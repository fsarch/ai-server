# OpenAI Integration - Automatische Bot-User-Generierung & Titel-Beschreibungsgenerierung

## Übersicht

Die OpenAI-Integration ist vollständig implementiert mit:
1. Automatischer KI-Antwort auf alle Nachrichten
2. Automatischer Bot-User-Generierung basierend auf Provider/Model
3. Automatischer Generierung von Conversation-Namen und Beschreibung

1. **Nachricht erstellen** → POST `/conversations/{id}/messages`
   - User sendet eine Nachricht
   - System speichert die Nachricht

2. **Automatische KI-Antwort**
   - OpenAI generiert eine Antwort
   - Bot-User wird AUTOMATISCH erstellt (falls nicht vorhanden) basierend auf:
     - Provider-ID: `open-ai` (aus config.yml)
     - Model-ID: `gpt-4` (aus config.yml)
   - KI-Antwort wird mit Bot-User gespeichert

3. **Rückgabe**
   ```json
   {
     "data": [
       {
         "id": "msg-user-123",
         "conversation_id": "conv-456",
         "author_user_id": "user-789",
         "content": "Hallo KI!",
         "creation_time": "2024-03-01T10:00:00Z",
         "deletion_time": null
       },
       {
         "id": "msg-ai-124",
         "conversation_id": "conv-456",
         "author_user_id": "bot-user-gpt4",
         "content": "Hallo! Ich bin ein KI-Assistent...",
         "creation_time": "2024-03-01T10:00:01Z",
         "deletion_time": null
       }
     ]
   }
   ```

## Bot-User-Generierung

### Automatische Erstellung
- **Externe ID**: `bot:open-ai:gpt-4` (bleibt stabil, auch wenn Name sich ändert)
- **Family Name**: `open-ai` (Provider-ID)
- **Given Name**: `gpt-4` (Model-ID)
- **Short Name**: `GPT-4` (Model-Name aus Config)
- **is_bot**: `true`

### Name-Updates
Wenn der Model-Name in der Config geändert wird (z.B. von "GPT-4" zu "GPT-4 Turbo"):
- Der **bestehende Bot-User wird aktualisiert** (kein neuer User!)
- Die `external_id` bleibt gleich: `bot:open-ai:gpt-4`
- Nur `short_name` wird auf den neuen Wert gesetzt

### Identifikation
Alle Antworten werden durch das `is_bot = true` Flag erkannt.

### Wiederverwendung
Wenn ein Bot-User bereits existiert (basierend auf `external_id`), wird er wiederverwendet statt neu zu erstellen.

## Automatische Titel- und Beschreibungsgenerierung

Wenn eine neue Conversation mit einer `initial_message` erstellt wird und kein `name` oder keine `description` angegeben ist:

1. OpenAI analysiert die initiale Nachricht
2. Generiert einen kurzen Titel (max. 50 Zeichen)
3. Generiert eine kurze Beschreibung (max. 150 Zeichen)

### Beispiel:
```bash
POST /conversations
{
  "initial_message": {
    "content": "Kann mir jemand erklären, wie Photosynthese funktioniert?"
  }
}

Response:
{
  "id": "conv-123",
  "name": "Photosynthese erklärt",
  "description": "Erklärung des Photosynthese-Prozesses und dessen Funktion in Pflanzen",
  "owner_user_id": "user-789",
  "creation_time": "2024-03-01T10:00:00Z"
}
```

### Fallback-Verhalten:
- Falls die Generierung fehlschlägt → keine Titel/Beschreibung (wie normal)
- Falls `name` oder `description` explizit angegeben → diese Werte werden verwendet (Generierung wird übersprungen)
- Falls kein `initial_message` → normale Erstellung ohne Generierung

## Konfiguration

Die Konfiguration wird aus `config.yml` gelesen:

```yaml
providers:
  - type: 'open-ai'
    id: 'open-ai'                    # Provider-ID (für external_id und family_name)
    api_key: 'sk-proj-...'           # OpenAI API-Key
    models:
      - id: 'gpt-4'                  # Model-ID (für external_id und given_name)
        name: 'GPT-4'                # Model-Name (für short_name, kann geändert werden!)
```

**Wichtig:** Eine Änderung des `name` erstellt KEINEN neuen User, sondern aktualisiert nur den `short_name` des bestehenden Bot-Users!

## Flow-Diagramm

```
POST /messages
    ↓
MessageService.createWithAiResponse()
    ↓
├─ Speichere User-Nachricht
├─ Rufe OpenAI API auf
├─ Hole Provider-ID: 'open-ai'
├─ Hole Model-ID: 'gpt-4'
├─ Hole Model-Name: 'GPT-4'
└─ UserService.getOrCreateBotUser('open-ai', 'gpt-4', 'GPT-4')
    ↓
    ├─ Suche User mit external_id: 'bot:open-ai:gpt-4'
    ├─ Falls vorhanden: 
    │   ├─ Prüfe ob short_name = 'GPT-4'
    │   ├─ Falls anders: Aktualisiere short_name
    │   └─ Gebe User zurück
    └─ Falls nicht vorhanden:
        ├─ Erstelle neuen User
        ├─ Setze is_bot = true
        ├─ Setze short_name = 'GPT-4'
        └─ Speichere ab
    ↓
Speichere KI-Antwort mit Bot-User-ID
    ↓
Rückgabe: { userMessage, aiMessage }
```

## Änderungen

### Service-Layer
- **OpenAiService**: `getProviderId()`, `getModelId()` hinzugefügt
- **UserService**: `getOrCreateBotUser(providerId, modelId)` hinzugefügt
- **MessageService**: Nutzt `UserService` zur Bot-User-Verwaltung

### Keine neuen Datenbank-Migrationen
- Das `is_bot`-Flag existierte bereits
- Keine neuen Tabellen erforderlich

## Testing

```bash
# Conversation mit initialer Nachricht erstellen
POST /conversations
{
  "name": "Test Conversation",
  "initial_message": {
    "content": "Hallo KI!"
  }
}

# Follow-up Nachricht senden
POST /conversations/{conversationId}/messages
{
  "content": "Wie geht es dir?"
}

# Response-Format
{
  "data": [
    { "id": "msg-user-id", "content": "Wie geht es dir?", "author_user_id": "user-123", ... },
    { "id": "msg-ai-id", "content": "Mir geht es gut, danke!", "author_user_id": "bot-user-id", "is_bot": true, ... }
  ]
}
```

Beide Requests werden automatisch KI-Antworten generieren und den Bot-User automatisch erstellen!

