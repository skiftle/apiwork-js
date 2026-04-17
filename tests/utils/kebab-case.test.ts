import { describe, expect, it } from 'vitest';

import { kebabCase } from '../../src/utils/kebab-case';

describe('kebabCase', () => {
  it('converts camelCase', () => {
    expect(kebabCase('userName')).toBe('user-name');
  });

  it('converts PascalCase', () => {
    expect(kebabCase('InvoiceNumber')).toBe('invoice-number');
  });

  it('converts snake_case', () => {
    expect(kebabCase('user_name')).toBe('user-name');
  });

  it('converts acronym prefix', () => {
    expect(kebabCase('IPAddress')).toBe('ip-address');
  });

  it('converts acronym in middle', () => {
    expect(kebabCase('fetchHTMLContent')).toBe('fetch-html-content');
  });

  it('converts all-caps acronym', () => {
    expect(kebabCase('APIKey')).toBe('api-key');
  });

  it('leaves kebab-case unchanged', () => {
    expect(kebabCase('user-name')).toBe('user-name');
  });

  it('handles single-word input', () => {
    expect(kebabCase('foo')).toBe('foo');
  });
});
