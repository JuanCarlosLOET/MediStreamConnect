import { describe, it } from "node:test";
import { MllpFrameDecoder } from "../src/mllpFrameDecoder.js";
import { mllpFrameEncoder } from "../src/mllpFrameEncoder.js";
import { HL7_SAMPLES } from "./samples.js";
import { DELIMITER } from "../src/constants.js";

const payload = Buffer.from(HL7_SAMPLES.ADT_Minimal, "latin1");

async function decoderAllData(chucks) {
  const decoder = new MllpFrameDecoder();
  const frames = [];

  decoder.on("data", (chuck) => frames.push(chuck));

  const completion = new Promise((resolve) => {
    decoder.once("error", resolve);
    decoder.once("end", () => resolve(null));
  });

  for (const chuck of chucks) {
    decoder.write(chuck);
  }

  decoder.end();
  const error = await completion;

  return { frames, error };
}

describe("MllpFrameDecoder", () => {
  it("round-trip: encoding and decoding recover the original payload", async ({
    assert,
  }) => {
    const { frames, error } = await decoderAllData([mllpFrameEncoder(payload)]);

    assert.equal(error, null);
    assert.deepEqual(frames, [payload]);
  });

  it("emits two frames delivered in a single chunk", async ({ assert }) => {
    const second = Buffer.from("MSH|^~\\&|C|D\r", "latin1");

    const combinedFrames = Buffer.concat([
      mllpFrameEncoder(payload),
      mllpFrameEncoder(second),
    ]);

    const { frames, error } = await decoderAllData([combinedFrames]);

    assert.equal(error, null);
    assert.deepEqual(frames, [payload, second]);
  });

  it("fails fast on an unexpected VT inside the payload", async ({
    assert,
  }) => {
    const invalidPayload = Buffer.from([
      DELIMITER.VT,
      0x41,
      DELIMITER.VT,
      0x42,
    ]);

    const { error } = await decoderAllData([invalidPayload]);

    assert.strictEqual(
      error.message,
      "Unexpected MLLP start delimiter (VT) encountered while reading payload.",
    );
  });

  it("fails when FS is not followed by CR", async ({ assert }) => {
    const invalidPayload = Buffer.from([
      DELIMITER.VT,
      0x41,
      DELIMITER.FS,
      0x41,
    ]);
    const { error } = await decoderAllData([invalidPayload]);

    assert.strictEqual(
      error.message,
      "Expected MLLP carriage return (CR) after frame terminator (FS).",
    );
  });

  it("fails when the stream ends with an incomplete frame", async ({
    assert,
  }) => {
    const truncatedPayload = mllpFrameEncoder(payload).subarray(0, 6);
    const { error } = await decoderAllData([truncatedPayload]);

    assert.strictEqual(
      error.message,
      "Stream ended with incomplete MLLP frame.",
    );
  });

  it("reassembles a frame fragmented across chunks", async ({ assert }) => {
    const encoded = mllpFrameEncoder(payload);

    const chunks = [
      encoded.subarray(0, 5), // 5 bytes
      encoded.subarray(5, 12), // 7 bytes
      encoded.subarray(12, 23), // 11 bytes
      encoded.subarray(23, 37), // 14 bytes
    ];

    const { frames, error } = await decoderAllData(chunks);

    assert.equal(error, null);
    assert.deepEqual(frames, [payload]);
  });
});
