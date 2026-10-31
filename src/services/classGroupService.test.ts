import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  fetchTeacherClassesAndGroups,
  createClassInSupabase,
  updateClassInSupabase,
  deleteClassInSupabase,
  createGroupInSupabase,
  updateGroupInSupabase,
  deleteGroupInSupabase,
} from './classGroupService';

describe('classGroupService unit test', () => {
  it('returns empty classes and groups when teacherId is empty', async () => {
    const res = await fetchTeacherClassesAndGroups('');
    assert.deepStrictEqual(res, { classes: [], groups: [] });
  });
});
