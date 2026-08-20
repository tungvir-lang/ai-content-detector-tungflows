import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { api, type Summary, type DailyRow } from "../api.js";
import { fmtInt, fmtMoney, fmtPct, fmtX } from "../format.js";

export function Overview() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.summary(), api.daily()])
      .then(([s, d]) => {
        setSummary(s);
        setDaily(d);
      })
      .catch((e: unknown) => setError(String(e)));
  }, []);

  if (error) return <p className="error">Không tải được dữ liệu: {error}</p>;
  if (!summary) return <p className="empty">Đang tải…</p>;

  const kpis = [
    { label: "Chi tiêu (30 ngày)", value: fmtMoney(summary.spend) },
    { label: "Doanh thu", value: fmtMoney(summary.revenue) },
    { label: "ROAS", value: fmtX(summary.roas) },
    { label: "Hiển thị", value: fmtInt(summary.impressions) },
    { label: "Click", value: fmtInt(summary.clicks) },
    { label: "CTR", value: fmtPct(summary.ctr) },
    { label: "Chuyển đổi", value: fmtInt(summary.conversions) },
  ];

  return (
    <>
      <div className="kpis">
        {kpis.map((k) => (
          <div className="kpi" key={k.label}>
            <div className="label">{k.label}</div>
            <div className="value">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <h2>Chi tiêu vs Doanh thu theo ngày</h2>
        {daily.length === 0 ? (
          <p className="empty">Chưa có dữ liệu báo cáo. Chạy worker để đồng bộ từ Marketing API.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={daily} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="#2a2f3a" strokeDasharray="3 3" />
              <XAxis dataKey="stat_date" stroke="#9aa3b2" fontSize={12} />
              <YAxis stroke="#9aa3b2" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "#1e222b", border: "1px solid #2a2f3a", borderRadius: 8, color: "#e6e8ec" }}
              />
              <Line type="monotone" dataKey="spend" name="Chi tiêu" stroke="#ff3b5c" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#22d3ee" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}
