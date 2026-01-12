import { getOfflineCache, setOfflineCache } from "@/lib/offlineCache";
import type {
  BootstrapPayload,
  SyncClass,
  SyncLesson,
  SyncStudent,
  SyncSubject,
  SyncTeacher,
} from "@/lib/offlineSyncClient";

const BOOTSTRAP_CACHE_KEY = "sync:bootstrap:v1";

const STUDENTS_ENTITY_KEY = "sync:entity:students:v1";
const TEACHERS_ENTITY_KEY = "sync:entity:teachers:v1";
const CLASSES_ENTITY_KEY = "sync:entity:classes:v1";
const SUBJECTS_ENTITY_KEY = "sync:entity:subjects:v1";
const LESSONS_ENTITY_KEY = "sync:entity:lessons:v1";

export interface HydratedEntities {
  classes: SyncClass[];
  students: SyncStudent[];
  lessons: SyncLesson[];
  subjects: SyncSubject[];
  teachers: SyncTeacher[];
}

export const hydrateFromBootstrapSnapshot = async (): Promise<HydratedEntities | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  const payload = await getOfflineCache<BootstrapPayload>(BOOTSTRAP_CACHE_KEY);

  if (!payload) {
    return null;
  }

  const { classes, students, lessons, subjects, teachers } = payload.data;

  await Promise.all([
    setOfflineCache<SyncStudent[]>(STUDENTS_ENTITY_KEY, students),
    setOfflineCache<SyncTeacher[]>(TEACHERS_ENTITY_KEY, teachers),
    setOfflineCache<SyncClass[]>(CLASSES_ENTITY_KEY, classes),
    setOfflineCache<SyncSubject[]>(SUBJECTS_ENTITY_KEY, subjects),
    setOfflineCache<SyncLesson[]>(LESSONS_ENTITY_KEY, lessons),
  ]);

  return {
    classes,
    students,
    lessons,
    subjects,
    teachers,
  };
};
