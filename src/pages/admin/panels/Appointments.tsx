import {useEffect, useState} from 'react';
import {CheckCircle2, DoorOpen, FileDown, Play, Stethoscope, X, XCircle} from 'lucide-react';
import {api, downloadFile, money, STATUS} from '../../../lib/api';

export default function Appointments() {
  const [rows, setRows] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [filter, setFilter] = useState({date: '', status: '', doctorId: ''});
  const [confirmModal, setConfirmModal] = useState<any>(null);
  const [completeModal, setCompleteModal] = useState<any>(null);
  const [msg, setMsg] = useState('');

  async function load() {
    const q = new URLSearchParams();
    if (filter.date) q.set('date', filter.date);
    if (filter.status) q.set('status', filter.status);
    if (filter.doctorId) q.set('doctorId', filter.doctorId);
    setRows(await api.aget(`/admin/appointments?${q.toString()}`));
  }
  useEffect(() => {
    api.aget('/admin/doctors').then(setDoctors).catch(() => {});
  }, []);
  useEffect(() => {
    load().catch(() => {});
  }, [filter]);

  async function action(url: string, body?: any, note?: string) {
    await api.apost(url, body);
    if (note) {
      setMsg(note);
      setTimeout(() => setMsg(''), 4000);
    }
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-800 mb-1">Bảng lịch khám</h1>
      <p className="text-gray-400 text-sm mb-5">Xác nhận lịch, gán phòng & số thứ tự, tiến hành khám và lưu phiếu kết quả.</p>

      {msg && <div className="mb-4 text-sm bg-green-50 text-green-700 rounded-lg px-4 py-2">{msg}</div>}

      <div className="flex flex-wrap gap-2 mb-4">
        <input type="date" className="input max-w-40" value={filter.date} onChange={(e) => setFilter({...filter, date: e.target.value})} />
        <select className="input max-w-44" value={filter.status} onChange={(e) => setFilter({...filter, status: e.target.value})}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <select className="input max-w-56" value={filter.doctorId} onChange={(e) => setFilter({...filter, doctorId: e.target.value})}>
          <option value="">Tất cả bác sỹ</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        {(filter.date || filter.status || filter.doctorId) && (
          <button className="btn btn-ghost" onClick={() => setFilter({date: '', status: '', doctorId: ''})}>
            Xóa lọc
          </button>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-brand-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Mã / Bệnh nhân</th>
              <th className="text-left p-3">Ngày giờ</th>
              <th className="text-left p-3">Bác sỹ</th>
              <th className="text-left p-3">Dịch vụ</th>
              <th className="text-center p-3">Phòng/STT</th>
              <th className="text-center p-3">Trạng thái</th>
              <th className="text-right p-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-brand-50 hover:bg-brand-50/40">
                <td className="p-3">
                  <div className="font-semibold text-brand-600">{r.code}</div>
                  <div className="text-gray-700">{r.patient_name}</div>
                  <div className="text-xs text-gray-400">{r.patient_phone}</div>
                </td>
                <td className="p-3">
                  <div>{r.date}</div>
                  <div className="text-xs text-gray-400">{r.time_slot} · {r.facility}</div>
                </td>
                <td className="p-3 text-gray-700">{r.doctor_name}</td>
                <td className="p-3 text-gray-600">{r.service_name}</td>
                <td className="p-3 text-center">
                  {r.room ? (
                    <span className="badge bg-brand-50 text-brand-600">
                      {r.room} · #{r.queue_no}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  <span className={`badge ${STATUS[r.status]?.cls}`}>{STATUS[r.status]?.label}</span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1.5 justify-end flex-wrap">
                    {r.status === 'pending' && (
                      <button className="btn btn-primary !py-1.5 !px-2.5 text-xs" onClick={() => setConfirmModal({...r, room: r.doctor_room})}>
                        <DoorOpen size={14} /> Xác nhận
                      </button>
                    )}
                    {r.status === 'confirmed' && (
                      <button className="btn btn-ghost !py-1.5 !px-2.5 text-xs" onClick={() => action(`/admin/appointments/${r.id}/start`, {}, 'Đã bắt đầu khám.')}>
                        <Play size={14} /> Khám
                      </button>
                    )}
                    {r.status === 'in_progress' && (
                      <button className="btn btn-primary !py-1.5 !px-2.5 text-xs" onClick={() => setCompleteModal(r)}>
                        <CheckCircle2 size={14} /> Hoàn thành
                      </button>
                    )}
                    {r.status === 'completed' && (
                      <button className="btn btn-ghost !py-1.5 !px-2.5 text-xs" onClick={() => downloadFile(`/reports/export/record/${r.id}`, `PhieuKham-${r.code}.docx`)}>
                        <FileDown size={14} /> Phiếu khám
                      </button>
                    )}
                    {r.status !== 'completed' && r.status !== 'cancelled' && (
                      <button className="btn !py-1.5 !px-2 text-xs text-red-500 hover:bg-red-50" onClick={() => action(`/admin/appointments/${r.id}/cancel`, {}, 'Đã hủy lịch.')}>
                        <XCircle size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  Không có lịch khám phù hợp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal xác nhận */}
      {confirmModal && (
        <Modal title="Xác nhận & gán phòng khám" onClose={() => setConfirmModal(null)}>
          <p className="text-sm text-gray-500 mb-4">
            Bệnh nhân <b>{confirmModal.patient_name}</b> — {confirmModal.code}
          </p>
          <label className="label">Bác sỹ khám</label>
          <select className="input mb-3" value={confirmModal.doctor_id} onChange={(e) => setConfirmModal({...confirmModal, doctor_id: Number(e.target.value)})}>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.room}
              </option>
            ))}
          </select>
          <label className="label">Số phòng</label>
          <input className="input mb-4" value={confirmModal.room || ''} onChange={(e) => setConfirmModal({...confirmModal, room: e.target.value})} placeholder="VD: P.101" />
          <button
            className="btn btn-primary w-full"
            onClick={async () => {
              const res = await api.apost(`/admin/appointments/${confirmModal.id}/confirm`, {doctorId: confirmModal.doctor_id, room: confirmModal.room});
              setConfirmModal(null);
              setMsg(res.message);
              setTimeout(() => setMsg(''), 5000);
              load();
            }}>
            <DoorOpen size={16} /> Xác nhận & thông báo bệnh nhân
          </button>
        </Modal>
      )}

      {/* Modal hoàn thành khám */}
      {completeModal && (
        <Modal title="Hoàn thành khám & lưu phiếu kết quả" onClose={() => setCompleteModal(null)}>
          <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
            <Stethoscope size={16} className="text-brand-500" /> {completeModal.patient_name} · {completeModal.doctor_name}
          </p>
          {['diagnosis', 'prescription', 'advice', 'follow_up'].map((f) => (
            <div key={f} className="mb-3">
              <label className="label">
                {{diagnosis: 'Chẩn đoán', prescription: 'Chỉ định / Đơn thuốc', advice: 'Lời dặn', follow_up: 'Hẹn tái khám'}[f]}
              </label>
              <textarea className="input" rows={f === 'diagnosis' ? 2 : 2} value={completeModal[f] || ''} onChange={(e) => setCompleteModal({...completeModal, [f]: e.target.value})} />
            </div>
          ))}
          <button
            className="btn btn-primary w-full mt-1"
            onClick={async () => {
              await api.apost(`/admin/appointments/${completeModal.id}/complete`, {
                diagnosis: completeModal.diagnosis,
                prescription: completeModal.prescription,
                advice: completeModal.advice,
                follow_up: completeModal.follow_up,
              });
              setCompleteModal(null);
              setMsg('Đã hoàn thành khám và lưu phiếu kết quả. Có thể xuất phiếu khám Word.');
              setTimeout(() => setMsg(''), 5000);
              load();
            }}>
            <CheckCircle2 size={16} /> Lưu & hoàn thành
          </button>
        </Modal>
      )}
    </div>
  );
}

function Modal({title, children, onClose}: {title: string; children: React.ReactNode; onClose: () => void}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
