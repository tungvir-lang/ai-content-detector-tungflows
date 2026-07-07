import {useEffect, useState} from 'react';
import {Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {CalendarClock, CheckCircle2, TrendingUp, Wallet} from 'lucide-react';
import {api, money, STATUS} from '../../../lib/api';

const COLORS = ['#f47c20', '#ff8c3f', '#ffa668', '#e5670f', '#be4f0d', '#973f13'];

export default function Overview({features}: {features: any}) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const to = new Date().toISOString().slice(0, 10);
    const fromD = new Date();
    fromD.setDate(fromD.getDate() - 29);
    const from = fromD.toISOString().slice(0, 10);
    api.aget(`/reports/stats?from=${from}&to=${to}`).then(setStats).catch(() => {});
  }, []);

  if (!stats) return <div className="text-gray-400">Đang tải số liệu…</div>;

  const completed = stats.byStatus.find((s: any) => s.status === 'completed')?.c || 0;
  const cards = [
    {label: 'Lượt hẹn (30 ngày)', value: stats.total, icon: CalendarClock, color: 'text-brand-600 bg-brand-50'},
    {label: 'Hôm nay', value: stats.today.total, icon: TrendingUp, color: 'text-blue-600 bg-blue-50'},
    {label: 'Đã hoàn thành', value: completed, icon: CheckCircle2, color: 'text-green-600 bg-green-50'},
    {label: 'Doanh thu (hoàn thành)', value: money(stats.revenue), icon: Wallet, color: 'text-purple-600 bg-purple-50'},
  ];

  const statusData = stats.byStatus.map((s: any) => ({name: STATUS[s.status]?.label || s.status, value: s.c}));
  const doctorData = stats.byDoctor.slice(0, 8).map((d: any) => ({name: (d.name || '—').replace(/^(ThS\.BS\.|BS\.CKII\.|BS\.CKI\.|ThS\.) /, ''), value: d.c}));
  const trendData = stats.trend.map((t: any) => ({date: t.d?.slice(5), value: t.c}));

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-800 mb-1">Bảng điều khiển</h1>
      <p className="text-gray-400 text-sm mb-6">Tổng hợp trực quan hoạt động phòng khám 30 ngày gần nhất.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.color}`}>
              <c.icon size={20} />
            </div>
            <div className="text-2xl font-extrabold text-gray-800">{c.value}</div>
            <div className="text-xs text-gray-400 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-bold text-gray-700 mb-4">Lượt hẹn theo ngày</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0e6da" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="value" name="Lượt hẹn" stroke="#f47c20" strokeWidth={2.5} dot={{r: 3}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="font-bold text-gray-700 mb-4">Theo trạng thái</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={70} label>
                {statusData.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{fontSize: 11}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold text-gray-700 mb-4">Lượt khám theo bác sỹ</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={doctorData} layout="vertical" margin={{left: 30}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0e6da" />
            <XAxis type="number" allowDecimals={false} fontSize={11} />
            <YAxis type="category" dataKey="name" width={120} fontSize={11} />
            <Tooltip />
            <Bar dataKey="value" name="Lượt khám" fill="#f47c20" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {features && !features.advancedAnalytics && (
        <p className="text-xs text-gray-400 mt-4">
          💡 Nâng cấp lên bản <b>PRO</b> để mở khóa phân tích nâng cao (dự báo lượt khám, phân tích theo nhóm rối loạn, so sánh cơ sở…).
        </p>
      )}
    </div>
  );
}
