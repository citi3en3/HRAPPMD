import type { CustomFieldDefinition, LocalizedText, RoleDefinition, RoleId } from './role-model';
import { createRoleId } from './role-model';

/**
 * A branded sector identifier.
 */
export type SectorId = string & { readonly __brand: 'SectorId' };

/**
 * Supported regions for a sector template.
 */
export type Region = 'MD' | 'RO';

/**
 * Supported UI languages for a sector template.
 */
export type Lang = 'ro' | 'en';

/**
 * Theme values used to visually brand a business or sector.
 */
export interface BrandTheme {
  readonly primaryHex: string;
  readonly accentHex: string;
  readonly logoUrl?: string;
}

/**
 * A task template captures the reusable task blueprint for a sector.
 */
export type RaciCode = 'R' | 'A' | 'C' | 'I' | null;

export interface TaskTemplate {
  readonly id: string;
  readonly name: LocalizedText;
  readonly defaultRaciByRole: Readonly<Record<string, RaciCode>>;
}

/**
 * A sector template is the reusable blueprint from which live RACI matrices are built.
 */
export interface SectorTemplate {
  readonly id: SectorId;
  readonly name: LocalizedText;
  readonly industrySubType: string;
  readonly region: Region;
  readonly defaultLang: Lang;
  readonly theme: BrandTheme;
  readonly roleTemplates: ReadonlyArray<RoleDefinition>;
  readonly taskTemplates: ReadonlyArray<TaskTemplate>;
  readonly businessFieldDefinitions: ReadonlyArray<CustomFieldDefinition>;
  readonly schemaVersion: number;
}

/**
 * Live RACI matrix instance derived from a sector template.
 */
export interface RaciMatrix {
  readonly id: string;
  readonly sectorId: SectorId;
  readonly locale: Lang;
  readonly theme: BrandTheme;
  readonly roles: ReadonlyArray<RoleDefinition>;
  readonly tasks: ReadonlyArray<TaskTemplate>;
  readonly businessFields: ReadonlyArray<CustomFieldDefinition>;
}

/**
 * A typed error used when a sector id is registered more than once.
 */
export class DuplicateSectorError extends Error {
  public readonly code = 'DUPLICATE_SECTOR';

  constructor(public readonly sectorId: SectorId) {
    super(`Sector already registered: ${sectorId}`);
    this.name = 'DuplicateSectorError';
  }
}

/**
 * Registry for sector templates with runtime collision detection.
 */
export interface SectorRegistry {
  register(template: SectorTemplate): SectorTemplate;
  get(id: SectorId): SectorTemplate | undefined;
  list(): ReadonlyArray<SectorTemplate>;
  clone(sourceId: SectorId, newId: SectorId): SectorTemplate;
}

/**
 * Creates a branded sector id.
 */
export function createSectorId(value: string): SectorId {
  return value as SectorId;
}

/**
 * Creates a sector registry that rejects duplicate ids at runtime.
 */
export function createSectorRegistry(
  initialTemplates: ReadonlyArray<SectorTemplate> = [],
): SectorRegistry {
  const templates = new Map<SectorId, SectorTemplate>();

  for (const template of initialTemplates) {
    registerInternal(template);
  }

  function registerInternal(template: SectorTemplate): SectorTemplate {
    if (templates.has(template.id)) {
      throw new DuplicateSectorError(template.id);
    }

    templates.set(template.id, template);
    return template;
  }

  return {
    register(template: SectorTemplate): SectorTemplate {
      return registerInternal(template);
    },
    get(id: SectorId): SectorTemplate | undefined {
      return templates.get(id);
    },
    list(): ReadonlyArray<SectorTemplate> {
      return Array.from(templates.values());
    },
    clone(sourceId: SectorId, newId: SectorId): SectorTemplate {
      const source = templates.get(sourceId);
      if (!source) {
        throw new Error(`Sector not found: ${sourceId}`);
      }

      const clone: SectorTemplate = {
        ...source,
        id: newId,
        name: { ...source.name },
        theme: { ...source.theme },
        roleTemplates: source.roleTemplates.map((role) => ({
          ...role,
          id: role.id,
          label: { ...role.label },
          description: { ...role.description },
          fields: role.fields.map((field) => ({ ...field })),
          metadata: { ...role.metadata },
        })),
        taskTemplates: source.taskTemplates.map((task) => ({
          ...task,
          name: { ...task.name },
          defaultRaciByRole: { ...task.defaultRaciByRole },
        })),
        businessFieldDefinitions: source.businessFieldDefinitions.map((field) => ({ ...field })),
      };

      registerInternal(clone);
      return clone;
    },
  };
}

/**
 * Builds a live RACI matrix from a sector template and optional overrides.
 * Overrides always win over template defaults.
 */
export function buildRaciFromSector(
  template: SectorTemplate,
  overrides?: Partial<{
    readonly locale: Lang;
    readonly theme: BrandTheme;
    readonly roles: ReadonlyArray<RoleDefinition>;
    readonly tasks: ReadonlyArray<TaskTemplate>;
    readonly businessFields: ReadonlyArray<CustomFieldDefinition>;
  }>,
): RaciMatrix {
  return {
    id: `matrix-${template.id}`,
    sectorId: template.id,
    locale: overrides?.locale ?? template.defaultLang,
    theme: overrides?.theme ?? template.theme,
    roles: overrides?.roles ?? template.roleTemplates,
    tasks: overrides?.tasks ?? template.taskTemplates,
    businessFields: overrides?.businessFields ?? template.businessFieldDefinitions,
  };
}

/**
 * Serializes a sector template into JSON-friendly data.
 */
export function exportSectorTemplate(template: SectorTemplate): string {
  return JSON.stringify(template, null, 2);
}

/**
 * Deserializes a sector template from JSON.
 */
export function importSectorTemplate(input: string): SectorTemplate {
  return JSON.parse(input) as SectorTemplate;
}

/**
 * Built-in sectors are seed data; a sixth sector can be added by the user without code changes.
 */
export const builtInSectorTemplates: ReadonlyArray<SectorTemplate> = [
  {
    id: createSectorId('manufacturing'),
    name: { ro: 'Manufacturare', en: 'Manufacturing' },
    industrySubType: 'production',
    region: 'RO',
    defaultLang: 'ro',
    theme: { primaryHex: '#2563eb', accentHex: '#0f172a' },
    roleTemplates: [
      {
        id: createRoleId('owner'),
        label: { ro: 'Responsabil', en: 'Responsible' },
        description: { ro: 'Execută activitatea', en: 'Executes the task' },
        colorHex: '#3b82f6',
        orderIndex: 0,
        fields: [],
        metadata: {},
      },
    ],
    taskTemplates: [
      {
        id: 'planning',
        name: { ro: 'Planificare', en: 'Planning' },
        defaultRaciByRole: { owner: 'R' },
      },
    ],
    businessFieldDefinitions: [
      {
        key: 'employeeCount',
        label: { ro: 'Număr angajați', en: 'Employee count' },
        type: { kind: 'number', min: 1 },
        required: true,
        defaultValue: 1,
      },
    ],
    schemaVersion: 1,
  },
  {
    id: createSectorId('healthcare'),
    name: { ro: 'Sănătate', en: 'Healthcare' },
    industrySubType: 'medical-services',
    region: 'RO',
    defaultLang: 'en',
    theme: { primaryHex: '#14b8a6', accentHex: '#0f766e' },
    roleTemplates: [
      {
        id: createRoleId('lead'),
        label: { ro: 'Coordonator', en: 'Lead' },
        description: { ro: 'Coordonează activitatea', en: 'Coordinates the work' },
        colorHex: '#14b8a6',
        orderIndex: 0,
        fields: [],
        metadata: {},
      },
    ],
    taskTemplates: [
      {
        id: 'compliance',
        name: { ro: 'Conformitate', en: 'Compliance' },
        defaultRaciByRole: { lead: 'A' },
      },
    ],
    businessFieldDefinitions: [
      {
        key: 'fiscalCode',
        label: { ro: 'Cod fiscal', en: 'Fiscal code' },
        type: { kind: 'text', maxLength: 20 },
        required: true,
        defaultValue: undefined,
      },
    ],
    schemaVersion: 1,
  },
  {
    id: createSectorId('retail'),
    name: { ro: 'Retail', en: 'Retail' },
    industrySubType: 'commerce',
    region: 'MD',
    defaultLang: 'ro',
    theme: { primaryHex: '#f59e0b', accentHex: '#92400e' },
    roleTemplates: [
      {
        id: createRoleId('manager'),
        label: { ro: 'Manager', en: 'Manager' },
        description: { ro: 'Supervizează operațiunile', en: 'Supervises operations' },
        colorHex: '#f59e0b',
        orderIndex: 0,
        fields: [],
        metadata: {},
      },
    ],
    taskTemplates: [
      {
        id: 'stock',
        name: { ro: 'Stoc', en: 'Stock' },
        defaultRaciByRole: { manager: 'C' },
      },
    ],
    businessFieldDefinitions: [],
    schemaVersion: 1,
  },
  {
    id: createSectorId('it-services'),
    name: { ro: 'Servicii IT', en: 'IT Services' },
    industrySubType: 'software',
    region: 'RO',
    defaultLang: 'en',
    theme: { primaryHex: '#7c3aed', accentHex: '#4c1d95' },
    roleTemplates: [
      {
        id: createRoleId('owner'),
        label: { ro: 'Responsabil', en: 'Owner' },
        description: { ro: 'Deține responsabilitatea', en: 'Owns the responsibility' },
        colorHex: '#7c3aed',
        orderIndex: 0,
        fields: [],
        metadata: {},
      },
    ],
    taskTemplates: [
      {
        id: 'release',
        name: { ro: 'Lansare', en: 'Release' },
        defaultRaciByRole: { owner: 'A' },
      },
    ],
    businessFieldDefinitions: [],
    schemaVersion: 1,
  },
  {
    id: createSectorId('construction'),
    name: { ro: 'Construcții', en: 'Construction' },
    industrySubType: 'engineering',
    region: 'MD',
    defaultLang: 'ro',
    theme: { primaryHex: '#ef4444', accentHex: '#991b1b' },
    roleTemplates: [
      {
        id: createRoleId('siteLead'),
        label: { ro: 'Șef de șantier', en: 'Site lead' },
        description: { ro: 'Coordonează activitatea de șantier', en: 'Coordinates site work' },
        colorHex: '#ef4444',
        orderIndex: 0,
        fields: [],
        metadata: {},
      },
    ],
    taskTemplates: [
      {
        id: 'siteOps',
        name: { ro: 'Operațiuni de șantier', en: 'Site operations' },
        defaultRaciByRole: { siteLead: 'R' },
      },
    ],
    businessFieldDefinitions: [],
    schemaVersion: 1,
  },
];
