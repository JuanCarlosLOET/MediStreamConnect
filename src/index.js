import { log } from "node:console";
import { HL7MessageParser } from "./HL7MessageParser.js";
import { MllpFrameDecoder } from "./mllpFrameDecoder.js";
import { mllpFrameEncoder } from "./mllpFrameEncoder.js";
import { HL7_SAMPLES } from "../test/samples.js";

const frame = new MllpFrameDecoder();
const parser = new HL7MessageParser();

const message = Buffer.from(HL7_SAMPLES.ADT_A01_Interval);
frame.write(mllpFrameEncoder(message));
frame.end();

frame.pipe(parser);

parser.on("data", (data) => {
  log("-------------");
  log(data.toString());
});
