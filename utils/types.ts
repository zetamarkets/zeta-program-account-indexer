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

export interface MarginAccountPnL {
  timestamp: number;
  margin_account_address: string;
  underlying: string;
  owner_pub_key: string;
  balance: number;
  unrealizedPnl: number;
}

export interface MarginAccount {
  timestamp: number;
  slot: number;
  margin_account_address: string;
  underlying: string;
  owner_pub_key: string;
  force_cancel_flag: boolean;
  balance: number;
  rebalance_amount: number;
  positions: MarginAccountPosition[];
}

export interface MarginAccountPosition {
  expiry_timestamp: number;
  market_index: number;
  size: number;
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
  market_index: number;
  underlying: string;
  active_timestamp: number;
  expiry_timestamp: number;
  strike: number;
  kind: Kind;
}
