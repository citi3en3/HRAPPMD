import { cookies } from 'next/headers';

const DEV_AUTH_COOKIE = 'hri-dev-auth';
const DEV_USER = {
  clerkId: 'dev_admin',
  email: 'admin@hri.local',
  name: 'Admin',
};

/**
 * True ONLY when both conditions hold:
 *   1. NODE_ENV is not 'production'
 *   2. NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is absent
 * Either condition alone is NOT sufficient to activate dev-auth mode.
 * See: SECURITY FIX below.
 */
export function isDevAuthMode(): boolean {
  // SECURITY FIX: require non-production environment in addition to absent Clerk key.
  // Previously only checked for absent Clerk key, which would silently activate
  // the bypass in production if the env var was accidentally unset.
  return process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

/**
 * Call at server startup (e.g. in instrumentation.ts or the top of a
 * long-lived module) to ensure dev-auth never reaches production silently.
 * SECURITY FIX: throws immediately if both Clerk key is absent AND we are
 * running in production, preventing a misconfigured deploy from falling back
 * to the dev bypass.
 */
export function assertDevAuthSafe(): void {
  // SECURITY FIX: hard-fail if production is missing the Clerk key so the
  // process never starts with the dev bypass active.
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    throw new Error(
      '[HRI] SECURITY: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set in production. ' +
        'The dev-auth bypass must never run in production. ' +
        'Set the Clerk publishable key before deploying.',
    );
  }
}

/** Read the dev session cookie. Returns the dev clerkId or null. */
export async function getDevSession(): Promise<string | null> {
  if (!isDevAuthMode()) return null;
  const store = await cookies();
  const value = store.get(DEV_AUTH_COOKIE)?.value;
  return value === 'true' ? DEV_USER.clerkId : null;
}

/** Validate dev credentials. Only works in dev-auth mode. */
export function validateDevCredentials(username: string, password: string): boolean {
  if (!isDevAuthMode()) return false;
  return username === 'admin' && password === 'admin';
}

export { DEV_AUTH_COOKIE, DEV_USER };
