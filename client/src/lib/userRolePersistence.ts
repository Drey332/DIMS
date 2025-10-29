import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { UserRole } from '../hooks/useRole';

type NonNullUserRole = Exclude<UserRole, null>;

export interface RoleAttemptRecord {
  userId: string;
  requestedRole: NonNullUserRole;
  success: boolean;
  grantedAt?: string;
}

/**
 * Persist the outcome of a role validation attempt for the currently
 * authenticated user. Successful attempts capture the hierarchy state so the
 * rest of the app (team presence, dashboards, etc.) can react in real-time.
 */
export async function persistRoleAttempt({
  userId,
  requestedRole,
  success,
  grantedAt,
}: RoleAttemptRecord) {
  if (!userId) return;

  const ref = doc(db, 'users', userId);
  const attemptTimestamp = grantedAt ?? new Date().toISOString();

  const payload: Record<string, unknown> = {
    lastRoleAttempt: attemptTimestamp,
    lastRoleAttemptRole: requestedRole,
    lastRoleAttemptSuccess: success,
    lastRoleAttemptRecordedAt: serverTimestamp(),
  };

  if (success) {
    payload.sessionRole = requestedRole;
    payload.roleGrantedAt = grantedAt ?? attemptTimestamp;
  }

  await setDoc(ref, payload, { merge: true });
}
