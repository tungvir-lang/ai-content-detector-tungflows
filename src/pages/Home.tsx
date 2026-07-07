import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {Brain, CalendarCheck, HeartPulse, MessagesSquare, ShieldCheck, Stethoscope} from 'lucide-react';
import {api} from '../lib/api';

export default function Home() {
  const [clinic, setClinic] = useState<any>({});
  const [specialties, setSpecialties] = useState<string[]>([]);
  useEffect(() => {
    api.get('/public/clinic').then((c) => {
      setClinic(c);
      setSpecialties(c.specialties || []);
    }).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="brand-gradient text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="badge bg-white/20 text-white mb-4">Phòng khám chuyên khoa Tâm thần</span>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              {clinic.name || 'Phòng khám Sức khỏe Tâm thần MeHeal'}
            </h1>
            <p className="mt-4 text-white/90 text-lg">{clinic.tagline || 'Chăm sóc sức khỏe tâm thần toàn diện - Thấu hiểu & Đồng hành'}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/dat-lich" className="btn bg-white text-brand-600 hover:bg-brand-50">
                <CalendarCheck size={18} /> Đặt lịch khám
              </Link>
              <Link to="/tu-van" className="btn bg-brand-700/40 border border-white/40 text-white hover:bg-brand-700/60">
                <MessagesSquare size={18} /> Tư vấn với AI
              </Link>
            </div>
            <div className="mt-6 text-white/90 text-sm">
              Hotline: <a className="font-bold underline" href={`tel:${(clinic.hotline || '0523175175').replace(/\./g, '')}`}>{clinic.hotline || '0523.175.175'}</a>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <div className="bg-white/95 rounded-3xl p-8 shadow-2xl">
              <img src="/brand/meheal-logo-text.jpg" alt="MeHeal" style={{maxWidth: 380, mixBlendMode: 'multiply'}} />
            </div>
          </div>
        </div>
      </section>

      {/* Điểm mạnh */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {icon: Stethoscope, title: 'Đội ngũ chuyên môn cao', desc: 'Thạc sỹ, Bác sỹ chuyên khoa và Nhà trị liệu tâm lý lâm sàng nhiều năm kinh nghiệm.'},
            {icon: Brain, title: 'Chuyên sâu tâm thần', desc: 'Người lớn, trẻ em, người cao tuổi, nghiện chất, rối loạn giấc ngủ và stress.'},
            {icon: ShieldCheck, title: 'Riêng tư & tận tâm', desc: 'Bảo mật thông tin, quy trình khám khoa học, đồng hành cùng người bệnh.'},
          ].map((f) => (
            <div key={f.title} className="card p-6">
              <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 mb-4">
                <f.icon size={24} />
              </div>
              <h3 className="font-bold text-lg mb-1">{f.title}</h3>
              <p className="text-gray-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Giới thiệu */}
      <section className="bg-brand-50/60 py-14">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-800 mb-4">Giới thiệu phòng khám</h2>
            <p className="text-gray-600 leading-relaxed">{clinic.intro}</p>
            <Link to="/phong-kham" className="btn btn-primary mt-6">
              Tìm hiểu chuyên môn
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {specialties.map((s) => (
              <div key={s} className="card p-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <HeartPulse size={16} className="text-brand-500 shrink-0" /> {s}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quy trình */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="text-3xl font-extrabold text-center text-gray-800 mb-10">Quy trình khám thông minh</h2>
        <div className="grid md:grid-cols-4 gap-5">
          {[
            {n: 1, t: 'Đặt lịch online', d: 'Chọn bác sỹ, dịch vụ, ngày giờ phù hợp chỉ trong 1 phút.'},
            {n: 2, t: 'Phòng khám xác nhận', d: 'Hệ thống gán phòng, số thứ tự và thông báo bác sỹ khám.'},
            {n: 3, t: 'Đến khám', d: 'Bạn nhận số phòng/người khám, được thăm khám đúng hẹn.'},
            {n: 4, t: 'Nhận kết quả', d: 'Phiếu khám & lời dặn được lưu và có thể xuất file.'},
          ].map((s) => (
            <div key={s.n} className="card p-6 relative">
              <div className="w-10 h-10 rounded-full brand-gradient text-white font-bold flex items-center justify-center mb-3">{s.n}</div>
              <h3 className="font-bold mb-1">{s.t}</h3>
              <p className="text-gray-500 text-sm">{s.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
