import { browserLocalPersistence, type Persistence } from 'firebase/auth';

export function createAuthPersistence(): Persistence {
  return browserLocalPersistence;
}
