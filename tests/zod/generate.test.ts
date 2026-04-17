import { describe, expect, it } from 'vitest';

import { generate } from '../../src/zod/generate';
import { primitivesSchema, schema } from '../test-utils/schema';
import {
  formatDiagnostics,
  getSyntaxDiagnostics,
} from '../test-utils/typescript';

describe('generate (zod)', () => {
  it('produces a non-empty file map', () => {
    const files = generate(schema);
    expect(files.size).toBeGreaterThan(0);
  });

  it('generates api.ts for global types', () => {
    const files = generate(schema);
    expect(files.has('api.ts')).toBe(true);
  });

  it('imports zod in api.ts', () => {
    const files = generate(schema);
    const api = files.get('api.ts');
    expect(api).toContain("import * as z from 'zod';");
  });

  it('exports z.enum for enum types', () => {
    const files = generate(schema);
    const api = files.get('api.ts');
    expect(api).toContain(
      "export const InvoiceStatusSchema = z.enum(['draft', 'paid', 'sent']);",
    );
  });

  it('exports z.object for object types', () => {
    const files = generate(schema);
    const api = files.get('api.ts');
    expect(api).toContain('export const InvoiceSchema = z.object({');
    expect(api).toContain('id: z.uuid(),');
    expect(api).toContain('number: z.string(),');
    expect(api).toContain('status: InvoiceStatusSchema,');
  });

  it('exports both TypeScript types and Zod schemas', () => {
    const files = generate(schema);
    const api = files.get('api.ts');
    expect(api).toContain('export type InvoiceStatus =');
    expect(api).toContain('export interface Invoice {');
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

  it('imports both schemas and type in dependent files', () => {
    const files = generate(schema);
    const endpoints = files.get('endpoints/invoices.ts');
    expect(endpoints).toContain("import type { Invoice } from '../api';");
    expect(endpoints).toContain("import { InvoiceSchema } from '../api';");
  });
});

describe('generate (zod) — primitives', () => {
  const files = generate(primitivesSchema);
  const api = files.get('api.ts') ?? '';

  it.each([
    ['string', 'str: z.string(),'],
    ['integer', 'int: z.number().int(),'],
    ['number', 'num: z.number(),'],
    ['decimal', 'dec: z.number(),'],
    ['boolean', 'bool: z.boolean(),'],
    ['date', 'd: z.iso.date(),'],
    ['datetime', 'dt: z.iso.datetime(),'],
    ['time', 't: z.iso.time(),'],
    ['uuid', 'id: z.uuid(),'],
    ['binary', 'bin: z.string(),'],
    ['literal', "lit: z.literal('fixed'),"],
    ['array', 'strs: z.array(z.string()),'],
    ['record', 'nums: z.record(z.string(), z.number()),'],
    ['union', 'either: z.union([z.string(), z.number().int()]),'],
    ['unknown', 'any: z.unknown(),'],
    ['enum reference', 'shade: ColorSchema,'],
    ['min/max modifiers', 'bounded: z.string().min(1).max(10),'],
    ['email format', 'email: z.email(),'],
    ['nullable', 'nullableStr: z.string().nullable(),'],
    ['optional', 'optionalStr: z.string().optional(),'],
    [
      'nullable + optional',
      'nullableOptionalStr: z.string().nullable().optional(),',
    ],
    ['default', "defaultedStr: z.string().default('hello'),"],
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
