import { describe, expect, it } from 'vitest';

import {
  addField,
  createRoleId,
  deserializeRole,
  removeField,
  reorderRoles,
  serializeRole,
  updateFieldValue,
  validateRole,
  type CustomFieldDefinition,
  type RoleDefinition,
} from './role-model';

const baseRole: RoleDefinition = {
  id: createRoleId('role-1'),
  label: { ro: 'Responsabil', en: 'Responsible' },
  description: { ro: 'Descriere', en: 'Description' },
  colorHex: '#2563eb',
  orderIndex: 0,
  fields: [],
  metadata: { source: 'seed' },
};

const definitions: ReadonlyArray<CustomFieldDefinition> = [
  {
    key: 'team',
    label: { ro: 'Echipa', en: 'Team' },
    type: { kind: 'text', maxLength: 24 },
    required: true,
    defaultValue: undefined,
  },
  {
    key: 'budget',
    label: { ro: 'Buget', en: 'Budget' },
    type: { kind: 'number', min: 0, max: 1000 },
    required: false,
    defaultValue: 0,
  },
];

describe('validateRole', () => {
  it('reports required and type-specific errors', () => {
    const result = validateRole(
      {
        ...baseRole,
        fields: [{ key: 'team', value: 'Very long team name that exceeds the limit' }],
      },
      definitions,
    );

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.team).toContain('at most');
  });

  it('passes when required fields and constraints are satisfied', () => {
    const result = validateRole(
      {
        ...baseRole,
        fields: [
          { key: 'team', value: 'Ops' },
          { key: 'budget', value: 250 },
        ],
      },
      definitions,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe('immutable helpers', () => {
  it('adds and updates field values without mutating the original role', () => {
    const role = addField(baseRole, { key: 'team', value: 'Ops' });
    const updated = updateFieldValue(role, 'team', 'Finance');

    expect(baseRole.fields).toHaveLength(0);
    expect(role.fields).toEqual([{ key: 'team', value: 'Ops' }]);
    expect(updated.fields).toEqual([{ key: 'team', value: 'Finance' }]);
  });

  it('removes a field by key and reorders roles immutably', () => {
    const first = { ...baseRole, id: createRoleId('role-1') };
    const second = { ...baseRole, id: createRoleId('role-2') };
    const third = { ...baseRole, id: createRoleId('role-3') };

    const withField = addField(first, { key: 'team', value: 'Ops' });
    const removed = removeField(withField, 'team');
    const reordered = reorderRoles([first, second, third], 0, 2);

    expect(removed.fields).toEqual([]);
    expect(reordered.map((role) => role.id)).toEqual([
      createRoleId('role-2'),
      createRoleId('role-3'),
      createRoleId('role-1'),
    ]);
    expect([first, second, third]).toHaveLength(3);
  });
});

describe('serialization', () => {
  it('round-trips and migrates serialized role payloads', () => {
    const serialized = serializeRole(baseRole);
    const restored = deserializeRole(serialized);
    expect(restored).toEqual(baseRole);

    const legacy = { schemaVersion: 0, role: baseRole };
    const migrated = deserializeRole(legacy);
    expect(migrated).toEqual(baseRole);
  });
});
