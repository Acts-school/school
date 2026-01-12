import { getOfflineCache, setOfflineCache } from "@/lib/offlineCache";

// Shared types mirroring /api/sync/bootstrap and /api/sync/changes payloads

export interface SyncClass {
  id: number;
  name: string;
  gradeId: number;
  schoolId: number | null;
}

export interface SyncStudent {
  id: string;
  name: string;
  surname: string;
  classId: number;
  gradeId: number;
}

export interface SyncLesson {
  id: number;
  name: string;
  day: string;
  startTime: string;
  endTime: string;
  subjectId: number;
  classId: number;
  teacherId: string;
}

export interface SyncSubject {
  id: number;
  name: string;
}

export interface SyncTeacher {
  id: string;
  name: string;
  surname: string;
}

export interface BootstrapData {
  classes: SyncClass[];
  students: SyncStudent[];
  lessons: SyncLesson[];
  subjects: SyncSubject[];
  teachers: SyncTeacher[];
}

export interface BootstrapPayload {
  serverTime: string;
  data: BootstrapData;
}

export interface SyncChangesData extends BootstrapData {}

export interface SyncChangesPayload {
  serverTime: string;
  since: string | null;
  data: SyncChangesData;
}

const BOOTSTRAP_CACHE_KEY = "sync:bootstrap:v1";
const CHANGES_CACHE_KEY_PREFIX = "sync:changes:v1:";

export const getLastSyncTimestamp = async (): Promise<string | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  const last = await getOfflineCache<string | null>("sync:lastSync:v1");
  return last ?? null;
};

const setLastSyncTimestamp = async (isoTimestamp: string): Promise<void> => {
  if (typeof window === "undefined") {
    return;
  }

  await setOfflineCache<string | null>("sync:lastSync:v1", isoTimestamp);
};

export const runBootstrapSync = async (): Promise<BootstrapPayload | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  const response = await fetch("/api/sync/bootstrap");

  if (!response.ok) {
    throw new Error("Failed to run bootstrap sync");
  }

  const payload: BootstrapPayload = await response.json();

  await setOfflineCache<BootstrapPayload>(BOOTSTRAP_CACHE_KEY, payload);
  await setLastSyncTimestamp(payload.serverTime);

  return payload;
};

export const runChangesSync = async (
  sinceOverride?: string | null,
): Promise<SyncChangesPayload | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  const since = sinceOverride ?? (await getLastSyncTimestamp());

  const searchParams = new URLSearchParams();

  if (since) {
    searchParams.set("since", since);
  }

  const url = `/api/sync/changes${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to run changes sync");
  }

  const payload: SyncChangesPayload = await response.json();

  const changesKey = `${CHANGES_CACHE_KEY_PREFIX}${payload.since ?? "initial"}`;
  await setOfflineCache<SyncChangesPayload>(changesKey, payload);
  await setLastSyncTimestamp(payload.serverTime);

  return payload;
};

export const runBootstrapThenChangesSync = async (): Promise<{
  bootstrap: BootstrapPayload | null;
  changes: SyncChangesPayload | null;
}> => {
  const bootstrap = await runBootstrapSync();
  const changes = await runChangesSync();

  return { bootstrap, changes };
};
