import { Exchange } from "@zetamarkets/sdk";
import { MarketMetadata } from "./utils/types";
import { utils } from "@zetamarkets/flex-sdk";
import { putFirehoseBatch } from "./utils/firehose";
import { NETWORK } from "./utils/constants";

export const collectZetaGroupMarketMetadata = async () => {
  if (!Exchange.isInitialized) return;
  const zetaGroupMarketMetadata: MarketMetadata[] = [];

  for (var i = 0; i < Exchange.markets.expirySeries.length; i++) {
    let expiryIndex = i;
    let expirySeries = Exchange.markets.expirySeries[expiryIndex];
    let expiryTs = Math.floor(expirySeries.expiryTs);
    let activeTs = Math.floor(expirySeries.activeTs);

    // If expirySeries isn't live, do not go through inactive expirySeries
    if (!expirySeries.isLive()) continue;

    let markets = Exchange.markets.getMarketsByExpiryIndex(expiryIndex);
    for (var j = 0; j < markets.length; j++) {
      let market = markets[j];

      const underlying = utils.getUnderlyingMapping(
        NETWORK,
        Exchange.zetaGroup.underlyingMint
      );

      const newZetaGroupMarketMetadata: MarketMetadata = {
        timestamp: Math.round(new Date().getTime() / 1000),
        slot: Exchange.clockSlot,
        market_index: market.marketIndex,
        market_pub_key: market.serumMarket.address.toString(),
        underlying: underlying,
        active_timestamp: activeTs,
        expiry_timestamp: expiryTs,
        strike: market.strike,
        kind: market.kind,
      };
      zetaGroupMarketMetadata.push(newZetaGroupMarketMetadata);
    }
  }
  putFirehoseBatch(
    zetaGroupMarketMetadata,
    process.env.FIREHOSE_DS_NAME_MARKETS
  );
};

export const subscribeZetaGroupChanges = () => {
  const eventEmitter = Exchange.program.account.zetaGroup.subscribe(
    Exchange.zetaGroupAddress,
    "finalized"
  );
  eventEmitter.on("change", async () => {
    await Exchange.updateZetaGroup();
    await Exchange.markets.updateExpirySeries();
    collectZetaGroupMarketMetadata();
  });
};
