import { subscription, programTypes } from "@zetamarkets/sdk";
import { POSITION_PRECISION } from "@zetamarkets/sdk/dist/constants";
import { convertNativeBNToDecimal } from "@zetamarkets/sdk/dist/utils";
import { putFirehoseBatch } from "./utils/firehose";
import { MarginAccountPosition } from "./utils/types";

export const collectMarginAccountData = () => {
  subscription.subscribeProgramAccounts<programTypes.MarginAccount>(
    subscription.ProgramAccountType.MarginAccount,
    async (
      data: subscription.AccountSubscriptionData<programTypes.MarginAccount>
    ) => {
      let marginAccountUpdateBatch: MarginAccountPosition[] = [];
      const timestamp = Math.floor(Date.now() / 1000);
      const marginAccount = data.account;
      for (let i = 0; i < marginAccount.positions.length; i++) {
        let position = marginAccount.positions[i];
        const marketIndex = i;
        const expiryIndex = Math.floor(marketIndex / 23);
        let expiry = marginAccount.seriesExpiry[expiryIndex].toNumber();

        let marginAccountPosition: MarginAccountPosition = {
          timestamp: timestamp,
          owner_pub_key: data.key.toString(),
          expiry_timestamp: expiry,
          balance: convertNativeBNToDecimal(marginAccount.balance),
          rebalance_amount: convertNativeBNToDecimal(marginAccount.rebalanceAmount),
          force_cancel_flag: marginAccount.forceCancelFlag,
          market_index: marketIndex,
          position: convertNativeBNToDecimal(position.position, POSITION_PRECISION),
          cost_of_trades: convertNativeBNToDecimal(position.costOfTrades),
          closing_orders: convertNativeBNToDecimal(position.closingOrders, POSITION_PRECISION),
          opening_orders_bid: convertNativeBNToDecimal(position.openingOrders[0], POSITION_PRECISION),
          opening_orders_ask: convertNativeBNToDecimal(position.openingOrders[1], POSITION_PRECISION)
        }
        marginAccountUpdateBatch.push(marginAccountPosition);
      }
      putFirehoseBatch(marginAccountUpdateBatch, process.env.FIREHOSE_DS_NAME_MARGIN_ACCOUNT);
    }
  );
}