import { Injectable, Inject, Logger, NotFoundException, BadGatewayException } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { ConfigType, ConfigMcpServerType } from '../fsarch/configuration/config.type.js';

/**
 * Resolves a request path against the configured base URL of an MCP server.
 *
 * `path` is always an absolute path (e.g. `/mcp/endpoint`). Using `new URL(path, base)`
 * directly would discard any path segment already present on `base` (e.g. `/.ai`), because
 * a leading `/` is treated as absolute by the URL spec. To keep the base path, `base` is
 * normalized to end with a `/` and `path` is stripped of its leading `/` before resolution.
 */
export function resolveMcpTargetUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const relativePath = path.startsWith('/') ? path.slice(1) : path;
  return new URL(relativePath, normalizedBase).toString();
}

export type McpToolDefinition = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
};

export type McpProxyResponse = {
  status: number;
  headers: Record<string, string>;
  body: ReadableStream<Uint8Array> | null;
};

const MCP_CLIENT_TIMEOUT_MS = 10_000;
const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD']);

@Injectable()
export class McpProxyService {
  private readonly logger = new Logger(McpProxyService.name);

  constructor(@Inject('CONFIG') private readonly config: ConfigType) {}

  listConfiguredServers(): ConfigMcpServerType[] {
    return this.config.mcp || [];
  }

  getMcpServer(id: string): ConfigMcpServerType {
    const server = this.listConfiguredServers().find((s) => s.id === id);

    if (!server) {
      throw new NotFoundException(`MCP server with id '${id}' not found`);
    }

    return server;
  }

  /**
   * Applies the configured authentication for an MCP server to a set of outgoing headers.
   * For `credential-propagation`, the caller is expected to already have placed the
   * `authorization` header of the originating request into `headers`.
   */
  private applyAuth(
    server: ConfigMcpServerType,
    headers: Record<string, string>,
  ): Record<string, string> {
    const result: Record<string, string> = { ...headers };
    delete result['host'];
    delete result['content-length'];

    if (server.auth?.type === 'bearer') {
      result['authorization'] = `Bearer ${server.auth.token}`;
    }

    return result;
  }

  /**
   * Raw HTTP passthrough used by the public `/mcp-proxy/:id/mcp` controller. The response
   * body is streamed rather than buffered so that SSE responses from a Streamable-HTTP MCP
   * server are forwarded as they arrive instead of being held until the stream ends.
   */
  async proxyRequest(
    id: string,
    method: string,
    path: string,
    headers: Record<string, string>,
    body?: any,
  ): Promise<McpProxyResponse> {
    const server = this.getMcpServer(id);
    const targetUrl = resolveMcpTargetUrl(server.url, path);
    const proxyHeaders = this.applyAuth(server, headers);
    const upperMethod = method.toUpperCase();
    const canHaveBody = !METHODS_WITHOUT_BODY.has(upperMethod);

    if (canHaveBody && body !== undefined && body !== null && !proxyHeaders['content-type']) {
      proxyHeaders['content-type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        method: upperMethod,
        headers: proxyHeaders,
        body: canHaveBody && body !== undefined && body !== null ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      throw new BadGatewayException(`Failed to proxy request to MCP server: ${error}`);
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      headers: responseHeaders,
      body: response.body,
    };
  }

  /**
   * Opens an ephemeral MCP session (initialize -> use -> terminate) against a configured
   * server using the official MCP SDK, which handles the Streamable-HTTP handshake,
   * `Mcp-Session-Id` bookkeeping and SSE parsing for us.
   */
  private async withMcpClient<T>(
    id: string,
    headers: Record<string, string>,
    fn: (client: Client) => Promise<T>,
  ): Promise<T> {
    const server = this.getMcpServer(id);
    const requestHeaders = this.applyAuth(server, headers);
    const targetUrl = new URL(resolveMcpTargetUrl(server.url, '/mcp'));

    const transport = new StreamableHTTPClientTransport(targetUrl, {
      requestInit: { headers: requestHeaders },
    });
    const client = new Client(
      { name: 'fsarch-ai-server', version: '1.0.0' },
      { capabilities: {} },
    );

    try {
      await client.connect(transport);
      return await fn(client);
    } finally {
      try {
        await transport.terminateSession();
      } catch {
        // Server may not support explicit session termination (e.g. HTTP 405) - ignore.
      }
      await client.close();
    }
  }

  /**
   * Lists the tools exposed by a configured MCP server. Failures are logged and result in
   * an empty list rather than throwing, so that one unreachable/misconfigured MCP server
   * does not prevent a chat response from being generated.
   */
  async listTools(
    id: string,
    headers: Record<string, string> = {},
  ): Promise<McpToolDefinition[]> {
    try {
      const result = await this.withMcpClient(id, headers, (client) =>
        client.listTools(undefined, { timeout: MCP_CLIENT_TIMEOUT_MS }),
      );

      return (result.tools || []).map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as Record<string, unknown> | undefined,
      }));
    } catch (error) {
      this.logger.warn(`Failed to list tools for MCP server '${id}': ${error}`);
      return [];
    }
  }

  /**
   * Calls a tool on a configured MCP server and returns its result as text, suitable for
   * feeding back into an LLM tool-result message.
   */
  async callTool(
    id: string,
    name: string,
    args: Record<string, unknown>,
    headers: Record<string, string> = {},
  ): Promise<string> {
    return this.withMcpClient(id, headers, async (client) => {
      const result = await client.callTool(
        { name, arguments: args },
        undefined,
        { timeout: MCP_CLIENT_TIMEOUT_MS },
      );
      return this.extractToolResultText(result);
    });
  }

  private extractToolResultText(result: unknown): string {
    const content = (result as { content?: unknown })?.content;
    if (Array.isArray(content)) {
      const text = content
        .filter((c: any) => c?.type === 'text' && typeof c.text === 'string')
        .map((c: any) => c.text)
        .join('\n');
      if (text) {
        return text;
      }
    }

    try {
      return JSON.stringify(result);
    } catch {
      return String(result);
    }
  }
}
