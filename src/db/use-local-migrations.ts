import { useSyncExternalStore } from 'react';

import { applyMigrations } from '@/db/migrate';

export type LocalMigrationSnapshot =
  | { status: 'pending'; error?: undefined }
  | { status: 'ready'; error?: undefined }
  | { status: 'error'; error: Error };

let snapshot: LocalMigrationSnapshot = { status: 'pending' };
let started = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function start(): void {
  if (started) {
    return;
  }
  started = true;
  applyMigrations()
    .then(() => {
      snapshot = { status: 'ready' };
      emit();
    })
    .catch((error: unknown) => {
      snapshot = {
        status: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
      };
      emit();
    });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): LocalMigrationSnapshot {
  return snapshot;
}

export function useLocalMigrations(): LocalMigrationSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
