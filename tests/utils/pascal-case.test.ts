import { describe, expect, it } from 'vitest';

import { pascalCase } from '../../src/utils/pascal-case';

describe('pascalCase', () => {
  it('converts snake_case', () => {
    expect(pascalCase('user_name')).toBe('UserName');
  });

  it('converts kebab-case', () => {
    expect(pascalCase('user-name')).toBe('UserName');
  });

  it('converts camelCase', () => {
    expect(pascalCase('userName')).toBe('UserName');
  });

  it('leaves PascalCase unchanged', () => {
    expect(pascalCase('UserName')).toBe('UserName');
  });

  it('handles single-word input', () => {
    expect(pascalCase('foo')).toBe('Foo');
  });

  it('preserves acronym casing', () => {
    expect(pascalCase('IPAddress')).toBe('IPAddress');
  });
});
