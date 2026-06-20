import { describe, expect, it } from 'vitest';

import { detectAndMigrate, applyPartialUpdate } from './persistence';
import {
  detectValidationIssues,
  generateRepairSuggestions,
  applyRepairSuggestions,
} from './ai-repair';
import { serializeRaciMatrix, deserializeRaciMatrix } from '../services/export-import-service';
import type { SaveRaciInput } from '../schemas/raci.schemas';

describe('RACI customization helpers', () => {
  it('migrates legacy flat-cell payloads into structured roles and cells', () => {
    const legacy = {
      name: 'Legacy Matrix',
      cells: [
        { roleId: 'role-1', activity: 'Planning', value: 'R' },
        { roleId: 'role-2', activity: 'Planning', value: 'A' },
      ],
    };

    const result = detectAndMigrate(legacy);
    expect(result.isMigrated).toBe(true);
    expect(result.format).toBe('v0-flat-array');
    expect(result.data.roles).toHaveLength(2);
    expect(result.data.cells).toHaveLength(2);
  });

  it('detects orphaned cells and invalid RACI values', () => {
    const matrix: SaveRaciInput = {
      name: 'Broken Matrix',
      roles: [{ id: 'role-1', title: 'Manager' }],
      cells: [
        { roleId: 'role-1', activity: 'Planning', value: 'R' },
        { roleId: 'role-999', activity: 'Execution', value: 'X' as never },
      ],
    };

    const issues = detectValidationIssues(matrix);
    expect(issues.some((issue) => issue.type === 'orphaned_cell')).toBe(true);
    expect(issues.some((issue) => issue.type === 'invalid_raci_value')).toBe(true);
  });

  it('applies partial updates without mutating the original matrix', () => {
    const original: SaveRaciInput = {
      name: 'Original',
      roles: [{ id: 'role-1', title: 'Manager' }],
      cells: [{ roleId: 'role-1', activity: 'Planning', value: 'R' }],
    };

    const updated = applyPartialUpdate(original, { name: 'Updated' });

    expect(updated.name).toBe('Updated');
    expect(original.name).toBe('Original');
    expect(updated.roles).toEqual(original.roles);
  });

  it('serializes and deserializes matrices with unicode content', () => {
    const matrix: SaveRaciInput = {
      name: 'Matrice ÎN Diacritice',
      roles: [{ id: 'role-1', title: 'Manager şi Șef' }],
      cells: [{ roleId: 'role-1', activity: 'Planificare & Execuție', value: 'R' }],
    };

    const serialized = serializeRaciMatrix(matrix);
    const deserialized = deserializeRaciMatrix(serialized);

    expect(deserialized.name).toBe(matrix.name);
    expect(deserialized.roles?.[0]?.title).toBe(matrix.roles?.[0]?.title);
    expect(deserialized.cells[0].activity).toBe(matrix.cells[0].activity);
  });
});
