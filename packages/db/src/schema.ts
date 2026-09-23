import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const agentTasks = pgTable(
  "agent_tasks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"),
    prompt: text("prompt").notNull(),
    agent: text("agent").default("loki").notNull(),
    status: text("status").notNull(), // 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
    title: text("title"),
    repository: text("repository"),
    branch: text("branch"),
    sessionActive: boolean("session_active").default(false).notNull(),
    sandboxId: text("sandbox_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("agent_tasks_user_id_idx").on(table.userId),
    index("agent_tasks_status_idx").on(table.status),
    index("agent_tasks_updated_at_idx").on(table.updatedAt),
  ]
);

export const agentSessions = pgTable(
  "agent_sessions",
  {
    taskId: text("task_id")
      .primaryKey()
      .references(() => agentTasks.id, { onDelete: "cascade" }),
    sandboxId: text("sandbox_id").notNull(),
    repoCwd: text("repo_cwd").notNull().default("/home/user/repo"),
    state: text("state").notNull().default("active"),
    lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("agent_sessions_state_idx").on(table.state),
    index("agent_sessions_last_active_idx").on(table.lastActiveAt),
  ]
);

export const agentTaskEvents = pgTable(
  "agent_task_events",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => agentTasks.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    message: text("message").notNull(),
    data: jsonb("data"),
    sequence: integer("sequence").notNull(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => [
    index("agent_task_events_task_id_idx").on(table.taskId),
    index("agent_task_events_task_seq_idx").on(
      table.taskId,
      table.sequence
    ),
  ]
);

export const agentTasksRelations = relations(agentTasks, ({ many, one }) => ({
  events: many(agentTaskEvents),
  session: one(agentSessions),
}));

export const agentTaskEventsRelations = relations(
  agentTaskEvents,
  ({ one }) => ({
    task: one(agentTasks, {
      fields: [agentTaskEvents.taskId],
      references: [agentTasks.id],
    }),
  })
);

export const agentSessionsRelations = relations(agentSessions, ({ one }) => ({
  task: one(agentTasks, {
    fields: [agentSessions.taskId],
    references: [agentTasks.id],
  }),
}));

export const schema = {
  agentTasks,
  agentSessions,
  agentTaskEvents,
  agentTasksRelations,
  agentTaskEventsRelations,
  agentSessionsRelations,
};
