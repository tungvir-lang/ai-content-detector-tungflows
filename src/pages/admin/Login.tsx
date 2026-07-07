import {useState} from 'react';
import {Lock} from 'lucide-react';
import {api, setToken} from '../../lib/api';
import {Logo} from '../../components/Brand';

export default function Login({onSuccess}: {onSuccess: () => void}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/admin/login', {password});
      setToken(res.token);
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center brand-gradient p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="flex justify-center mb-6">
          <Logo size={48} />
        </div>
        <h1 className="text-xl font-bold text-center text-gray-800">Quản trị hệ thống</h1>
        <p className="text-center text-sm text-gray-400 mb-6">MeHeal Clinic Bot · Khu vực dành cho quản trị viên</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label flex items-center gap-1">
              <Lock size={13} /> Mật khẩu quản trị
            </label>
            <input className="input" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Đang kiểm tra…' : 'Đăng nhập'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-300 mt-6">© {new Date().getFullYear()} MeHeal · Bản quyền có kiểm soát</p>
      </div>
    </div>
  );
}
