import type { Enum, Param, Type } from '../types';

export function collectTypeReferences(
  types: Type[],
  enums: Enum[],
): Set<string> {
  const references = new Set<string>();
  const localNames = new Set<string>();

  for (const _enum of enums) {
    localNames.add(_enum.name);
  }

  for (const type of types) {
    localNames.add(type.name);
  }

  for (const type of types) {
    if (type.type === 'object') {
      for (const param of type.shape) {
        collectParamReferences(param, references);
      }
    } else {
      for (const variant of type.variants) {
        collectParamReferences(variant, references);
      }
    }
  }

  for (const name of localNames) {
    references.delete(name);
  }

  return references;
}

export function collectParamReferences(
  param: Param,
  references: Set<string>,
): void {
  switch (param.type) {
    case 'reference':
      references.add(param.reference);
      break;
    case 'array':
      if (param.of) {
        collectParamReferences(param.of, references);
      }
      break;
    case 'record':
      if (param.of) {
        collectParamReferences(param.of, references);
      }
      break;
    case 'object':
      for (const field of param.shape) {
        collectParamReferences(field, references);
      }
      break;
    case 'union':
      for (const variant of param.variants) {
        collectParamReferences(variant, references);
      }
      break;
    case 'string':
    case 'integer':
    case 'number':
    case 'decimal':
    case 'boolean':
    case 'date':
    case 'datetime':
    case 'time':
    case 'uuid':
      if (param.enum) {
        references.add(param.enum);
      }
      break;
  }
}
