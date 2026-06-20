/**
 * Next.js instrumentation hook — runs once per process start on the server.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // SECURITY FIX: assert that dev-auth bypass cannot be active in production.
    // Throws immediately with a clear message if NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    // is missing in a production deployment. See lib/auth/dev-auth.ts.
    const { assertDevAuthSafe } = await import('@/lib/auth/dev-auth');
    assertDevAuthSafe();
  }
}
