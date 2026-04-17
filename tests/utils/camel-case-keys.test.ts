import { describe, expect, it } from 'vitest';

import { camelCaseKeys } from '../../src/utils/camel-case-keys';

describe('camelCaseKeys', () => {
  it('converts top-level keys', () => {
    expect(
      camelCaseKeys({
        created_at: '2026-01-01',
        user_name: 'Alice',
      }),
    ).toEqual({
      createdAt: '2026-01-01',
      userName: 'Alice',
    });
  });

  it('converts nested object keys', () => {
    expect(
      camelCaseKeys({
        user_profile: {
          avatar_url: 'https://...',
          full_name: 'Alice',
        },
      }),
    ).toEqual({
      userProfile: {
        avatarUrl: 'https://...',
        fullName: 'Alice',
      },
    });
  });

  it('converts keys inside arrays', () => {
    expect(
      camelCaseKeys({
        user_list: [{ first_name: 'Alice' }, { first_name: 'Bob' }],
      }),
    ).toEqual({
      userList: [{ firstName: 'Alice' }, { firstName: 'Bob' }],
    });
  });

  it('leaves non-object values unchanged', () => {
    expect(camelCaseKeys('hello')).toBe('hello');
    expect(camelCaseKeys(42)).toBe(42);
    expect(camelCaseKeys(null)).toBe(null);
    expect(camelCaseKeys(true)).toBe(true);
  });

  it('handles deeply nested structures', () => {
    expect(
      camelCaseKeys({
        a_b: { c_d: [{ e_f: { g_h: 1 } }] },
      }),
    ).toEqual({
      aB: { cD: [{ eF: { gH: 1 } }] },
    });
  });

  it('leaves already camelCased keys unchanged', () => {
    expect(camelCaseKeys({ userName: 'Alice' })).toEqual({ userName: 'Alice' });
  });

  it('handles empty object', () => {
    expect(camelCaseKeys({})).toEqual({});
  });

  it('handles empty array', () => {
    expect(camelCaseKeys([])).toEqual([]);
  });
});
