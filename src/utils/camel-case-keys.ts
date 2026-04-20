import { camelCase } from './camel-case';

/** @internal */
export function camelCaseKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(camelCaseKeys);
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(value)) {
      result[camelCase(key)] = camelCaseKeys(entryValue);
    }
    return result;
  }

  return value;
}
