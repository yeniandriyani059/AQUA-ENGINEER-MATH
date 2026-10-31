import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  fetchTeacherClassesAndGroups,
  parseMembersInput,
  formatMembersOutput,
} from './classGroupService';

describe('classGroupService unit test', () => {
  it('returns empty classes and groups when teacherId is empty', async () => {
    const res = await fetchTeacherClassesAndGroups('');
    assert.deepStrictEqual(res, { classes: [], groups: [] });
  });

  it('correctly parses comma-separated members string into trimmed valid string array', () => {
    const input = ' Aisyah, Bima , , Rara ';
    const res = parseMembersInput(input);
    assert.deepStrictEqual(res, ['Aisyah', 'Bima', 'Rara']);
  });

  it('correctly parses empty or null members input into empty array', () => {
    assert.deepStrictEqual(parseMembersInput(''), []);
    assert.deepStrictEqual(parseMembersInput('   '), []);
    assert.deepStrictEqual(parseMembersInput(null), []);
    assert.deepStrictEqual(parseMembersInput(undefined), []);
  });

  it('correctly formats array of members from DB into comma-separated readable string', () => {
    const arr = ['Aisyah', 'Bima', 'Rara'];
    const res = formatMembersOutput(arr);
    assert.strictEqual(res, 'Aisyah, Bima, Rara');
  });

  it('correctly formats empty or single members array/string from DB', () => {
    assert.strictEqual(formatMembersOutput([]), '');
    assert.strictEqual(formatMembersOutput(null), '');
    assert.strictEqual(formatMembersOutput('Aisyah, Bima, Rara'), 'Aisyah, Bima, Rara');
  });
});
