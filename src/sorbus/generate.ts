import type { GenerateOptions } from '../codegen';
import type { Schema } from '../types';

import {
  buildEndpoints,
  buildSchemas,
  buildScopeIndex,
  resolveGenerateOptions,
} from '../codegen';
import { buildClient } from './client';
import { buildContract } from './contract';

/**
 * Options for the Sorbus generator.
 */
export interface SorbusGenerateOptions extends GenerateOptions {
  /** TypeScript output configuration. */
  typescript?: {
    /** Target TypeScript major version. Defaults to `5`. */
    version?: 5;
  };
  /** Target Sorbus major version. Defaults to `1`. */
  version?: 1;

  /** Zod output configuration. */
  zod?: {
    /** Target Zod major version. Defaults to `4`. */
    version?: 4;
  };
}

/**
 * Generates Sorbus contract and client from the Apiwork schema.
 *
 * @param schema - The parsed schema.
 * @param options - The generator options.
 * @returns The generated files, keyed by file path.
 *
 * @example
 * ```ts
 * import { parse } from 'apiwork';
 * import { generate } from 'apiwork/sorbus';
 *
 * const schema = await parse.url('http://localhost:3000/api/v1/.apiwork');
 * const files = generate(schema, {
 *   version: 1,
 *   zod: { version: 4 },
 *   typescript: { version: 5 },
 *   fileCase: 'kebab',
 *   importExtension: '.js',
 *   transformIdentifier: (identifier, source) => {
 *     if (source === 'api') return `Api${identifier}`;
 *     if (source === 'client' && identifier === 'Client') return 'MyClient';
 *     return identifier;
 *   },
 * });
 * ```
 */
export function generate(
  schema: Schema,
  options: SorbusGenerateOptions = {},
): Map<string, string> {
  const resolvedOptions = resolveGenerateOptions(options);
  const scopeIndex = buildScopeIndex(schema);
  const context = { options: resolvedOptions, scopeIndex };
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
      endpoints: true,
      reexportChildren: true,
      zod: true,
    },
    resolvedOptions,
  )) {
    files.set(filename, content);
  }

  files.set('contract.ts', buildContract(schema, resolvedOptions, context));
  files.set('client.ts', buildClient(schema, resolvedOptions, context));

  return files;
}
