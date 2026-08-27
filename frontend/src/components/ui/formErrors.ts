import { ApiError } from '../../api/http';

export type FieldErrors = Record<string, string>;

export function mapValidationErrors(details: unknown): FieldErrors {
  if (!Array.isArray(details)) {
    return {};
  }
  const errors: FieldErrors = {};
  for (const entry of details) {
    if (typeof entry !== 'string') {
      continue;
    }
    const trimmed = entry.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const spaceIndex = trimmed.indexOf(' ');
    const field = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
    const message =
      spaceIndex === -1 ? 'Valor inválido' : trimmed.slice(spaceIndex + 1);
    if (!errors[field]) {
      errors[field] = message;
    }
  }
  return errors;
}

export function fieldError(
  errors: FieldErrors | undefined,
  field: string,
): string | undefined {
  return errors?.[field];
}

const CONFLICT_FIELD_KEYWORDS: ReadonlyArray<readonly [string, string[]]> = [
  ['name', ['nombre', 'name']],
  ['code', ['código', 'codigo', 'code']],
  ['email', ['email']],
];

export function mapConflictField(message: string): string | undefined {
  const normalized = message.toLowerCase();
  for (const [field, keywords] of CONFLICT_FIELD_KEYWORDS) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return field;
    }
  }
  return undefined;
}

export function resolveFormError(error: unknown): {
  fieldErrors: FieldErrors;
  global?: string;
} {
  if (!(error instanceof ApiError)) {
    return { fieldErrors: {}, global: 'Ocurrió un error inesperado' };
  }
  const fieldErrors = mapValidationErrors(error.details);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }
  const field = mapConflictField(error.message);
  if (field) {
    return { fieldErrors: { [field]: error.message } };
  }
  return { fieldErrors: {}, global: error.message };
}
