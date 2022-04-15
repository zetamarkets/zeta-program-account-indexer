import { Kind } from "@zetamarkets/sdk/dist/types";

export interface EventQueueHeader {
  head: number;
  count: number;
  seqNum: number;
}

export interface Trade {
  seq_num: number;
  timestamp: number;
  owner_pub_key: string;
  expiry_series_index: number;
  market_index: number;
  expiry_timestamp: number;
  strike: number;
  kind: Kind;
  is_fill: boolean;
  is_maker: boolean;
  is_bid: boolean;
  price: number;
  size: number;
}

export interface Pricing {
  timestamp: number;
  slot: number;
  expiry_series_index: number;
  expiry_timestamp: number;
  market_index: number;
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
  vol_surface: number[];
  nodes: number[];
  interest_rate: number;
}

export interface MarginAccountPosition {
  timestamp: number;
  slot: number;
  owner_pub_key: string;
  expiry_timestamp: number;
  force_cancel_flag: boolean;
  balance: number;
  rebalance_amount: number;
  market_index: number;
  position: number;
  cost_of_trades: number;
  closing_orders: number;
  opening_orders_bid: number;
  opening_orders_ask: number;
}

export interface VaultBalance {
  timestamp: number;
  slot: number;
  vault_balance: number;
  insurance_vault_balance: number;
  tvl: number;
}

export interface MarketMetadata {
  timestamp: number;
  slot: number;
  market_pub_key: string;
  underlying: string;
  expiry_timestamp: number;
  strike: number;
  kind: Kind;
}
