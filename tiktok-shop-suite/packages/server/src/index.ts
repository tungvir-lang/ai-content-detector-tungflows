import express, { type Request, type Response } from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { log, recordRun } from "@tts/core";
import { listRules } from "@tts/marketing";
import { enqueue, listPosts, cancel } from "@tts/scheduler";
import { buildContext, type AppContext } from "./context.js";

/**
 * REST API for the dashboard. Read endpoints query the local SQLite snapshot;
 * write endpoints mutate rules/schedule and trigger automation runs. The
 * built dashboard (if present) is served as static files at the root.
 */

const ctx: AppContext = buildContext();
const app = express();
app.use(express.json({ limit: "1mb" }));

const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response) => {
    fn(req, res).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      log.error("request failed", { path: req.path, error: message });
      res.status(500).json({ error: message });
    });
  };

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, dryRun: ctx.cfg.dryRun, ts: Date.now() });
});

// --- Reports ---------------------------------------------------------------

app.get("/api/reports/summary", (_req, res) => {
  const row = ctx.db
    .prepare(
      `SELECT
         COALESCE(SUM(spend),0) AS spend,
         COALESCE(SUM(impressions),0) AS impressions,
         COALESCE(SUM(clicks),0) AS clicks,
         COALESCE(SUM(conversions),0) AS conversions,
         COALESCE(SUM(revenue),0) AS revenue
       FROM ad_reports
       WHERE stat_date >= date('now','-30 day')`,
    )
    .get() as { spend: number; impressions: number; clicks: number; conversions: number; revenue: number };
  const ctr = row.impressions > 0 ? row.clicks / row.impressions : 0;
  const roas = row.spend > 0 ? row.revenue / row.spend : 0;
  res.json({ ...row, ctr, roas });
});

app.get("/api/reports/daily", (_req, res) => {
  const rows = ctx.db
    .prepare(
      `SELECT stat_date,
              SUM(spend) AS spend,
              SUM(revenue) AS revenue,
              SUM(clicks) AS clicks,
              SUM(impressions) AS impressions
       FROM ad_reports
       WHERE stat_date >= date('now','-30 day')
       GROUP BY stat_date
       ORDER BY stat_date`,
    )
    .all();
  res.json(rows);
});

app.get("/api/reports/campaigns", (_req, res) => {
  const rows = ctx.db
    .prepare(
      `SELECT object_id AS campaignId,
              MAX(object_name) AS name,
              SUM(spend) AS spend,
              SUM(revenue) AS revenue,
              SUM(clicks) AS clicks,
              SUM(conversions) AS conversions
       FROM ad_reports
       WHERE object_type = 'campaign' AND stat_date >= date('now','-30 day')
       GROUP BY object_id
       ORDER BY spend DESC`,
    )
    .all();
  res.json(rows);
});

// --- Budget rules ----------------------------------------------------------

app.get("/api/rules", (_req, res) => {
  res.json(listRules(ctx.db));
});

app.post(
  "/api/rules",
  (req: Request, res: Response) => {
    const b = req.body as Record<string, unknown>;
    const info = ctx.db
      .prepare(
        `INSERT INTO budget_rules
           (name, enabled, object_type, object_id, metric, comparator, threshold, lookback_days, action, action_value, max_budget, min_budget, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        String(b.name ?? "rule"),
        b.enabled === false ? 0 : 1,
        String(b.objectType ?? "campaign"),
        b.objectId ? String(b.objectId) : null,
        String(b.metric ?? "roas"),
        String(b.comparator ?? "lt"),
        Number(b.threshold ?? 0),
        Number(b.lookbackDays ?? 3),
        String(b.action ?? "decrease_budget_pct"),
        Number(b.actionValue ?? 10),
        b.maxBudget != null ? Number(b.maxBudget) : null,
        b.minBudget != null ? Number(b.minBudget) : null,
        Date.now(),
      );
    res.status(201).json({ id: Number(info.lastInsertRowid) });
  },
);

app.delete("/api/rules/:id", (req: Request, res: Response) => {
  ctx.db.prepare(`DELETE FROM budget_rules WHERE id = ?`).run(Number(req.params.id));
  res.json({ ok: true });
});

app.post(
  "/api/automation/run",
  asyncHandler(async (_req, res) => {
    const decisions = await ctx.automation.run();
    res.json({ dryRun: ctx.cfg.dryRun, decisions });
  }),
);

// --- Affiliate -------------------------------------------------------------

app.post(
  "/api/affiliate/plan",
  asyncHandler(async (req, res) => {
    const b = req.body as Record<string, unknown>;
    const changes = await ctx.affiliateBot.plan({
      defaultRate: Number(b.defaultRate ?? 10),
      maxRate: Number(b.maxRate ?? 30),
      minDeltaToUpdate: Number(b.minDeltaToUpdate ?? 0.5),
      overrides: (b.overrides as Record<string, number>) ?? {},
    });
    res.json({ dryRun: ctx.cfg.dryRun, changes });
  }),
);

app.post(
  "/api/affiliate/apply",
  asyncHandler(async (req, res) => {
    const b = req.body as Record<string, unknown>;
    const changes = await ctx.affiliateBot.apply({
      defaultRate: Number(b.defaultRate ?? 10),
      maxRate: Number(b.maxRate ?? 30),
      minDeltaToUpdate: Number(b.minDeltaToUpdate ?? 0.5),
      overrides: (b.overrides as Record<string, number>) ?? {},
    });
    res.json({ dryRun: ctx.cfg.dryRun, changes });
  }),
);

// --- Scheduler -------------------------------------------------------------

app.get("/api/schedule", (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  res.json(listPosts(ctx.db, status as never));
});

app.post("/api/schedule", (req: Request, res: Response) => {
  const b = req.body as Record<string, unknown>;
  const id = enqueue(ctx.db, {
    caption: String(b.caption ?? ""),
    videoUrl: b.videoUrl ? String(b.videoUrl) : undefined,
    productIds: (b.productIds as string[]) ?? [],
    scheduledAt: Number(b.scheduledAt ?? Date.now()),
  });
  recordRun(ctx.db, { module: "scheduler", action: "enqueue", target: String(id), dryRun: ctx.cfg.dryRun });
  res.status(201).json({ id });
});

app.delete("/api/schedule/:id", (req: Request, res: Response) => {
  cancel(ctx.db, Number(req.params.id));
  res.json({ ok: true });
});

// --- Run log ---------------------------------------------------------------

app.get("/api/runs", (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const rows = ctx.db.prepare(`SELECT * FROM run_log ORDER BY ts DESC LIMIT ?`).all(limit);
  res.json(rows);
});

// --- Static dashboard ------------------------------------------------------

const here = dirname(fileURLToPath(import.meta.url));
const dashboardDist = join(here, "../../dashboard/dist");
if (existsSync(dashboardDist)) {
  app.use(express.static(dashboardDist));
  app.get("*", (_req, res) => res.sendFile(join(dashboardDist, "index.html")));
}

app.listen(ctx.cfg.serverPort, () => {
  log.info("server listening", { port: ctx.cfg.serverPort, dryRun: ctx.cfg.dryRun });
});
