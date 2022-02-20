import { constants, Decimal, Exchange, programTypes, utils } from "@zetamarkets/sdk";
import { Pricing, Surface } from "./utils/types";
import { putFirehoseBatch } from "./utils/firehose";
import {
  convertNativeBNToDecimal,
  getGreeksIndex,
} from "@zetamarkets/sdk/dist/utils";

export const collectPricingAndSurfaceData = async () => {
  const pricingUpdate: Pricing[] = [];
  const surfaceUpdate: Surface[] = [];

  for (var i = 0; i < 2; i++) {
    let expiryIndex = i;
    let expirySeries = Exchange.markets.expirySeries[expiryIndex];
    let expiryTs = Math.floor(expirySeries.expiryTs);

    // If expirySeries isn't live, do not go through inactive expirySeries
    if (!expirySeries.isLive()) continue;
    console.log(
      `Expiration @ ${new Date(
        expirySeries.expiryTs * 1000
      )} Live: ${expirySeries.isLive()}`
    );
    let interestRate = convertNativeBNToDecimal(
      Exchange.greeks.interestRate[expiryIndex],
      constants.PRICING_PRECISION
    );

    let nodes = [];
    for (var k = 0; k < Exchange.greeks.nodes.length; k++) {
      nodes.push(
        convertNativeBNToDecimal(
          Exchange.greeks.nodes[k],
          constants.PRICING_PRECISION
        )
      );
    }

    let volatility = [];
    let expiryVolFirstIndex = expiryIndex * 5;
    for (var l = expiryVolFirstIndex; l < expiryVolFirstIndex + 5; l++) {
      volatility.push(
        convertNativeBNToDecimal(
          Exchange.greeks.volatility[l],
          constants.PRICING_PRECISION
        )
      );
    }

    const newSurfaceUpdate: Surface = {
      timestamp: Exchange.clockTimestamp,
      slot: Exchange.clockSlot,
      expiry_series_index: expiryIndex,
      expiry_timestamp: expiryTs,
      vol_surface: volatility,
      nodes: nodes,
      interest_rate: interestRate,
    };

    surfaceUpdate.push(newSurfaceUpdate);
    putFirehoseBatch(surfaceUpdate, process.env.FIREHOSE_DS_NAME_SURFACES);

    let marginAccounts: any[] = undefined;
    console.log("Fetching margin accounts...");
    try {
      marginAccounts = await Exchange.program.account.marginAccount.all();
    } catch (e) {
      throw Error("[MARGIN ACCOUNT] Margin Account fetch error.");
    }
    console.log("Finished fetching margin accounts.");

    let markets = Exchange.markets.getMarketsByExpiryIndex(expiryIndex);
    for (var j = 0; j < markets.length; j++) {
      let market = markets[j];
      let marketIndex = market.marketIndex;
      let greeksIndex = getGreeksIndex(marketIndex);
      let markPrice = convertNativeBNToDecimal(
        Exchange.greeks.markPrices[marketIndex]
      );
      let delta = convertNativeBNToDecimal(
        Exchange.greeks.productGreeks[greeksIndex].delta,
        constants.PRICING_PRECISION
      );

      let sigma = Decimal.fromAnchorDecimal(
        Exchange.greeks.productGreeks[greeksIndex].volatility
      ).toNumber();

      let vega = Decimal.fromAnchorDecimal(
        Exchange.greeks.productGreeks[greeksIndex].vega
      ).toNumber();

      let totalPositions = 0;
      for (var i = 0; i < marginAccounts.length; i++) {
        let acc = marginAccounts[i].account as programTypes.MarginAccount;
        totalPositions += utils.convertNativeBNToDecimal(
          acc.positions[marketIndex].position.abs(),
          3
        );
      }

      const newPricingUpdate: Pricing = {
        timestamp: Exchange.clockTimestamp,
        slot: Exchange.clockSlot,
        expiry_series_index: expiryIndex,
        expiry_timestamp: expiryTs,
        market_index: marketIndex,
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
