import { Exchange, Network, utils } from "@zetamarkets/sdk";
import { PublicKey, Connection, ConfirmOptions } from "@solana/web3.js";
import { EventType } from "@zetamarkets/sdk/dist/events";
import { collectPricingAndSurfaceData } from "./greeks-update-processing";
import { collectMarginAccountData } from "./margin-account-processing";

const callback = (eventType: EventType, data: any) => {
  switch (eventType) {
    case EventType.GREEKS:
      try {
        collectPricingAndSurfaceData();
      } catch (e) {
        console.log("[GREEKS]", e);
      }
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

export const refreshExchange = async () => {
  await Exchange.close();
  console.log("Reloading Exchange..")
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
  try {
    collectMarginAccountData();
  } catch (e) {
    console.log("[MARGIN ACCOUNTS]", e);
  }
};

const main = async () => {
  await Exchange.load(
    new PublicKey(process.env.PROGRAM_ID),
    network,
    connection,
    opts,
    undefined,
    undefined,
    callback
  );
  try {
    collectMarginAccountData();
  } catch (e) {
    console.log("[MARGIN ACCOUNTS]", e);
  }

  setInterval(async () => {
    console.log("Refreshing Exchange");
    refreshExchange();
  }, 10_800_000); // Refresh every 3 hours

  setInterval(async () => {
    await Exchange.updateExchangeState();
  }, 60_000);
};

main().catch(console.error.bind(console));
