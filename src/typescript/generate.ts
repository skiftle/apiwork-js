import type { GenerateOptions } from '../codegen';
import type { Schema } from '../types';

import {
  buildEndpoints,
  buildSchemas,
  buildScopeIndex,
  resolveGenerateOptions,
} from '../codegen';

/**
 * Options for the TypeScript generator.
 */
export interface TypescriptGenerateOptions extends GenerateOptions {
  /** Target TypeScript major version. Defaults to `5`. */
  version?: 5;
}

/**
 * Generates TypeScript types from the Apiwork schema.
 *
 * @param schema - The parsed schema.
 * @param options - The generator options.
 * @returns The generated files, keyed by file path.
 *
 * @example
 * ```ts
 * import { parse } from 'apiwork';
 * import { generate } from 'apiwork/typescript';
 *
 * const schema = await parse.url('http://localhost:3000/api/v1/.apiwork');
 * const files = generate(schema, {
 *   version: 5,
 *   fileCase: 'kebab',
 *   importExtension: '.js',
 *   transformIdentifier: (identifier, source) => {
 *     if (source === 'api') return `Api${identifier}`;
 *     return identifier;
 *   },
 * });
 * ```
 */
export function generate(
  schema: Schema,
  options: TypescriptGenerateOptions = {},
): Map<string, string> {
  const resolvedOptions = resolveGenerateOptions(options);
  const scopeIndex = buildScopeIndex(schema);
  const files = new Map<string, string>();

  for (const [filename, content] of buildSchemas(
    schema,
    { zod: false },
    resolvedOptions,
  )) {
    files.set(filename, content);
  }

  for (const [filename, content] of buildEndpoints(
    schema,
    scopeIndex,
    {
      endpoints: false,
      reexportChildren: false,
      zod: false,
    },
    resolvedOptions,
  )) {
    files.set(filename, content);
  }

  return files;
}
