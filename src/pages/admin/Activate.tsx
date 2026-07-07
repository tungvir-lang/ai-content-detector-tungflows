import {useState} from 'react';
import {KeyRound, LogOut, ShieldAlert} from 'lucide-react';
import {api} from '../../lib/api';
import {Logo} from '../../components/Brand';

export default function Activate({license, onActivated, onLogout}: {license: any; onActivated: () => void; onLogout: () => void}) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function activate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.apost('/admin/license/activate', {key: key.trim()});
      onActivated();
    } catch (e: any) {
      setError(e.message || 'Kích hoạt thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <Logo size={40} />
          <button onClick={onLogout} className="text-sm text-gray-400 flex items-center gap-1 hover:text-red-500">
            <LogOut size={14} /> Đăng xuất
          </button>
        </div>
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <ShieldAlert className="text-amber-500 shrink-0" />
          <div className="text-sm text-amber-800">
            <b>Hệ thống chưa được kích hoạt bản quyền.</b>
            <p className="mt-1 text-amber-700">{license?.reason || 'Vui lòng nhập khóa bản quyền do nhà cung cấp phát hành để mở khóa toàn bộ tính năng.'}</p>
          </div>
        </div>

        <form onSubmit={activate} className="space-y-4">
          <div>
            <label className="label flex items-center gap-1">
              <KeyRound size={13} /> Khóa bản quyền (License Key)
            </label>
            <textarea
              className="input font-mono text-xs"
              rows={3}
              placeholder="MEHEAL-xxxxxxxxxxxxxxxxxxxx~xxxxxxxx"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
          <button className="btn btn-primary w-full" disabled={loading || !key.trim()}>
            {loading ? 'Đang kích hoạt…' : 'Kích hoạt hệ thống'}
          </button>
        </form>

        <div className="mt-6 text-xs text-gray-400 border-t pt-4">
          <p className="font-semibold text-gray-500 mb-1">Chưa có khóa bản quyền?</p>
          <p>Liên hệ nhà cung cấp <b>MeHeal / Tungflows</b> để được cấp khóa. Khóa được phát hành bằng công cụ nội bộ:</p>
          <code className="block bg-gray-100 rounded p-2 mt-1 text-gray-600">npm run keygen -- -e PRO -l "Tên phòng khám" -d 365</code>
        </div>
      </div>
    </div>
  );
}
