import type { Schema } from './types';

import { camelCaseKeys } from './utils/camel-case-keys';
import { readFile } from 'node:fs/promises';

/**
 * Thrown when an Apiwork schema fails to parse.
 *
 * The {@link Error.cause} property contains the underlying error, such as a
 * network failure from `fetch` or a `SyntaxError` from invalid JSON.
 *
 * @example
 * ```ts
 * import { parse, ParseError } from 'apiwork';
 *
 * try {
 *   const schema = await parse.url('http://localhost:3000/api/v1/.apiwork');
 * } catch (error) {
 *   if (error instanceof ParseError) {
 *     console.error(error.message);
 *     console.error(error.cause);
 *   }
 * }
 * ```
 */
export class ParseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ParseError';
  }
}

/**
 * Parses an Apiwork schema from raw JSON data.
 *
 * @param data - The raw schema data.
 * @returns The parsed schema with camelCase keys.
 *
 * @example
 * ```ts
 * import { parse } from 'apiwork';
 *
 * const schema = parse(data);
 * console.log(schema.basePath);
 * ```
 */
function parseData(data: unknown): Schema {
  return camelCaseKeys(data) as Schema;
}

/**
 * Fetches and parses an Apiwork schema from a URL.
 *
 * @param url - The URL to fetch the `.apiwork` JSON from.
 * @returns The parsed schema with camelCase keys.
 * @throws {@link ParseError} When the fetch fails, returns a non-OK status, or the response is not valid JSON.
 *
 * @example
 * ```ts
 * import { parse } from 'apiwork';
 *
 * const schema = await parse.url('http://localhost:3000/api/v1/.apiwork');
 * ```
 */
async function parseUrl(url: string): Promise<Schema> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new ParseError(`Failed to fetch schema from ${url}`, { cause });
  }

  if (!response.ok) {
    throw new ParseError(
      `Failed to fetch schema from ${url}: ${response.status} ${response.statusText}`,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (cause) {
    throw new ParseError(`Schema at ${url} is not valid JSON`, { cause });
  }

  return parseData(data);
}

/**
 * Reads and parses an Apiwork schema from a file.
 *
 * @param path - The file path to the `.apiwork` JSON.
 * @returns The parsed schema with camelCase keys.
 * @throws {@link ParseError} When the file cannot be read or contains invalid JSON.
 *
 * @example
 * ```ts
 * import { parse } from 'apiwork';
 *
 * const schema = await parse.file('./schema.apiwork');
 * ```
 */
async function parseFile(path: string): Promise<Schema> {
  let content: string;
  try {
    content = await readFile(path, 'utf-8');
  } catch (cause) {
    throw new ParseError(`Failed to read schema from ${path}`, { cause });
  }

  try {
    return parseData(JSON.parse(content));
  } catch (cause) {
    throw new ParseError(`Schema at ${path} is not valid JSON`, { cause });
  }
}

export const parse = Object.assign(parseData, {
  file: parseFile,
  url: parseUrl,
});
