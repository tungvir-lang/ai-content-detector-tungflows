import crypto from 'node:crypto';
import {config} from './config.ts';

/**
 * Hệ thống KHÓA BẢN QUYỀN của MeHeal.
 * - Key được NHÀ CUNG CẤP ký bằng LICENSE_SECRET (chỉ nhà cung cấp giữ).
 * - Máy khách xác thực offline bằng cùng secret => cài trên máy khác chạy ngay,
 *   không cần gọi server bản quyền.
 * - Chỉ admin (đã đăng nhập) mới kích hoạt / xem / gỡ key.
 */

export type Edition = 'TRIAL' | 'STANDARD' | 'PRO' | 'ENTERPRISE';

export interface LicensePayload {
  v: number;
  ed: Edition;
  lic: string; // đơn vị được cấp phép
  exp: number; // epoch giây, 0 = vĩnh viễn
  sn: string; // serial
}

const b64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function sign(data: string): string {
  return b64url(crypto.createHmac('sha256', config.licenseSecret).update(data).digest()).slice(0, 24);
}

export function generateLicense(opts: {edition: Edition; days?: number; licensee: string}): string {
  const exp = opts.days && opts.days > 0 ? Math.floor(Date.now() / 1000) + opts.days * 86400 : 0;
  const payload: LicensePayload = {
    v: 1,
    ed: opts.edition,
    lic: opts.licensee,
    exp,
    sn: crypto.randomBytes(4).toString('hex').toUpperCase(),
  };
  const data = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = sign(data);
  return `MEHEAL-${data}~${sig}`;
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
  payload?: LicensePayload;
  expiresAt?: string | null;
}

export function verifyLicense(key: string): VerifyResult {
  try {
    const raw = (key || '').trim();
    if (!raw.startsWith('MEHEAL-')) return {valid: false, reason: 'Sai định dạng khóa bản quyền.'};
    const body = raw.slice('MEHEAL-'.length);
    const [data, sig] = body.split('~');
    if (!data || !sig) return {valid: false, reason: 'Khóa bản quyền không hợp lệ.'};
    if (sign(data) !== sig) return {valid: false, reason: 'Chữ ký bản quyền không hợp lệ (khóa giả hoặc bị sửa).'};
    const payload = JSON.parse(unb64url(data).toString('utf8')) as LicensePayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return {valid: false, reason: 'Khóa bản quyền đã hết hạn.', payload};
    }
    return {
      valid: true,
      payload,
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
    };
  } catch {
    return {valid: false, reason: 'Không đọc được khóa bản quyền.'};
  }
}

/** Quyền theo phiên bản (chuẩn bị cho các bản Pro tiếp theo). */
export function featuresFor(edition: Edition) {
  const base = {aiConsult: true, booking: true, schedule: true, reportsWord: true, reportsExcel: true};
  switch (edition) {
    case 'TRIAL':
      return {...base, maxDoctors: 2, maxAppointmentsPerMonth: 100, multiFacility: false, advancedAnalytics: false};
    case 'STANDARD':
      return {...base, maxDoctors: 10, maxAppointmentsPerMonth: 2000, multiFacility: true, advancedAnalytics: false};
    case 'PRO':
      return {...base, maxDoctors: 50, maxAppointmentsPerMonth: 50000, multiFacility: true, advancedAnalytics: true};
    case 'ENTERPRISE':
      return {...base, maxDoctors: Infinity, maxAppointmentsPerMonth: Infinity, multiFacility: true, advancedAnalytics: true};
  }
}
