import { Network } from "@zetamarkets/flex-sdk";

export const FETCH_INTERVAL = 1000;

export const NETWORK =
  process.env.NETWORK === "mainnet"
    ? Network.MAINNET
    : process.env.NETWORK === "devnet"
    ? Network.DEVNET
    : Network.LOCALNET;

export const DEBUG_MODE = process.argv.slice(2).includes("--debug");
export const MAX_ACCOUNTS_TO_FETCH = 100;
