import AWS from "aws-sdk";
import { AWSOptions } from "./aws-config";
import {
  MarginAccount,
  MarginAccountPnL,
  MarketMetadata,
  Pricing,
  Surface,
  Trade,
  VaultBalance,
} from "./types";
import { DEBUG_MODE } from "./constants";

let firehose = new AWS.Firehose(AWSOptions);

firehose.listDeliveryStreams(function (err, data) {
  if (err) console.log(err, err.stack);
  // an error occurred
  else console.log(data); // successful response
});

export const putFirehoseBatch = (
  data:
    | Trade[]
    | Pricing[]
    | Surface[]
    | MarginAccount[]
    | MarginAccountPnL[]
    | VaultBalance[]
    | MarketMetadata[],
  deliveryStreamName: string
) => {
  if (DEBUG_MODE) return;
  if (!data.length) return;
  const records = data.map((d) => {
    return { Data: JSON.stringify(d).concat("\n") };
  });
  var params = {
    DeliveryStreamName: deliveryStreamName /* required */,
    Records: records,
  };
  firehose.putRecordBatch(params, function (err, data) {
    if (err) {
      console.log("Firehose putRecordBatch Error", err);
    } else {
      console.log("Firehose putRecordBatch Success:", deliveryStreamName);
    }
  });
};
