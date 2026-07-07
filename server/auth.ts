import type {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import {config} from './config.ts';
import {getSetting, verifyPassword} from './db.ts';
import {verifyLicense} from './license.ts';

export function login(password: string): {ok: boolean; token?: string; error?: string} {
  const stored = getSetting('admin_password');
  if (!stored || !verifyPassword(password, stored)) {
    return {ok: false, error: 'Sai mật khẩu quản trị.'};
  }
  const token = jwt.sign({role: 'admin'}, config.jwtSecret, {expiresIn: '12h'});
  return {ok: true, token};
}

export interface AuthedRequest extends Request {
  admin?: boolean;
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    jwt.verify(token, config.jwtSecret);
    req.admin = true;
    next();
  } catch {
    res.status(401).json({error: 'Yêu cầu quyền quản trị (chưa đăng nhập hoặc phiên hết hạn).'});
  }
}

/** Chặn mọi API nghiệp vụ nếu hệ thống chưa được kích hoạt bản quyền. */
export function requireLicense(req: Request, res: Response, next: NextFunction) {
  const key = getSetting('license_key');
  const check = key ? verifyLicense(key) : {valid: false, reason: 'Hệ thống chưa được kích hoạt bản quyền.'};
  if (!check.valid) {
    return res.status(403).json({error: check.reason || 'Bản quyền không hợp lệ.', locked: true});
  }
  next();
}
