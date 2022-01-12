// require("dotenv").config();
import { Exchange, Network, utils } from "@zetamarkets/sdk";
import { PublicKey, Connection } from "@solana/web3.js";
import { EventType } from "@zetamarkets/sdk/dist/events";
import { collectPricingAndSurfaceData } from "./greeks-update-processing";

const callback = (eventType: EventType, data: any) => {
  switch (eventType) {
    case EventType.GREEKS:
      collectPricingAndSurfaceData();
  }
};

export const connection = new Connection(
  process.env.RPC_URL,
  utils.defaultCommitment()
);

const network =
  process.env!.NETWORK === "mainnet"
    ? Network.MAINNET
    : process.env!.NETWORK === "devnet"
    ? Network.DEVNET
    : Network.LOCALNET;

const main = async () => {
  await Exchange.load(
    new PublicKey(process.env.PROGRAM_ID),
    network,
    connection,
    utils.defaultCommitment(),
    undefined,
    undefined,
    callback
  );
};

main().catch(console.error.bind(console));
