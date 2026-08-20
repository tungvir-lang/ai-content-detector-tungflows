/** Typed fetch helpers against the backend REST API. */

export interface Summary {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  roas: number;
}

export interface DailyRow {
  stat_date: string;
  spend: number;
  revenue: number;
  clicks: number;
  impressions: number;
}

export interface CampaignRow {
  campaignId: string;
  name: string | null;
  spend: number;
  revenue: number;
  clicks: number;
  conversions: number;
}

export interface BudgetRule {
  id: number;
  name: string;
  enabled: boolean;
  objectType: string;
  objectId: string | null;
  metric: string;
  comparator: string;
  threshold: number;
  lookbackDays: number;
  action: string;
  actionValue: number;
  maxBudget: number | null;
  minBudget: number | null;
}

export interface ScheduledPost {
  id: number;
  caption: string;
  videoUrl: string | null;
  productIds: string[];
  scheduledAt: number;
  status: string;
  publishId: string | null;
  error: string | null;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return (await res.json()) as T;
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  health: () => get<{ ok: boolean; dryRun: boolean }>("/api/health"),
  summary: () => get<Summary>("/api/reports/summary"),
  daily: () => get<DailyRow[]>("/api/reports/daily"),
  campaigns: () => get<CampaignRow[]>("/api/reports/campaigns"),
  rules: () => get<BudgetRule[]>("/api/rules"),
  createRule: (r: Partial<BudgetRule>) => send<{ id: number }>("POST", "/api/rules", r),
  deleteRule: (id: number) => send<{ ok: boolean }>("DELETE", `/api/rules/${id}`),
  runAutomation: () => send<{ dryRun: boolean; decisions: unknown[] }>("POST", "/api/automation/run"),
  schedule: () => get<ScheduledPost[]>("/api/schedule"),
  addPost: (p: { caption: string; videoUrl?: string; scheduledAt: number }) =>
    send<{ id: number }>("POST", "/api/schedule", p),
  cancelPost: (id: number) => send<{ ok: boolean }>("DELETE", `/api/schedule/${id}`),
};
