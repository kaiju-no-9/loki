# 01 - System Architecture & Component Mapping

## 💡 Executive Summary

**Loki** is a simplified, cloud-native AI coding agent platform inspired by the reference architecture of **Devin**. While Devin employs a complex infrastructure footprint including custom Firecracker microVM management, gRPC tool gateways, isolated schedulers, and multi-tier orchestrators, Loki streamlines this into a lightweight **Node/Bun Monorepo** powered by **E2B Sandbox SDK** for cloud execution environments.

---

## 🏗️ Architecture Comparison: Devin vs. Loki

| Architectural Layer | Devin Reference Architecture | Loki Simplified Architecture |
| :--- | :--- | :--- |
| **Control Plane** | Multi-app split (`apps/server`, `apps/brain`, `apps/orchestrator`) | Unified API Server (`apps/server`) + Agent SDK (`packages/agent-sdk`) |
| **Sandbox Infrastructure** | Custom Firecracker microVMs + Docker + K8s CNI | Cloud-hosted **E2B Sandboxes** via `@e2b/code-interpreter` |
| **Tool Execution** | Tool Gateway gRPC server (`:9095`) → Guest Worker HTTP proxy | Direct E2B SDK calls (`sandbox.commands.run()`, `sandbox.files.write()`) |
| **Database & Persistence** | PostgreSQL + Drizzle ORM | PostgreSQL + Drizzle ORM (compatible schema) |
| **LLM Provider** | OpenAI / Anthropic direct API calls | OpenAI / Anthropic SDK with structured outputs |
| **Security & Guardrails** | In-harness trust boundary (`wrapUserRequest`, secret filtering) | Dedicated Trust Guardrail Module (`packages/trust`) |

---

## 📐 High-Level Architecture Diagram

```mermaid
graph TD
    User[User / Client UI] -->|HTTP / WebSockets| Server[apps/server: API & Controller]
    Server -->|1. Create Task| DB[(Postgres DB via Drizzle)]
    Server -->|2. Trigger Execution| Harness[packages/agent-sdk: Agent Loop Engine]
    
    subgraph Control Plane
        Harness -->|3. Validate Prompt & Intent| Trust[packages/trust: Guardrails]
        Harness -->|4. LLM Completion| LLM[OpenAI / Anthropic APIs]
        Harness -->|5. Emit Progress| EventBus[packages/events: Event Stream]
    end
    
    subgraph Execution Plane (E2B Cloud)
        Harness -->|6. Provision / Connect| E2B[E2B Cloud Sandbox]
        Harness -->|7. Execute Tools (Shell, File, Git)| E2B
        E2B -->|8. Return Output / Artifacts| Harness
    end

    EventBus -->|Live Updates| Server
```

---

## 🧩 Monorepo Component Breakdown

The Loki project is organized as a Bun workspace monorepo. Below is the mapping of packages and applications:

```text
loki/
├── apps/
│   └── server/             # REST/WebSocket API control plane & task lifecycle manager
├── packages/
│   ├── agent-sdk/          # Core LLM Agent Harness loop, prompt builders & tool handlers
│   ├── sandbox/            # E2B Sandbox lifecycle manager & execution wrappers
│   ├── trust/              # Prompt injection guardrails, secret filters & delimiters
│   ├── db/                 # Drizzle ORM database schemas, migrations & queries
│   ├── events/             # Shared typed event bus & event emission helpers
│   └── types/              # Common TypeScript interfaces & schema definitions
├── architecture/           # Obsidian Architecture Vault (this documentation)
├── package.json            # Root workspace configuration
└── turbo.json              # Turborepo build pipeline config
```

### Component Details

#### 1. `apps/server` (Control Plane API)
- Exposes REST endpoints to create, list, pause, resume, and terminate agent tasks.
- Manages HTTP/WebSocket streaming for real-time task log events.
- Handles user authentication, session binding, and task scheduling.

#### 2. `packages/agent-sdk` (Agent Harness Engine)
- Implements the core agent loop (`runAgentLoop`).
- Manages message history, context compaction, prompt assembly, and tool selection.
- Connects to `packages/trust` for safety checks and `packages/sandbox` for tool execution.

#### 3. `packages/sandbox` (E2B Sandbox Manager)
- Replaces custom Firecracker microVM provisioning with E2B SDK integration.
- Exposes clean methods:
  - `createSandbox(template?: string)`
  - `executeShellCommand(sandboxId, command, timeout)`
  - `readFile(sandboxId, path)`, `writeFile(sandboxId, path, content)`
  - `listDirectory(sandboxId, path)`
  - `closeSandbox(sandboxId)`

#### 4. `packages/trust` (Security Guardrails)
- Sanitizes user input and formats untrusted external data into XML boundaries (`<untrusted source="...">`).
- Inspects shell commands before execution to prevent API key exfiltration.
- Quarantines tool outputs to prevent prompt injection hijacking.

#### 5. `packages/db` (Persistence Layer)
- PostgreSQL database access powered by Drizzle ORM.
- Stores durable task records (`agent_tasks`), execution events (`agent_task_events`), and sandbox session states (`agent_sessions`).

#### 6. `packages/events` (Event Bus)
- Defines strongly typed task events (`agent.started`, `agent.thought`, `agent.tool`, `agent.output`, `agent.completed`, `agent.failed`).
- Provides event emitters for real-time log streaming across services.

---

## 🔄 Data & Execution Flow

1. **Task Dispatch**: User submits a prompt to `apps/server`. A record is saved to Postgres (`agent_tasks` table).
2. **Intent Classification**: `packages/agent-sdk` calls LLM chooser to check if the prompt is a quick greeting or requires code execution.
3. **Sandbox Provisioning**: If code execution is needed, `packages/sandbox` provisions a remote E2B Sandbox environment.
4. **Agent Loop**:
   - Build system prompt with instruction hierarchy & untrusted input delimiters (`packages/trust`).
   - Call LLM with tool declarations (`read_file`, `write_file`, `list_dir`, `shell`, `git_commit`, `finish`).
   - Execute requested tools in E2B sandbox (`packages/sandbox`).
   - Wrap tool output in `TOOL_RESULT` tags and re-inject into conversation history.
   - Stream event notifications to `packages/events`.
   - Repeat until model calls `finish` tool or hits step budget.
5. **Cleanup**: Close or hibernate E2B sandbox, save final summary in Postgres, mark task as `completed`.

---

## 🔗 Related Notes
- [[00 - Architecture Index|Return to Index]]
- [[02 - Agent Harness & Loop Design|Next: Agent Harness & Loop Design]]
- [[03 - E2B Sandbox Integration|E2B Sandbox Integration Details]]
