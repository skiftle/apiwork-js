import { describe, expect, it } from 'vitest';

import { camelCase } from '../../src/utils/camel-case';

describe('camelCase', () => {
  it('converts snake_case', () => {
    expect(camelCase('user_name')).toBe('userName');
  });

  it('converts kebab-case', () => {
    expect(camelCase('due-on')).toBe('dueOn');
  });

  it('leaves camelCase unchanged', () => {
    expect(camelCase('userName')).toBe('userName');
  });

  it('leaves PascalCase unchanged', () => {
    expect(camelCase('UserName')).toBe('UserName');
  });

  it('preserves leading underscore', () => {
    expect(camelCase('_foo')).toBe('_foo');
  });

  it('preserves multiple leading underscores', () => {
    expect(camelCase('__private_name')).toBe('__privateName');
  });

  it('handles single-word input', () => {
    expect(camelCase('foo')).toBe('foo');
  });

  it('handles empty string', () => {
    expect(camelCase('')).toBe('');
  });
});
