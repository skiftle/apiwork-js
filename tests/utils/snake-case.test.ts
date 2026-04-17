import { describe, expect, it } from 'vitest';

import { snakeCase } from '../../src/utils/snake-case';

describe('snakeCase', () => {
  it('converts camelCase', () => {
    expect(snakeCase('userName')).toBe('user_name');
  });

  it('converts PascalCase', () => {
    expect(snakeCase('InvoiceNumber')).toBe('invoice_number');
  });

  it('converts kebab-case', () => {
    expect(snakeCase('due-on')).toBe('due_on');
  });

  it('converts acronym prefix', () => {
    expect(snakeCase('IPAddress')).toBe('ip_address');
  });

  it('converts acronym in middle', () => {
    expect(snakeCase('fetchHTMLContent')).toBe('fetch_html_content');
  });

  it('converts all-caps acronym', () => {
    expect(snakeCase('APIKey')).toBe('api_key');
  });

  it('leaves snake_case unchanged', () => {
    expect(snakeCase('user_name')).toBe('user_name');
  });

  it('handles single-word input', () => {
    expect(snakeCase('foo')).toBe('foo');
  });
});
