import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ParseError, parse } from '../src/parse';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('parse', () => {
  it('converts snake_case keys to camelCase recursively', () => {
    const schema = parse({
      base_path: '/api/v1',
      error_codes: [],
      nested: { snake_case_key: { deeper_key: 1 } },
    });
    expect(schema).toEqual({
      basePath: '/api/v1',
      errorCodes: [],
      nested: { snakeCaseKey: { deeperKey: 1 } },
    });
  });
});

describe('parse.url', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches and parses JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ base_path: '/api/v1' }), {
        status: 200,
      }),
    );
    const schema = await parse.url('http://example.com/.apiwork');
    expect(schema).toEqual({ basePath: '/api/v1' });
  });

  it('throws ParseError when fetch rejects', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network down'));
    await expect(parse.url('http://example.com/.apiwork')).rejects.toThrow(
      ParseError,
    );
    await expect(parse.url('http://example.com/.apiwork')).rejects.toThrow(
      /Failed to fetch schema from http:\/\/example.com\/\.apiwork/,
    );
  });

  it('throws ParseError on non-OK status', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response('not found', { status: 404, statusText: 'Not Found' }),
      );
    await expect(parse.url('http://example.com/.apiwork')).rejects.toThrow(
      /404 Not Found/,
    );
  });

  it('throws ParseError when response is not valid JSON', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response('not-json{', { status: 200 }));
    await expect(parse.url('http://example.com/.apiwork')).rejects.toThrow(
      /not valid JSON/,
    );
  });

  it('attaches the underlying error as cause', async () => {
    const cause = new Error('network down');
    globalThis.fetch = vi.fn().mockRejectedValue(cause);
    await expect(
      parse.url('http://example.com/.apiwork'),
    ).rejects.toMatchObject({ cause });
  });
});

describe('parse.file', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'apiwork-parse-'));
  });

  afterEach(async () => {
    await rm(directory, { force: true, recursive: true });
  });

  it('reads and parses a JSON file', async () => {
    const path = join(directory, 'schema.apiwork');
    await writeFile(path, JSON.stringify({ base_path: '/api/v1' }));
    const schema = await parse.file(path);
    expect(schema).toEqual({ basePath: '/api/v1' });
  });

  it('throws ParseError when the file does not exist', async () => {
    const path = join(directory, 'missing.apiwork');
    await expect(parse.file(path)).rejects.toThrow(ParseError);
    await expect(parse.file(path)).rejects.toThrow(/Failed to read schema/);
  });

  it('throws ParseError when the file is not valid JSON', async () => {
    const path = join(directory, 'bad.apiwork');
    await writeFile(path, 'not-json{');
    await expect(parse.file(path)).rejects.toThrow(/not valid JSON/);
  });
});

describe('ParseError', () => {
  it('has name "ParseError"', () => {
    expect(new ParseError('x').name).toBe('ParseError');
  });

  it('is an instance of Error', () => {
    expect(new ParseError('x')).toBeInstanceOf(Error);
  });

  it('preserves the cause option', () => {
    const cause = new Error('inner');
    expect(new ParseError('x', { cause }).cause).toBe(cause);
  });
});
