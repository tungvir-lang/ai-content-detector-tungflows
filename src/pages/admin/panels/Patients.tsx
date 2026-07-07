import {useEffect, useState} from 'react';
import {Search} from 'lucide-react';
import {api} from '../../../lib/api';

export default function Patients() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');

  async function load() {
    setRows(await api.aget(`/admin/patients${q ? `?q=${encodeURIComponent(q)}` : ''}`));
  }
  useEffect(() => {
    const t = setTimeout(() => load().catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-800 mb-1">Hồ sơ bệnh nhân</h1>
      <p className="text-gray-400 text-sm mb-5">Danh sách bệnh nhân đã đăng ký khám tại phòng khám.</p>

      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        <input className="input pl-10" placeholder="Tìm theo tên, SĐT hoặc mã bệnh nhân…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-brand-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Mã BN</th>
              <th className="text-left p-3">Họ tên</th>
              <th className="text-left p-3">SĐT</th>
              <th className="text-left p-3">Giới tính</th>
              <th className="text-left p-3">Ngày sinh</th>
              <th className="text-left p-3">Địa chỉ</th>
              <th className="text-left p-3">Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-brand-50">
                <td className="p-3 font-semibold text-brand-600">{p.code}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3">{p.phone}</td>
                <td className="p-3">{p.gender || '—'}</td>
                <td className="p-3">{p.dob || '—'}</td>
                <td className="p-3 text-gray-500">{p.address || '—'}</td>
                <td className="p-3 text-gray-400 text-xs">{p.created_at}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  Chưa có bệnh nhân.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
