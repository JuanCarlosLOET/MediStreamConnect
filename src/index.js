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

switch (state) {
  case STATE.SEGMENT_ID: {
    if (idLength === 0 && atEnd) break; // text ended with a terminator

    if (idLength < SEGMENT_ID_LENGTH) {
      if (idLength === 0) idStart = i;
      if (ch === SEGMENT_TERMINATOR) {
        fail(
          ERR.INVALID_SEGMENT_ID,
          idLength === 0
            ? "empty segment"
            : "segment ID shorter than 3 characters",
          i,
        );
      }
      idLength++;
      if (idLength === SEGMENT_ID_LENGTH) {
        id = text.slice(idStart, i + 1);
        if (!SEGMENT_ID_PATTERN.test(id)) {
          fail(
            ERR.INVALID_SEGMENT_ID,
            `invalid segment ID ${JSON.stringify(id)}`,
            idStart,
          );
        }
        if (delimiters === null && id !== "MSH") {
          fail(ERR.MISSING_MSH, "message must start with MSH", 0);
        }
      }
      break;
    }

    // Character right after the 3-character ID.
    if (delimiters === null) {
      // First segment (MSH): this character *defines* the field separator.
      if (ch === SEGMENT_TERMINATOR) {
        fail(ERR.INVALID_DELIMITERS, "MSH has no field separator", i);
      }
      fieldSeparator = ch;
      start = i + 1;
      state = STATE.MSH_ENCODING;
    } else if (ch === delimiters.field) {
      start = i + 1;
      state = STATE.FIELD_DATA;
    } else if (ch === SEGMENT_TERMINATOR) {
      pushSegment(); // segment with ID only, e.g. "ZZZ"
    } else {
      fail(
        ERR.INVALID_SEGMENT_ID,
        `expected field separator after ${id}, found ${JSON.stringify(ch)}`,
        i,
      );
    }
    break;
  }
}
