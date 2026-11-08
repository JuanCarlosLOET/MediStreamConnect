import { Transform } from "node:stream";
import { MLLP_DELIMITER } from "./constants.js";

export class MllpDecoder extends Transform {
  constructor(options = {}) {
    super(options);
  }

  _transform(chuck, encoding, callback) {}
}
