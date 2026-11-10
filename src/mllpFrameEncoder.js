import { DELIMITER } from "./constants.js";

const START = Buffer.from([DELIMITER.VT]);
const END = Buffer.from([DELIMITER.FS, DELIMITER.CR]);

export function mllpFrameEncoder(payload) {
  if (!Buffer.isBuffer(payload)) {
    throw new TypeError("encode expects a Buffer");
  }

  if (payload.length === 0) {
    throw new RangeError("payload must not be empty");
  }

  if (payload.includes(DELIMITER.VT) || payload.includes(DELIMITER.FS)) {
    throw new RangeError(
      "payload contains VT or FS and would break the framing",
    );
  }
  return Buffer.concat([START, payload, END]);
}
