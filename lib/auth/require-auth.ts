import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { isDevAuthMode, getDevSession, DEV_USER } from './dev-auth';

async function getClerkId(): Promise<string | null> {
  // SECURITY FIX: isDevAuthMode() (see lib/auth/dev-auth.ts) now requires
  // NODE_ENV !== 'production' so this branch cannot execute in production.
  if (isDevAuthMode()) {
    return getDevSession();
  }
  const { auth } = await import('@clerk/nextjs/server');
  const { userId } = await auth();
  return userId;
}

export async function requireAuth() {
  const clerkId = await getClerkId();
  if (!clerkId) {
    throw new NextResponse('Unauthorized', { status: 401 });
  }
  return clerkId;
}

export async function requireOrg() {
  const clerkId = await requireAuth();

  let user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, organizationId: true },
  });

  // Auto-seed dev user on first request
  // SECURITY FIX: isDevAuthMode() (see lib/auth/dev-auth.ts) is false in production.
  if (!user && isDevAuthMode()) {
    const org = await prisma.organization.create({
      data: { name: 'Admin Organization' },
    });
    user = await prisma.user.create({
      data: {
        clerkId: DEV_USER.clerkId,
        email: DEV_USER.email,
        name: DEV_USER.name,
        organizationId: org.id,
      },
      select: { id: true, organizationId: true },
    });
  }

  if (!user?.organizationId) {
    throw new NextResponse('No organization found', { status: 403 });
  }

  return { userId: user.id, organizationId: user.organizationId };
}
