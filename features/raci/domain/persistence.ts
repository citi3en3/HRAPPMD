import type { RaciCell, RoleStub, SaveRaciInput } from '../schemas/raci.schemas';

export interface DetectAndMigrateResult {
  readonly isMigrated: boolean;
  readonly format: 'v0-flat-array' | 'v1-structured';
  readonly data: { name?: string; roles: RoleStub[]; cells: RaciCell[] };
}

export interface ReferentialIntegrityIssue {
  readonly type: 'orphaned_cell' | 'duplicate_cell';
  readonly roleId: string;
  readonly activity: string;
}

export function detectAndMigrate(input: unknown): DetectAndMigrateResult {
  const payload = input as { name?: string; roles?: RoleStub[]; cells?: RaciCell[] } | undefined;
  const cells = Array.isArray(payload?.cells) ? payload.cells : [];

  if (Array.isArray(payload?.roles)) {
    return {
      isMigrated: false,
      format: 'v1-structured',
      data: {
        name: payload?.name,
        roles: payload.roles,
        cells,
      },
    };
  }

  const roleIds = Array.from(new Set(cells.map((cell) => cell.roleId)));
  const roles = roleIds.map((id) => ({ id, title: '' }));

  return {
    isMigrated: true,
    format: 'v0-flat-array',
    data: {
      name: payload?.name,
      roles,
      cells,
    },
  };
}

export function validateReferentialIntegrity(input: SaveRaciInput): ReferentialIntegrityIssue[] {
  const issues: ReferentialIntegrityIssue[] = [];
  const roleIds = new Set((input.roles ?? []).map((role) => role.id));
  const seen = new Set<string>();

  for (const cell of input.cells) {
    if (!roleIds.has(cell.roleId)) {
      issues.push({ type: 'orphaned_cell', roleId: cell.roleId, activity: cell.activity });
      continue;
    }

    const duplicateKey = `${cell.roleId}:${cell.activity}`;
    if (seen.has(duplicateKey)) {
      issues.push({ type: 'duplicate_cell', roleId: cell.roleId, activity: cell.activity });
      continue;
    }
    seen.add(duplicateKey);
  }

  return issues;
}

export function applyPartialUpdate(
  current: SaveRaciInput,
  update: Partial<Pick<SaveRaciInput, 'name' | 'roles' | 'cells'>>,
): SaveRaciInput {
  return {
    name: update.name ?? current.name,
    roles: update.roles ?? current.roles ?? [],
    cells: update.cells ?? current.cells,
  };
}

export function checkOrgAccess(matrixOrgId: string, requestOrgId: string): boolean {
  return matrixOrgId === requestOrgId;
}
