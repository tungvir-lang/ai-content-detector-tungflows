import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {ChevronDown, MapPin, Stethoscope} from 'lucide-react';
import {api, money} from '../lib/api';

export default function Clinic() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [disorders, setDisorders] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api.get('/public/doctors').then(setDoctors).catch(() => {});
    api.get('/public/services').then(setServices).catch(() => {});
    api.get('/public/disorders').then(setDisorders).catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Phòng khám & Chuyên môn</h1>
      <p className="text-gray-500 mb-8">Đội ngũ bác sỹ, dịch vụ và các rối loạn tâm thần thường gặp được điều trị tại MeHeal.</p>

      {/* Bác sỹ */}
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Stethoscope className="text-brand-500" /> Đội ngũ bác sỹ
      </h2>
      <div className="grid md:grid-cols-3 gap-4 mb-12">
        {doctors.map((d) => (
          <div key={d.id} className="card p-5">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-full brand-gradient text-white font-bold flex items-center justify-center">
                {d.name.split(' ').pop()?.[0]}
              </div>
              <span className="badge bg-brand-50 text-brand-600">
                <MapPin size={12} /> {d.room} · {d.facility}
              </span>
            </div>
            <h3 className="font-bold mt-3">{d.name}</h3>
            <p className="text-xs text-brand-600 font-semibold">{d.title}</p>
            <p className="text-sm text-gray-500 mt-2">{d.specialty}</p>
            <p className="text-xs text-gray-400 mt-2">{d.bio}</p>
          </div>
        ))}
      </div>

      {/* Dịch vụ */}
      <h2 className="text-xl font-bold text-gray-800 mb-4">Bảng dịch vụ & chi phí</h2>
      <div className="card overflow-hidden mb-12">
        <table className="w-full text-sm">
          <thead className="bg-brand-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Dịch vụ</th>
              <th className="text-left p-3 hidden md:table-cell">Mô tả</th>
              <th className="text-center p-3">Thời lượng</th>
              <th className="text-right p-3">Chi phí</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className="border-t border-brand-50">
                <td className="p-3 font-semibold">{s.name}</td>
                <td className="p-3 text-gray-500 hidden md:table-cell">{s.description}</td>
                <td className="p-3 text-center text-gray-500">{s.duration}'</td>
                <td className="p-3 text-right font-bold text-brand-600">{money(s.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rối loạn */}
      <h2 className="text-xl font-bold text-gray-800 mb-4">Các rối loạn tâm thần thường gặp</h2>
      <div className="space-y-2 mb-8">
        {disorders.map((d) => (
          <div key={d.slug} className="card overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 text-left" onClick={() => setOpen(open === d.slug ? null : d.slug)}>
              <span className="font-semibold text-gray-800">{d.name}</span>
              <ChevronDown className={`transition ${open === d.slug ? 'rotate-180 text-brand-500' : 'text-gray-400'}`} size={18} />
            </button>
            {open === d.slug && (
              <div className="px-4 pb-4 border-t border-brand-50 pt-3">
                <p className="text-sm text-gray-600 mb-2">{d.summary}</p>
                <ul className="list-disc pl-5 text-sm text-gray-500 space-y-1">
                  {d.symptoms.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card p-6 text-center brand-gradient text-white">
        <p className="font-semibold text-lg mb-3">Bạn hoặc người thân đang gặp vấn đề tâm lý?</p>
        <Link to="/dat-lich" className="btn bg-white text-brand-600">
          Đặt lịch khám ngay
        </Link>
      </div>
    </div>
  );
}
