import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * LangGraph-spec Checkpoint Table:
 * Stores thread-scoped graph state snapshots for conversation continuity,
 * fault tolerance, and time travel.
 */
export const agentCheckpoints = sqliteTable('agent_checkpoints', {
  id: text('id').primaryKey(),
  threadId: text('thread_id').notNull(),
  checkpointNs: text('checkpoint_ns').default(''),
  parentCheckpointId: text('parent_checkpoint_id'),
  step: integer('step').notNull(),
  state: text('state', { mode: 'json' }).notNull(), // Serialized channel values & task outputs
  createdAt: text('created_at').notNull(),
});

/**
 * LangGraph-spec Writes Table:
 * Stores node/tool outputs within a superstep: (task_id, channel, value).
 */
export const agentCheckpointWrites = sqliteTable('agent_checkpoint_writes', {
  id: text('id').primaryKey(),
  checkpointId: text('checkpoint_id').notNull(),
  taskId: text('task_id').notNull(),
  channel: text('channel').notNull(),
  value: text('value', { mode: 'json' }).notNull(),
  createdAt: text('created_at').notNull(),
});

/**
 * LangGraph-spec Long-Term Memory Store:
 * Cross-thread persistence for user preferences, shared research facts, and knowledge.
 */
export const agentStore = sqliteTable('agent_store', {
  key: text('key').notNull(),
  namespace: text('namespace').notNull(), // e.g. "default.memories" or "userId.spaces"
  value: text('value', { mode: 'json' }).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type AgentCheckpoint = typeof agentCheckpoints.$inferSelect;
export type AgentCheckpointWrite = typeof agentCheckpointWrites.$inferSelect;
export type AgentStoreItem = typeof agentStore.$inferSelect;
