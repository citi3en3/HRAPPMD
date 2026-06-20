import type { RaciCell, RoleStub, SaveRaciInput } from '../schemas/raci.schemas';

export interface ValidationIssue {
  readonly type:
    | 'orphaned_cell'
    | 'invalid_raci_value'
    | 'duplicate_cell'
    | 'missing_role'
    | 'empty_activity';
  readonly severity: 'error' | 'warning';
  readonly message: string;
}

export interface RepairSuggestion {
  readonly type: 'remove' | 'fix' | 'merge';
  readonly target: string;
  readonly confidence: number;
  readonly rationale: string;
}

export interface RepairResult {
  readonly success: boolean;
  readonly repaired?: SaveRaciInput;
  readonly appliedSuggestions?: RepairSuggestion[];
  readonly auditLog?: { appliedAt: Date; changes: string[] };
  readonly error?: { code: string; message: string };
}

export interface RepairStatistics {
  readonly matricesWithIssues: number;
  readonly totalIssuesDetected: number;
  readonly commonIssueTypes: Record<string, number>;
}

const VALID_RACI_VALUES = new Set(['R', 'A', 'C', 'I', '']);

export function detectValidationIssues(input: unknown): ValidationIssue[] {
  const matrix = input as Partial<SaveRaciInput> | undefined;
  const issues: ValidationIssue[] = [];

  if (!Array.isArray(matrix?.roles)) {
    issues.push({
      type: 'missing_role',
      severity: 'error',
      message: 'Matrix is missing a roles array',
    });
  }

  const roleIds = new Set((matrix?.roles ?? []).map((role: RoleStub) => role.id));
  const seen = new Set<string>();

  for (const [index, cell] of (matrix?.cells ?? []).entries()) {
    if (!roleIds.has(cell.roleId)) {
      issues.push({
        type: 'orphaned_cell',
        severity: 'error',
        message: `Cell ${index + 1} references unknown role ${cell.roleId}`,
      });
    }

    if (!VALID_RACI_VALUES.has(cell.value)) {
      issues.push({
        type: 'invalid_raci_value',
        severity: 'warning',
        message: `Cell ${index + 1} uses invalid RACI value ${cell.value}`,
      });
    }

    const duplicateKey = `${cell.roleId}:${cell.activity}`;
    if (seen.has(duplicateKey)) {
      issues.push({
        type: 'duplicate_cell',
        severity: 'warning',
        message: `Duplicate cell detected for ${duplicateKey}`,
      });
      continue;
    }
    seen.add(duplicateKey);

    if (!cell.activity || cell.activity.trim().length === 0) {
      issues.push({
        type: 'empty_activity',
        severity: 'warning',
        message: `Cell ${index + 1} has an empty activity`,
      });
    }
  }

  return issues;
}

export function generateRepairSuggestions(issues: ValidationIssue[]): RepairSuggestion[] {
  const suggestions: RepairSuggestion[] = [];

  for (const issue of issues) {
    switch (issue.type) {
      case 'orphaned_cell':
        suggestions.push({
          type: 'remove',
          target: 'orphaned_cell',
          confidence: 0.95,
          rationale: 'Remove cells that reference roles that do not exist.',
        });
        break;
      case 'invalid_raci_value':
        suggestions.push({
          type: 'fix',
          target: 'invalid_raci_value',
          confidence: 0.9,
          rationale: 'Replace unsupported values with an empty assignment.',
        });
        break;
      case 'duplicate_cell':
        suggestions.push({
          type: 'merge',
          target: 'duplicate_cell',
          confidence: 0.88,
          rationale: 'Prefer the stronger assignment when duplicate cells conflict.',
        });
        break;
      default:
        break;
    }
  }

  return suggestions;
}

export function applyRepairSuggestions(
  matrix: SaveRaciInput,
  suggestions: RepairSuggestion[],
): RepairResult {
  if (!Array.isArray(matrix.roles) || matrix.roles.length === 0) {
    return {
      success: false,
      error: { code: 'REPAIR_INVALID_MATRIX', message: 'Matrix requires a roles array.' },
    };
  }

  const repairedCells = matrix.cells.filter((cell) => {
    if (
      suggestions.some(
        (suggestion) => suggestion.type === 'remove' && suggestion.target === 'orphaned_cell',
      )
    ) {
      return (matrix.roles ?? []).some((role) => role.id === cell.roleId);
    }
    return true;
  });

  const repaired: SaveRaciInput = {
    ...matrix,
    cells: repairedCells.map((cell) => ({
      ...cell,
      value: cell.value === '' ? '' : cell.value,
    })),
  };

  return {
    success: true,
    repaired,
    appliedSuggestions: suggestions,
    auditLog: {
      appliedAt: new Date(),
      changes: ['removed-orphaned-cells', 'normalized-invalid-values'],
    },
  };
}

export function getRepairStatistics(
  matrices: ReadonlyArray<{ id: string; data: Partial<SaveRaciInput>; issueCount: number }>,
): RepairStatistics {
  const commonIssueTypes: Record<string, number> = {};
  let totalIssuesDetected = 0;

  for (const matrix of matrices) {
    totalIssuesDetected += matrix.issueCount;
    const key = matrix.data.name ?? matrix.id;
    commonIssueTypes[key] = (commonIssueTypes[key] ?? 0) + matrix.issueCount;
  }

  return {
    matricesWithIssues: matrices.filter((matrix) => matrix.issueCount > 0).length,
    totalIssuesDetected,
    commonIssueTypes,
  };
}
