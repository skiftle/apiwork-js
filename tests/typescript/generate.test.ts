import { describe, expect, it } from 'vitest';

import { generate } from '../../src/typescript/generate';
import { primitivesSchema, schema } from '../test-utils/schema';
import {
  formatDiagnostics,
  getSyntaxDiagnostics,
} from '../test-utils/typescript';

describe('generate (typescript)', () => {
  it('produces a non-empty file map', () => {
    const files = generate(schema);
    expect(files.size).toBeGreaterThan(0);
  });

  it('generates api.ts for global types', () => {
    const files = generate(schema);
    expect(files.has('api.ts')).toBe(true);
  });

  it('generates endpoints/invoices.ts', () => {
    const files = generate(schema);
    expect(files.has('endpoints/invoices.ts')).toBe(true);
  });

  it('exports enum as TypeScript union', () => {
    const files = generate(schema);
    const api = files.get('api.ts');
    expect(api).toContain(
      "export type InvoiceStatus = 'draft' | 'sent' | 'paid';",
    );
  });

  it('exports interface for object type', () => {
    const files = generate(schema);
    const api = files.get('api.ts');
    expect(api).toContain('export interface Invoice {');
    expect(api).toContain('id: string;');
    expect(api).toContain('number: string;');
    expect(api).toContain('status: InvoiceStatus;');
  });

  it('imports referenced types in endpoints file', () => {
    const files = generate(schema);
    const endpoints = files.get('endpoints/invoices.ts');
    expect(endpoints).toContain("import type { Invoice } from '../api';");
  });

  it('applies domainPrefix via transformIdentifier', () => {
    const files = generate(schema, {
      transformIdentifier: (identifier, source) =>
        source === 'api' ? `Api${identifier}` : identifier,
    });
    const api = files.get('api.ts');
    expect(api).toContain('export interface ApiInvoice {');
    expect(api).toContain('status: ApiInvoiceStatus;');
  });

  it('appends importExtension to relative imports', () => {
    const files = generate(schema, { importExtension: '.js' });
    const endpoints = files.get('endpoints/invoices.ts');
    expect(endpoints).toContain("from '../api.js';");
  });

  it('produces syntactically valid TypeScript for every file', () => {
    const files = generate(schema);
    for (const [fileName, source] of files) {
      const diagnostics = getSyntaxDiagnostics(fileName, source);
      expect(
        diagnostics,
        `${fileName} has syntax errors:\n${formatDiagnostics(diagnostics)}`,
      ).toEqual([]);
    }
  });

  it('applies fileCase to scoped domain files', () => {
    const files = generate(
      {
        ...schema,
        types: [
          {
            ...schema.types[0],
            name: 'shipping_address',
            scope: 'shipping',
          },
        ],
      },
      { fileCase: 'pascal' },
    );
    const paths = [...files.keys()];
    expect(paths).toContain('domains/Shipping.ts');
  });
});

describe('generate (typescript) — primitives', () => {
  const files = generate(primitivesSchema);
  const api = files.get('api.ts') ?? '';

  it.each([
    ['str', 'str: string;'],
    ['int', 'int: number;'],
    ['num', 'num: number;'],
    ['dec', 'dec: number;'],
    ['bool', 'bool: boolean;'],
    ['date', 'd: string;'],
    ['datetime', 'dt: string;'],
    ['time', 't: string;'],
    ['uuid', 'id: string;'],
    ['binary', 'bin: string;'],
    ['literal', "lit: 'fixed';"],
    ['array', 'strs: string[];'],
    ['record', 'nums: Record<string, number>;'],
    ['union', 'either: string | number;'],
    ['unknown', 'any: unknown;'],
    ['enum reference', 'shade: Color;'],
    ['nullable', 'nullableStr: string | null;'],
    ['optional', 'optionalStr?: string;'],
    ['nullable + optional', 'nullableOptionalStr?: string | null;'],
  ])('maps %s to `%s`', (_label, expected) => {
    expect(api).toContain(expected);
  });

  it('produces syntactically valid TypeScript', () => {
    for (const [fileName, source] of files) {
      const diagnostics = getSyntaxDiagnostics(fileName, source);
      expect(
        diagnostics,
        `${fileName} has syntax errors:\n${formatDiagnostics(diagnostics)}`,
      ).toEqual([]);
    }
  });
});
