import { prisma } from '@/lib/prisma/client';
import { ok, err, type ServiceResult } from '@/lib/errors/service-error';
import type { SaveRaciInput, RaciCell, RoleStub } from '../schemas/raci.schemas';
import { track } from '@/lib/telemetry/events';
import {
  detectValidationIssues,
  generateRepairSuggestions as suggestRepairs,
} from '../domain/ai-repair';
import type { RepairSuggestion } from '../domain/ai-repair';
import {
  checkOrgAccess,
  detectAndMigrate,
  validateReferentialIntegrity,
  type ReferentialIntegrityIssue,
} from '../domain/persistence';

/**
 * Persists a RACI matrix and returns repair suggestions when validation issues are detected.
 */
export async function saveRaciMatrix(
  input: SaveRaciInput,
  organizationId: string,
): Promise<ServiceResult<{ id: string; repairSuggestions?: RepairSuggestion[] }>> {
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
    const issues = detectValidationIssues(matrixJson);
    if (issues.length > 0) {
      return ok({ id: matrix.id, repairSuggestions: suggestRepairs(issues) });
    }

    return ok({ id: matrix.id });
  } catch {
    return err('RACI_SAVE_ERROR', 'Failed to save RACI matrix');
  }
}

/**
 * Loads a RACI matrix, migrates legacy persisted formats, and reports integrity warnings.
 */
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
    warnings?: ReferentialIntegrityIssue[];
  }>
> {
  try {
    const matrix = await prisma.raciMatrix.findUnique({
      where: { id: matrixId },
    });

    if (!matrix || !checkOrgAccess(matrix.organizationId, organizationId)) {
      return err('RACI_NOT_FOUND', 'RACI matrix not found');
    }

    const json = matrix.matrixJson as unknown;
    const rawRecord = Array.isArray(json)
      ? { name: matrix.name, cells: json }
      : { name: matrix.name, ...(json as object) };
    let migrated: ReturnType<typeof detectAndMigrate>;

    try {
      migrated = detectAndMigrate(rawRecord);
    } catch {
      return err('RACI_MIGRATION_ERROR', 'Failed to migrate RACI matrix');
    }

    const warnings = validateReferentialIntegrity({
      name: migrated.data.name ?? matrix.name,
      roles: migrated.data.roles,
      cells: migrated.data.cells,
    });

    return ok({
      id: matrix.id,
      name: migrated.data.name ?? matrix.name,
      roles: migrated.data.roles,
      cells: migrated.data.cells,
      createdAt: matrix.createdAt,
      ...(warnings.length > 0 && { warnings }),
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

/**
 * Updates a RACI matrix after verifying organization access through the domain access guard.
 */
export async function updateRaciMatrix(
  matrixId: string,
  input: Partial<SaveRaciInput>,
  organizationId: string,
): Promise<ServiceResult<{ id: string }>> {
  try {
    const existing = await prisma.raciMatrix.findUnique({
      where: { id: matrixId },
    });

    if (!existing || !checkOrgAccess(existing.organizationId, organizationId)) {
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
