import { useEffect, useState } from "react";
import { api, type CampaignRow } from "../api.js";
import { fmtInt, fmtMoney, fmtX } from "../format.js";

export function Campaigns() {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.campaigns().then(setRows).catch((e: unknown) => setError(String(e)));
  }, []);

  if (error) return <p className="error">{error}</p>;

  return (
    <div className="panel">
      <h2>Chiến dịch (30 ngày)</h2>
      {rows.length === 0 ? (
        <p className="empty">Chưa có dữ liệu chiến dịch.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Chiến dịch</th>
              <th className="num">Chi tiêu</th>
              <th className="num">Doanh thu</th>
              <th className="num">ROAS</th>
              <th className="num">Click</th>
              <th className="num">Chuyển đổi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const roas = r.spend > 0 ? r.revenue / r.spend : 0;
              return (
                <tr key={r.campaignId}>
                  <td>{r.name ?? r.campaignId}</td>
                  <td className="num">{fmtMoney(r.spend)}</td>
                  <td className="num">{fmtMoney(r.revenue)}</td>
                  <td className="num">{fmtX(roas)}</td>
                  <td className="num">{fmtInt(r.clicks)}</td>
                  <td className="num">{fmtInt(r.conversions)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
