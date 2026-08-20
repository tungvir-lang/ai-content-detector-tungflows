import { recordRun, log, type Db } from "@tts/core";
import { MarketingApi, type Campaign } from "./client.js";

/**
 * Rule-based budget/bid automation engine.
 *
 * Rules are stored declaratively in the budget_rules table and evaluated
 * against the locally-synced ad_reports snapshot over a lookback window. Each
 * rule says: "if <metric> <comparator> <threshold> over the last N days, then
 * <action> by <value>, clamped to [min_budget, max_budget]."
 *
 * Safety:
 *   - Runs in dry-run unless explicitly disabled.
 *   - Every decision (fired or not) is written to run_log.
 *   - Budget changes are clamped so a runaway rule cannot spend without bound.
 */

export type Comparator = "gt" | "gte" | "lt" | "lte";
export type Metric = "spend" | "clicks" | "impressions" | "conversions" | "roas" | "cpa";
export type Action = "increase_budget_pct" | "decrease_budget_pct" | "set_budget" | "pause";

export interface BudgetRule {
  id: number;
  name: string;
  enabled: boolean;
  objectType: "campaign" | "adgroup";
  objectId: string | null; // null = applies to all objects of the type
  metric: Metric;
  comparator: Comparator;
  threshold: number;
  lookbackDays: number;
  action: Action;
  actionValue: number;
  maxBudget: number | null;
  minBudget: number | null;
}

interface RuleRow {
  id: number;
  name: string;
  enabled: number;
  object_type: string;
  object_id: string | null;
  metric: string;
  comparator: string;
  threshold: number;
  lookback_days: number;
  action: string;
  action_value: number;
  max_budget: number | null;
  min_budget: number | null;
}

interface Aggregate {
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  revenue: number;
}

export interface Decision {
  ruleId: number;
  ruleName: string;
  objectId: string;
  metricValue: number;
  fired: boolean;
  currentBudget: number;
  nextBudget: number | null;
  action: Action;
}

function compare(value: number, comparator: Comparator, threshold: number): boolean {
  switch (comparator) {
    case "gt": return value > threshold;
    case "gte": return value >= threshold;
    case "lt": return value < threshold;
    case "lte": return value <= threshold;
  }
}

function metricValue(agg: Aggregate, metric: Metric): number {
  switch (metric) {
    case "spend": return agg.spend;
    case "clicks": return agg.clicks;
    case "impressions": return agg.impressions;
    case "conversions": return agg.conversions;
    case "roas": return agg.spend > 0 ? agg.revenue / agg.spend : 0;
    case "cpa": return agg.conversions > 0 ? agg.spend / agg.conversions : Infinity;
  }
}

export function listRules(db: Db): BudgetRule[] {
  const rows = db.prepare(`SELECT * FROM budget_rules ORDER BY id`).all() as RuleRow[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    enabled: r.enabled === 1,
    objectType: r.object_type as "campaign" | "adgroup",
    objectId: r.object_id,
    metric: r.metric as Metric,
    comparator: r.comparator as Comparator,
    threshold: r.threshold,
    lookbackDays: r.lookback_days,
    action: r.action as Action,
    actionValue: r.action_value,
    maxBudget: r.max_budget,
    minBudget: r.min_budget,
  }));
}

function aggregateFor(db: Db, objectType: string, objectId: string, lookbackDays: number): Aggregate {
  const since = new Date(Date.now() - lookbackDays * 86400_000).toISOString().slice(0, 10);
  const row = db
    .prepare(
      `SELECT
         COALESCE(SUM(spend),0) AS spend,
         COALESCE(SUM(clicks),0) AS clicks,
         COALESCE(SUM(impressions),0) AS impressions,
         COALESCE(SUM(conversions),0) AS conversions,
         COALESCE(SUM(revenue),0) AS revenue
       FROM ad_reports
       WHERE object_type = ? AND object_id = ? AND stat_date >= ?`,
    )
    .get(objectType, objectId, since) as Aggregate;
  return row;
}

function nextBudget(rule: BudgetRule, current: number): number | null {
  let next: number;
  switch (rule.action) {
    case "increase_budget_pct": next = current * (1 + rule.actionValue / 100); break;
    case "decrease_budget_pct": next = current * (1 - rule.actionValue / 100); break;
    case "set_budget": next = rule.actionValue; break;
    case "pause": return null; // handled separately
  }
  if (rule.maxBudget !== null) next = Math.min(next, rule.maxBudget);
  if (rule.minBudget !== null) next = Math.max(next, rule.minBudget);
  return Math.round(next * 100) / 100;
}

export class BudgetAutomationEngine {
  constructor(
    private readonly api: MarketingApi,
    private readonly db: Db,
    private readonly dryRun: boolean,
  ) {}

  /**
   * Evaluate all enabled rules against the local snapshot and apply the ones
   * that fire. Returns every decision (fired or not) for surfacing in the UI.
   */
  async run(): Promise<Decision[]> {
    const rules = listRules(this.db).filter((r) => r.enabled);
    const campaigns = await this.api.listCampaigns();
    const byId = new Map(campaigns.map((c) => [c.campaign_id, c]));

    const decisions: Decision[] = [];
    for (const rule of rules) {
      const targets = rule.objectId ? [rule.objectId] : campaigns.map((c) => c.campaign_id);
      for (const objectId of targets) {
        const decision = await this.evaluate(rule, objectId, byId.get(objectId));
        decisions.push(decision);
      }
    }
    return decisions;
  }

  private async evaluate(
    rule: BudgetRule,
    objectId: string,
    campaign: Campaign | undefined,
  ): Promise<Decision> {
    const agg = aggregateFor(this.db, rule.objectType, objectId, rule.lookbackDays);
    const value = metricValue(agg, rule.metric);
    const fired = compare(value, rule.comparator, rule.threshold);
    const currentBudget = campaign?.budget ?? 0;
    const next = fired ? nextBudget(rule, currentBudget) : currentBudget;

    const decision: Decision = {
      ruleId: rule.id,
      ruleName: rule.name,
      objectId,
      metricValue: value,
      fired,
      currentBudget,
      nextBudget: fired ? next : null,
      action: rule.action,
    };

    recordRun(this.db, {
      module: "marketing",
      action: fired ? `rule_fired:${rule.action}` : "rule_evaluated",
      target: objectId,
      dryRun: this.dryRun,
      detail: { ...decision, metric: rule.metric, threshold: rule.threshold },
    });

    if (!fired) return decision;

    if (this.dryRun) {
      log.info("automation dry-run", { rule: rule.name, objectId, action: rule.action, next });
      return decision;
    }

    if (rule.action === "pause") {
      // Pausing is intentionally not auto-executed here without an explicit
      // pause endpoint wiring; log the intent for operator review.
      log.warn("pause requested by rule — review manually", { rule: rule.name, objectId });
      return decision;
    }
    if (next !== null && rule.objectType === "campaign") {
      await this.api.updateCampaignBudget(objectId, next);
      log.info("automation applied", { rule: rule.name, objectId, budget: next });
    } else if (next !== null) {
      await this.api.updateAdGroupBudget(objectId, next);
      log.info("automation applied", { rule: rule.name, objectId, budget: next });
    }
    return decision;
  }
}
