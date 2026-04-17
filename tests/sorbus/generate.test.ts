import { describe, expect, it } from 'vitest';

import { generate } from '../../src/sorbus/generate';
import { schema } from '../test-utils/schema';
import {
  formatDiagnostics,
  getSyntaxDiagnostics,
} from '../test-utils/typescript';

describe('generate (sorbus)', () => {
  it('produces a non-empty file map', () => {
    const files = generate(schema);
    expect(files.size).toBeGreaterThan(0);
  });

  it('generates contract.ts', () => {
    const files = generate(schema);
    expect(files.has('contract.ts')).toBe(true);
  });

  it('generates client.ts', () => {
    const files = generate(schema);
    expect(files.has('client.ts')).toBe(true);
  });

  it('generates api.ts with types and schemas', () => {
    const files = generate(schema);
    const api = files.get('api.ts');
    expect(api).toContain('export const InvoiceSchema');
    expect(api).toContain('export interface Invoice');
  });

  it('generates endpoints with runtime definitions', () => {
    const files = generate(schema);
    const endpoints = files.get('endpoints/invoices.ts');
    expect(endpoints).toContain("import type { Operation } from 'sorbus';");
    expect(endpoints).toContain('export const invoices = {');
    expect(endpoints).toContain('export interface InvoicesOperationTree {');
  });

  it('generates Client interface in client.ts', () => {
    const files = generate(schema);
    const client = files.get('client.ts');
    expect(client).toContain('export interface Client {');
    expect(client).toContain('invoices: InvoicesOperationTree;');
    expect(client).toContain(
      'export const createClient = createClientFactory<Client>(contract);',
    );
  });

  it('generates contract.ts that composes endpoints', () => {
    const files = generate(schema);
    const contract = files.get('contract.ts');
    expect(contract).toContain('export const contract = {');
    expect(contract).toContain('endpoints:');
    expect(contract).toContain('invoices,');
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

  it('renames Client via transformIdentifier', () => {
    const files = generate(schema, {
      transformIdentifier: (identifier, source) => {
        if (source === 'client' && identifier === 'Client') return 'MyClient';
        if (source === 'client' && identifier === 'createClient')
          return 'createMyClient';
        return identifier;
      },
    });
    const client = files.get('client.ts');
    expect(client).toContain('export interface MyClient {');
    expect(client).toContain(
      'export const createMyClient = createClientFactory<MyClient>(contract);',
    );
  });
});
