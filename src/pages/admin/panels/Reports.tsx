import {useEffect, useState} from 'react';
import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {FileSpreadsheet, FileText} from 'lucide-react';
import {api, downloadFile, money, STATUS} from '../../../lib/api';

export default function Reports() {
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 29);
  const [range, setRange] = useState({from: monthAgo.toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10)});
  const [stats, setStats] = useState<any>(null);
  const [busy, setBusy] = useState('');

  async function load() {
    setStats(await api.aget(`/reports/stats?from=${range.from}&to=${range.to}`));
  }
  useEffect(() => {
    load().catch(() => {});
  }, [range]);

  async function exportFile(kind: 'excel' | 'word') {
    setBusy(kind);
    try {
      const url = `/reports/export/${kind}?from=${range.from}&to=${range.to}`;
      await downloadFile(url, `MeHeal-BaoCao.${kind === 'excel' ? 'xlsx' : 'docx'}`);
    } finally {
      setBusy('');
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-800 mb-1">Báo cáo & Xuất file</h1>
      <p className="text-gray-400 text-sm mb-5">Tổng hợp trực quan và xuất báo cáo Word / Excel theo khoảng thời gian.</p>

      <div className="card p-5 mb-5 flex flex-wrap items-end gap-4">
        <div>
          <label className="label">Từ ngày</label>
          <input type="date" className="input" value={range.from} onChange={(e) => setRange({...range, from: e.target.value})} />
        </div>
        <div>
          <label className="label">Đến ngày</label>
          <input type="date" className="input" value={range.to} onChange={(e) => setRange({...range, to: e.target.value})} />
        </div>
        <div className="flex gap-2 ml-auto">
          <button className="btn btn-ghost" disabled={busy === 'excel'} onClick={() => exportFile('excel')}>
            <FileSpreadsheet size={16} className="text-green-600" /> {busy === 'excel' ? 'Đang xuất…' : 'Xuất Excel'}
          </button>
          <button className="btn btn-ghost" disabled={busy === 'word'} onClick={() => exportFile('word')}>
            <FileText size={16} className="text-blue-600" /> {busy === 'word' ? 'Đang xuất…' : 'Xuất Word'}
          </button>
        </div>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <Stat label="Tổng lượt hẹn" value={stats.total} />
            <Stat label="Doanh thu" value={money(stats.revenue)} />
            <Stat label="Số bác sỹ có lịch" value={stats.byDoctor.length} />
            <Stat label="Số dịch vụ" value={stats.byService.length} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="font-bold text-gray-700 mb-4">Theo dịch vụ</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.byService.map((s: any) => ({name: s.name, value: s.c}))} layout="vertical" margin={{left: 40}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0e6da" />
                  <XAxis type="number" allowDecimals={false} fontSize={11} />
                  <YAxis type="category" dataKey="name" width={130} fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="value" name="Lượt" fill="#f47c20" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card p-5">
              <h3 className="font-bold text-gray-700 mb-4">Chi tiết theo trạng thái</h3>
              <table className="w-full text-sm">
                <tbody>
                  {stats.byStatus.map((s: any) => (
                    <tr key={s.status} className="border-b border-brand-50">
                      <td className="py-2.5">
                        <span className={`badge ${STATUS[s.status]?.cls}`}>{STATUS[s.status]?.label || s.status}</span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-gray-700">{s.c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3 className="font-bold text-gray-700 mt-6 mb-3">Theo bác sỹ</h3>
              <table className="w-full text-sm">
                <tbody>
                  {stats.byDoctor.map((d: any, i: number) => (
                    <tr key={i} className="border-b border-brand-50">
                      <td className="py-2 text-gray-600">{d.name || '(chưa gán)'}</td>
                      <td className="py-2 text-right font-bold text-brand-600">{d.c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({label, value}: {label: string; value: any}) {
  return (
    <div className="card p-5">
      <div className="text-2xl font-extrabold text-gray-800">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}
