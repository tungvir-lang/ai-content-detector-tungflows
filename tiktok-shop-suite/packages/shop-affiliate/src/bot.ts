import { recordRun, log, type Db } from "@tts/core";
import { AffiliateClient, type Product } from "./client.js";

/**
 * Rule-based affiliate promotion bot.
 *
 * Applies a declarative commission policy across the seller's OWN products:
 * ensure every active product has an open-collaboration plan at a target
 * commission rate, so affiliate creators can pick it up. This is legitimate
 * seller-side marketing configuration, not engagement manipulation.
 *
 * Runs in dry-run by default: it reports the plans it would create/adjust and
 * writes them to run_log, but only mutates when `dryRun` is false.
 */

export interface CommissionPolicy {
  /** Commission rate (percent) to set on products with no plan yet. */
  defaultRate: number;
  /** Optional per-product overrides, keyed by product id. */
  overrides?: Record<string, number>;
  /** Never set a rate above this ceiling (safety guard). */
  maxRate: number;
  /** Only touch a plan if the desired rate differs by at least this much. */
  minDeltaToUpdate: number;
}

export interface PlannedChange {
  productId: string;
  productTitle: string;
  currentRate: number | null;
  targetRate: number;
  reason: "create" | "adjust";
}

export class AffiliateBot {
  constructor(
    private readonly client: AffiliateClient,
    private readonly db: Db,
    private readonly dryRun: boolean,
  ) {}

  /** Compute the set of plan changes the policy implies against live state. */
  async plan(policy: CommissionPolicy): Promise<PlannedChange[]> {
    const [products, existing] = await Promise.all([
      this.client.listProducts(),
      this.client.listOpenCollaborations(),
    ]);
    const byProduct = new Map(existing.map((p) => [p.productId, p]));

    const changes: PlannedChange[] = [];
    for (const product of products) {
      const target = this.targetRate(product, policy);
      const current = byProduct.get(product.id)?.commissionRate ?? null;

      if (current === null) {
        changes.push({
          productId: product.id,
          productTitle: product.title,
          currentRate: null,
          targetRate: target,
          reason: "create",
        });
      } else if (Math.abs(current - target) >= policy.minDeltaToUpdate) {
        changes.push({
          productId: product.id,
          productTitle: product.title,
          currentRate: current,
          targetRate: target,
          reason: "adjust",
        });
      }
    }
    return changes;
  }

  /** Apply the planned changes (or just log them, in dry-run). */
  async apply(policy: CommissionPolicy): Promise<PlannedChange[]> {
    const changes = await this.plan(policy);
    for (const change of changes) {
      recordRun(this.db, {
        module: "affiliate",
        action: change.reason === "create" ? "create_open_collab" : "adjust_open_collab",
        target: change.productId,
        dryRun: this.dryRun,
        detail: { ...change },
      });
      if (this.dryRun) {
        log.info("affiliate dry-run", { productId: change.productId, targetRate: change.targetRate });
        continue;
      }
      await this.client.setOpenCollaboration(change.productId, change.targetRate);
      log.info("affiliate applied", { productId: change.productId, targetRate: change.targetRate });
    }
    return changes;
  }

  private targetRate(product: Product, policy: CommissionPolicy): number {
    const raw = policy.overrides?.[product.id] ?? policy.defaultRate;
    return Math.min(raw, policy.maxRate);
  }
}
