import { ShopClient, type Db, type ShopConfig } from "@tts/core";

/**
 * Affiliate + product client for TikTok Shop.
 *
 * Wraps the Shop Partner API endpoints a seller uses to (a) enumerate their own
 * products and (b) manage affiliate collaboration plans on those products —
 * Open Collaboration (any creator can promote at the set commission) and Target
 * Collaboration (a specific creator is invited).
 *
 * Endpoint versions are read from ShopConfig.apiVersion where the base path is
 * version-tagged; the affiliate endpoints below pin their own known versions and
 * can be overridden via the constructor for forward-compatibility.
 */

export interface Product {
  id: string;
  title: string;
  status: string;
  price?: { currency: string; sale_price: string };
}

export interface OpenCollaborationPlan {
  productId: string;
  commissionRate: number; // percent, e.g. 12.5
  status: string;
}

export interface AffiliateEndpoints {
  productSearch: string;
  openCollabAdd: string;
  openCollabUpdate: string;
  openCollabList: string;
}

const DEFAULT_ENDPOINTS: AffiliateEndpoints = {
  productSearch: "/product/202312/products/search",
  openCollabAdd: "/affiliate_seller/202405/open_collaboration_plans",
  openCollabUpdate: "/affiliate_seller/202405/open_collaboration_plans",
  openCollabList: "/affiliate_seller/202405/open_collaboration_plans/search",
};

export class AffiliateClient {
  private readonly shop: ShopClient;

  constructor(
    cfg: ShopConfig,
    db: Db,
    accountId: string,
    private readonly endpoints: AffiliateEndpoints = DEFAULT_ENDPOINTS,
  ) {
    this.shop = new ShopClient(cfg, db, accountId);
  }

  /** Page through the seller's own products. */
  async listProducts(pageSize = 50): Promise<Product[]> {
    const out: Product[] = [];
    let pageToken: string | undefined;
    do {
      const data = await this.shop.call<{ products?: Product[]; next_page_token?: string }>(
        "POST",
        this.endpoints.productSearch,
        { page_size: pageSize, page_token: pageToken },
        { status: "ACTIVATE" },
      );
      out.push(...(data.products ?? []));
      pageToken = data.next_page_token && data.next_page_token.length > 0 ? data.next_page_token : undefined;
    } while (pageToken);
    return out;
  }

  /** Current open-collaboration plans keyed by product id. */
  async listOpenCollaborations(): Promise<OpenCollaborationPlan[]> {
    const data = await this.shop.call<{ plans?: Array<{ product_id: string; commission_rate: string; status: string }> }>(
      "POST",
      this.endpoints.openCollabList,
      { page_size: 100 },
      {},
    );
    return (data.plans ?? []).map((p) => ({
      productId: p.product_id,
      commissionRate: Number(p.commission_rate),
      status: p.status,
    }));
  }

  /**
   * Create or update an open-collaboration plan for a product at a commission
   * rate (percent). The Shop API upserts, so a single endpoint covers both.
   */
  async setOpenCollaboration(productId: string, commissionRate: number): Promise<void> {
    await this.shop.call(
      "POST",
      this.endpoints.openCollabAdd,
      {},
      {
        product_id: productId,
        commission_rate: commissionRate.toFixed(2),
      },
    );
  }
}
