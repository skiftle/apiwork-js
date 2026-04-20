import type { GeneratorContext } from '../codegen';
import type { Enum, ObjectType, Param, UnionType } from '../types';

import { resolveDomainIdentifier } from '../codegen';

/** @internal */
export function generateEnum(_enum: Enum, context: GeneratorContext): string {
  const name = resolveDomainIdentifier(_enum.name, context);
  const values = _enum.values.map((value) => `'${value}'`).join(' | ');
  return `export type ${name} = ${values};`;
}

/** @internal */
export function generateInterface(
  type: ObjectType,
  context: GeneratorContext,
): string {
  const name = resolveDomainIdentifier(type.name, context);
  const fields = [...type.shape]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((param) => {
      const optional = isOptionalField(param) ? '?' : '';
      const typescriptType = mapParamToType(param, context);
      return `  ${param.name}${optional}: ${typescriptType};`;
    })
    .join('\n');

  if (type.extends.length > 0) {
    const bases = type.extends
      .map((base) => resolveDomainIdentifier(base, context))
      .join(', ');
    return `export interface ${name} extends ${bases} {\n${fields}\n}`;
  }

  return `export interface ${name} {\n${fields}\n}`;
}

/** @internal */
export function generateUnionType(
  type: UnionType,
  context: GeneratorContext,
): string {
  const name = resolveDomainIdentifier(type.name, context);

  if (type.discriminator) {
    const variants = type.variants.map((variant) => {
      const base = mapParamToType(variant, context);
      const tag = 'tag' in variant ? variant.tag : null;
      if (tag) {
        return `${base} & { ${type.discriminator}: '${tag}' }`;
      }
      return base;
    });
    return `export type ${name} =\n  | ${variants.join('\n  | ')};`;
  }

  const variants = type.variants.map((variant) =>
    mapParamToType(variant, context),
  );
  return `export type ${name} = ${variants.join(' | ')};`;
}

/** @internal */
export function mapParamToType(
  param: Param,
  context: GeneratorContext,
): string {
  const base = mapBaseType(param, context);
  return param.nullable ? `${base} | null` : base;
}

function mapBaseType(param: Param, context: GeneratorContext): string {
  switch (param.type) {
    case 'string':
      return param.enum
        ? resolveDomainIdentifier(param.enum, context)
        : 'string';
    case 'integer':
      return param.enum
        ? resolveDomainIdentifier(param.enum, context)
        : 'number';
    case 'number':
    case 'decimal':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
    case 'datetime':
    case 'time':
      return 'string';
    case 'uuid':
      return 'string';
    case 'binary':
      return 'string';
    case 'literal':
      return typeof param.value === 'string'
        ? `'${param.value}'`
        : String(param.value);
    case 'array':
      return param.of ? `${mapParamToType(param.of, context)}[]` : 'unknown[]';
    case 'record':
      return param.of
        ? `Record<string, ${mapParamToType(param.of, context)}>`
        : 'Record<string, unknown>';
    case 'object':
      return mapObjectParam(param, context);
    case 'union':
      return param.variants
        .map((variant) => mapParamToType(variant, context))
        .join(' | ');
    case 'reference':
      return resolveDomainIdentifier(param.reference, context);
    case 'unknown':
      return 'unknown';
  }
}

/** @internal */
export function mapObjectParam(
  param: {
    shape: Param[];
    partial?: boolean;
  },
  context: GeneratorContext,
): string {
  if (param.shape.length === 0) {
    return 'Record<string, unknown>';
  }

  const fields = [...param.shape]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((field) => {
      const optional = param.partial || isOptionalField(field) ? '?' : '';
      return `${field.name}${optional}: ${mapParamToType(field, context)}`;
    })
    .join('; ');

  return `{ ${fields} }`;
}

/** @internal */
export function isOptionalField(param: Param): boolean {
  return param.optional === true;
}
