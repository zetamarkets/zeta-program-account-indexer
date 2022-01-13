import { subscription, programTypes } from "@zetamarkets/sdk";
import { POSITION_PRECISION } from "@zetamarkets/sdk/dist/constants";
import { convertNativeBNToDecimal } from "@zetamarkets/sdk/dist/utils";
import { putFirehoseBatch } from "./utils/firehose";
import { MarginAccount, Position } from "./utils/types";

export const collectMarginAccountData = () => {
  let marginAccountUpdateBatch = [];
  subscription.subscribeProgramAccounts<programTypes.MarginAccount>(
    subscription.ProgramAccountType.MarginAccount,
    async (
      data: subscription.AccountSubscriptionData<programTypes.MarginAccount>
    ) => {
      const timestamp = Math.floor(Date.now() / 1000);
      const marginAccount = data.account;
      let newMarginAccountPositions: Position[] = [];
      for (let i = 0; i < marginAccount.positions.length; i++) {
        let position = marginAccount.positions[i];
        let newPosition: Position = {
          market_index: i,
          position: convertNativeBNToDecimal(position.position, POSITION_PRECISION),
          cost_of_trades: convertNativeBNToDecimal(position.costOfTrades),
          closing_orders: convertNativeBNToDecimal(position.closingOrders, POSITION_PRECISION),
          opening_orders_bid: convertNativeBNToDecimal(position.openingOrders[0], POSITION_PRECISION),
          opening_orders_ask: convertNativeBNToDecimal(position.openingOrders[1], POSITION_PRECISION)
        }
        newMarginAccountPositions.push(newPosition);
      }
      let expiryTimestamps: number[] = [];
      for (let i = 0; i < marginAccount.seriesExpiry.length; i++) {
        let expiry = marginAccount.seriesExpiry[i].toNumber();
        if (expiry !== 0) {
          expiryTimestamps.push(expiry);
        }
      }
      const marginAccountUpdate: MarginAccount = {
        timestamp: timestamp,
        owner_pub_key: data.key.toString(),
        expiry_timestamp: expiryTimestamps,
        balance: convertNativeBNToDecimal(marginAccount.balance),
        positions: newMarginAccountPositions,
        rebalance_amount: convertNativeBNToDecimal(marginAccount.rebalanceAmount),
        force_cancel_flag: marginAccount.forceCancelFlag,
      }
      marginAccountUpdateBatch.push(marginAccountUpdate);
      
      // Batch every 20 for a put request as that is upper limit for Firehose batch
      if (marginAccountUpdateBatch.length === 20) {
        putFirehoseBatch(marginAccountUpdateBatch, process.env.FIREHOSE_DS_NAME_MARGIN_ACCOUNT);
        // Reset batch
        marginAccountUpdateBatch = [];
      }
    }
  );
}