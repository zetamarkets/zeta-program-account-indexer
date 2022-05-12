import { utils } from "@zetamarkets/flex-sdk";
import { subscription, programTypes, types, Exchange } from "@zetamarkets/sdk";
import { POSITION_PRECISION } from "@zetamarkets/sdk/dist/constants";
import { convertNativeBNToDecimal } from "@zetamarkets/sdk/dist/utils";
import { NETWORK } from "./utils/constants";
import { putFirehoseBatch } from "./utils/firehose";
import { MarginAccount, MarginAccountPosition } from "./utils/types";

export const collectMarginAccountData = () => {
  subscription.subscribeProgramAccounts<programTypes.MarginAccount>(
    types.ProgramAccountType.MarginAccount,
    async (
      data: subscription.AccountSubscriptionData<programTypes.MarginAccount>
    ) => {
      const timestamp = Exchange.clockTimestamp;
      const slot = data.context.slot;
      const marginAccount = data.account;
      let marginAccountPositions: MarginAccountPosition[] = [];

      for (let i = 0; i < marginAccount.positions.length; i++) {
        let position = marginAccount.positions[i];
        const marketIndex = i;
        const expiryIndex = Math.floor(marketIndex / 23);
        let expiry = marginAccount.seriesExpiry[expiryIndex].toNumber();
        let marginAccountPosition: MarginAccountPosition = {
          market_index: marketIndex,
          expiry_timestamp: expiry,
          size: convertNativeBNToDecimal(position.position, POSITION_PRECISION),
          cost_of_trades: convertNativeBNToDecimal(position.costOfTrades),
          closing_orders: convertNativeBNToDecimal(
            position.closingOrders,
            POSITION_PRECISION
          ),
          opening_orders_bid: convertNativeBNToDecimal(
            position.openingOrders[0],
            POSITION_PRECISION
          ),
          opening_orders_ask: convertNativeBNToDecimal(
            position.openingOrders[1],
            POSITION_PRECISION
          ),
        };
        marginAccountPositions.push(marginAccountPosition);
      }
      let marginAccountUpdate: MarginAccount = {
        timestamp: timestamp,
        slot: slot,
        underlying: utils.getUnderlyingMapping(
          NETWORK,
          Exchange.zetaGroup.underlyingMint
        ),
        margin_account_address: data.key.toString(),
        owner_pub_key: marginAccount.authority.toString(),
        balance: convertNativeBNToDecimal(marginAccount.balance),
        rebalance_amount: convertNativeBNToDecimal(
          marginAccount.rebalanceAmount
        ),
        force_cancel_flag: marginAccount.forceCancelFlag,
        positions: marginAccountPositions,
      };

      putFirehoseBatch(
        [marginAccountUpdate],
        process.env.FIREHOSE_DS_NAME_MARGIN_ACCOUNT
      );
    }
  );
};
