import { Kind } from "@zetamarkets/sdk/dist/types";

export interface Pricing {
  timestamp: number;
  slot: number;
  expiry_series_index: number;
  expiry_timestamp: number;
  market_index: number;
  underlying: string;
  strike: number;
  kind: Kind;
  theo: number;
  delta: number;
  sigma: number;
  vega: number;
  open_interest: number;
}

export interface Surface {
  timestamp: number;
  slot: number;
  expiry_series_index: number;
  expiry_timestamp: number;
  underlying: string;
  vol_surface: number[];
  nodes: number[];
  interest_rate: number;
}

export interface MarketMetadata {
  timestamp: number;
  slot: number;
  market_pub_key: string;
  market_index: number;
  underlying: string;
  active_timestamp: number;
  expiry_timestamp: number;
  strike: number;
  kind: Kind;
}
