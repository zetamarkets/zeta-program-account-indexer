import { Exchange, Network, utils } from "@zetamarkets/sdk";
import { PublicKey, Connection, ConfirmOptions } from "@solana/web3.js";
import { EventType } from "@zetamarkets/sdk/dist/events";
import { collectPricingAndSurfaceData } from "./greeks-update-processing";
import { collectMarginAccountData } from "./margin-account-processing";

const callback = (eventType: EventType, data: any) => {
  switch (eventType) {
    case EventType.GREEKS:
      collectPricingAndSurfaceData();
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
  collectMarginAccountData();

  const refreshExchange = async () => {
    await Exchange.close().then(async () => {
      console.log("Reloading Exchange..")
      await Exchange.load(
        new PublicKey(process.env.PROGRAM_ID),
        network,
        connection,
        utils.defaultCommitment(),
        undefined,
        undefined,
        callback
      );
      collectMarginAccountData();
    }).catch((error) => {
      console.log("Failed to close Exchange:", error);
    })
  }
  setInterval(async () => {
    console.log("Refreshing Exchange");
    refreshExchange();
  }, 21600000); // Refresh every 6 hours

};

main().catch(console.error.bind(console));
