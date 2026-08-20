import { MarketingClient, type Db, type MarketingConfig } from "@tts/core";

/**
 * TikTok Marketing API client for campaign/adgroup reporting and budget/bid
 * mutation — the operator's OWN advertiser account only.
 */

export interface Campaign {
  campaign_id: string;
  campaign_name: string;
  budget: number;
  budget_mode: string;
  operation_status: string;
}

export interface AdGroup {
  adgroup_id: string;
  adgroup_name: string;
  campaign_id: string;
  budget: number;
  bid_price?: number;
  operation_status: string;
}

export interface ReportRow {
  dimensions: Record<string, string>;
  metrics: Record<string, string>;
}

export class MarketingApi {
  private readonly api: MarketingClient;

  constructor(
    private readonly cfg: MarketingConfig,
    db: Db,
  ) {
    this.api = new MarketingClient(cfg, db);
  }

  seedToken(accessToken: string): void {
    this.api.seedToken(accessToken);
  }

  get advertiserId(): string {
    return this.cfg.advertiserId;
  }

  async listCampaigns(): Promise<Campaign[]> {
    const data = await this.api.get<{ list: Campaign[] }>("/campaign/get/", {
      advertiser_id: this.cfg.advertiserId,
      page_size: 100,
    });
    return data.list;
  }

  async listAdGroups(campaignIds?: string[]): Promise<AdGroup[]> {
    const filtering = campaignIds?.length ? { campaign_ids: campaignIds } : undefined;
    const data = await this.api.get<{ list: AdGroup[] }>("/adgroup/get/", {
      advertiser_id: this.cfg.advertiserId,
      page_size: 100,
      filtering,
    });
    return data.list;
  }

  /**
   * Pull a basic performance report for a date range.
   *
   * @param level     "AUCTION_CAMPAIGN" or "AUCTION_ADGROUP".
   * @param dimensions e.g. ["campaign_id", "stat_time_day"].
   * @param startDate  YYYY-MM-DD.
   * @param endDate    YYYY-MM-DD.
   */
  async getReport(
    level: string,
    dimensions: string[],
    startDate: string,
    endDate: string,
  ): Promise<ReportRow[]> {
    const data = await this.api.get<{ list: ReportRow[] }>("/report/integrated/get/", {
      advertiser_id: this.cfg.advertiserId,
      report_type: "BASIC",
      data_level: level,
      dimensions,
      metrics: ["spend", "impressions", "clicks", "conversion", "complete_payment_roas", "total_complete_payment_rate"],
      start_date: startDate,
      end_date: endDate,
      page_size: 200,
    });
    return data.list;
  }

  /** Update a campaign's daily budget (currency units). */
  async updateCampaignBudget(campaignId: string, budget: number): Promise<void> {
    await this.api.post("/campaign/update/", {
      advertiser_id: this.cfg.advertiserId,
      campaign_id: campaignId,
      budget,
    });
  }

  /** Update an ad group's daily budget. */
  async updateAdGroupBudget(adgroupId: string, budget: number): Promise<void> {
    await this.api.post("/adgroup/update/", {
      advertiser_id: this.cfg.advertiserId,
      adgroup_id: adgroupId,
      budget,
    });
  }

  /** Update an ad group's bid price. */
  async updateAdGroupBid(adgroupId: string, bidPrice: number): Promise<void> {
    await this.api.post("/adgroup/update/", {
      advertiser_id: this.cfg.advertiserId,
      adgroup_id: adgroupId,
      bid_price: bidPrice,
    });
  }
}
