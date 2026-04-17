import type { Enum, Schema, Type } from '../types';
import type { GeneratorContext, ResolvedGenerateOptions } from './options';

import {
  generateEnum,
  generateInterface,
  generateUnionType,
} from '../typescript/mapper';
import {
  generateEnumSchema,
  generateObjectSchema,
  generateUnionSchema,
} from '../zod/mapper';
import { formatFileName, resolveDomainIdentifier } from './options';
import { collectTypeReferences } from './references';

export interface SchemaOptions {
  zod: boolean;
}

interface ScopeGroup {
  enums: Enum[];
  types: Type[];
}

export function buildScopeIndex(schema: Schema): Map<string, string | null> {
  const index = new Map<string, string | null>();

  for (const _enum of schema.enums) {
    index.set(_enum.name, _enum.scope);
  }

  for (const type of schema.types) {
    index.set(type.name, type.scope);
  }

  return index;
}

export function buildSchemas(
  schema: Schema,
  options: SchemaOptions,
  resolvedOptions: ResolvedGenerateOptions,
): Map<string, string> {
  const files = new Map<string, string>();
  const groups = groupByScope(schema);
  const scopeIndex = buildScopeIndex(schema);
  const context: GeneratorContext = { options: resolvedOptions, scopeIndex };

  for (const [scope, group] of groups) {
    const filename =
      scope === null
        ? 'api.ts'
        : `domains/${formatFileName(scope, resolvedOptions.fileCase)}.ts`;
    const content = buildFile(
      scope,
      group.enums,
      group.types,
      options,
      context,
    );
    files.set(filename, content);
  }

  const barrelLines: string[] = [];
  for (const scope of [...groups.keys()]
    .filter((scope): scope is string => scope !== null)
    .sort()) {
    barrelLines.push(
      `export * from './${formatFileName(scope, resolvedOptions.fileCase)}${resolvedOptions.importExtension}';`,
    );
  }
  if (barrelLines.length > 0) {
    files.set('domains/index.ts', `${barrelLines.join('\n')}\n`);
  }

  return files;
}

function groupByScope(schema: Schema): Map<string | null, ScopeGroup> {
  const groups = new Map<string | null, ScopeGroup>();

  function getGroup(scope: string | null): ScopeGroup {
    let group = groups.get(scope);
    if (!group) {
      group = { enums: [], types: [] };
      groups.set(scope, group);
    }
    return group;
  }

  for (const _enum of schema.enums) {
    getGroup(_enum.scope).enums.push(_enum);
  }

  for (const type of schema.types) {
    getGroup(type.scope).types.push(type);
  }

  return groups;
}

function buildFile(
  scope: string | null,
  enums: Enum[],
  types: Type[],
  options: SchemaOptions,
  context: GeneratorContext,
): string {
  const references = collectTypeReferences(types, enums);
  const imports = buildImports(scope, references, options, context);
  const lines: string[] = [];

  if (options.zod) {
    lines.push("import * as z from 'zod';");
    if (imports) {
      lines.push('');
    }
  }

  if (imports) {
    lines.push(imports);
  }

  if (lines.length > 0) {
    lines.push('');
  }

  if (options.zod) {
    for (const _enum of enums) {
      lines.push(generateEnumSchema(_enum, context));
      lines.push('');
    }

    for (const type of types) {
      if (type.type === 'object') {
        lines.push(generateObjectSchema(type, context));
      } else {
        lines.push(generateUnionSchema(type, context));
      }
      lines.push('');
    }
  }

  for (const _enum of enums) {
    lines.push(generateEnum(_enum, context));
    lines.push('');
  }

  for (const type of types) {
    if (type.type === 'object') {
      lines.push(generateInterface(type, context));
    } else {
      lines.push(generateUnionType(type, context));
    }
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

function resolveImportPath(
  currentScope: string | null,
  targetScope: string | null,
  resolvedOptions: ResolvedGenerateOptions,
): string {
  const extension = resolvedOptions.importExtension;
  if (currentScope === null) {
    return `./domains/${formatFileName(targetScope as string, resolvedOptions.fileCase)}${extension}`;
  }
  if (targetScope === null) {
    return `../api${extension}`;
  }
  return `./${formatFileName(targetScope, resolvedOptions.fileCase)}${extension}`;
}

function buildImports(
  currentScope: string | null,
  references: Set<string>,
  options: SchemaOptions,
  context: GeneratorContext,
): string {
  const importsByFile = new Map<
    string,
    { schemas: string[]; types: string[] }
  >();

  for (const reference of references) {
    const targetScope = context.scopeIndex.get(reference);
    if (targetScope === undefined || targetScope === currentScope) {
      continue;
    }

    const filename = resolveImportPath(
      currentScope,
      targetScope,
      context.options,
    );

    let entry = importsByFile.get(filename);
    if (!entry) {
      entry = { schemas: [], types: [] };
      importsByFile.set(filename, entry);
    }

    const name = resolveDomainIdentifier(reference, context);
    if (options.zod) {
      entry.schemas.push(`${name}Schema`);
    }
    entry.types.push(name);
  }

  const lines: string[] = [];

  for (const [filename, entry] of [...importsByFile.entries()].sort(
    ([a], [b]) => a.localeCompare(b),
  )) {
    if (options.zod) {
      const allImports = [
        ...entry.schemas.sort(),
        ...entry.types.sort().map((name) => `type ${name}`),
      ];
      lines.push(`import { ${allImports.join(', ')} } from '${filename}';`);
    } else {
      lines.push(
        `import type { ${entry.types.sort().join(', ')} } from '${filename}';`,
      );
    }
  }

  return lines.join('\n');
}
