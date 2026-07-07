import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {BarChart3, CalendarDays, KeyRound, LayoutDashboard, LogOut, Settings, Stethoscope, Users} from 'lucide-react';
import {api, clearToken, getToken} from '../../lib/api';
import {Logo} from '../../components/Brand';
import Login from './Login';
import Activate from './Activate';
import Overview from './panels/Overview';
import Appointments from './panels/Appointments';
import Patients from './panels/Patients';
import Catalog from './panels/Catalog';
import Reports from './panels/Reports';
import SettingsPanel from './panels/SettingsPanel';

type Tab = 'overview' | 'appointments' | 'patients' | 'catalog' | 'reports' | 'settings';

const TABS: {id: Tab; label: string; icon: any}[] = [
  {id: 'overview', label: 'Tổng quan', icon: LayoutDashboard},
  {id: 'appointments', label: 'Lịch khám', icon: CalendarDays},
  {id: 'patients', label: 'Bệnh nhân', icon: Users},
  {id: 'catalog', label: 'Bác sỹ & Dịch vụ', icon: Stethoscope},
  {id: 'reports', label: 'Báo cáo', icon: BarChart3},
  {id: 'settings', label: 'Cài đặt & Bản quyền', icon: Settings},
];

export default function AdminApp() {
  const [authed, setAuthed] = useState(!!getToken());
  const [license, setLicense] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  async function refreshLicense() {
    try {
      const s = await api.get('/admin/license/status');
      setLicense(s);
    } catch {
      setLicense({activated: false});
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refreshLicense();
  }, []);

  function logout() {
    clearToken();
    setAuthed(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Đang tải…</div>;
  if (!authed) return <Login onSuccess={() => {setAuthed(true); refreshLicense();}} />;
  if (license && !license.activated) return <Activate license={license} onActivated={refreshLicense} onLogout={logout} />;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-brand-100 flex flex-col fixed h-full">
        <div className="p-4 border-b border-brand-100">
          <Logo size={34} />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                tab === t.id ? 'brand-gradient text-white' : 'text-gray-600 hover:bg-brand-50'
              }`}>
              <t.icon size={18} /> {t.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-brand-100">
          <div className="px-3 py-2 mb-2 rounded-lg bg-brand-50">
            <div className="flex items-center gap-1.5 text-xs text-brand-700 font-semibold">
              <KeyRound size={13} /> {license?.edition} · {license?.licensee}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              {license?.expiresAt ? `HSD: ${new Date(license.expiresAt).toLocaleDateString('vi-VN')}` : 'Bản quyền vĩnh viễn'}
            </div>
          </div>
          <Link to="/" className="block text-xs text-gray-500 px-3 py-1 hover:text-brand-600">
            ← Về trang chủ
          </Link>
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50">
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 ml-60 p-6">
        {tab === 'overview' && <Overview features={license?.features} />}
        {tab === 'appointments' && <Appointments />}
        {tab === 'patients' && <Patients />}
        {tab === 'catalog' && <Catalog />}
        {tab === 'reports' && <Reports />}
        {tab === 'settings' && <SettingsPanel license={license} onLicenseChange={refreshLicense} />}
      </main>
    </div>
  );
}
