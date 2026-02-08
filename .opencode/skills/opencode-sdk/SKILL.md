---
name: opencode-sdk
description: Provides comprehensive documentation and usage patterns for the OpenCode JS/TS SDK. Use when: (1) Integrating with OpenCode server programmatically, (2) Building tools or plugins that interact with OpenCode, (3) Managing OpenCode sessions, files, or project resources via API
---

# OpenCode SDK

The OpenCode JS/TS SDK provides a type-safe client for interacting with the server programmatically.

## Installation

```bash
npm install @opencode-ai/sdk
```

## Creating Clients

### Full Instance (Server + Client)

```javascript
import { createOpencode } from "@opencode-ai/sdk"

const { client } = await createOpencode()
```

Options:
- `hostname`: Server hostname (default: `127.0.0.1`)
- `port`: Server port (default: `4096`)
- `signal`: AbortSignal for cancellation
- `timeout`: Server start timeout in ms (default: `5000`)
- `config`: Configuration object

### Client Only

```javascript
import { createOpencodeClient } from "@opencode-ai/sdk"

const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",
})
```

Options:
- `baseUrl`: Server URL (default: `http://localhost:4096`)
- `fetch`: Custom fetch implementation
- `parseAs`: Response parsing method (`auto`)
- `responseStyle`: `data` or `fields` (default: `fields`)
- `throwOnError`: Throw errors instead of return (default: `false`)

## API Modules

### Global Module

Health check:

```javascript
const health = await client.global.health()
console.log(health.data.version)
```

Response: `{ healthy: true, version: string }`

### App Module

Write log entry:

```javascript
await client.app.log({
  body: {
    service: "my-app",
    level: "info",
    message: "Operation completed",
  },
})
```

List available agents:

```javascript
const agents = await client.app.agents()
```

Response: `Agent[]`

### Project Module

List all projects:

```javascript
const projects = await client.project.list()
```

Response: `Project[]`

Get current project:

```javascript
const currentProject = await client.project.current()
```

Response: `Project`

### Path Module

Get current path information:

```javascript
const pathInfo = await client.path.get()
```

Response: `Path`

### Config Module

Get config:

```javascript
const config = await client.config.get()
```

Response: `Config`

List providers and defaults:

```javascript
const { providers, default: defaults } = await client.config.providers()
```

Response: `{ providers: Provider[], default: { [key: string]: string } }`

### Session Module

**List sessions:**

```javascript
const sessions = await client.session.list()
```

**Get session:**

```javascript
const session = await client.session.get({
  path: { id: "session-id" },
})
```

**List child sessions:**

```javascript
const children = await client.session.children({
  path: { id: "session-id" },
})
```

**Create session:**

```javascript
const session = await client.session.create({
  body: { title: "My session" },
})
```

**Delete session:**

```javascript
await client.session.delete({
  path: { id: "session-id" },
})
```

**Update session:**

```javascript
const updated = await client.session.update({
  path: { id: "session-id" },
  body: { title: "New title" },
})
```

**Initialize session (analyze app and create AGENTS.md):**

```javascript
await client.session.init({
  path: { id: "session-id" },
  body: {},
})
```

**Abort running session:**

```javascript
await client.session.abort({
  path: { id: "session-id" },
})
```

**Share session:**

```javascript
const shared = await client.session.share({
  path: { id: "session-id" },
})
```

**Unshare session:**

```javascript
const unshared = await client.session.unshare({
  path: { id: "session-id" },
})
```

**Summarize session:**

```javascript
await client.session.summarize({
  path: { id: "session-id" },
  body: {},
})
```

**List messages:**

```javascript
const messages = await client.session.messages({
  path: { id: "session-id" },
})
```

Response: `{ info: Message, parts: Part[] }[]`

**Get message details:**

```javascript
const message = await client.session.message({
  path: { id: "session-id", messageId: "msg-id" },
})
```

Response: `{ info: Message, parts: Part[] }`

**Send prompt:**

```javascript
const result = await client.session.prompt({
  path: { id: session.id },
  body: {
    model: { providerID: "anthropic", modelID: "claude-3-5-sonnet-20241022" },
    parts: [{ type: "text", text: "Hello!" }],
  },
})
```

Inject context without AI response (for plugins):

```javascript
await client.session.prompt({
  path: { id: session.id },
  body: {
    noReply: true,
    parts: [{ type: "text", text: "Context injection..." }],
  },
})
```

**Send command:**

```javascript
const result = await client.session.command({
  path: { id: "session-id" },
  body: { command: "/list_files" },
})
```

**Run shell command:**

```javascript
const result = await client.session.shell({
  path: { id: "session-id" },
  body: { command: "ls -la" },
})
```

**Revert message:**

```javascript
const reverted = await client.session.revert({
  path: { id: "session-id" },
  body: { messageId: "msg-id" },
})
```

**Restore reverted messages:**

```javascript
const restored = await client.session.unrevert({
  path: { id: "session-id" },
})
```

**Respond to permission request:**

```javascript
await client.postSessionByIdPermissionsByPermissionId({
  path: { id: "session-id", permissionId: "perm-id" },
  body: { approved: true },
})
```

### Files Module

**Search text in files:**

```javascript
const textResults = await client.find.text({
  query: { pattern: "function.*opencode" },
})
```

Response: Array with `path`, `lines`, `line_number`, `absolute_offset`, `submatches`

**Find files by name:**

```javascript
const files = await client.find.files({
  query: { query: "*.ts", type: "file" },
})
```

Find directories:

```javascript
const directories = await client.find.files({
  query: { query: "packages", type: "directory", limit: 20 },
})
```

Optional query fields for `find.files`:
- `type`: `"file"` or `"directory"`
- `directory`: override project root
- `limit`: max results (1-200)

**Find workspace symbols:**

```javascript
const symbols = await client.find.symbols({
  query: { query: "MyFunction" },
})
```

Response: `Symbol[]`

**Read file:**

```javascript
const content = await client.file.read({
  query: { path: "src/index.ts" },
})
```

Response: `{ type: "raw" | "patch", content: string }`

**Get file status:**

```javascript
const status = await client.file.status()
```

Response: `File[]`

### TUI Module

**Append text to prompt:**

```javascript
await client.tui.appendPrompt({
  body: { text: "Add this to prompt" },
})
```

**Open dialogs:**

```javascript
await client.tui.openHelp()
await client.tui.openSessions()
await client.tui.openThemes()
await client.tui.openModels()
```

**Submit/clear prompt:**

```javascript
await client.tui.submitPrompt()
await client.tui.clearPrompt()
```

**Execute command:**

```javascript
await client.tui.executeCommand({
  body: { command: "/list_files" },
})
```

**Show toast:**

```javascript
await client.tui.showToast({
  body: { message: "Task completed", variant: "success" },
})
```

### Auth Module

**Set authentication credentials:**

```javascript
await client.auth.set({
  path: { id: "anthropic" },
  body: { type: "api", key: "your-api-key" },
})
```

Response: `boolean`

### Events Module

**Subscribe to real-time events:**

```javascript
const events = await client.event.subscribe()
for await (const event of events.stream) {
  console.log("Event:", event.type, event.properties)
}
```

Response: Server-sent events stream

## Error Handling

```typescript
try {
  await client.session.get({ path: { id: "invalid-id" } })
} catch (error) {
  console.error("Failed to get session:", (error as Error).message)
}
```

## Types

Import TypeScript types directly:

```typescript
import type { Session, Message, Part, Project, Agent } from "@opencode-ai/sdk"
```

## Constraints

- Always handle errors with try-catch when calling SDK methods
- Use type annotations for better code safety
- Check response structure before accessing nested properties
- Use `noReply: true` for context injection without triggering AI responses
- Respect rate limits when calling multiple methods in succession
- Validate user input before passing to SDK methods

## Best Practices

- Prefer client-only mode when connecting to existing OpenCode instance
- Use AbortSignal for cancellation where appropriate
- Validate all paths and IDs before passing to SDK methods
- Log errors for debugging but avoid exposing sensitive data
- Use TypeScript types for compile-time safety
- Mock SDK client in tests for unit testing
