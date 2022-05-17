import {
  constants,
  Decimal,
  Exchange,
  programTypes,
  utils,
} from "@zetamarkets/sdk";
import { utils as FlexUtils } from "@zetamarkets/flex-sdk";
import { Pricing, Surface, VaultBalance } from "./utils/types";
import { putFirehoseBatch } from "./utils/firehose";
import {
  convertNativeBNToDecimal,
  getGreeksIndex,
} from "@zetamarkets/sdk/dist/utils";
import { reloadExchange } from ".";
import { alert } from "./utils/telegram";
import { Kind } from "@zetamarkets/sdk/dist/types";
import { NETWORK } from "./utils/constants";

let fetchingMarginAccounts = false;

export const collectSurfaceData = () => {
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
      underlying: FlexUtils.getUnderlyingMapping(
        NETWORK,
        Exchange.zetaGroup.underlyingMint
      ),
      expiry_series_index: expiryIndex,
      expiry_timestamp: expiryTs,
      vol_surface: volatility,
      nodes: nodes,
      interest_rate: interestRate,
    };

    surfaceUpdate.push(newSurfaceUpdate);
    putFirehoseBatch(surfaceUpdate, process.env.FIREHOSE_DS_NAME_SURFACES);
  }
};

export const collectPricingData = async () => {
  const pricingUpdate: Pricing[] = [];

  if (fetchingMarginAccounts) {
    console.log("Already fetching margin accounts.");
    return;
  }

  // Fetch margin accounts once for all expirySeries
  const timeFetched = Date.now();
  let marginAccounts: any[] = undefined;
  fetchingMarginAccounts = true;
  console.log(`[${timeFetched}] Attempting to fetch margin accounts...`);
  try {
    marginAccounts = await Exchange.program.account.marginAccount.all();
  } catch (e) {
    alert(`Failed to fetch margin account fetch error: ${e}`, false);
    // Refresh exchange upon failure of margin accounts fetch
    reloadExchange();
    fetchingMarginAccounts = false;
    return;
  } finally {
    fetchingMarginAccounts = false;
  }
  console.log(`[${timeFetched}] Successfully fetched margin accounts.`);

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
        timestamp: Exchange.clockTimestamp,
        slot: Exchange.clockSlot,
        expiry_series_index: expiryIndex,
        expiry_timestamp: expiryTs,
        market_index: marketIndex,
        underlying: FlexUtils.getUnderlyingMapping(
          NETWORK,
          Exchange.zetaGroup.underlyingMint
        ),
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

export const collectVaultData = async () => {
  let vaultAccount = await utils.getTokenAccountInfo(
    Exchange.connection,
    Exchange.vaultAddress
  );
  let insuranceVaultAccount = await utils.getTokenAccountInfo(
    Exchange.connection,
    Exchange.insuranceVaultAddress
  );

  let vaultBalance = utils.convertNativeBNToDecimal(vaultAccount.amount);
  let insuranceVaultBalance = utils.convertNativeBNToDecimal(
    insuranceVaultAccount.amount
  );

  const vaultBalanceUpdate: VaultBalance = {
    timestamp: Exchange.clockTimestamp,
    slot: Exchange.clockSlot,
    vault_balance: vaultBalance,
    insurance_vault_balance: insuranceVaultBalance,
    tvl: vaultBalance + insuranceVaultBalance,
  };

  putFirehoseBatch([vaultBalanceUpdate], process.env.FIREHOSE_DS_NAME_VAULTS);
};
