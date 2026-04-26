/**
 * Offline-first task store using idb-keyval.
 * When online: writes go to Supabase first, then mirror to IDB.
 * When offline: writes go to IDB with a 'pending' sync flag.
 * On reconnect: sync() flushes pending writes to Supabase.
 */
import { get, set, del, keys, setMany } from 'idb-keyval';
import type { Task } from '@/types';

const PREFIX    = 'caldr:task:';
const PENDING   = 'caldr:pending';

function taskKey(id: string) { return `${PREFIX}${id}`; }

export async function saveTaskLocally(task: Task): Promise<void> {
  await set(taskKey(task.id), task);
}

export async function getLocalTask(id: string): Promise<Task | undefined> {
  return get<Task>(taskKey(id));
}

export async function getAllLocalTasks(): Promise<Task[]> {
  const allKeys = (await keys()) as string[];
  const taskKeys = allKeys.filter(k => (k as string).startsWith(PREFIX));
  const tasks = await Promise.all(taskKeys.map(k => get<Task>(k)));
  return (tasks.filter(Boolean) as Task[]).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function deleteLocalTask(id: string): Promise<void> {
  await del(taskKey(id));
}

export async function clearAllLocalTasks(): Promise<void> {
  const allKeys = (await keys()) as string[];
  const taskKeys = allKeys.filter(k => (k as string).startsWith(PREFIX));
  await Promise.all(taskKeys.map(k => del(k)));
}

// ── Pending queue for offline writes ─────────────────────────

export interface PendingWrite {
  type: 'upsert' | 'delete' | 'status';
  task: Task;
}

export async function enqueuePendingWrite(write: PendingWrite): Promise<void> {
  const existing: PendingWrite[] = (await get<PendingWrite[]>(PENDING)) ?? [];
  // De-dup: replace existing entry for same id + type
  const filtered = existing.filter(
    e => !(e.task.id === write.task.id && e.type === write.type)
  );
  await set(PENDING, [...filtered, write]);
}

export async function getPendingWrites(): Promise<PendingWrite[]> {
  return (await get<PendingWrite[]>(PENDING)) ?? [];
}

export async function clearPendingWrites(): Promise<void> {
  await del(PENDING);
}

/**
 * Sync pending offline writes back to Supabase.
 * Called when navigator.onLine becomes true.
 */
export async function syncPendingTasks(
  upsertFn: (task: Task) => Promise<void>,
  deleteFn: (id: string) => Promise<void>,
): Promise<number> {
  const pending = await getPendingWrites();
  if (pending.length === 0) return 0;

  let synced = 0;
  for (const write of pending) {
    try {
      if (write.type === 'delete') {
        await deleteFn(write.task.id);
      } else {
        await upsertFn(write.task);
      }
      synced++;
    } catch {
      // Leave in queue for next attempt
    }
  }

  if (synced === pending.length) {
    await clearPendingWrites();
  } else {
    // Remove successfully synced items
    const remaining = pending.slice(synced);
    await set(PENDING, remaining);
  }

  return synced;
}

/**
 * Hydrate local store from a fresh server fetch.
 * Called on page load when online to keep IDB in sync.
 */
export async function hydrateFromServer(tasks: Task[]): Promise<void> {
  const pairs: [string, Task][] = tasks.map(t => [taskKey(t.id), t]);
  await setMany(pairs);
}
