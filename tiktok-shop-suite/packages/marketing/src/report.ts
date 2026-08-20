import { log, type Db } from "@tts/core";
import { MarketingApi } from "./client.js";

/**
 * Sync Marketing API reports into the ad_reports table so the dashboard can
 * query performance without hitting rate limits, and the automation engine can
 * evaluate rules against a stable local snapshot.
 */

function num(v: string | undefined): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export interface SyncSummary {
  level: string;
  rows: number;
  startDate: string;
  endDate: string;
}

export async function syncCampaignReports(
  api: MarketingApi,
  db: Db,
  advertiserId: string,
  startDate: string,
  endDate: string,
): Promise<SyncSummary> {
  const rows = await api.getReport(
    "AUCTION_CAMPAIGN",
    ["campaign_id", "stat_time_day"],
    startDate,
    endDate,
  );

  const stmt = db.prepare(
    `INSERT INTO ad_reports
       (stat_date, advertiser_id, object_type, object_id, object_name, spend, impressions, clicks, conversions, revenue, synced_at)
     VALUES (@stat_date, @advertiser_id, 'campaign', @object_id, @object_name, @spend, @impressions, @clicks, @conversions, @revenue, @synced_at)
     ON CONFLICT(stat_date, object_type, object_id) DO UPDATE SET
       spend = excluded.spend,
       impressions = excluded.impressions,
       clicks = excluded.clicks,
       conversions = excluded.conversions,
       revenue = excluded.revenue,
       synced_at = excluded.synced_at`,
  );

  const now = Date.now();
  const insertAll = db.transaction((list: typeof rows) => {
    for (const row of list) {
      const spend = num(row.metrics.spend);
      const roas = num(row.metrics.complete_payment_roas);
      stmt.run({
        stat_date: row.dimensions.stat_time_day?.slice(0, 10) ?? startDate,
        advertiser_id: advertiserId,
        object_id: row.dimensions.campaign_id ?? "unknown",
        object_name: row.dimensions.campaign_id ?? null,
        spend,
        impressions: Math.round(num(row.metrics.impressions)),
        clicks: Math.round(num(row.metrics.clicks)),
        conversions: num(row.metrics.conversion),
        revenue: spend * roas,
        synced_at: now,
      });
    }
  });
  insertAll(rows);

  log.info("report sync complete", { level: "campaign", rows: rows.length });
  return { level: "campaign", rows: rows.length, startDate, endDate };
}
