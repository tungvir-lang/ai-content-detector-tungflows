import 'dotenv/config';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');

export const config = {
  port: Number(process.env.PORT || 8787),
  isProd: process.env.NODE_ENV === 'production',
  jwtSecret: process.env.JWT_SECRET || 'meheal-dev-jwt-secret-change-me',
  licenseSecret: process.env.LICENSE_SECRET || 'meheal-vendor-master-secret-2026',
  adminDefaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || 'admin@123',
  dbPath: path.resolve(ROOT, process.env.DATABASE_PATH || './data/meheal.db'),
  exportsDir: path.resolve(ROOT, './exports'),
  ai: {
    provider: (process.env.AI_PROVIDER || 'gemini') as 'gemini' | 'openai' | 'compatible',
    gemini: {apiKey: process.env.GEMINI_API_KEY || '', model: process.env.GEMINI_MODEL || 'gemini-2.0-flash'},
    openai: {apiKey: process.env.OPENAI_API_KEY || '', model: process.env.OPENAI_MODEL || 'gpt-4o-mini'},
    compatible: {
      baseUrl: process.env.COMPATIBLE_BASE_URL || '',
      apiKey: process.env.COMPATIBLE_API_KEY || '',
      model: process.env.COMPATIBLE_MODEL || '',
    },
  },
};

export const APP_INFO = {
  product: 'MeHeal Clinic Bot',
  version: '1.0.0',
  edition: 'Commercial',
  vendor: 'MeHeal / Tungflows',
  copyright: `© ${new Date().getFullYear()} MeHeal. Bản quyền thuộc về nhà cung cấp.`,
};
