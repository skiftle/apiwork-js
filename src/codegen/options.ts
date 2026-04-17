import { camelCase, kebabCase, pascalCase, snakeCase } from '../utils';

/**
 * The file name case format.
 */
export type FileCase = 'kebab' | 'camel' | 'pascal' | 'snake';

/**
 * The source category of a generated identifier.
 *
 * - `'domain'` — types and schemas in `domains/` (scoped domain types).
 * - `'api'` — types and schemas in `api.ts` (global domain types).
 * - `'endpoint'` — types and schemas in `endpoints/` (request, response, definition).
 * - `'client'` — sorbus-specific symbols: `Client`, `createClient`, `contract`.
 *
 * @see {@link GenerateOptions.transformIdentifier}
 */
export type IdentifierSource = 'domain' | 'api' | 'endpoint' | 'client';

/**
 * Options shared by all code generators.
 */
export interface GenerateOptions {
  /** The file name case format. Defaults to `'kebab'`. */
  fileCase?: FileCase;

  /** The import path extension (e.g., `'.js'` for Node ESM). Defaults to `''`. */
  importExtension?: '' | '.js' | '.ts';

  /**
   * Transforms a generated identifier into a new name.
   *
   * Called for every domain type, endpoint type, and client symbol the
   * generator emits. Return `identifier` unchanged to keep the default name.
   *
   * @param identifier - The default identifier the generator would emit.
   * @param source - The source category of the identifier.
   *
   * @example
   * ```ts
   * transformIdentifier: (identifier, source) => {
   *   if (source === 'api') return `Api${identifier}`;
   *   if (source === 'client' && identifier === 'Client') return 'MyClient';
   *   return identifier;
   * }
   * ```
   */
  transformIdentifier?: (
    identifier: string,
    source: IdentifierSource,
  ) => string;
}

export interface ResolvedGenerateOptions {
  fileCase: FileCase;
  importExtension: string;
  transformIdentifier: (identifier: string, source: IdentifierSource) => string;
}

export interface GeneratorContext {
  options: ResolvedGenerateOptions;
  scopeIndex: Map<string, string | null>;
}

export function resolveGenerateOptions(
  options: GenerateOptions,
): ResolvedGenerateOptions {
  const {
    fileCase = 'kebab',
    importExtension = '',
    transformIdentifier = (identifier) => identifier,
  } = options;

  return {
    fileCase,
    importExtension,
    transformIdentifier,
  };
}

export function formatFileName(name: string, fileCase: FileCase): string {
  switch (fileCase) {
    case 'kebab':
      return kebabCase(name);
    case 'camel':
      return camelCase(name);
    case 'pascal':
      return pascalCase(name);
    case 'snake':
      return snakeCase(name);
  }
}

export function resolveDomainIdentifier(
  rawName: string,
  context: GeneratorContext,
): string {
  const scope = context.scopeIndex.get(rawName);
  const source: IdentifierSource =
    scope === null || scope === undefined ? 'api' : 'domain';
  return context.options.transformIdentifier(pascalCase(rawName), source);
}

export function resolveEndpointIdentifier(
  identifier: string,
  context: GeneratorContext,
): string {
  return context.options.transformIdentifier(identifier, 'endpoint');
}

export function resolveClientIdentifier(
  identifier: string,
  context: GeneratorContext,
): string {
  return context.options.transformIdentifier(identifier, 'client');
}
