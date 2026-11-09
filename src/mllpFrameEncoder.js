import { MLLP_DELIMITER } from "./constants.js";

const START = Buffer.from([MLLP_DELIMITER.VT]);
const END = Buffer.from([MLLP_DELIMITER.FS, MLLP_DELIMITER.CR]);

export function mllpFrameEncoder(payload) {
  if (!Buffer.isBuffer(payload)) {
    throw new TypeError("encode expects a Buffer");
  }
  if (
    payload.includes(MLLP_DELIMITER.VT) ||
    payload.includes(MLLP_DELIMITER.FS)
  ) {
    throw new RangeError(
      "payload contains VT or FS and would break the framing",
    );
  }
  return Buffer.concat([START, payload, END]);
}
