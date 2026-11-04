import { SessionInfo } from '../types';
import { normalizeCode } from './access';

export interface StudentTokenPayload {
  sub: string;
  role: 'student';
  classId: string;
  classCode: string;
  groupId: string;
  groupCode: string;
  iat: number;
  exp: number;
}

export const STUDENT_TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 jam

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  if (typeof atob === 'function') {
    return decodeURIComponent(
      Array.from(atob(padded))
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
  }
  return Buffer.from(padded, 'base64').toString('utf-8');
}

export function decodeStudentTokenPayload(token?: string | null): StudentTokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'aem-st-v1') return null;
  try {
    const json = base64UrlDecode(parts[1]);
    const parsed = JSON.parse(json);
    if (
      parsed &&
      parsed.role === 'student' &&
      typeof parsed.groupId === 'string' &&
      typeof parsed.classId === 'string' &&
      typeof parsed.groupCode === 'string' &&
      typeof parsed.classCode === 'string' &&
      typeof parsed.exp === 'number'
    ) {
      return parsed as StudentTokenPayload;
    }
  } catch {
    return null;
  }
  return null;
}

export function isStudentTokenExpired(
  payload: StudentTokenPayload | null,
  nowMs: number = Date.now()
): boolean {
  if (!payload) return true;
  return nowMs >= payload.exp;
}

export function canStudentTokenAccessGroup(
  payload: StudentTokenPayload | null,
  targetGroupId?: string | null,
  targetGroupCode?: string | null,
  nowMs: number = Date.now()
): boolean {
  if (!payload || payload.role !== 'student') return false;
  if (isStudentTokenExpired(payload, nowMs)) return false;

  if (targetGroupId && payload.groupId === targetGroupId) {
    return true;
  }
  if (
    targetGroupCode &&
    normalizeCode(payload.groupCode) === normalizeCode(targetGroupCode)
  ) {
    return true;
  }
  return false;
}

export function canStudentTokenAccessTeacherDashboard(
  _payload: StudentTokenPayload | null
): boolean {
  // Token siswa tidak pernah diizinkan mengakses Dashboard Guru
  return false;
}

export function isValidStudentSession(
  session: SessionInfo | null,
  nowMs: number = Date.now()
): boolean {
  if (!session || !session.groupId || !session.classId) return false;
  if (session.expiresAt && nowMs >= session.expiresAt) return false;
  if (session.studentToken) {
    const payload = decodeStudentTokenPayload(session.studentToken);
    if (!payload) return false;
    if (isStudentTokenExpired(payload, nowMs)) return false;
    if (payload.groupId !== session.groupId) return false;
  }
  return true;
}
