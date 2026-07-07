import {useEffect, useState} from 'react';
import {Link, NavLink, Outlet} from 'react-router-dom';
import {Facebook, Menu, Phone, X} from 'lucide-react';
import {Logo} from './Brand';
import {api} from '../lib/api';

const NAV = [
  {to: '/', label: 'Trang chủ', end: true},
  {to: '/phong-kham', label: 'Phòng khám'},
  {to: '/tu-van', label: 'Tư vấn AI'},
  {to: '/dat-lich', label: 'Đặt lịch'},
  {to: '/tra-cuu', label: 'Tra cứu lịch'},
  {to: '/lien-he', label: 'Liên hệ'},
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const [clinic, setClinic] = useState<any>({});
  useEffect(() => {
    api.get('/public/clinic').then(setClinic).catch(() => {});
  }, []);
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-brand-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({isActive}) =>
                  `px-3 py-2 rounded-lg text-sm font-semibold transition ${
                    isActive ? 'bg-brand-50 text-brand-600' : 'text-gray-600 hover:text-brand-600'
                  }`
                }>
                {n.label}
              </NavLink>
            ))}
            <Link to="/dat-lich" className="btn btn-primary ml-2">
              Đặt lịch ngay
            </Link>
          </nav>
          <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <nav className="md:hidden border-t border-brand-100 bg-white px-4 py-2 flex flex-col">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)} className="py-2 font-semibold text-gray-700">
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet context={{clinic}} />
      </main>

      <footer className="brand-gradient text-white mt-16">
        <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/brand/meheal-logo-brain.jpg" width={36} height={36} style={{mixBlendMode: 'screen'}} alt="MeHeal" />
              <span className="text-2xl font-extrabold">MeHeal</span>
            </div>
            <p className="text-white/90 text-sm">{clinic.name || 'Phòng khám Sức khỏe Tâm thần MeHeal'}</p>
            <p className="text-white/80 text-sm mt-2">{clinic.tagline}</p>
          </div>
          <div>
            <h4 className="font-bold mb-3">Cơ sở khám chữa bệnh</h4>
            {(clinic.facilities || []).map((f: any) => (
              <div key={f.code} className="text-sm text-white/90 mb-2">
                <div className="font-semibold">{f.name}</div>
                <div className="text-white/80">{f.address}</div>
              </div>
            ))}
          </div>
          <div>
            <h4 className="font-bold mb-3">Liên hệ</h4>
            <a href={`tel:${(clinic.hotline || '').replace(/\./g, '')}`} className="flex items-center gap-2 text-sm mb-2">
              <Phone size={16} /> {clinic.hotline || '0523.175.175'}
            </a>
            <a href={clinic.facebook || 'https://www.facebook.com/phongkhammeheal'} target="_blank" className="flex items-center gap-2 text-sm mb-2">
              <Facebook size={16} /> Fanpage MeHeal
            </a>
            <p className="text-sm text-white/80">{clinic.workingHours || 'Thứ 2 - CN: 7:30 - 17:30'}</p>
            <Link to="/admin" className="inline-block mt-3 text-xs text-white/70 underline">
              Quản trị hệ thống
            </Link>
          </div>
        </div>
        <div className="border-t border-white/20 py-4 text-center text-xs text-white/80">
          © {new Date().getFullYear()} MeHeal Clinic Bot · Bản thương mại có bản quyền · Phát triển bởi Tungflows
        </div>
      </footer>
    </div>
  );
}
