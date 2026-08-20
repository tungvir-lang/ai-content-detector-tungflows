import { loadPartialConfig, openDb, type Db, type SuiteConfig } from "@tts/core";
import { AffiliateClient, AffiliateBot } from "@tts/shop-affiliate";
import { MarketingApi, BudgetAutomationEngine } from "@tts/marketing";
import { ContentApi, Dispatcher } from "@tts/scheduler";

/**
 * Wires config + db into the concrete clients/engines every route and the
 * worker share. Account ids are read from env so a single deployment can be
 * pointed at one seller/advertiser/creator identity.
 */

export interface AppContext {
  cfg: SuiteConfig;
  db: Db;
  affiliate: AffiliateClient;
  affiliateBot: AffiliateBot;
  marketing: MarketingApi;
  automation: BudgetAutomationEngine;
  content: ContentApi;
  dispatcher: Dispatcher;
}

export function buildContext(): AppContext {
  const cfg = loadPartialConfig();
  const db = openDb(cfg.dbPath);

  const shopAccountId = process.env.TTS_SHOP_ACCOUNT_ID ?? "default_shop";
  const contentAccountId = process.env.TTS_CONTENT_OPEN_ID ?? "default_creator";

  const affiliate = new AffiliateClient(cfg.shop, db, shopAccountId);
  const marketing = new MarketingApi(cfg.marketing, db);
  const content = new ContentApi(cfg.content, db, contentAccountId);

  return {
    cfg,
    db,
    affiliate,
    affiliateBot: new AffiliateBot(affiliate, db, cfg.dryRun),
    marketing,
    automation: new BudgetAutomationEngine(marketing, db, cfg.dryRun),
    content,
    dispatcher: new Dispatcher(content, db, cfg.dryRun),
  };
}
