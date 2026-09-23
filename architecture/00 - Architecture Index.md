# Loki Agent Harness — Architecture Vault

Welcome to the **Loki Architecture Vault**. This documentation defines the architectural blueprint, system design, security boundary, database schema, sandbox integration, and step-by-step implementation plan for building **Loki** — a lightweight, production-ready AI software engineering agent harness derived from the reference architecture of **Devin**.

---

## 🗺️ Map of Content (MOC)

This vault is structured into modular notes designed for human engineers and subagents to inspect, understand, and implement.

### Core Architecture & Design
- [[01 - System Architecture & Component Mapping|01. System Architecture & Component Mapping]]
  - Overview of Devin vs. Loki simplified design
  - High-level block diagrams & service boundaries
  - Control plane vs. Execution environment breakdown

- [[02 - Agent Harness & Loop Design|02. Agent Harness & Loop Design]]
  - Core agent execution loop (`loki-harness`)
  - Intent classification & fast-path small talk routing
  - Context building, message compaction, and token budgeting
  - Tool execution flow & state transitions

- [[03 - E2B Sandbox Integration|03. E2B Sandbox Integration]]
  - Replacing Firecracker microVMs with **E2B Sandbox SDK** (`@e2b/code-interpreter` / `@e2b/desktop`)
  - E2B session lifecycle: provision, execute, keep-alive, hibernate, terminate
  - Tool implementation over E2B APIs (Shell, File Editor, Search, Git)

- [[04 - Security & Trust Boundary|04. Security & Trust Boundary]]
  - Instruction hierarchy & system prompt policy
  - Untrusted data delimiters (`<untrusted source="...">`)
  - Tool result quarantine & indirect injection prevention
  - Shell command inspection & secret exfiltration defense

- [[05 - Database & Event System|05. Database & Event System]]
  - Postgres + Drizzle ORM schema design (`agent_tasks`, `agent_sessions`, `agent_task_events`)
  - Real-time event streaming & event bus architecture
  - Task state machine & durability

### 🛠️ Subagent Implementation Plan
- [[06 - Implementation Roadmap for Subagents|06. Implementation Roadmap for Subagents]]
  - Modular, step-by-step execution roadmap for lower subagents
  - **Phase 1**: Types, DB Schema & Event Bus (`packages/types`, `packages/db`, `packages/events`)
  - **Phase 2**: E2B Sandbox Manager (`packages/sandbox`)
  - **Phase 3**: Security & Trust Guardrail Module (`packages/trust`)
  - **Phase 4**: Agent Harness & Prompt Builder (`packages/agent-sdk`)
  - **Phase 5**: API Server & Task Controller (`apps/server`)
  - **Phase 6**: E2E Integration & Verification Suite

---

## 🎯 Architectural Philosophy

1. **Simplicity Over Over-Engineering**: Devin uses a custom Firecracker microVM supervisor, orchestrator, and gRPC tool gateway. Loki simplifies this by delegating sandboxing directly to **E2B**, eliminating infrastructure bloat while retaining high isolation.
2. **Strict Trust & Security Boundaries**: All data entering the agent loop (user input, file contents, shell output, recalled memory) is treated as untrusted data wrapped in XML tags to prevent prompt injection.
3. **Durable Agentic State**: Agent tasks and execution events are backed by Postgres and emitted sequentially to allow real-time UI/CLI streaming, pause/resume, and replayability.
4. **Subagent-Friendly Modularization**: The codebase is split into decoupled Bun/Node workspaces with explicit contracts so subagents can work concurrently on distinct modules without breaking dependencies.
