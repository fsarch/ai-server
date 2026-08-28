# MCP Proxy & Tool-Calling

Der `ai-server` bindet die MCP-Server (Model Context Protocol, Streamable-HTTP-Transport,
üblicherweise via `@rekog/mcp-nest`) anderer fsarch-Dienste (z.B. `material-tracing-server`)
auf zwei Arten ein:

1. **`McpProxyController`**: ein öffentlicher HTTP-Reverse-Proxy, über den externe MCP-Clients
   (z.B. Claude Desktop) einen konfigurierten internen MCP-Server erreichen können, ohne
   direkten Netzwerkzugriff auf ihn zu benötigen.
2. **`McpProxyService.listTools` / `callTool`**: wird intern von `MessageService` genutzt, um
   dem LLM (OpenAI) bei jeder Chat-Nachricht die Tools der konfigurierten MCP-Server anzubieten
   und Tool-Aufrufe des Modells dorthin weiterzuleiten.

Beide Wege nutzen dieselbe Server-Konfiguration und denselben Authentifizierungs-Mechanismus.

## Konfiguration

In der `config.yaml` können MCP-Server wie folgt konfiguriert werden:

```yaml
mcp:
  - id: 'material-tracing'
    url: 'http://localhost:8080/.ai'
    auth:
      type: 'credential-propagation'

  - id: 'other-service'
    url: 'http://localhost:8081'
    auth:
      type: 'bearer'
      token: 'your-bearer-token-here'
```

`url` ist die Basis-URL des Dienstes bis zu dem Pfad-Präfix, unter dem sein MCP-Endpunkt
gemountet ist (z.B. `/.ai` bei `StreamableHttpTransport({ endpoint: '/.ai/mcp' })`) - **nicht**
inklusive `/mcp` selbst, das wird von `ai-server` angehängt.

### Authentifizierung

1. **credential-propagation**: Der `Authorization`-Header der ursprünglichen Anfrage (HTTP-Proxy)
   bzw. der Access-Token des aktuellen Chat-Users (internes Tool-Calling) wird an den MCP-Server
   weitergereicht. Dadurch greifen dort die Berechtigungen (UAC) des jeweiligen Users, nicht ein
   pauschales Service-Credential.
2. **bearer**: Ein statischer Bearer-Token wird für alle Anfragen an diesen Server verwendet.

## HTTP-Proxy

Der Proxy ist unter folgendem Pfad erreichbar:

```
/v1/.ai/mcp-proxy/<id>/mcp
```

Das ist ein **einzelner Endpoint**, wie ihn der Streamable-HTTP-Transport von `@rekog/mcp-nest`
vorsieht: POST für JSON-RPC-Aufrufe, GET zum Öffnen eines SSE-Streams, DELETE zum Beenden der
Session - alles gegen exakt diese URL, ohne Sub-Pfade. Ein zusätzlicher Sub-Pfad
(`/v1/.ai/mcp-proxy/<id>/mcp/irgendwas`) wird trotzdem noch durchgereicht, falls ein
nicht-standardkonformer MCP-Server das erwartet.

Die Antwort wird als Stream durchgereicht statt komplett gepuffert, damit `text/event-stream`-
Antworten (SSE) funktionieren.

### Beispiele

**Beispiel 1**: Anfrage an einen MCP-Server mit Credential Propagation

```bash
curl -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize", ...}' \
  https://your-server.com/v1/.ai/mcp-proxy/material-tracing/mcp

# Wird weitergeleitet an (mit Authorization-Header)
http://localhost:8080/.ai/mcp
```

**Beispiel 2**: Anfrage an einen MCP-Server mit Bearer-Token

```bash
curl https://your-server.com/v1/.ai/mcp-proxy/other-service/mcp

# Wird weitergeleitet an (mit konfiguriertem Bearer-Token)
http://localhost:8081/mcp
```

## AI Tool-Calling (intern)

Bei jeder Chat-Nachricht (`POST /v1/conversations/:id/messages`) fragt `MessageService` vor dem
Aufruf von OpenAI für jeden konfigurierten MCP-Server per `tools/list` dessen Tools ab (mit dem
Access-Token des aktuellen Users als `credential-propagation`-Header) und bietet sie dem Modell
als Function-Tools an, mit dem Namen `<server-id>__<tool-name>`, um Kollisionen zwischen
Servern zu vermeiden. Ruft das Modell ein Tool auf, wird es per `tools/call` auf dem richtigen
Server ausgeführt und das Ergebnis als `tool`-Message an das Modell zurückgegeben (bis zu 5
Runden pro Chat-Nachricht). Ist ein MCP-Server nicht erreichbar, wird das geloggt und seine
Tools werden für diese Anfrage einfach übersprungen, statt die ganze Antwort scheitern zu lassen.

Für Initialize-Handshake, Session-Handling (`Mcp-Session-Id`) und SSE-Parsing wird das offizielle
[`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
(`Client` + `StreamableHTTPClientTransport`) verwendet statt einer eigenen JSON-RPC-Implementierung.

## Implementierung

### Dateien

- `src/repositories/mcp-proxy.service.ts` - `proxyRequest` (HTTP-Passthrough) sowie
  `listTools`/`callTool` (SDK-basiertes internes Tool-Calling)
- `src/repositories/mcp-proxy.service.spec.ts` - Unit-Tests
- `src/controllers/mcp-proxy/mcp-proxy.controller.ts` - HTTP-Endpunkt für den Proxy
- `src/controllers/mcp-proxy/mcp-proxy.controller.spec.ts` - Unit- und Routing-Tests
- `src/controllers/mcp-proxy/mcp-proxy.module.ts` - NestJS Module
- `src/repositories/openai.service.ts` - `generateResponse` mit Tool-Call-Loop
- `src/repositories/message.service.ts` - baut Tool-Liste & Dispatcher pro Chat-Nachricht
- `src/repositories/mcp-proxy.service.ts` / `src/repositories/openai.service.ts` - definieren die app-spezifischen Config-Typen (`mcp`/`providers`) und lesen sie über Nest's `ConfigService`

### Testing

```bash
npm test -- mcp-proxy
npm test -- openai.service
npm test -- message.service
```
