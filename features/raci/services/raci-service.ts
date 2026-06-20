import { prisma } from '@/lib/prisma/client';
import { ok, err, type ServiceResult } from '@/lib/errors/service-error';
import type { SaveRaciInput, RaciCell, RoleStub } from '../schemas/raci.schemas';
import { track } from '@/lib/telemetry/events';

export async function saveRaciMatrix(
  input: SaveRaciInput,
  organizationId: string,
): Promise<ServiceResult<{ id: string }>> {
  try {
    const matrixJson = {
      roles: input.roles ?? [],
      cells: input.cells,
    };

    const matrix = await prisma.raciMatrix.create({
      data: {
        organizationId,
        name: input.name,
        matrixJson: JSON.parse(JSON.stringify(matrixJson)),
      },
    });

    track('raci.saved', { matrixId: matrix.id, name: input.name });
    return ok({ id: matrix.id });
  } catch {
    return err('RACI_SAVE_ERROR', 'Failed to save RACI matrix');
  }
}

export async function getRaciMatrix(
  matrixId: string,
  organizationId: string,
): Promise<
  ServiceResult<{
    id: string;
    name: string;
    roles: RoleStub[];
    cells: RaciCell[];
    createdAt: Date;
  }>
> {
  try {
    const matrix = await prisma.raciMatrix.findFirst({
      where: { id: matrixId, organizationId },
    });

    if (!matrix) {
      return err('RACI_NOT_FOUND', 'RACI matrix not found');
    }

    // Handle both old format (flat cells array) and new format ({ roles, cells })
    const json = matrix.matrixJson as unknown;
    let roles: RoleStub[] = [];
    let cells: RaciCell[];

    if (Array.isArray(json)) {
      cells = json as RaciCell[];
    } else {
      const structured = json as { roles?: RoleStub[]; cells: RaciCell[] };
      roles = structured.roles ?? [];
      cells = structured.cells;
    }

    return ok({
      id: matrix.id,
      name: matrix.name,
      roles,
      cells,
      createdAt: matrix.createdAt,
    });
  } catch {
    return err('RACI_FETCH_ERROR', 'Failed to fetch RACI matrix');
  }
}

export async function listRaciMatrices(organizationId: string) {
  const matrices = await prisma.raciMatrix.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true },
  });

  return matrices;
}

export async function updateRaciMatrix(
  matrixId: string,
  input: Partial<SaveRaciInput>,
  organizationId: string,
): Promise<ServiceResult<{ id: string }>> {
  try {
    const existing = await prisma.raciMatrix.findFirst({
      where: { id: matrixId, organizationId },
    });

    if (!existing) {
      return err('RACI_NOT_FOUND', 'RACI matrix not found');
    }

    await prisma.raciMatrix.update({
      where: { id: matrixId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.cells && {
          matrixJson: JSON.parse(JSON.stringify({ roles: input.roles ?? [], cells: input.cells })),
        }),
      },
    });

    return ok({ id: matrixId });
  } catch {
    return err('RACI_UPDATE_ERROR', 'Failed to update RACI matrix');
  }
}
