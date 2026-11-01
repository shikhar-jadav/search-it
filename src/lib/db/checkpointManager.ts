import db from './index';
import {
  agentCheckpoints,
  agentCheckpointWrites,
  agentStore,
  AgentCheckpoint,
  AgentStoreItem,
} from './checkpointSchema';
import { eq, and, desc } from 'drizzle-orm';

export interface CheckpointWriteInput {
  taskId: string;
  channel: string;
  value: any;
}

export class CheckpointManager {
  /**
   * Initializes checkpoint and store tables in SQLite
   */
  static init() {
    try {
      db.run(`
        CREATE TABLE IF NOT EXISTS agent_checkpoints (
          id TEXT PRIMARY KEY,
          thread_id TEXT NOT NULL,
          checkpoint_ns TEXT DEFAULT '',
          parent_checkpoint_id TEXT,
          step INTEGER NOT NULL,
          state TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_agent_checkpoints_thread ON agent_checkpoints(thread_id, step);
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS agent_checkpoint_writes (
          id TEXT PRIMARY KEY,
          checkpoint_id TEXT NOT NULL,
          task_id TEXT NOT NULL,
          channel TEXT NOT NULL,
          value TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS agent_store (
          key TEXT NOT NULL,
          namespace TEXT NOT NULL,
          value TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (namespace, key)
        );
      `);
    } catch (err) {
      console.error('Failed to initialize agent checkpoint/store tables:', err);
    }
  }

  /**
   * Saves a state snapshot at a given superstep
   */
  static async saveCheckpoint(
    threadId: string,
    step: number,
    state: Record<string, any>,
    parentCheckpointId?: string,
    writes?: CheckpointWriteInput[],
  ): Promise<string> {
    this.init();
    const checkpointId = `${threadId}:${step}:${Date.now()}`;
    const now = new Date().toISOString();

    await db.insert(agentCheckpoints).values({
      id: checkpointId,
      threadId,
      step,
      state,
      parentCheckpointId: parentCheckpointId || null,
      createdAt: now,
    });

    if (writes && writes.length > 0) {
      for (const w of writes) {
        await db.insert(agentCheckpointWrites).values({
          id: `${checkpointId}:${w.taskId}:${w.channel}`,
          checkpointId,
          taskId: w.taskId,
          channel: w.channel,
          value: w.value,
          createdAt: now,
        });
      }
    }

    return checkpointId;
  }

  /**
   * Retrieves the latest checkpoint tuple for a thread
   */
  static async getLatestCheckpoint(threadId: string): Promise<AgentCheckpoint | null> {
    this.init();
    const rows = await db
      .select()
      .from(agentCheckpoints)
      .where(eq(agentCheckpoints.threadId, threadId))
      .orderBy(desc(agentCheckpoints.step))
      .limit(1);

    return rows[0] || null;
  }

  /**
   * Long-term Cross-Thread Store put
   */
  static async storePut(
    namespace: string,
    key: string,
    value: Record<string, any>,
  ): Promise<void> {
    this.init();
    const now = new Date().toISOString();

    const existing = await db
      .select()
      .from(agentStore)
      .where(and(eq(agentStore.namespace, namespace), eq(agentStore.key, key)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(agentStore)
        .set({ value, updatedAt: now })
        .where(and(eq(agentStore.namespace, namespace), eq(agentStore.key, key)));
    } else {
      await db.insert(agentStore).values({
        namespace,
        key,
        value,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  /**
   * Long-term Cross-Thread Store get
   */
  static async storeGet(
    namespace: string,
    key: string,
  ): Promise<AgentStoreItem | null> {
    this.init();
    const rows = await db
      .select()
      .from(agentStore)
      .where(and(eq(agentStore.namespace, namespace), eq(agentStore.key, key)))
      .limit(1);

    return rows[0] || null;
  }
}
