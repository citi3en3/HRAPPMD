import type { RaciCell, RoleStub, SaveRaciInput } from '../schemas/raci.schemas';

export interface ImportValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
}

export function serializeRaciMatrix(
  matrix: SaveRaciInput & { metadata?: Record<string, unknown> },
): string {
  return JSON.stringify(matrix);
}

export function deserializeRaciMatrix(
  serialized: string,
): SaveRaciInput & { metadata?: Record<string, unknown> } {
  const parsed = JSON.parse(serialized) as SaveRaciInput & { metadata?: Record<string, unknown> };
  return parsed;
}

export function validateImportData(data: unknown): ImportValidationResult {
  const matrix = data as Partial<SaveRaciInput> | undefined;
  const errors: string[] = [];

  if (!matrix?.name || typeof matrix.name !== 'string') {
    errors.push('Matrix name is required');
  }

  if (!Array.isArray(matrix?.roles) || matrix.roles.length === 0) {
    errors.push('At least one role is required');
  }

  if (!Array.isArray(matrix?.cells) || matrix.cells.length === 0) {
    errors.push('At least one cell is required');
  }

  const roleIds = new Set((matrix?.roles ?? []).map((role: RoleStub) => role.id));
  for (const cell of matrix?.cells ?? []) {
    if (!roleIds.has(cell.roleId)) {
      errors.push(`Cell references missing role ${cell.roleId}`);
    }
    if (!['R', 'A', 'C', 'I', ''].includes(cell.value)) {
      errors.push(`Cell has invalid RACI value ${cell.value}`);
    }
  }

  return { isValid: errors.length === 0, errors };
}
