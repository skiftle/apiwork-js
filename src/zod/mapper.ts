import type { GeneratorContext } from '../codegen';
import type { Enum, ObjectType, Param, UnionType } from '../types';

import { resolveDomainIdentifier } from '../codegen';

const TYPE_MAP: Record<string, string> = {
  binary: 'z.string()',
  boolean: 'z.boolean()',
  date: 'z.iso.date()',
  datetime: 'z.iso.datetime()',
  decimal: 'z.number()',
  integer: 'z.number().int()',
  number: 'z.number()',
  string: 'z.string()',
  time: 'z.iso.time()',
  unknown: 'z.unknown()',
  uuid: 'z.uuid()',
};

const FORMAT_MAP: Record<string, string> = {
  date: 'z.iso.date()',
  datetime: 'z.iso.datetime()',
  double: 'z.number()',
  email: 'z.email()',
  float: 'z.number()',
  hostname: 'z.string()',
  int32: 'z.number().int()',
  int64: 'z.number().int()',
  ipv4: 'z.ipv4()',
  ipv6: 'z.ipv6()',
  password: 'z.string()',
  url: 'z.url()',
  uuid: 'z.uuid()',
};

/** @internal */
export function generateEnumSchema(
  _enum: Enum,
  context: GeneratorContext,
): string {
  const name = resolveDomainIdentifier(_enum.name, context);
  const values = _enum.values
    .sort()
    .map((value) => `'${value}'`)
    .join(', ');
  return `export const ${name}Schema = z.enum([${values}]);`;
}

/** @internal */
export function generateObjectSchema(
  type: ObjectType,
  context: GeneratorContext,
): string {
  const name = resolveDomainIdentifier(type.name, context);

  const properties = [...type.shape]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((param) => {
      return `  ${param.name}: ${mapParamToZod(param, context)},`;
    })
    .join('\n');

  if (type.recursive) {
    return `export const ${name}Schema: z.ZodType<${name}> = z.lazy(() => z.object({\n${properties}\n}));`;
  }

  if (type.extends.length > 0) {
    const bases = type.extends.map(
      (base) => `${resolveDomainIdentifier(base, context)}Schema`,
    );
    if (bases.length === 1) {
      if (properties.trim()) {
        return `export const ${name}Schema = ${bases[0]}.merge(z.object({\n${properties}\n}));`;
      }
      return `export const ${name}Schema = ${bases[0]};`;
    }
    const merged = bases.join('.merge(') + ')'.repeat(bases.length - 1);
    if (properties.trim()) {
      return `export const ${name}Schema = ${merged}.merge(z.object({\n${properties}\n}));`;
    }
    return `export const ${name}Schema = ${merged};`;
  }

  return `export const ${name}Schema = z.object({\n${properties}\n});`;
}

/** @internal */
export function generateUnionSchema(
  type: UnionType,
  context: GeneratorContext,
): string {
  const name = resolveDomainIdentifier(type.name, context);

  let unionCode: string;

  if (type.discriminator) {
    const variants = type.variants.map((variant) => {
      const base = mapParamToZod(variant, context);
      const tag = 'tag' in variant ? variant.tag : null;
      if (tag) {
        return `${base}.extend({ ${type.discriminator}: z.literal('${tag}') })`;
      }
      return base;
    });
    unionCode = `z.discriminatedUnion('${type.discriminator}', [\n  ${variants.join(',\n  ')}\n])`;
  } else {
    const variants = type.variants.map((variant) =>
      mapParamToZod(variant, context),
    );
    unionCode = `z.union([\n  ${variants.join(',\n  ')}\n])`;
  }

  if (type.recursive) {
    return `export const ${name}Schema: z.ZodType<${name}> = z.lazy(() => ${unionCode});`;
  }

  return `export const ${name}Schema = ${unionCode};`;
}

/** @internal */
export function mapParamToZod(param: Param, context: GeneratorContext): string {
  let base = mapParamBase(param, context);
  base = applyModifiers(base, param);
  return base;
}

function mapParamBase(param: Param, context: GeneratorContext): string {
  switch (param.type) {
    case 'string':
    case 'integer':
    case 'number':
    case 'decimal':
    case 'boolean':
    case 'date':
    case 'datetime':
    case 'time':
    case 'uuid':
    case 'binary':
      return mapScalar(param, context);
    case 'literal':
      return mapLiteral(param);
    case 'array':
      return mapArray(param, context);
    case 'record':
      return mapRecord(param, context);
    case 'object':
      return mapObject(param, context);
    case 'union':
      return mapUnion(param, context);
    case 'reference':
      return `${resolveDomainIdentifier(param.reference, context)}Schema`;
    case 'unknown':
      return 'z.unknown()';
  }
}

function mapScalar(
  param: Param & {
    format?: string | null;
    min?: number | null;
    max?: number | null;
    enum?: string;
  },
  context: GeneratorContext,
): string {
  if (param.enum) {
    return `${resolveDomainIdentifier(param.enum, context)}Schema`;
  }

  let base: string;

  if (param.format) {
    base = FORMAT_MAP[param.format] ?? TYPE_MAP[param.type] ?? 'z.unknown()';
  } else {
    base = TYPE_MAP[param.type] ?? 'z.unknown()';
  }

  if ('min' in param && param.min !== null && param.min !== undefined) {
    base += `.min(${param.min})`;
  }
  if ('max' in param && param.max !== null && param.max !== undefined) {
    base += `.max(${param.max})`;
  }

  return base;
}

function mapLiteral(param: Param & { value: unknown }): string {
  if (param.value === null) {
    return 'z.null()';
  }
  if (typeof param.value === 'string') {
    return `z.literal('${param.value}')`;
  }
  return `z.literal(${param.value})`;
}

function mapArray(
  param: Param & { of: Param | null; min?: number | null; max?: number | null },
  context: GeneratorContext,
): string {
  const items = param.of ? mapParamToZod(param.of, context) : 'z.unknown()';
  let base = `z.array(${items})`;
  if (param.min !== null && param.min !== undefined) {
    base += `.min(${param.min})`;
  }
  if (param.max !== null && param.max !== undefined) {
    base += `.max(${param.max})`;
  }
  return base;
}

function mapRecord(
  param: Param & { of: Param | null },
  context: GeneratorContext,
): string {
  const value = param.of ? mapParamToZod(param.of, context) : 'z.unknown()';
  return `z.record(z.string(), ${value})`;
}

function mapObject(
  param: Param & { shape: Param[]; partial?: boolean },
  context: GeneratorContext,
): string {
  if (param.shape.length === 0) {
    return 'z.record(z.string(), z.unknown())';
  }

  const properties = [...param.shape]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((field) => {
      const zodType = param.partial
        ? mapParamToZodWithoutOptional(field, context)
        : mapParamToZod(field, context);
      return `${field.name}: ${zodType}`;
    })
    .join(', ');

  const base = `z.object({ ${properties} })`;
  return param.partial ? `${base}.partial()` : base;
}

function mapUnion(
  param: Param & { discriminator?: string | null; variants: Param[] },
  context: GeneratorContext,
): string {
  if (param.discriminator) {
    const variants = param.variants.map((variant) =>
      mapParamToZod(variant, context),
    );
    return `z.discriminatedUnion('${param.discriminator}', [${variants.join(', ')}])`;
  }

  const variants = param.variants.map((variant) =>
    mapParamToZod(variant, context),
  );
  return `z.union([${variants.join(', ')}])`;
}

function applyModifiers(base: string, param: Param): string {
  if (param.nullable && hasDefault(param)) {
    return `${base}.nullable().default(${serializeDefault(param)})`;
  }
  if (hasDefault(param)) {
    return `${base}.default(${serializeDefault(param)})`;
  }
  if (param.nullable && param.optional) {
    return `${base}.nullable().optional()`;
  }
  if (param.optional) {
    return `${base}.optional()`;
  }
  if (param.nullable) {
    return `${base}.nullable()`;
  }
  return base;
}

function hasDefault(param: Param): boolean {
  if (!('default' in param)) {
    return false;
  }
  if (param.default === undefined) {
    return false;
  }
  return true;
}

function serializeDefault(param: Param): string {
  const value = 'default' in param ? param.default : undefined;
  if (value === null) {
    return 'null';
  }
  if (value === '') {
    return "''";
  }
  if (typeof value === 'string') {
    return `'${value}'`;
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  return JSON.stringify(value);
}

function mapParamToZodWithoutOptional(
  param: Param,
  context: GeneratorContext,
): string {
  const base = mapParamBase(param, context);

  if (param.nullable && hasDefault(param)) {
    return `${base}.nullable().default(${serializeDefault(param)})`;
  }
  if (param.nullable) {
    return `${base}.nullable()`;
  }
  if (hasDefault(param)) {
    return `${base}.default(${serializeDefault(param)})`;
  }

  return base;
}
