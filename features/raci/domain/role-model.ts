/**
 * Domain model for fully customizable RACI roles.
 *
 * This module is intentionally free of UI, network, and I/O concerns.
 * All business logic is expressed as pure functions and immutable data transforms.
 */

export type RoleId = string & { readonly __brand: 'RoleId' };

export interface LocalizedText {
  readonly ro: string;
  readonly en: string;
}

export type CustomFieldType =
  | {
      readonly kind: 'text';
      readonly maxLength?: number;
      readonly regex?: string;
    }
  | {
      readonly kind: 'number';
      readonly min?: number;
      readonly max?: number;
    }
  | {
      readonly kind: 'boolean';
    }
  | {
      readonly kind: 'date';
    }
  | {
      readonly kind: 'select';
      readonly options: readonly string[];
    }
  | {
      readonly kind: 'multiselect';
      readonly options: readonly string[];
    };

type CustomFieldValuePayload<TType extends CustomFieldType = CustomFieldType> = TType extends {
  readonly kind: 'text';
}
  ? string
  : TType extends { readonly kind: 'number' }
    ? number
    : TType extends { readonly kind: 'boolean' }
      ? boolean
      : TType extends { readonly kind: 'date' }
        ? string
        : TType extends { readonly kind: 'select' }
          ? string
          : TType extends { readonly kind: 'multiselect' }
            ? readonly string[]
            : never;

/**
 * A field definition describes how a custom field is typed and validated.
 */
export interface CustomFieldDefinition<TType extends CustomFieldType = CustomFieldType> {
  readonly key: string;
  readonly label: LocalizedText;
  readonly type: TType;
  readonly required: boolean;
  readonly defaultValue: CustomFieldValuePayload<TType> | undefined;
}

/**
 * A concrete value bound to a custom field definition.
 */
export interface CustomFieldValue<TType extends CustomFieldType = CustomFieldType> {
  readonly key: string;
  readonly value: CustomFieldValuePayload<TType>;
}

/**
 * A role definition contains the role identity, localized content, ordering,
 * custom field values, and extensible metadata.
 */
export interface RoleDefinition {
  readonly id: RoleId;
  readonly label: LocalizedText;
  readonly description: LocalizedText;
  readonly colorHex: string;
  readonly orderIndex: number;
  readonly fields: ReadonlyArray<CustomFieldValue>;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * A validation error scoped to a specific field.
 */
export interface ValidationError {
  readonly field: string;
  readonly message: string;
}

/**
 * The result of validating a role against a set of field definitions.
 */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ReadonlyArray<ValidationError>;
  readonly fieldErrors: Readonly<Record<string, string>>;
}

/**
 * Serialized form of a role with an explicit schema version.
 */
export interface SerializedRole {
  readonly schemaVersion: number;
  readonly role: RoleDefinition;
}

export const ROLE_SCHEMA_VERSION = 1 as const;

/**
 * Creates a branded role id from a plain string.
 */
export function createRoleId(value: string): RoleId {
  return value as RoleId;
}

/**
 * Validates a role against the provided custom field definitions.
 */
export function validateRole(
  role: RoleDefinition,
  definitions: ReadonlyArray<CustomFieldDefinition>,
): ValidationResult {
  const errors: ValidationError[] = [];
  const fieldErrors: Record<string, string> = {};

  const valuesByKey = new Map<string, unknown>(
    role.fields.map((field) => [field.key, field.value]),
  );

  for (const definition of definitions) {
    const existingValue = valuesByKey.get(definition.key);
    const candidateValue = existingValue !== undefined ? existingValue : definition.defaultValue;

    if (definition.required && candidateValue === undefined) {
      const message = 'This field is required.';
      errors.push({ field: definition.key, message });
      fieldErrors[definition.key] = message;
      continue;
    }

    if (candidateValue === undefined) {
      continue;
    }

    const message = validateFieldValue(definition, candidateValue);
    if (message !== undefined) {
      errors.push({ field: definition.key, message });
      fieldErrors[definition.key] = message;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    fieldErrors,
  };
}

function validateFieldValue(definition: CustomFieldDefinition, value: unknown): string | undefined {
  switch (definition.type.kind) {
    case 'text': {
      if (typeof value !== 'string') {
        return 'Expected a text value.';
      }

      if (definition.type.maxLength !== undefined && value.length > definition.type.maxLength) {
        return `Text must be at most ${definition.type.maxLength} characters.`;
      }

      if (definition.type.regex !== undefined) {
        const regex = new RegExp(definition.type.regex);
        if (!regex.test(value)) {
          return 'Value does not match the required pattern.';
        }
      }

      return undefined;
    }

    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 'Expected a number.';
      }

      if (definition.type.min !== undefined && value < definition.type.min) {
        return `Number must be at least ${definition.type.min}.`;
      }

      if (definition.type.max !== undefined && value > definition.type.max) {
        return `Number must be at most ${definition.type.max}.`;
      }

      return undefined;
    }

    case 'boolean': {
      return typeof value === 'boolean' ? undefined : 'Expected a boolean value.';
    }

    case 'date': {
      if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
        return 'Expected a valid date string.';
      }

      return undefined;
    }

    case 'select': {
      const selectType = definition.type;
      if (typeof value !== 'string' || !selectType.options.includes(value)) {
        return 'Value is not one of the allowed options.';
      }

      return undefined;
    }

    case 'multiselect': {
      const multiselectType = definition.type;
      if (!Array.isArray(value)) {
        return 'Expected a list of values.';
      }

      const invalid = value.some(
        (item) => typeof item !== 'string' || !multiselectType.options.includes(item),
      );

      return invalid ? 'Value contains an invalid option.' : undefined;
    }

    default: {
      const exhaustiveCheck: never = definition.type;
      return exhaustiveCheck;
    }
  }
}

/**
 * Adds a field to a role immutably. If the same key already exists, it is replaced.
 */
export function addField<TType extends CustomFieldType>(
  role: RoleDefinition,
  field: CustomFieldValue<TType>,
): RoleDefinition {
  const existingIndex = role.fields.findIndex((current) => current.key === field.key);

  const nextFields: CustomFieldValue[] =
    existingIndex >= 0
      ? role.fields.map((current, index) => (index === existingIndex ? field : current))
      : [...role.fields, field];

  return {
    ...role,
    fields: nextFields,
  };
}

/**
 * Updates a field value immutably by key.
 */
export function updateFieldValue<TType extends CustomFieldType>(
  role: RoleDefinition,
  key: string,
  value: CustomFieldValuePayload<TType>,
): RoleDefinition {
  return addField(role, { key, value });
}

/**
 * Removes a field from a role immutably by key.
 */
export function removeField(role: RoleDefinition, key: string): RoleDefinition {
  return {
    ...role,
    fields: role.fields.filter((field) => field.key !== key),
  };
}

/**
 * Reorders roles immutably.
 */
export function reorderRoles(
  roles: ReadonlyArray<RoleDefinition>,
  fromIndex: number,
  toIndex: number,
): ReadonlyArray<RoleDefinition> {
  const next = [...roles];

  if (fromIndex === toIndex) {
    return next;
  }

  const clampedFrom = Math.max(0, Math.min(fromIndex, next.length - 1));
  const clampedTo = Math.max(0, Math.min(toIndex, next.length - 1));

  const [moved] = next.splice(clampedFrom, 1);
  next.splice(clampedTo, 0, moved);

  return next;
}

/**
 * Serializes a role into a versioned envelope.
 */
export function serializeRole(role: RoleDefinition): SerializedRole {
  return {
    schemaVersion: ROLE_SCHEMA_VERSION,
    role,
  };
}

/**
 * Deserializes a role from a versioned envelope and applies migration logic.
 */
export function deserializeRole(input: unknown): RoleDefinition {
  const envelope = normalizeSerializedRole(input);
  const migrated = migrate(envelope);
  return migrated.role;
}

/**
 * Migrates an older serialized role envelope to the current schema version.
 */
export function migrate(input: SerializedRole | { readonly role: RoleDefinition }): SerializedRole {
  if (isSerializedRole(input)) {
    if (input.schemaVersion === ROLE_SCHEMA_VERSION) {
      return input;
    }

    return {
      schemaVersion: ROLE_SCHEMA_VERSION,
      role: input.role,
    };
  }

  return {
    schemaVersion: ROLE_SCHEMA_VERSION,
    role: input.role,
  };
}

function normalizeSerializedRole(input: unknown): SerializedRole {
  if (isSerializedRole(input)) {
    return input;
  }

  if (isRoleDefinition(input)) {
    return {
      schemaVersion: ROLE_SCHEMA_VERSION,
      role: input,
    };
  }

  throw new Error('Invalid serialized role payload.');
}

function isSerializedRole(value: unknown): value is SerializedRole {
  return isRecord(value) && typeof value.schemaVersion === 'number' && isRoleDefinition(value.role);
}

function isRoleDefinition(value: unknown): value is RoleDefinition {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isLocalizedText(value.label) &&
    isLocalizedText(value.description) &&
    typeof value.colorHex === 'string' &&
    typeof value.orderIndex === 'number' &&
    Array.isArray(value.fields) &&
    isRecord(value.metadata)
  );
}

function isLocalizedText(value: unknown): value is LocalizedText {
  return isRecord(value) && typeof value.ro === 'string' && typeof value.en === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
