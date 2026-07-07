import {useState} from 'react';
import {Search, DoorOpen, Hash, Stethoscope} from 'lucide-react';
import {api, STATUS} from '../lib/api';

export default function Lookup() {
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setData(null);
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (code) q.set('code', code);
      if (phone) q.set('phone', phone);
      setData(await api.get(`/public/appointments/lookup?${q.toString()}`));
    } catch (e: any) {
      setError(e.message || 'Không tìm thấy.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-14">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold text-gray-800">Tra cứu lịch khám</h1>
        <p className="text-gray-500 mt-1">Nhập mã lịch khám hoặc số điện thoại để xem trạng thái, số phòng và bác sỹ.</p>
      </div>
      <form onSubmit={lookup} className="card p-6 space-y-3">
        <div>
          <label className="label">Mã lịch khám</label>
          <input className="input" placeholder="VD: LH20260707-A1B2" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="text-center text-xs text-gray-400">— hoặc —</div>
        <div>
          <label className="label">Số điện thoại</label>
          <input className="input" placeholder="Số điện thoại đã đặt lịch" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <button className="btn btn-primary w-full" disabled={loading}>
          <Search size={16} /> {loading ? 'Đang tra cứu…' : 'Tra cứu'}
        </button>
      </form>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-4">{error}</div>}

      {data && (
        <div className="card p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-brand-600">{data.code}</span>
            <span className={`badge ${STATUS[data.status]?.cls || ''}`}>{STATUS[data.status]?.label || data.status}</span>
          </div>
          <div className="brand-gradient text-white rounded-xl p-4 mb-4">
            <p className="text-sm">{data.statusText}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Bệnh nhân" value={data.patient_name} />
            <Info label="Ngày giờ" value={`${data.date} · ${data.time_slot}`} />
            <Info label="Dịch vụ" value={data.service_name} />
            <Info label="Cơ sở" value={data.facility} />
            {(data.status === 'confirmed' || data.status === 'in_progress') && (
              <>
                <div className="flex items-center gap-2 col-span-2 bg-brand-50 rounded-lg p-3">
                  <DoorOpen className="text-brand-500" size={18} />
                  <span className="font-semibold">Phòng {data.room || '—'}</span>
                  <Hash className="text-brand-500 ml-3" size={16} />
                  <span className="font-semibold">STT {data.queue_no ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <Stethoscope className="text-brand-500" size={16} />
                  <span>{data.doctor_name} — {data.doctor_title}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({label, value}: {label: string; value: string}) {
  return (
    <div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="font-semibold text-gray-700">{value || '—'}</div>
    </div>
  );
}
