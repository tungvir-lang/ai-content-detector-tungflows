import {Router} from 'express';
import {db, genCode, getJSON} from '../db.ts';
import {CLINIC, DISORDERS, DOCTORS} from '../content.ts';

export const publicRouter = Router();

/** Thông tin phòng khám cho trang chủ. */
publicRouter.get('/clinic', (_req, res) => {
  const clinic = getJSON('clinic', {name: CLINIC.name, hotline: CLINIC.hotline});
  res.json({
    ...clinic,
    tagline: CLINIC.tagline,
    intro: CLINIC.intro,
    specialties: CLINIC.specialties,
    facebook: CLINIC.facebook,
  });
});

publicRouter.get('/doctors', (_req, res) => {
  const rows = db.prepare('SELECT id,name,title,specialty,room,facility,bio FROM doctors WHERE active=1 ORDER BY id').all();
  res.json(rows);
});

publicRouter.get('/services', (_req, res) => {
  const rows = db.prepare('SELECT id,name,description,duration,price FROM services WHERE active=1 ORDER BY id').all();
  res.json(rows);
});

publicRouter.get('/disorders', (_req, res) => {
  res.json(DISORDERS);
});

/** Các khung giờ khám còn trống của 1 bác sỹ trong 1 ngày. */
publicRouter.get('/availability', (req, res) => {
  const doctorId = Number(req.query.doctorId);
  const date = String(req.query.date || '');
  const slots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
  if (!doctorId || !date) return res.json({slots: slots.map((s) => ({time: s, available: true}))});
  const taken = db
    .prepare(`SELECT time_slot FROM appointments WHERE doctor_id=? AND date=? AND status!='cancelled'`)
    .all(doctorId, date)
    .map((r: any) => r.time_slot);
  res.json({slots: slots.map((s) => ({time: s, available: !taken.includes(s)}))});
});

/** BỆNH NHÂN ĐẶT LỊCH. Quy trình: người khám -> đặt lịch -> chọn bác sỹ/dịch vụ. */
publicRouter.post('/appointments', (req, res) => {
  const {name, phone, email, dob, gender, address, doctorId, serviceId, date, timeSlot, reason, symptoms} = req.body || {};
  if (!name || !phone || !doctorId || !serviceId || !date || !timeSlot) {
    return res.status(400).json({error: 'Vui lòng nhập đủ: họ tên, SĐT, bác sỹ, dịch vụ, ngày và giờ khám.'});
  }
  const doctor = db.prepare('SELECT * FROM doctors WHERE id=?').get(doctorId) as any;
  if (!doctor) return res.status(400).json({error: 'Bác sỹ không tồn tại.'});

  const clash = db
    .prepare(`SELECT id FROM appointments WHERE doctor_id=? AND date=? AND time_slot=? AND status!='cancelled'`)
    .get(doctorId, date, timeSlot);
  if (clash) return res.status(409).json({error: 'Khung giờ này vừa có người đặt. Vui lòng chọn giờ khác.'});

  const tx = db.transaction(() => {
    let patient = phone ? (db.prepare('SELECT * FROM patients WHERE phone=?').get(phone) as any) : null;
    if (!patient) {
      const code = genCode('BN');
      const info = db
        .prepare('INSERT INTO patients(code,name,phone,email,dob,gender,address) VALUES(?,?,?,?,?,?,?)')
        .run(code, name, phone, email || null, dob || null, gender || null, address || null);
      patient = {id: info.lastInsertRowid, code};
    }
    const code = genCode('LH');
    const info = db
      .prepare(
        `INSERT INTO appointments(code,patient_id,doctor_id,service_id,facility,date,time_slot,status,reason,symptoms)
         VALUES(?,?,?,?,?,?,?, 'pending', ?, ?)`,
      )
      .run(code, patient.id, doctorId, serviceId, doctor.facility, date, timeSlot, reason || null, symptoms || null);
    return {appointmentId: info.lastInsertRowid, code, patientCode: patient.code};
  });
  const result = tx();
  res.json({
    ok: true,
    ...result,
    message: 'Đặt lịch thành công! Phòng khám sẽ xác nhận và thông báo số phòng/bác sỹ khám cho bạn.',
  });
});

/** BỆNH NHÂN TRA CỨU trạng thái lịch — nhận thông báo số phòng/người khám. */
publicRouter.get('/appointments/lookup', (req, res) => {
  const code = String(req.query.code || '').trim();
  const phone = String(req.query.phone || '').trim();
  if (!code && !phone) return res.status(400).json({error: 'Nhập mã lịch hoặc số điện thoại để tra cứu.'});
  const row = db
    .prepare(
      `SELECT a.code, a.date, a.time_slot, a.status, a.room, a.queue_no, a.facility, a.reason,
              p.name patient_name, p.phone patient_phone,
              d.name doctor_name, d.title doctor_title,
              s.name service_name
       FROM appointments a
       LEFT JOIN patients p ON p.id=a.patient_id
       LEFT JOIN doctors d ON d.id=a.doctor_id
       LEFT JOIN services s ON s.id=a.service_id
       WHERE a.code=? OR p.phone=?
       ORDER BY a.created_at DESC LIMIT 1`,
    )
    .get(code || '__', phone || '__') as any;
  if (!row) return res.status(404).json({error: 'Không tìm thấy lịch khám phù hợp.'});
  const statusText: Record<string, string> = {
    pending: 'Chờ phòng khám xác nhận',
    confirmed: `Đã xác nhận — Mời bạn đến ${row.facility}, phòng ${row.room || '(sẽ báo sau)'}, gặp ${row.doctor_name}. Số thứ tự: ${row.queue_no ?? '—'}`,
    in_progress: `Đang được khám tại phòng ${row.room} bởi ${row.doctor_name}`,
    completed: 'Đã hoàn thành khám. Cảm ơn bạn đã tin tưởng MeHeal!',
    cancelled: 'Lịch đã bị hủy',
  };
  res.json({...row, statusText: statusText[row.status] || row.status});
});
