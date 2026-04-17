import type { GenerateOptions } from '../codegen';
import type { Schema } from '../types';

import {
  buildEndpoints,
  buildSchemas,
  buildScopeIndex,
  resolveGenerateOptions,
} from '../codegen';

/**
 * Options for the Zod generator.
 */
export interface ZodGenerateOptions extends GenerateOptions {
  /** TypeScript output configuration. */
  typescript?: {
    /** Target TypeScript major version. Defaults to `5`. */
    version?: 5;
  };
  /** Target Zod major version. Defaults to `4`. */
  version?: 4;
}

/**
 * Generates Zod schemas from the Apiwork schema.
 *
 * @param schema - The parsed schema.
 * @param options - The generator options.
 * @returns The generated files, keyed by file path.
 *
 * @example
 * ```ts
 * import { parse } from 'apiwork';
 * import { generate } from 'apiwork/zod';
 *
 * const schema = await parse.url('http://localhost:3000/api/v1/.apiwork');
 * const files = generate(schema, {
 *   version: 4,
 *   typescript: { version: 5 },
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
  options: ZodGenerateOptions = {},
): Map<string, string> {
  const resolvedOptions = resolveGenerateOptions(options);
  const scopeIndex = buildScopeIndex(schema);
  const files = new Map<string, string>();

  for (const [filename, content] of buildSchemas(
    schema,
    { zod: true },
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
      zod: true,
    },
    resolvedOptions,
  )) {
    files.set(filename, content);
  }

  return files;
}
