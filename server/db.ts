import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {config} from './config.ts';
import {CLINIC, DOCTORS, SERVICES} from './content.ts';

fs.mkdirSync(path.dirname(config.dbPath), {recursive: true});

export const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  title TEXT,
  specialty TEXT,
  room TEXT,
  facility TEXT,
  bio TEXT,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  duration INTEGER DEFAULT 30,
  price INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  dob TEXT,
  gender TEXT,
  address TEXT,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  patient_id INTEGER REFERENCES patients(id),
  doctor_id INTEGER REFERENCES doctors(id),
  service_id INTEGER REFERENCES services(id),
  facility TEXT,
  date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  room TEXT,
  queue_no INTEGER,
  reason TEXT,
  symptoms TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  confirmed_at TEXT,
  examined_at TEXT
);

CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER REFERENCES appointments(id),
  patient_id INTEGER REFERENCES patients(id),
  doctor_id INTEGER REFERENCES doctors(id),
  diagnosis TEXT,
  prescription TEXT,
  advice TEXT,
  follow_up TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER REFERENCES appointments(id),
  channel TEXT,
  message TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_appt_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appt_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appt_status ON appointments(status);
`);

export function getSetting(key: string): string | undefined {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as {value: string} | undefined;
  return row?.value;
}
export function setSetting(key: string, value: string) {
  db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, value);
}
export function getJSON<T>(key: string, fallback: T): T {
  const v = getSetting(key);
  if (!v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}
export function setJSON(key: string, value: unknown) {
  setSetting(key, JSON.stringify(value));
}

export function hashPassword(pw: string, salt?: string): string {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(pw, s, 32).toString('hex');
  return `${s}:${h}`;
}
export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, h] = stored.split(':');
  if (!salt || !h) return false;
  const test = crypto.scryptSync(pw, salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(test, 'hex'));
}

export function genCode(prefix: string): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}${ymd}-${rand}`;
}

/** Khởi tạo dữ liệu lần đầu (admin, phòng khám, bác sỹ, dịch vụ). */
export function seed() {
  if (!getSetting('admin_password')) {
    setSetting('admin_password', hashPassword(config.adminDefaultPassword));
  }
  if (!getSetting('clinic')) {
    setJSON('clinic', {
      name: CLINIC.name,
      hotline: CLINIC.hotline,
      email: CLINIC.email,
      facebook: CLINIC.facebook,
      workingHours: CLINIC.workingHours,
      facilities: CLINIC.facilities,
    });
  }
  if (!getSetting('ai_config')) {
    setJSON('ai_config', {
      provider: config.ai.provider,
      gemini: {model: config.ai.gemini.model, apiKey: config.ai.gemini.apiKey},
      openai: {model: config.ai.openai.model, apiKey: config.ai.openai.apiKey},
      compatible: {...config.ai.compatible},
    });
  }
  const docCount = (db.prepare('SELECT COUNT(*) c FROM doctors').get() as {c: number}).c;
  if (docCount === 0) {
    const ins = db.prepare('INSERT INTO doctors(name,title,specialty,room,facility,bio) VALUES(?,?,?,?,?,?)');
    for (const d of DOCTORS) ins.run(d.name, d.title, d.specialty, d.room, d.facility, d.bio);
  }
  const svcCount = (db.prepare('SELECT COUNT(*) c FROM services').get() as {c: number}).c;
  if (svcCount === 0) {
    const ins = db.prepare('INSERT INTO services(name,description,duration,price) VALUES(?,?,?,?)');
    for (const s of SERVICES) ins.run(s.name, s.description, s.duration, s.price);
  }
}

seed();
