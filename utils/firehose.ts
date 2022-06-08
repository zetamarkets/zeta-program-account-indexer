import AWS from "aws-sdk";
import { AWSOptions } from "./aws-config";
import {
  MarketMetadata,
  Pricing,
  Surface,
} from "./types";
import { DEBUG_MODE } from "./constants";

let firehose = new AWS.Firehose(AWSOptions);

export const putFirehoseBatch = (
  data:
    | Pricing[]
    | Surface[]
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
      console.log(
        "Firehose putRecordBatch ",
        deliveryStreamName,
        " Error",
        err
      );
    } else {
      console.log(
        "Firehose putRecordBatch ",
        deliveryStreamName,
        " Success:",
        deliveryStreamName
      );
    }
  });
};
