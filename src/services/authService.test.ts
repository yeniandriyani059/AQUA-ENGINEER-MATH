import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatAuthError } from './authService';

describe('formatAuthError', () => {
  it('translates invalid credentials error to Indonesian', () => {
    const res = formatAuthError({ message: 'Invalid login credentials' });
    assert.match(res, /Email atau kata sandi tidak sesuai/);
  });

  it('translates user already registered error to Indonesian', () => {
    const res = formatAuthError({ message: 'User already registered' });
    assert.match(res, /sudah terdaftar/);
  });

  it('translates short password error to Indonesian', () => {
    const res = formatAuthError({ message: 'Password should be at least 6 characters' });
    assert.match(res, /minimal harus 6 karakter/);
  });

  it('translates network error to Indonesian', () => {
    const res = formatAuthError({ message: 'Failed to fetch' });
    assert.match(res, /Gagal terhubung ke Supabase/);
  });

  it('handles null or undefined gracefully', () => {
    const res = formatAuthError(null);
    assert.strictEqual(res, 'Terjadi kesalahan tidak dikenal.');
  });
});
