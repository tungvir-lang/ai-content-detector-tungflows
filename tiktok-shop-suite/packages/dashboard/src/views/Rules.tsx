import { useEffect, useState } from "react";
import { api, type BudgetRule } from "../api.js";

const METRICS = ["roas", "spend", "cpa", "clicks", "conversions", "impressions"];
const COMPARATORS = [
  { v: "lt", label: "<" },
  { v: "lte", label: "≤" },
  { v: "gt", label: ">" },
  { v: "gte", label: "≥" },
];
const ACTIONS = [
  { v: "increase_budget_pct", label: "Tăng ngân sách %" },
  { v: "decrease_budget_pct", label: "Giảm ngân sách %" },
  { v: "set_budget", label: "Đặt ngân sách" },
  { v: "pause", label: "Tạm dừng (thủ công)" },
];

export function Rules() {
  const [rules, setRules] = useState<BudgetRule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [runMsg, setRunMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    metric: "roas",
    comparator: "lt",
    threshold: 1,
    lookbackDays: 3,
    action: "decrease_budget_pct",
    actionValue: 15,
    maxBudget: "",
    minBudget: "",
  });

  const load = () => api.rules().then(setRules).catch((e: unknown) => setError(String(e)));
  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    await api.createRule({
      name: form.name || `${form.metric} ${form.comparator} ${form.threshold}`,
      metric: form.metric,
      comparator: form.comparator,
      threshold: Number(form.threshold),
      lookbackDays: Number(form.lookbackDays),
      action: form.action,
      actionValue: Number(form.actionValue),
      objectType: "campaign",
      maxBudget: form.maxBudget ? Number(form.maxBudget) : null,
      minBudget: form.minBudget ? Number(form.minBudget) : null,
    });
    setForm({ ...form, name: "" });
    void load();
  };

  const runNow = async () => {
    setRunMsg("Đang chạy…");
    const res = await api.runAutomation();
    const fired = (res.decisions as { fired: boolean }[]).filter((d) => d.fired).length;
    setRunMsg(`${res.dryRun ? "[DRY-RUN] " : ""}Đã đánh giá ${res.decisions.length} mục, ${fired} luật kích hoạt.`);
    void load();
  };

  return (
    <>
      <div className="panel">
        <h2>Thêm luật tự động</h2>
        <div className="form-row">
          <div className="field">
            <label>Tên</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ROAS thấp → giảm" />
          </div>
          <div className="field">
            <label>Chỉ số</label>
            <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
              {METRICS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Điều kiện</label>
            <select value={form.comparator} onChange={(e) => setForm({ ...form, comparator: e.target.value })}>
              {COMPARATORS.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Ngưỡng</label>
            <input type="number" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label>Lookback (ngày)</label>
            <input type="number" value={form.lookbackDays} onChange={(e) => setForm({ ...form, lookbackDays: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label>Hành động</label>
            <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}>
              {ACTIONS.map((a) => <option key={a.v} value={a.v}>{a.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Giá trị</label>
            <input type="number" value={form.actionValue} onChange={(e) => setForm({ ...form, actionValue: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label>Ngân sách tối đa</label>
            <input type="number" value={form.maxBudget} onChange={(e) => setForm({ ...form, maxBudget: e.target.value })} />
          </div>
          <button className="action" onClick={() => void create()}>Thêm luật</button>
        </div>
      </div>

      <div className="panel">
        <h2>
          Luật hiện có{" "}
          <button className="ghost" onClick={() => void runNow()} style={{ marginLeft: 8 }}>Chạy tự động ngay</button>
        </h2>
        {runMsg && <p className="empty">{runMsg}</p>}
        {error && <p className="error">{error}</p>}
        {rules.length === 0 ? (
          <p className="empty">Chưa có luật nào.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tên</th><th>Điều kiện</th><th>Lookback</th><th>Hành động</th><th>Giới hạn</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.metric} {r.comparator} {r.threshold}</td>
                  <td>{r.lookbackDays}d</td>
                  <td>{r.action} ({r.actionValue})</td>
                  <td>{r.minBudget ?? "–"} / {r.maxBudget ?? "–"}</td>
                  <td><button className="ghost" onClick={() => api.deleteRule(r.id).then(load)}>Xóa</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
