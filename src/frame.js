import { MLLP_DELIMITER } from "./constants.js";
import { Transform } from "node:stream";

const START = Buffer.from([MLLP_DELIMITER.VT]);
const END = Buffer.from([MLLP_DELIMITER.FS, MLLP_DELIMITER.CR]);

export function encode(payload) {
  if (!Buffer.isBuffer(payload)) {
    throw new TypeError("encode expects a Buffer");
  }
  if (payload.includes(VT) || payload.includes(FS)) {
    throw new RangeError(
      "payload contains VT or FS and would break the framing",
    );
  }
  return Buffer.concat([Buffer.from([VT]), payload, END]);
}

export function createDecoder() {
  return new Transform({
    transform(chuck, encoding, callback) {},
  });
}
