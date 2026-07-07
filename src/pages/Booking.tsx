import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {CalendarCheck, CheckCircle2, Clock} from 'lucide-react';
import {api, money} from '../lib/api';

export default function Booking() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [slots, setSlots] = useState<{time: string; available: boolean}[]>([]);
  const [form, setForm] = useState<any>({name: '', phone: '', email: '', gender: '', dob: '', address: '', doctorId: '', serviceId: '', date: '', timeSlot: '', reason: '', symptoms: ''});
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/public/doctors').then(setDoctors).catch(() => {});
    api.get('/public/services').then(setServices).catch(() => {});
  }, []);
  useEffect(() => {
    if (form.doctorId && form.date) {
      api.get(`/public/availability?doctorId=${form.doctorId}&date=${form.date}`).then((r) => setSlots(r.slots)).catch(() => setSlots([]));
    } else setSlots([]);
  }, [form.doctorId, form.date]);

  const set = (k: string, v: any) => setForm((f: any) => ({...f, [k]: v}));
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/public/appointments', {
        ...form,
        doctorId: Number(form.doctorId),
        serviceId: Number(form.serviceId),
      });
      setResult(res);
    } catch (e: any) {
      setError(e.message || 'Đặt lịch thất bại.');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto text-green-500 mb-4" size={64} />
        <h1 className="text-2xl font-extrabold text-gray-800 mb-2">Đặt lịch thành công!</h1>
        <p className="text-gray-500">{result.message}</p>
        <div className="card p-6 my-6 text-left">
          <div className="flex justify-between py-1">
            <span className="text-gray-500">Mã lịch khám</span>
            <span className="font-bold text-brand-600">{result.code}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-500">Mã bệnh nhân</span>
            <span className="font-semibold">{result.patientCode}</span>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Vui lòng lưu lại <b>mã lịch khám</b>. Bạn có thể vào mục <b>Tra cứu lịch</b> để xem trạng thái, số phòng và bác sỹ khi phòng khám xác nhận.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link to="/tra-cuu" className="btn btn-primary">
            Tra cứu lịch của tôi
          </Link>
          <button className="btn btn-ghost" onClick={() => {setResult(null); setForm({...form, timeSlot: ''});}}>
            Đặt lịch khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl brand-gradient text-white flex items-center justify-center">
          <CalendarCheck size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Đặt lịch khám</h1>
          <p className="text-gray-500 text-sm">Điền thông tin, chọn bác sỹ và khung giờ phù hợp.</p>
        </div>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-5">
        <div>
          <h3 className="font-bold text-gray-700 mb-3">1. Thông tin người khám</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="label">Họ và tên *</label>
              <input className="input" required value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Số điện thoại *</label>
              <input className="input" required value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <label className="label">Ngày sinh</label>
              <input className="input" type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} />
            </div>
            <div>
              <label className="label">Giới tính</label>
              <select className="input" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">-- Chọn --</option>
                <option>Nam</option>
                <option>Nữ</option>
                <option>Khác</option>
              </select>
            </div>
            <div>
              <label className="label">Địa chỉ</label>
              <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-gray-700 mb-3">2. Chọn dịch vụ & bác sỹ</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="label">Dịch vụ *</label>
              <select className="input" required value={form.serviceId} onChange={(e) => set('serviceId', e.target.value)}>
                <option value="">-- Chọn dịch vụ --</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {money(s.price)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Bác sỹ *</label>
              <select className="input" required value={form.doctorId} onChange={(e) => set('doctorId', e.target.value)}>
                <option value="">-- Chọn bác sỹ --</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialty})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-gray-700 mb-3">3. Chọn ngày & giờ khám</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="label">Ngày khám *</label>
              <input className="input" type="date" min={today} required value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
          </div>
          {form.doctorId && form.date && (
            <div className="mt-3">
              <label className="label flex items-center gap-1">
                <Clock size={14} /> Khung giờ còn trống
              </label>
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => (
                  <button
                    type="button"
                    key={s.time}
                    disabled={!s.available}
                    onClick={() => set('timeSlot', s.time)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${
                      form.timeSlot === s.time
                        ? 'brand-gradient text-white border-transparent'
                        : s.available
                          ? 'bg-white border-brand-100 text-gray-700 hover:border-brand-400'
                          : 'bg-gray-100 text-gray-300 border-gray-100 line-through cursor-not-allowed'
                    }`}>
                    {s.time}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <h3 className="font-bold text-gray-700 mb-3">4. Lý do & triệu chứng</h3>
          <textarea className="input" rows={3} placeholder="Mô tả ngắn triệu chứng, lý do khám…" value={form.symptoms} onChange={(e) => set('symptoms', e.target.value)} />
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
        <button className="btn btn-primary w-full" disabled={loading || !form.timeSlot}>
          {loading ? 'Đang gửi…' : 'Xác nhận đặt lịch'}
        </button>
      </form>
    </div>
  );
}
