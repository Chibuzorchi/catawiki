/**
 * Domain types for Catawiki automation suite.
 */

// ─── UI Page Object Types ───────────────────────────────────────

export interface LotDetails {
  title: string;
  favouritesCount: number;
  currentBid: number;
  currency: string;
  closingTime: string;
}

export interface SearchResult {
  title: string;
  index: number;
}

export interface BidOptions {
  suggestedAmounts: number[];
  minimumBid: number;
  currency: string;
}

// ─── API Response Types ─────────────────────────────────────────
// Field names match the actual API responses observed via network tab.
// The batch lots endpoint (/v1/lots?ids=) uses snake_case.
// The seller lots endpoint (/v1/sellers/lots/) uses a mix of both.

/**
 * Lot from GET /buyer/api/v1/lots?ids=...&maintain_order=true
 * Powers the search results grid. Snake_case fields.
 */
export interface BatchLot {
  id: number;
  title: string;
  url: string;
  thumbnail2_url: string;
  original_image_url: string;
  pubnub_channel: string;
  use_realtime_message_fallback: boolean;
  auction_id: number;
  explicit_content: boolean;
  is_content_explicit: boolean;
}

export interface BatchLotsResponse {
  lots: BatchLot[];
}

/**
 * Lot from GET /buyer/api/v1/sellers/lots/?seller_ids=...
 * Uses camelCase for most fields.
 */
export interface SellerLot {
  id: number;
  title: string;
  subtitle: string;
  url: string;
  thumbImageUrl: string;
  originalImageUrl: string;
  favoriteCount: number;
  auctionId: number;
  pubnubChannel: string;
  reservePriceSet: boolean;
  biddingStartTime: string;
  bidding_start_time: string;
  buyNow: { price: number; currency: string } | null;
  hasFreeShipping: boolean | null;
  localized: boolean;
  seller: {
    country_code: string;
    shop_name: string;
  };
}

export interface SellerLotsResponse {
  total: number;
  lots: SellerLot[];
}

/**
 * Single bid from GET /buyer/api/v3/lots/{id}/bids
 */
export interface Bid {
  amount: number;
  bidder_id?: number;
  created_at?: string;
}

export interface BidsApiResponse {
  bids: Bid[];
  meta?: {
    total: number;
  };
}

/**
 * GET /buyer/api/v1/search/related_terms?q=...
 */
export interface RelatedTermsResponse {
  terms: string[];
}

/** Extracts numeric value from a currency string like "€ 53" → 53 */
export type CurrencyString = `€ ${number}` | `€${number}`;