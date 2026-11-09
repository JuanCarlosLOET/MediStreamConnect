import { describe, it } from "node:test";
import { mllpFrameEncoder } from "../src/mllpFrameEncoder.js";
import { MLLP_DELIMITER } from "../src/constants.js";

const hl7Message = `MSH|^~\\&|||||||ORU^R01|2|P|2.3.1|`;

describe("mllpFrameEncoder", () => {
  it("should encode a valid payload using MLLP framing", ({ assert }) => {
    const payload = Buffer.from(hl7Message);
    const start = Buffer.from([MLLP_DELIMITER.VT]);
    const end = Buffer.from([MLLP_DELIMITER.FS, MLLP_DELIMITER.CR]);

    const expect = Buffer.concat([start, payload, end]);

    assert.deepStrictEqual(mllpFrameEncoder(payload), expect);
  });
});

it("should throw TypeError when payload is not a Buffer", ({ assert }) => {
  assert.throws(() => mllpFrameEncoder(hl7Message), TypeError);
});

it("should throw RangeError when payload contains VT", ({ assert }) => {
  const payload = Buffer.from([0x41, MLLP_DELIMITER.VT, 0x42]);

  assert.throws(() => mllpFrameEncoder(payload), RangeError);
});

it("should throw RangeError when payload contains FS", ({ assert }) => {
  const payload = Buffer.from([0x41, MLLP_DELIMITER.FS, 0x42]);

  assert.throws(() => mllpFrameEncoder(payload), RangeError);
});
