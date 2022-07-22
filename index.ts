import { Exchange, Network, assets } from "@zetamarkets/sdk";
import { PublicKey, Connection, ConfirmOptions } from "@solana/web3.js";
import { EventType } from "@zetamarkets/sdk/dist/events";
import {
  collectSurfaceData,
  collectPricingData,
} from "./greeks-update-processing";
import { alert } from "./utils/telegram";
import {
  collectZetaGroupMarketMetadata,
  subscribeZetaGroupChanges,
} from "./market-metadata-processing";
import { DEBUG_MODE } from "./utils/constants";

const callback = (asset: assets.Asset, eventType: EventType, data: any) => {
  switch (eventType) {
    case EventType.GREEKS:
      collectSurfaceData(asset);
      collectPricingData(asset);
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

export const reloadExchange = async (assetList: assets.Asset[]) => {
  try {
    await Exchange.close();
    const newConnection = new Connection(process.env.RPC_URL, "finalized");
    await Exchange.load(
      assetList,
      new PublicKey(process.env.PROGRAM_ID),
      network,
      newConnection,
      opts,
      undefined,
      undefined,
      callback
    );
    await Promise.all(
      assetList.map(async (asset) => {
        subscribeZetaGroupChanges(asset);
      })
    );
  } catch (e) {
    alert("Failed to reload exchange", true);
    reloadExchange(assetList);
  }
};

const main = async () => {
  if (DEBUG_MODE) {
    console.log("Running in debug mode, no data will be pushed to AWS");
  }

  let assetsJson = process.env.ASSETS!;
  if (assetsJson[0] != "[" && assetsJson[-1] != "]") {
    assetsJson = "[" + assetsJson + "]";
  }
  let assetsStrings: string[] = JSON.parse(assetsJson);
  let allAssets = assetsStrings.map((assetStr) => {
    return assets.nameToAsset(assetStr);
  });

  alert("Loading exchange...", false);
  await Exchange.load(
    allAssets,
    new PublicKey(process.env.PROGRAM_ID),
    network,
    connection,
    opts,
    undefined,
    undefined,
    callback
  );
  alert("Loaded exchange.", false);
  await Promise.all(
    allAssets.map(async (asset) => {
      collectZetaGroupMarketMetadata(asset);
      subscribeZetaGroupChanges(asset);
    })
  );

  setInterval(async () => {
    await reloadExchange(allAssets);
  }, 60 * 60 * 1000); // Refresh once every hour

  setInterval(async () => {
    try {
      await Exchange.updateExchangeState();
    } catch (e) {
      alert(`Failed to update exchange state: ${e}`, true);
    }
  }, 60_000);
};

main().catch(console.error.bind(console));
