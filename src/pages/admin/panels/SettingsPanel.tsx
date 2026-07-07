import {useEffect, useState} from 'react';
import {Bot, Building2, KeyRound, Lock, Sparkles} from 'lucide-react';
import {api} from '../../../lib/api';

export default function SettingsPanel({license, onLicenseChange}: {license: any; onLicenseChange: () => void}) {
  const [sec, setSec] = useState<'clinic' | 'ai' | 'security' | 'license'>('clinic');
  const items = [
    {id: 'clinic', label: 'Phòng khám', icon: Building2},
    {id: 'ai', label: 'Trợ lý AI', icon: Bot},
    {id: 'security', label: 'Bảo mật', icon: Lock},
    {id: 'license', label: 'Bản quyền', icon: KeyRound},
  ] as const;
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-800 mb-1">Cài đặt hệ thống</h1>
      <p className="text-gray-400 text-sm mb-5">Cấu hình phòng khám, tích hợp AI, bảo mật và bản quyền.</p>
      <div className="flex gap-2 mb-5 flex-wrap">
        {items.map((i) => (
          <button key={i.id} className={`btn ${sec === i.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSec(i.id)}>
            <i.icon size={16} /> {i.label}
          </button>
        ))}
      </div>
      {sec === 'clinic' && <ClinicSettings />}
      {sec === 'ai' && <AISettings />}
      {sec === 'security' && <Security />}
      {sec === 'license' && <License license={license} onLicenseChange={onLicenseChange} />}
    </div>
  );
}

function Saved({show}: {show: boolean}) {
  return show ? <span className="text-sm text-green-600 ml-3">✓ Đã lưu</span> : null;
}

function ClinicSettings() {
  const [c, setC] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api.aget('/admin/settings').then((s) => setC(s.clinic));
  }, []);
  if (!c) return <div className="text-gray-400">Đang tải…</div>;
  const facil = c.facilities || [];
  async function save() {
    await api.aput('/admin/settings/clinic', c);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }
  return (
    <div className="card p-6 max-w-2xl">
      {[
        ['name', 'Tên phòng khám'],
        ['hotline', 'Hotline'],
        ['email', 'Email'],
        ['facebook', 'Fanpage Facebook'],
        ['workingHours', 'Giờ làm việc'],
      ].map(([k, l]) => (
        <div key={k} className="mb-3">
          <label className="label">{l}</label>
          <input className="input" value={c[k] || ''} onChange={(e) => setC({...c, [k]: e.target.value})} />
        </div>
      ))}
      <label className="label mt-2">Cơ sở</label>
      {facil.map((f: any, i: number) => (
        <div key={i} className="grid grid-cols-3 gap-2 mb-2">
          <input className="input" value={f.name} onChange={(e) => {const n = [...facil]; n[i] = {...f, name: e.target.value}; setC({...c, facilities: n});}} />
          <input className="input col-span-2" value={f.address} onChange={(e) => {const n = [...facil]; n[i] = {...f, address: e.target.value}; setC({...c, facilities: n});}} />
        </div>
      ))}
      <button className="btn btn-primary mt-3" onClick={save}>
        Lưu thay đổi
      </button>
      <Saved show={saved} />
    </div>
  );
}

function AISettings() {
  const [ai, setAi] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api.aget('/admin/settings').then((s) => setAi(s.ai));
    api.get('/ai/status').then(setStatus).catch(() => {});
  }, []);
  if (!ai) return <div className="text-gray-400">Đang tải…</div>;

  async function save() {
    // chỉ gửi apiKey nếu người dùng nhập mới (không rỗng)
    const payload: any = {
      provider: ai.provider,
      gemini: {model: ai.gemini.model, apiKey: ai.gemini.newKey || ''},
      openai: {model: ai.openai.model, apiKey: ai.openai.newKey || ''},
      compatible: {baseUrl: ai.compatible.baseUrl, model: ai.compatible.model, apiKey: ai.compatible.newKey || ''},
    };
    await api.aput('/admin/settings/ai', payload);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    api.get('/ai/status').then(setStatus).catch(() => {});
  }

  return (
    <div className="max-w-2xl">
      <div className="card p-6 mb-4">
        <label className="label">Nhà cung cấp AI đang dùng</label>
        <select className="input mb-4" value={ai.provider} onChange={(e) => setAi({...ai, provider: e.target.value})}>
          <option value="gemini">Google Gemini</option>
          <option value="openai">OpenAI</option>
          <option value="compatible">OpenAI-compatible (DeepSeek, OpenRouter, Ollama…)</option>
        </select>

        {ai.provider === 'gemini' && (
          <>
            <label className="label">Model Gemini</label>
            <input className="input mb-3" value={ai.gemini.model} onChange={(e) => setAi({...ai, gemini: {...ai.gemini, model: e.target.value}})} />
            <label className="label">Gemini API Key {ai.gemini.apiKeySet && <span className="text-green-600">(đã thiết lập: {ai.gemini.apiKeyMasked})</span>}</label>
            <input className="input" type="password" placeholder="Nhập key mới để cập nhật" onChange={(e) => setAi({...ai, gemini: {...ai.gemini, newKey: e.target.value}})} />
          </>
        )}
        {ai.provider === 'openai' && (
          <>
            <label className="label">Model OpenAI</label>
            <input className="input mb-3" value={ai.openai.model} onChange={(e) => setAi({...ai, openai: {...ai.openai, model: e.target.value}})} />
            <label className="label">OpenAI API Key {ai.openai.apiKeySet && <span className="text-green-600">(đã thiết lập)</span>}</label>
            <input className="input" type="password" placeholder="sk-..." onChange={(e) => setAi({...ai, openai: {...ai.openai, newKey: e.target.value}})} />
          </>
        )}
        {ai.provider === 'compatible' && (
          <>
            <label className="label">Base URL (VD: https://api.deepseek.com/v1 hoặc http://localhost:11434/v1)</label>
            <input className="input mb-3" value={ai.compatible.baseUrl} onChange={(e) => setAi({...ai, compatible: {...ai.compatible, baseUrl: e.target.value}})} />
            <label className="label">Model</label>
            <input className="input mb-3" value={ai.compatible.model} onChange={(e) => setAi({...ai, compatible: {...ai.compatible, model: e.target.value}})} placeholder="deepseek-chat / llama3.1" />
            <label className="label">API Key (bỏ trống nếu chạy nội bộ Ollama)</label>
            <input className="input" type="password" placeholder="Nhập key mới để cập nhật" onChange={(e) => setAi({...ai, compatible: {...ai.compatible, newKey: e.target.value}})} />
          </>
        )}
        <button className="btn btn-primary mt-4" onClick={save}>
          Lưu cấu hình AI
        </button>
        <Saved show={saved} />
        {status && (
          <p className={`text-sm mt-3 ${status.configured ? 'text-green-600' : 'text-amber-600'}`}>
            {status.configured ? `● Trợ lý AI đang hoạt động (${status.provider})` : '● Chưa cấu hình khóa API — trợ lý AI tạm ngưng.'}
          </p>
        )}
      </div>

      {status?.suggestions && (
        <div className="card p-5">
          <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-brand-500" /> Model đề xuất cho phòng khám
          </h3>
          <div className="space-y-2">
            {status.suggestions.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm border-b border-brand-50 pb-2">
                <div>
                  <span className="font-semibold">{s.model}</span>
                  <span className="text-gray-400 ml-2">({s.provider})</span>
                </div>
                <span className="text-gray-500 text-xs">{s.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Security() {
  const [f, setF] = useState({current: '', next: '', confirm: ''});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  async function save() {
    setErr('');
    setMsg('');
    if (f.next !== f.confirm) return setErr('Mật khẩu xác nhận không khớp.');
    try {
      await api.apost('/admin/password', {current: f.current, next: f.next});
      setMsg('Đã đổi mật khẩu quản trị thành công.');
      setF({current: '', next: '', confirm: ''});
    } catch (e: any) {
      setErr(e.message);
    }
  }
  return (
    <div className="card p-6 max-w-md">
      <h3 className="font-bold text-gray-700 mb-4">Đổi mật khẩu quản trị</h3>
      <label className="label">Mật khẩu hiện tại</label>
      <input className="input mb-3" type="password" value={f.current} onChange={(e) => setF({...f, current: e.target.value})} />
      <label className="label">Mật khẩu mới</label>
      <input className="input mb-3" type="password" value={f.next} onChange={(e) => setF({...f, next: e.target.value})} />
      <label className="label">Xác nhận mật khẩu mới</label>
      <input className="input mb-4" type="password" value={f.confirm} onChange={(e) => setF({...f, confirm: e.target.value})} />
      {err && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{err}</div>}
      {msg && <div className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-3">{msg}</div>}
      <button className="btn btn-primary w-full" onClick={save} disabled={!f.current || !f.next}>
        Đổi mật khẩu
      </button>
    </div>
  );
}

function License({license, onLicenseChange}: {license: any; onLicenseChange: () => void}) {
  const [key, setKey] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function activate() {
    setErr('');
    setMsg('');
    try {
      await api.apost('/admin/license/activate', {key: key.trim()});
      setMsg('Cập nhật bản quyền thành công.');
      setKey('');
      onLicenseChange();
    } catch (e: any) {
      setErr(e.message);
    }
  }
  async function deactivate() {
    if (!confirm('Gỡ bản quyền sẽ KHÓA toàn bộ tính năng nghiệp vụ. Tiếp tục?')) return;
    await api.apost('/admin/license/deactivate', {});
    onLicenseChange();
  }

  return (
    <div className="max-w-2xl">
      <div className="card p-6 mb-4">
        <h3 className="font-bold text-gray-700 mb-4">Thông tin bản quyền hiện tại</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Trạng thái" value={license?.activated ? '✅ Đã kích hoạt' : '❌ Chưa kích hoạt'} />
          <Info label="Phiên bản" value={license?.edition || '—'} />
          <Info label="Cấp cho" value={license?.licensee || '—'} />
          <Info label="Hạn sử dụng" value={license?.expiresAt ? new Date(license.expiresAt).toLocaleDateString('vi-VN') : 'Vĩnh viễn'} />
        </div>
        {license?.features && (
          <div className="mt-4 pt-4 border-t border-brand-50 grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div>Giới hạn bác sỹ: <b>{license.features.maxDoctors === null ? '∞' : license.features.maxDoctors}</b></div>
            <div>Đa cơ sở: <b>{license.features.multiFacility ? 'Có' : 'Không'}</b></div>
            <div>Phân tích nâng cao: <b>{license.features.advancedAnalytics ? 'Có' : 'Không'}</b></div>
            <div>Xuất Word/Excel: <b>Có</b></div>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
          <KeyRound size={16} className="text-brand-500" /> Cập nhật / gia hạn khóa bản quyền
        </h3>
        <textarea className="input font-mono text-xs mb-3" rows={3} placeholder="Dán khóa bản quyền mới (MEHEAL-...)" value={key} onChange={(e) => setKey(e.target.value)} />
        {err && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{err}</div>}
        {msg && <div className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-3">{msg}</div>}
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={activate} disabled={!key.trim()}>
            Kích hoạt khóa mới
          </button>
          {license?.activated && (
            <button className="btn text-red-500 border border-red-200 hover:bg-red-50" onClick={deactivate}>
              Gỡ bản quyền
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Chỉ quản trị viên (đã đăng nhập) mới có quyền quản lý bản quyền. Khóa do nhà cung cấp phát hành và không thể tự tạo nếu không có mã bí mật.
        </p>
      </div>
    </div>
  );
}

function Info({label, value}: {label: string; value: string}) {
  return (
    <div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="font-semibold text-gray-700">{value}</div>
    </div>
  );
}
