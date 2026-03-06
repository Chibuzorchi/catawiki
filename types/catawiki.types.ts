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
