import { describe, expect, it } from 'vitest';

import {
  DuplicateSectorError,
  buildRaciFromSector,
  createSectorId,
  createSectorRegistry,
  exportSectorTemplate,
  importSectorTemplate,
  builtInSectorTemplates,
} from './sector-engine';

describe('sector registry', () => {
  it('rejects duplicate sector ids at runtime', () => {
    const registry = createSectorRegistry();
    const template = builtInSectorTemplates[0];

    registry.register(template);

    expect(() => registry.register(template)).toThrow(DuplicateSectorError);
  });

  it('clones a sector template into a new id without mutating the source', () => {
    const registry = createSectorRegistry([builtInSectorTemplates[0]]);
    const clone = registry.clone(
      builtInSectorTemplates[0].id,
      createSectorId('manufacturing-clone'),
    );

    expect(clone.id).toBe(createSectorId('manufacturing-clone'));
    expect(registry.get(builtInSectorTemplates[0].id)).toBeDefined();
    expect(registry.get(createSectorId('manufacturing-clone'))).toBe(clone);
  });
});

describe('sector matrix builder', () => {
  it('uses template defaults and lets overrides win', () => {
    const matrix = buildRaciFromSector(builtInSectorTemplates[0], {
      locale: 'en',
      theme: { primaryHex: '#111111', accentHex: '#222222' },
    });

    expect(matrix.locale).toBe('en');
    expect(matrix.theme.primaryHex).toBe('#111111');
    expect(matrix.roles).toEqual(builtInSectorTemplates[0].roleTemplates);
  });

  it('round-trips a sector template through json import and export', () => {
    const serialized = exportSectorTemplate(builtInSectorTemplates[0]);
    const imported = importSectorTemplate(serialized);

    expect(imported).toEqual(builtInSectorTemplates[0]);
  });
});
