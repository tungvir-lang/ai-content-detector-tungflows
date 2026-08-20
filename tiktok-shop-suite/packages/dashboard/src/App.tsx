import { useEffect, useState } from "react";
import { api } from "./api.js";
import { Overview } from "./views/Overview.js";
import { Campaigns } from "./views/Campaigns.js";
import { Rules } from "./views/Rules.js";
import { Schedule } from "./views/Schedule.js";

type Tab = "overview" | "campaigns" | "rules" | "schedule";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "campaigns", label: "Chiến dịch" },
  { id: "rules", label: "Luật tự động" },
  { id: "schedule", label: "Lịch đăng" },
];

export function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [dryRun, setDryRun] = useState<boolean | null>(null);

  useEffect(() => {
    api.health().then((h) => setDryRun(h.dryRun)).catch(() => setDryRun(null));
  }, []);

  return (
    <div className="app">
      <header className="top">
        <h1>TikTok Shop Automation</h1>
        {dryRun === null ? (
          <span className="badge">chưa kết nối</span>
        ) : dryRun ? (
          <span className="badge dry">DRY-RUN · chỉ mô phỏng</span>
        ) : (
          <span className="badge live">LIVE · thao tác thật</span>
        )}
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "overview" && <Overview />}
      {tab === "campaigns" && <Campaigns />}
      {tab === "rules" && <Rules />}
      {tab === "schedule" && <Schedule />}
    </div>
  );
}
