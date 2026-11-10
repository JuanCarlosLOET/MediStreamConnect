import { Transform } from "node:stream";
import { DELIMITER } from "./constants.js";

export const STATE = {
  AWAITING_FOR_VT: "AWAITING_FOR_VT",
  READING_PAYLOAD: "READING_PAYLOAD",
  WAITING_FOR_CR: "WAITING_FOR_CR",
};

export class MllpFrameDecoder extends Transform {
  #state;
  #payloadChunks = [];

  constructor(streamOpts) {
    super({
      readableObjectMode: false,
      writableObjectMode: false,
      decodeStrings: false,
      defaultEncoding: "latin1",
      ...streamOpts,
    });

    this.#reset();
  }

  _transform(chunk, encoding, callback) {
    if (!Buffer.isBuffer(chunk)) {
      callback(
        new TypeError(
          "Expects Buffer chunks (did you call socket.setEncoding?)",
        ),
      );
      return;
    }

    try {
      this.#decoderChunkInfo(chunk);
      callback();
    } catch (error) {
      callback(error);
    }
  }

  _flush(callback) {
    if (this.#state !== STATE.AWAITING_FOR_VT) {
      callback(new Error("Stream ended with incomplete MLLP frame."));
      return;
    }

    callback();
  }

  #decoderChunkInfo(chunk) {
    let startSegment = this.#state === STATE.READING_PAYLOAD ? 0 : -1;

    for (let index = 0; index < chunk.length; index++) {
      const currentByte = chunk[index];

      switch (this.#state) {
        case STATE.AWAITING_FOR_VT:
          if (currentByte === DELIMITER.VT) {
            this.#state = STATE.READING_PAYLOAD;
            startSegment = index + 1;
          }
          break;

        case STATE.READING_PAYLOAD:
          if (currentByte === DELIMITER.FS) {
            if (startSegment < index) {
              this.#payloadChunks.push(chunk.subarray(startSegment, index));
            }

            this.#state = STATE.WAITING_FOR_CR;
          } else if (currentByte === DELIMITER.VT) {
            throw new Error(
              "Unexpected MLLP start delimiter (VT) encountered while reading payload.",
            );
          }
          break;

        case STATE.WAITING_FOR_CR:
          if (currentByte === DELIMITER.CR) {
            this.#emitFrame();
          } else {
            throw new Error(
              "Expected MLLP carriage return (CR) after frame terminator (FS).",
            );
          }
          break;
      }
    }

    if (this.#state === STATE.READING_PAYLOAD && startSegment < chunk.length) {
      this.#payloadChunks.push(chunk.subarray(startSegment));
    }
  }

  #emitFrame() {
    const payload = Buffer.concat(this.#payloadChunks);

    if (payload.length === 0) {
      throw new Error("HL7 message payload must not be empty");
    }

    this.#reset();
    this.push(payload);
  }

  #reset() {
    this.#payloadChunks = [];
    this.#state = STATE.AWAITING_FOR_VT;
  }
}
