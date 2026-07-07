import {Router} from 'express';
import {config, APP_INFO} from '../config.ts';
import {db, getJSON, getSetting, hashPassword, setJSON, setSetting, verifyPassword} from '../db.ts';
import {login, requireAdmin} from '../auth.ts';
import {featuresFor, verifyLicense} from '../license.ts';

export const adminRouter = Router();

// -------- Đăng nhập / phiên --------
adminRouter.post('/login', (req, res) => {
  const {password} = req.body || {};
  const result = login(String(password || ''));
  if (!result.ok) return res.status(401).json({error: result.error});
  res.json({token: result.token});
});

// -------- Trạng thái bản quyền (công khai để màn hình khóa hiển thị) --------
adminRouter.get('/license/status', (_req, res) => {
  const key = getSetting('license_key');
  const check = key ? verifyLicense(key) : {valid: false, reason: 'Chưa kích hoạt'};
  res.json({
    activated: !!check.valid,
    reason: check.valid ? undefined : check.reason,
    edition: check.payload?.ed || null,
    licensee: check.payload?.lic || null,
    expiresAt: check.expiresAt ?? null,
    features: check.valid && check.payload ? featuresFor(check.payload.ed) : null,
    product: APP_INFO,
  });
});

// -------- Kích hoạt / gỡ bản quyền (CHỈ ADMIN) --------
adminRouter.post('/license/activate', requireAdmin, (req, res) => {
  const key = String(req.body?.key || '').trim();
  const check = verifyLicense(key);
  if (!check.valid) return res.status(400).json({error: check.reason});
  setSetting('license_key', key);
  res.json({ok: true, edition: check.payload?.ed, licensee: check.payload?.lic, expiresAt: check.expiresAt});
});
adminRouter.post('/license/deactivate', requireAdmin, (_req, res) => {
  db.prepare('DELETE FROM settings WHERE key=?').run('license_key');
  res.json({ok: true});
});

// -------- Đổi mật khẩu admin --------
adminRouter.post('/password', requireAdmin, (req, res) => {
  const {current, next} = req.body || {};
  const stored = getSetting('admin_password') || '';
  if (!verifyPassword(String(current || ''), stored)) return res.status(400).json({error: 'Mật khẩu hiện tại không đúng.'});
  if (!next || String(next).length < 6) return res.status(400).json({error: 'Mật khẩu mới tối thiểu 6 ký tự.'});
  setSetting('admin_password', hashPassword(String(next)));
  res.json({ok: true});
});

// -------- Cấu hình phòng khám & AI --------
adminRouter.get('/settings', requireAdmin, (_req, res) => {
  const ai = getJSON<any>('ai_config', {});
  // che bớt api key khi trả về
  const mask = (k?: string) => (k ? k.slice(0, 4) + '••••' + k.slice(-3) : '');
  res.json({
    clinic: getJSON('clinic', {}),
    ai: {
      provider: ai.provider,
      gemini: {model: ai.gemini?.model, apiKeySet: !!ai.gemini?.apiKey, apiKeyMasked: mask(ai.gemini?.apiKey)},
      openai: {model: ai.openai?.model, apiKeySet: !!ai.openai?.apiKey, apiKeyMasked: mask(ai.openai?.apiKey)},
      compatible: {baseUrl: ai.compatible?.baseUrl, model: ai.compatible?.model, apiKeySet: !!ai.compatible?.apiKey},
    },
  });
});
adminRouter.put('/settings/clinic', requireAdmin, (req, res) => {
  setJSON('clinic', req.body || {});
  res.json({ok: true});
});
adminRouter.put('/settings/ai', requireAdmin, (req, res) => {
  const cur = getJSON<any>('ai_config', {});
  const b = req.body || {};
  const next = {
    provider: b.provider || cur.provider || 'gemini',
    gemini: {model: b.gemini?.model ?? cur.gemini?.model, apiKey: b.gemini?.apiKey ? b.gemini.apiKey : cur.gemini?.apiKey || ''},
    openai: {model: b.openai?.model ?? cur.openai?.model, apiKey: b.openai?.apiKey ? b.openai.apiKey : cur.openai?.apiKey || ''},
    compatible: {
      baseUrl: b.compatible?.baseUrl ?? (cur.compatible?.baseUrl || ''),
      model: b.compatible?.model ?? (cur.compatible?.model || ''),
      apiKey: b.compatible?.apiKey ? b.compatible.apiKey : cur.compatible?.apiKey || '',
    },
  };
  setJSON('ai_config', next);
  res.json({ok: true});
});

// -------- Bác sỹ --------
adminRouter.get('/doctors', requireAdmin, (_req, res) => {
  res.json(db.prepare('SELECT * FROM doctors ORDER BY id').all());
});
adminRouter.post('/doctors', requireAdmin, (req, res) => {
  const {name, title, specialty, room, facility, bio, active} = req.body || {};
  if (!name) return res.status(400).json({error: 'Thiếu tên bác sỹ.'});
  const info = db
    .prepare('INSERT INTO doctors(name,title,specialty,room,facility,bio,active) VALUES(?,?,?,?,?,?,?)')
    .run(name, title || '', specialty || '', room || '', facility || 'CS1', bio || '', active === false ? 0 : 1);
  res.json({ok: true, id: info.lastInsertRowid});
});
adminRouter.put('/doctors/:id', requireAdmin, (req, res) => {
  const {name, title, specialty, room, facility, bio, active} = req.body || {};
  db.prepare('UPDATE doctors SET name=?,title=?,specialty=?,room=?,facility=?,bio=?,active=? WHERE id=?').run(
    name,
    title || '',
    specialty || '',
    room || '',
    facility || 'CS1',
    bio || '',
    active === false ? 0 : 1,
    req.params.id,
  );
  res.json({ok: true});
});
adminRouter.delete('/doctors/:id', requireAdmin, (req, res) => {
  db.prepare('UPDATE doctors SET active=0 WHERE id=?').run(req.params.id);
  res.json({ok: true});
});

// -------- Dịch vụ --------
adminRouter.get('/services', requireAdmin, (_req, res) => {
  res.json(db.prepare('SELECT * FROM services ORDER BY id').all());
});
adminRouter.post('/services', requireAdmin, (req, res) => {
  const {name, description, duration, price} = req.body || {};
  if (!name) return res.status(400).json({error: 'Thiếu tên dịch vụ.'});
  const info = db.prepare('INSERT INTO services(name,description,duration,price) VALUES(?,?,?,?)').run(name, description || '', Number(duration) || 30, Number(price) || 0);
  res.json({ok: true, id: info.lastInsertRowid});
});
adminRouter.put('/services/:id', requireAdmin, (req, res) => {
  const {name, description, duration, price, active} = req.body || {};
  db.prepare('UPDATE services SET name=?,description=?,duration=?,price=?,active=? WHERE id=?').run(
    name,
    description || '',
    Number(duration) || 30,
    Number(price) || 0,
    active === false ? 0 : 1,
    req.params.id,
  );
  res.json({ok: true});
});

// -------- Bệnh nhân --------
adminRouter.get('/patients', requireAdmin, (req, res) => {
  const q = String(req.query.q || '').trim();
  const rows = q
    ? db.prepare('SELECT * FROM patients WHERE name LIKE ? OR phone LIKE ? OR code LIKE ? ORDER BY id DESC LIMIT 200').all(`%${q}%`, `%${q}%`, `%${q}%`)
    : db.prepare('SELECT * FROM patients ORDER BY id DESC LIMIT 200').all();
  res.json(rows);
});

// -------- Lịch khám (quản lý quy trình) --------
adminRouter.get('/appointments', requireAdmin, (req, res) => {
  const {date, status, doctorId} = req.query as any;
  const where: string[] = [];
  const params: any[] = [];
  if (date) {
    where.push('a.date=?');
    params.push(date);
  }
  if (status) {
    where.push('a.status=?');
    params.push(status);
  }
  if (doctorId) {
    where.push('a.doctor_id=?');
    params.push(doctorId);
  }
  const rows = db
    .prepare(
      `SELECT a.*, p.name patient_name, p.phone patient_phone,
              d.name doctor_name, d.room doctor_room, s.name service_name, s.price
       FROM appointments a
       LEFT JOIN patients p ON p.id=a.patient_id
       LEFT JOIN doctors d ON d.id=a.doctor_id
       LEFT JOIN services s ON s.id=a.service_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY a.date DESC, a.time_slot ASC LIMIT 500`,
    )
    .all(...params);
  res.json(rows);
});

/** XÁC NHẬN lịch: gán phòng + STT + (đổi bác sỹ nếu cần) => thông báo cho bệnh nhân. */
adminRouter.post('/appointments/:id/confirm', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const appt = db.prepare('SELECT * FROM appointments WHERE id=?').get(id) as any;
  if (!appt) return res.status(404).json({error: 'Không tìm thấy lịch.'});
  const doctorId = Number(req.body?.doctorId || appt.doctor_id);
  const doctor = db.prepare('SELECT * FROM doctors WHERE id=?').get(doctorId) as any;
  const room = String(req.body?.room || doctor?.room || '');
  // số thứ tự theo bác sỹ trong ngày
  const q = (db.prepare(`SELECT COUNT(*) c FROM appointments WHERE doctor_id=? AND date=? AND queue_no IS NOT NULL`).get(doctorId, appt.date) as {c: number}).c;
  const queueNo = q + 1;
  db.prepare(`UPDATE appointments SET status='confirmed', doctor_id=?, room=?, queue_no=?, confirmed_at=datetime('now','localtime') WHERE id=?`).run(doctorId, room, queueNo, id);
  const msg = `Lịch ${appt.code} đã được xác nhận. Mời bệnh nhân đến ${appt.facility}, phòng ${room}, gặp ${doctor?.name}. Số thứ tự: ${queueNo}.`;
  db.prepare('INSERT INTO notifications(appointment_id,channel,message) VALUES(?,?,?)').run(id, 'system', msg);
  res.json({ok: true, room, queueNo, doctor: doctor?.name, message: msg});
});

/** Bắt đầu khám. */
adminRouter.post('/appointments/:id/start', requireAdmin, (req, res) => {
  db.prepare(`UPDATE appointments SET status='in_progress' WHERE id=?`).run(req.params.id);
  res.json({ok: true});
});

/** HOÀN THÀNH khám + lưu phiếu kết quả (records) => tổng hợp báo cáo. */
adminRouter.post('/appointments/:id/complete', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const appt = db.prepare('SELECT * FROM appointments WHERE id=?').get(id) as any;
  if (!appt) return res.status(404).json({error: 'Không tìm thấy lịch.'});
  const {diagnosis, prescription, advice, follow_up} = req.body || {};
  const tx = db.transaction(() => {
    db.prepare(`UPDATE appointments SET status='completed', examined_at=datetime('now','localtime') WHERE id=?`).run(id);
    const existing = db.prepare('SELECT id FROM records WHERE appointment_id=?').get(id) as any;
    if (existing) {
      db.prepare('UPDATE records SET diagnosis=?,prescription=?,advice=?,follow_up=? WHERE appointment_id=?').run(diagnosis || '', prescription || '', advice || '', follow_up || '', id);
    } else {
      db.prepare('INSERT INTO records(appointment_id,patient_id,doctor_id,diagnosis,prescription,advice,follow_up) VALUES(?,?,?,?,?,?,?)').run(
        id,
        appt.patient_id,
        appt.doctor_id,
        diagnosis || '',
        prescription || '',
        advice || '',
        follow_up || '',
      );
    }
  });
  tx();
  res.json({ok: true, message: 'Đã hoàn thành khám và lưu phiếu kết quả.'});
});

adminRouter.post('/appointments/:id/cancel', requireAdmin, (req, res) => {
  db.prepare(`UPDATE appointments SET status='cancelled' WHERE id=?`).run(req.params.id);
  res.json({ok: true});
});

adminRouter.get('/appointments/:id/record', requireAdmin, (req, res) => {
  const rec = db.prepare('SELECT * FROM records WHERE appointment_id=?').get(req.params.id);
  res.json(rec || {});
});
