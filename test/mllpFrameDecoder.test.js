import { describe, it, beforeEach } from "node:test";
import { once } from "node:events";
import { MllpFrameDecoder } from "../src/mllpFrameDecoder.js";
import { mllpFrameEncoder } from "../src/mllpFrameEncoder.js";
import { log } from "node:console";

async function decoderAllData(decoder, chucks) {
  const output = [];
  const ended = once(decoder, "end");
  decoder.on("data", (chuck) => output.push(chuck));

  for (const chuck of chucks) {
    decoder.write(chuck);
  }

  decoder.end();
  await ended;

  return output;
}

describe("MllpFrameDecoder", () => {
  let decoder;

  beforeEach(() => {
    decoder = new MllpFrameDecoder();
  });

  it("round-trip: MllpFrameDecoder and mllpDecode recover the original payload", async ({
    assert,
  }) => {
    const original = Buffer.from(
      `MSH|^~\\&|||||||ORU^R01|2|P|2.3.1|\r`,
      "latin1",
    );
    const result = await decoderAllData(decoder, [mllpFrameEncoder(original)]);

    assert.deepEqual(original, ...result);
  });

  it("message boundaries are preserved when consumed with for await", async ({
    assert,
  }) => {
    const originalA = Buffer.from(
      `MSH|^~\\&|A||||||ORU^R01|2|P|2.3.1|\r`,
      "latin1",
    );

    const originalB = Buffer.from(
      `MSH|^~\\&|B||||||ORU^R01|2|P|2.3.1|\r`,
      "latin1",
    );

    const result = await decoderAllData(decoder, [
      mllpFrameEncoder(originalA),
      mllpFrameEncoder(originalB),
    ]);

    assert.deepEqual(result, [originalA, originalB]);
  });

  it("applies backpressure when the writable buffer reaches highWaterMark", ({
    assert,
  }) => {
    const decoder = new MllpFrameDecoder({
      writableHighWaterMark: 1,
      readableHighWaterMark: 1,
    });

    const payload = Buffer.from("MESSAGE_A\r");
    const frame = mllpFrameEncoder(payload);

    const canContinue = decoder.write(frame);

    assert.strictEqual(canContinue, false);

    decoder.destroy();
  });

  it(
    "applies backpressure when the readable buffer reaches highWaterMark",
    { todo: true },
    ({ assert }) => {
      const decoder = new MllpFrameExtractor({
        readableHighWaterMark: 1,
        writableHighWaterMark: 1024,
      });

      const payloadA = Buffer.from("MESSAGE_A\r");
      const payloadB = Buffer.from("MESSAGE_B\r");

      const combinedChunk = Buffer.concat([
        mllpFrameEncoder(payloadA),
        mllpFrameEncoder(payloadB),
      ]);

      const canContinue = decoder.write(combinedChunk);

      assert.strictEqual(canContinue, false);

      decoder.destroy();
    },
  );
});
