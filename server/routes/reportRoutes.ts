import {Router} from 'express';
import {requireAdmin} from '../auth.ts';
import {exportAppointmentsExcel, exportRecordWord, exportSummaryWord, summaryStats} from '../reports.ts';

export const reportRouter = Router();

/** Dữ liệu tổng hợp trực quan cho dashboard. */
reportRouter.get('/stats', requireAdmin, (req, res) => {
  const {from, to} = req.query as any;
  const stats = summaryStats(from, to);
  const today = new Date().toISOString().slice(0, 10);
  const todayStats = summaryStats(today, today);
  res.json({...stats, today: {total: todayStats.total, byStatus: todayStats.byStatus}});
});

/** Xuất Excel danh sách + tổng hợp. */
reportRouter.get('/export/excel', requireAdmin, async (req, res) => {
  const {from, to, status, doctorId} = req.query as any;
  const buf = await exportAppointmentsExcel({from, to, status, doctorId: doctorId ? Number(doctorId) : undefined});
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="MeHeal-BaoCao-${Date.now()}.xlsx"`);
  res.send(buf);
});

/** Xuất Word báo cáo tổng hợp. */
reportRouter.get('/export/word', requireAdmin, async (req, res) => {
  const {from, to} = req.query as any;
  const buf = await exportSummaryWord({from, to});
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="MeHeal-BaoCaoTongHop-${Date.now()}.docx"`);
  res.send(buf);
});

/** Xuất Word phiếu khám của 1 lượt. */
reportRouter.get('/export/record/:id', requireAdmin, async (req, res) => {
  const out = await exportRecordWord(Number(req.params.id));
  if (!out) return res.status(404).json({error: 'Không tìm thấy lượt khám.'});
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="MeHeal-PhieuKham-${out.code}.docx"`);
  res.send(out.buffer);
});
