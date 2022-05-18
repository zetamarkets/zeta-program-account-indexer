import { Exchange, Network } from "@zetamarkets/sdk";
import { PublicKey, Connection, ConfirmOptions } from "@solana/web3.js";
import { EventType } from "@zetamarkets/sdk/dist/events";
import {
  collectSurfaceData,
  collectPricingData,
  collectVaultData,
} from "./greeks-update-processing";
import {
  collectMarginAccountData,
  snapshotMarginAccounts,
} from "./margin-account-processing";
import { alert } from "./utils/telegram";
import {
  collectZetaGroupMarketMetadata,
  subscribeZetaGroupChanges,
} from "./market-metadata-processing";
import { DEBUG_MODE } from "./utils/constants";

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
  try {
    await Exchange.close();
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
    collectMarginAccountData();
    subscribeZetaGroupChanges();
  } catch (e) {
    alert("Failed to reload exchange", true);
    reloadExchange();
  }
};

const main = async () => {
  if (DEBUG_MODE) {
    console.log("Running in debug mode, no data will be pushed to AWS");
  }
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
  collectZetaGroupMarketMetadata();
  subscribeZetaGroupChanges();

  setInterval(() => {
    collectVaultData();
  }, 3 * 60 * 1000); // Every 30 mins

  setInterval(async () => {
    await reloadExchange();
  }, 4 * 60 * 1000); // Refresh once every hour

  setInterval(async () => {
    await snapshotMarginAccounts();
  }, 5 * 60 * 1000); // Snapshot once every hour

  setInterval(async () => {
    try {
      await Exchange.updateExchangeState();
    } catch (e) {
      alert(`Failed to update exchange state: ${e}`, true);
    }
  }, 60_000);
};

main().catch(console.error.bind(console));
