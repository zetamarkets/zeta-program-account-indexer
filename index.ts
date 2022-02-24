import { Exchange, Network } from "@zetamarkets/sdk";
import { PublicKey, Connection, ConfirmOptions } from "@solana/web3.js";
import { EventType } from "@zetamarkets/sdk/dist/events";
import {
  collectSurfaceData,
  collectPricingData,
  collectVaultData,
} from "./greeks-update-processing";
import { collectMarginAccountData } from "./margin-account-processing";
import { alert } from "./utils/telegram";

const callback = (eventType: EventType, data: any) => {
  switch (eventType) {
    case EventType.GREEKS:
      collectSurfaceData();
      collectPricingData();
  }
};

const opts: ConfirmOptions = {
  skipPreflight: false,
  preflightCommitment: "finalized",
  commitment: "finalized",
};
export const connection = new Connection(process.env.RPC_URL, opts.commitment);

const network =
  process.env!.NETWORK === "mainnet"
    ? Network.MAINNET
    : process.env!.NETWORK === "devnet"
    ? Network.DEVNET
    : Network.LOCALNET;

export const reloadExchange = async () => {
  await Exchange.close();
  alert("Reloading exchange...", false);
  const newConnection = new Connection(process.env.RPC_URL, "finalized");
  await Exchange.load(
    new PublicKey(process.env.PROGRAM_ID),
    network,
    newConnection,
    opts,
    undefined,
    undefined,
    callback
  );
  alert("Reloaded exchange.", false);
  collectMarginAccountData();
};

const main = async () => {
  alert("Loading exchange...", false);
  await Exchange.load(
    new PublicKey(process.env.PROGRAM_ID),
    network,
    connection,
    opts,
    undefined,
    undefined,
    callback
  );
  alert("Loaded exchange.", false);
  collectMarginAccountData();

  setInterval(() => {
    collectVaultData();
  }, 30 * 60 * 1000); // Every 30 mins

  setInterval(async () => {
    await reloadExchange();
  }, 15 * 60 * 1000); // Refresh every 15 mins

  setInterval(async () => {
    try {
      await Exchange.updateExchangeState();
    } catch (e) {
      alert(`Failed to update exchange state: ${e}`, true)
    }
  }, 60_000);
};

main().catch(console.error.bind(console));
