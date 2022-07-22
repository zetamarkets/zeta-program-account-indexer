import {
  constants,
  Decimal,
  Exchange,
  programTypes,
  utils,
  assets,
} from "@zetamarkets/sdk";
import { utils as FlexUtils } from "@zetamarkets/flex-sdk";
import { Pricing, Surface } from "./utils/types";
import { putFirehoseBatch } from "./utils/firehose";
import {
  convertNativeBNToDecimal,
  getGreeksIndex,
} from "@zetamarkets/sdk/dist/utils";
import { reloadExchange } from ".";
import { alert } from "./utils/telegram";
import { Kind } from "@zetamarkets/sdk/dist/types";
import { NETWORK } from "./utils/constants";

let fetchingMarginAccounts: Map<assets.Asset, boolean> = new Map();

export const collectSurfaceData = (asset: assets.Asset) => {
  const surfaceUpdate: Surface[] = [];

  for (var i = 0; i < 2; i++) {
    let expiryIndex = i;
    let expirySeries = Exchange.getExpirySeriesList(asset)[expiryIndex];
    let expiryTs = Math.floor(expirySeries.expiryTs);

    // If expirySeries isn't live, do not go through inactive expirySeries
    if (!expirySeries.isLive()) continue;
    console.log(
      `Expiration @ ${new Date(
        expirySeries.expiryTs * 1000
      )} Live: ${expirySeries.isLive()}`
    );
    let greeks = Exchange.getGreeks(asset);
    let interestRate = convertNativeBNToDecimal(
      greeks.interestRate[expiryIndex],
      constants.PRICING_PRECISION
    );

    let nodes = [];
    for (var k = 0; k < greeks.nodes.length; k++) {
      nodes.push(
        convertNativeBNToDecimal(greeks.nodes[k], constants.PRICING_PRECISION)
      );
    }

    let volatility = [];
    let expiryVolFirstIndex = expiryIndex * 5;
    for (var l = expiryVolFirstIndex; l < expiryVolFirstIndex + 5; l++) {
      volatility.push(
        convertNativeBNToDecimal(
          greeks.volatility[l],
          constants.PRICING_PRECISION
        )
      );
    }

    const newSurfaceUpdate: Surface = {
      timestamp: Math.round(new Date().getTime() / 1000),
      slot: Exchange.clockSlot,
      underlying: assets.assetToName(asset),
      expiry_series_index: expiryIndex,
      expiry_timestamp: expiryTs,
      vol_surface: volatility,
      nodes: nodes,
      interest_rate: interestRate,
    };

    surfaceUpdate.push(newSurfaceUpdate);
  }
  putFirehoseBatch(surfaceUpdate, process.env.FIREHOSE_DS_NAME_SURFACES);
};

export const collectPricingData = async (asset) => {
  const pricingUpdate: Pricing[] = [];

  if (fetchingMarginAccounts.get(asset)) {
    console.log("Already fetching margin accounts.");
    return;
  }

  // Fetch margin accounts once for all expirySeries
  const timeFetched = Date.now();
  let marginAccounts: any[] = undefined;
  fetchingMarginAccounts.set(asset, true);
  console.log(`[${timeFetched}] Attempting to fetch margin accounts...`);
  try {
    marginAccounts = await Exchange.program.account.marginAccount.all();
  } catch (e) {
    alert(`Failed to fetch margin account fetch error: ${e}`, false);
    // Refresh exchange upon failure of margin accounts fetch
    reloadExchange(asset);
    fetchingMarginAccounts.set(asset, false);
    return;
  } finally {
    fetchingMarginAccounts.set(asset, false);
  }
  console.log(`[${timeFetched}] Successfully fetched margin accounts.`);

  for (var i = 0; i < 2; i++) {
    let expiryIndex = i;
    let expirySeries =
      Exchange.getZetaGroupMarkets(asset).expirySeries[expiryIndex];
    let expiryTs = Math.floor(expirySeries.expiryTs);

    // If expirySeries isn't live, do not go through inactive expirySeries
    if (!expirySeries.isLive()) continue;
    console.log(
      `Expiration @ ${new Date(
        expirySeries.expiryTs * 1000
      )} Live: ${expirySeries.isLive()}`
    );

    let markets =
      Exchange.getZetaGroupMarkets(asset).getMarketsByExpiryIndex(expiryIndex);
    for (var j = 0; j < markets.length; j++) {
      let market = markets[j];
      let marketIndex = market.marketIndex;
      let greeksIndex = getGreeksIndex(marketIndex);

      let greeks = Exchange.getGreeks(asset);

      let markPrice = convertNativeBNToDecimal(greeks.markPrices[marketIndex]);
      let delta = convertNativeBNToDecimal(
        greeks.productGreeks[greeksIndex].delta,
        constants.PRICING_PRECISION
      );

      let sigma = Decimal.fromAnchorDecimal(
        greeks.productGreeks[greeksIndex].volatility
      ).toNumber();

      let vega = Decimal.fromAnchorDecimal(
        greeks.productGreeks[greeksIndex].vega
      ).toNumber();

      if (market.kind === Kind.FUTURE) {
        delta = null;
        sigma = null;
        vega = null;
      }

      let totalPositions = 0;
      for (var k = 0; k < marginAccounts.length; k++) {
        let acc = marginAccounts[k].account as programTypes.MarginAccount;
        totalPositions += utils.convertNativeBNToDecimal(
          acc.productLedgers[marketIndex].position.size.abs(),
          3
        );
      }

      const newPricingUpdate: Pricing = {
        timestamp: Math.round(new Date().getTime() / 1000),
        slot: Exchange.clockSlot,
        expiry_series_index: expiryIndex,
        expiry_timestamp: expiryTs,
        market_index: marketIndex,
        underlying: assets.assetToName(asset),
        strike: market.strike,
        kind: market.kind,
        theo: markPrice,
        delta: delta,
        sigma: sigma,
        vega: vega,
        open_interest: totalPositions / 2,
      };
      pricingUpdate.push(newPricingUpdate);
    }
    putFirehoseBatch(pricingUpdate, process.env.FIREHOSE_DS_NAME_PRICES);
  }
};
