import { Transform } from "node:stream";
import { createDelimiters } from "./createDelimiters.js";
import { log } from "node:console";

const STATE = {
  SEGMENT_ID: "SEGMENT_ID",
  MSH_ENCODING: "MSH_ENCODING",
  FIELD_DATA: "FIELD_DATA",
  ESCAPE: "ESCAPE",
};

const SEGMENT_SEPARATOR = "\r";
const SEGMENT_ID_LENGTH = 3;

export class HL7MessageParser extends Transform {
  #state;

  constructor(streamOpts = {}) {
    super({
      ...streamOpts,
      readableObjectMode: true,
      writableObjectMode: false,
    });

    this.#state = STATE.SEGMENT_ID;
  }

  _transform(chunk, encoding, callback) {
    log(chunk);
    try {
      this.#drainBuffer(chunk);
      callback();
    } catch (error) {
      callback(error);
    }
  }

  #drainBuffer(chunk) {
    let id = "";
    let idSegmentStart;
    let idLength = 0;

    for (let index = 0; index < chunk.length; index++) {
      switch (this.#state) {
        case STATE.SEGMENT_ID:
          if (idLength < SEGMENT_ID_LENGTH) {
            if (idLength === 0) idSegmentStart = 0;
            if (idLength === SEGMENT_ID_LENGTH) {
              id = chunk.subarray(idSegmentStart, index);
              if (!this.#isValidSegmentId(id)) {
                throw Error(`invalid segment ID ${JSON.stringify(id)}`);
              }
            }
          }
          idLength++;
          break;
      }
    }
  }

  #isValidSegmentId(buffer) {
    return (
      buffer.length === 3 &&
      buffer.every((byte) => byte >= 0x41 && byte <= 0x5a)
    );
  }
}
