import ExcelJS from 'exceljs';
import {AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle} from 'docx';
import {db, getJSON} from './db.ts';
import {CLINIC} from './content.ts';

interface ClinicSetting {
  name: string;
  hotline: string;
  email?: string;
  facebook?: string;
  workingHours?: string;
  facilities?: {code: string; name: string; address: string}[];
}
function clinic(): ClinicSetting {
  return getJSON<ClinicSetting>('clinic', {name: CLINIC.name, hotline: CLINIC.hotline});
}

const money = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ';

const STATUS_VI: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  in_progress: 'Đang khám',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export interface ApptRow {
  code: string;
  date: string;
  time_slot: string;
  status: string;
  room: string | null;
  queue_no: number | null;
  facility: string;
  patient_name: string;
  patient_phone: string;
  doctor_name: string;
  service_name: string;
  price: number;
  reason: string | null;
  symptoms: string | null;
  diagnosis?: string | null;
}

export function fetchAppointments(filters: {from?: string; to?: string; status?: string; doctorId?: number}): ApptRow[] {
  const where: string[] = [];
  const params: any[] = [];
  if (filters.from) {
    where.push('a.date >= ?');
    params.push(filters.from);
  }
  if (filters.to) {
    where.push('a.date <= ?');
    params.push(filters.to);
  }
  if (filters.status) {
    where.push('a.status = ?');
    params.push(filters.status);
  }
  if (filters.doctorId) {
    where.push('a.doctor_id = ?');
    params.push(filters.doctorId);
  }
  const sql = `
    SELECT a.code, a.date, a.time_slot, a.status, a.room, a.queue_no, a.facility, a.reason, a.symptoms,
           p.name patient_name, p.phone patient_phone,
           d.name doctor_name, s.name service_name, s.price,
           r.diagnosis
    FROM appointments a
    LEFT JOIN patients p ON p.id = a.patient_id
    LEFT JOIN doctors d ON d.id = a.doctor_id
    LEFT JOIN services s ON s.id = a.service_id
    LEFT JOIN records r ON r.appointment_id = a.id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY a.date DESC, a.time_slot ASC`;
  return db.prepare(sql).all(...params) as ApptRow[];
}

export function summaryStats(from?: string, to?: string) {
  const where: string[] = [];
  const params: any[] = [];
  if (from) {
    where.push('a.date >= ?');
    params.push(from);
  }
  if (to) {
    where.push('a.date <= ?');
    params.push(to);
  }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = (db.prepare(`SELECT COUNT(*) c FROM appointments a ${w}`).get(...params) as {c: number}).c;
  const byStatus = db.prepare(`SELECT status, COUNT(*) c FROM appointments a ${w} GROUP BY status`).all(...params) as {status: string; c: number}[];
  const byDoctor = db
    .prepare(`SELECT d.name, COUNT(*) c FROM appointments a LEFT JOIN doctors d ON d.id=a.doctor_id ${w} GROUP BY a.doctor_id ORDER BY c DESC`)
    .all(...params) as {name: string; c: number}[];
  const byService = db
    .prepare(`SELECT s.name, COUNT(*) c FROM appointments a LEFT JOIN services s ON s.id=a.service_id ${w} GROUP BY a.service_id ORDER BY c DESC`)
    .all(...params) as {name: string; c: number}[];
  const revenue = (
    db
      .prepare(
        `SELECT COALESCE(SUM(s.price),0) v FROM appointments a LEFT JOIN services s ON s.id=a.service_id ${w ? w + ' AND' : 'WHERE'} a.status='completed'`,
      )
      .get(...params) as {v: number}
  ).v;
  const trend = db
    .prepare(`SELECT a.date d, COUNT(*) c FROM appointments a ${w} GROUP BY a.date ORDER BY a.date ASC`)
    .all(...params) as {d: string; c: number}[];
  return {total, byStatus, byDoctor, byService, revenue, trend};
}

// ---------------------- EXCEL ----------------------
export async function exportAppointmentsExcel(filters: {from?: string; to?: string; status?: string; doctorId?: number}): Promise<Buffer> {
  const rows = fetchAppointments(filters);
  const stats = summaryStats(filters.from, filters.to);
  const c = clinic();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MeHeal Clinic Bot';
  wb.created = new Date();

  const ws = wb.addWorksheet('Lịch khám');
  ws.mergeCells('A1:L1');
  ws.getCell('A1').value = c.name.toUpperCase();
  ws.getCell('A1').font = {bold: true, size: 16, color: {argb: 'FFF47C20'}};
  ws.getCell('A1').alignment = {horizontal: 'center'};
  ws.mergeCells('A2:L2');
  ws.getCell('A2').value = `BÁO CÁO LỊCH KHÁM BỆNH  |  Hotline: ${c.hotline}  |  Xuất ngày: ${new Date().toLocaleString('vi-VN')}`;
  ws.getCell('A2').alignment = {horizontal: 'center'};

  const header = ['Mã lịch', 'Ngày', 'Giờ', 'Bệnh nhân', 'SĐT', 'Bác sỹ', 'Dịch vụ', 'Cơ sở', 'Phòng', 'STT', 'Trạng thái', 'Chi phí'];
  ws.addRow([]);
  const hr = ws.addRow(header);
  hr.eachCell((cell) => {
    cell.font = {bold: true, color: {argb: 'FFFFFFFF'}};
    cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFF47C20'}};
    cell.alignment = {horizontal: 'center', vertical: 'middle'};
    cell.border = {bottom: {style: 'thin'}};
  });
  for (const r of rows) {
    ws.addRow([
      r.code,
      r.date,
      r.time_slot,
      r.patient_name,
      r.patient_phone,
      r.doctor_name,
      r.service_name,
      r.facility,
      r.room || '',
      r.queue_no || '',
      STATUS_VI[r.status] || r.status,
      r.price || 0,
    ]);
  }
  ws.columns.forEach((col, i) => {
    col.width = [16, 12, 8, 22, 14, 24, 26, 8, 8, 6, 16, 14][i] || 14;
  });
  ws.getColumn(12).numFmt = '#,##0"đ"';

  // Sheet tổng hợp
  const ws2 = wb.addWorksheet('Tổng hợp');
  ws2.addRow(['CHỈ SỐ TỔNG HỢP']).font = {bold: true, size: 14};
  ws2.addRow(['Tổng lượt hẹn', stats.total]);
  ws2.addRow(['Doanh thu (đã hoàn thành)', stats.revenue]).getCell(2).numFmt = '#,##0"đ"';
  ws2.addRow([]);
  ws2.addRow(['Theo trạng thái']).font = {bold: true};
  for (const s of stats.byStatus) ws2.addRow([STATUS_VI[s.status] || s.status, s.c]);
  ws2.addRow([]);
  ws2.addRow(['Theo bác sỹ']).font = {bold: true};
  for (const s of stats.byDoctor) ws2.addRow([s.name || '(chưa gán)', s.c]);
  ws2.addRow([]);
  ws2.addRow(['Theo dịch vụ']).font = {bold: true};
  for (const s of stats.byService) ws2.addRow([s.name || '(khác)', s.c]);
  ws2.getColumn(1).width = 34;
  ws2.getColumn(2).width = 18;

  return (await wb.xlsx.writeBuffer()) as Buffer;
}

// ---------------------- WORD ----------------------
const ORANGE = 'F47C20';
function cell(text: string, opts: {bold?: boolean; header?: boolean; width?: number} = {}) {
  return new TableCell({
    width: opts.width ? {size: opts.width, type: WidthType.PERCENTAGE} : undefined,
    shading: opts.header ? {fill: ORANGE} : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({text, bold: opts.bold || opts.header, color: opts.header ? 'FFFFFF' : '000000', size: 20})],
      }),
    ],
  });
}

export async function exportSummaryWord(filters: {from?: string; to?: string}): Promise<Buffer> {
  const c = clinic();
  const stats = summaryStats(filters.from, filters.to);
  const rows = fetchAppointments(filters);

  const noBorder = {top: {style: BorderStyle.NONE, size: 0, color: 'FFFFFF'}, bottom: {style: BorderStyle.NONE, size: 0, color: 'FFFFFF'}, left: {style: BorderStyle.NONE, size: 0, color: 'FFFFFF'}, right: {style: BorderStyle.NONE, size: 0, color: 'FFFFFF'}, insideHorizontal: {style: BorderStyle.NONE, size: 0, color: 'FFFFFF'}, insideVertical: {style: BorderStyle.NONE, size: 0, color: 'FFFFFF'}};

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({alignment: AlignmentType.CENTER, children: [new TextRun({text: c.name.toUpperCase(), bold: true, size: 30, color: ORANGE})]}),
          new Paragraph({alignment: AlignmentType.CENTER, children: [new TextRun({text: `Hotline: ${c.hotline}`, size: 20})]}),
          new Paragraph({alignment: AlignmentType.CENTER, children: [new TextRun({text: 'BÁO CÁO TỔNG HỢP HOẠT ĐỘNG KHÁM BỆNH', bold: true, size: 26})]}),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Kỳ báo cáo: ${filters.from || '—'} đến ${filters.to || '—'}   |   Xuất: ${new Date().toLocaleString('vi-VN')}`,
                italics: true,
                size: 18,
              }),
            ],
          }),
          new Paragraph({text: ''}),
          new Paragraph({heading: HeadingLevel.HEADING_2, children: [new TextRun({text: '1. Chỉ số tổng quan', bold: true})]}),
          new Table({
            width: {size: 100, type: WidthType.PERCENTAGE},
            borders: noBorder,
            rows: [
              new TableRow({children: [cell('Tổng lượt hẹn', {bold: true}), cell(String(stats.total)), cell('Doanh thu (hoàn thành)', {bold: true}), cell(money(stats.revenue))]}),
            ],
          }),
          new Paragraph({text: ''}),
          new Paragraph({heading: HeadingLevel.HEADING_2, children: [new TextRun({text: '2. Theo trạng thái', bold: true})]}),
          new Table({
            width: {size: 60, type: WidthType.PERCENTAGE},
            rows: [
              new TableRow({children: [cell('Trạng thái', {header: true}), cell('Số lượt', {header: true})]}),
              ...stats.byStatus.map((s) => new TableRow({children: [cell(STATUS_VI[s.status] || s.status), cell(String(s.c))]})),
            ],
          }),
          new Paragraph({text: ''}),
          new Paragraph({heading: HeadingLevel.HEADING_2, children: [new TextRun({text: '3. Theo bác sỹ', bold: true})]}),
          new Table({
            width: {size: 80, type: WidthType.PERCENTAGE},
            rows: [
              new TableRow({children: [cell('Bác sỹ', {header: true}), cell('Số lượt', {header: true})]}),
              ...stats.byDoctor.map((s) => new TableRow({children: [cell(s.name || '(chưa gán)'), cell(String(s.c))]})),
            ],
          }),
          new Paragraph({text: ''}),
          new Paragraph({heading: HeadingLevel.HEADING_2, children: [new TextRun({text: '4. Chi tiết lịch khám', bold: true})]}),
          new Table({
            width: {size: 100, type: WidthType.PERCENTAGE},
            rows: [
              new TableRow({
                children: [cell('Mã', {header: true}), cell('Ngày/Giờ', {header: true}), cell('Bệnh nhân', {header: true}), cell('Bác sỹ', {header: true}), cell('Phòng', {header: true}), cell('Trạng thái', {header: true})],
              }),
              ...rows.slice(0, 300).map(
                (r) =>
                  new TableRow({
                    children: [cell(r.code), cell(`${r.date} ${r.time_slot}`), cell(r.patient_name || ''), cell(r.doctor_name || ''), cell(r.room || '—'), cell(STATUS_VI[r.status] || r.status)],
                  }),
              ),
            ],
          }),
          new Paragraph({text: ''}),
          new Paragraph({alignment: AlignmentType.RIGHT, children: [new TextRun({text: `© ${new Date().getFullYear()} MeHeal — Báo cáo tạo tự động bởi hệ thống.`, italics: true, size: 16})]}),
        ],
      },
    ],
  });
  return (await Packer.toBuffer(doc)) as Buffer;
}

/** Phiếu khám / kết quả cho 1 lượt khám cụ thể. */
export async function exportRecordWord(appointmentId: number): Promise<{buffer: Buffer; code: string} | null> {
  const r = db
    .prepare(
      `SELECT a.*, p.name pname, p.phone pphone, p.dob pdob, p.gender pgender, p.address paddr,
              d.name dname, d.title dtitle, s.name sname,
              rec.diagnosis, rec.prescription, rec.advice, rec.follow_up
       FROM appointments a
       LEFT JOIN patients p ON p.id=a.patient_id
       LEFT JOIN doctors d ON d.id=a.doctor_id
       LEFT JOIN services s ON s.id=a.service_id
       LEFT JOIN records rec ON rec.appointment_id=a.id
       WHERE a.id=?`,
    )
    .get(appointmentId) as any;
  if (!r) return null;
  const c = clinic();
  const line = (label: string, value: string) =>
    new Paragraph({children: [new TextRun({text: `${label}: `, bold: true, size: 22}), new TextRun({text: value || '—', size: 22})]});

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({alignment: AlignmentType.CENTER, children: [new TextRun({text: c.name.toUpperCase(), bold: true, size: 28, color: ORANGE})]}),
          new Paragraph({alignment: AlignmentType.CENTER, children: [new TextRun({text: (c.facilities?.[0]?.address || '') + ` — Hotline: ${c.hotline}`, size: 18})]}),
          new Paragraph({text: ''}),
          new Paragraph({alignment: AlignmentType.CENTER, children: [new TextRun({text: 'PHIẾU KHÁM BỆNH', bold: true, size: 30})]}),
          new Paragraph({alignment: AlignmentType.CENTER, children: [new TextRun({text: `Mã lượt khám: ${r.code}`, italics: true, size: 20})]}),
          new Paragraph({text: ''}),
          new Paragraph({heading: HeadingLevel.HEADING_3, children: [new TextRun({text: 'I. Thông tin bệnh nhân', bold: true})]}),
          line('Họ tên', r.pname),
          line('Điện thoại', r.pphone),
          line('Ngày sinh', r.pdob),
          line('Giới tính', r.pgender),
          line('Địa chỉ', r.paddr),
          new Paragraph({text: ''}),
          new Paragraph({heading: HeadingLevel.HEADING_3, children: [new TextRun({text: 'II. Thông tin khám', bold: true})]}),
          line('Ngày khám', `${r.date} ${r.time_slot}`),
          line('Cơ sở / Phòng', `${r.facility} / ${r.room || '—'}`),
          line('Bác sỹ', `${r.dname || '—'} (${r.dtitle || ''})`),
          line('Dịch vụ', r.sname),
          line('Lý do khám', r.reason),
          line('Triệu chứng', r.symptoms),
          new Paragraph({text: ''}),
          new Paragraph({heading: HeadingLevel.HEADING_3, children: [new TextRun({text: 'III. Kết quả & chẩn đoán', bold: true})]}),
          line('Chẩn đoán', r.diagnosis),
          line('Chỉ định / Đơn thuốc', r.prescription),
          line('Lời dặn', r.advice),
          line('Hẹn tái khám', r.follow_up),
          new Paragraph({text: ''}),
          new Paragraph({text: ''}),
          new Table({
            width: {size: 100, type: WidthType.PERCENTAGE},
            borders: {top: {style: BorderStyle.NONE, size: 0, color: 'FFFFFF'}, bottom: {style: BorderStyle.NONE, size: 0, color: 'FFFFFF'}, left: {style: BorderStyle.NONE, size: 0, color: 'FFFFFF'}, right: {style: BorderStyle.NONE, size: 0, color: 'FFFFFF'}, insideHorizontal: {style: BorderStyle.NONE, size: 0, color: 'FFFFFF'}, insideVertical: {style: BorderStyle.NONE, size: 0, color: 'FFFFFF'}},
            rows: [
              new TableRow({
                children: [
                  new TableCell({width: {size: 50, type: WidthType.PERCENTAGE}, children: [new Paragraph({alignment: AlignmentType.CENTER, children: [new TextRun({text: 'Bệnh nhân', bold: true, size: 22})]}), new Paragraph({alignment: AlignmentType.CENTER, children: [new TextRun({text: '(Ký, ghi rõ họ tên)', italics: true, size: 18})]})]}),
                  new TableCell({width: {size: 50, type: WidthType.PERCENTAGE}, children: [new Paragraph({alignment: AlignmentType.CENTER, children: [new TextRun({text: `Ngày ${new Date().toLocaleDateString('vi-VN')}`, italics: true, size: 18})]}), new Paragraph({alignment: AlignmentType.CENTER, children: [new TextRun({text: 'Bác sỹ khám', bold: true, size: 22})]}), new Paragraph({alignment: AlignmentType.CENTER, children: [new TextRun({text: '(Ký, ghi rõ họ tên)', italics: true, size: 18})]})]}),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });
  return {buffer: (await Packer.toBuffer(doc)) as Buffer, code: r.code};
}
