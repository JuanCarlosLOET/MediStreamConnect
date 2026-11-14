import { Transform } from "node:stream";
import { createDelimiters } from "./createDelimiters.js";
import { log } from "node:console";

const PARSE_STATE = {
  MESSAGE_HEADER: "MESSAGE_HEADER",
  MESSAGE_BODY: "MESSAGE_BODY",
};

const SEGMENT_SEPARATOR = "\r";
const FIELD_SEPARATOR_INDEX = 3;
const MSH = Buffer.from("MSH");

const PARSE_LEVEL = {
  BYTE: 0,
  FIELD: 1,
  REPETITION: 2,
  COMPONENT: 3,
  SUBCOMPONENT: 4,
};

export class HL7MessageParser extends Transform {
  #parseState;
  #delimiters = null;
  #segments = [];

  constructor(streamOpts = {}) {
    super({
      ...streamOpts,
      readableObjectMode: false,
      writableObjectMode: true,
    });

    this.#parseState = PARSE_STATE.MESSAGE_HEADER;
  }

  _transform(chunk, encoding, callback) {
    try {
      this.#drainBuffer(chunk);
      callback();
    } catch (error) {
      callback(error);
    }
  }

  #drainBuffer(chunk) {
    let start = 0;

    while (true) {
      const crIndex = chunk.indexOf(SEGMENT_SEPARATOR, start);

      if (crIndex === -1) break;
      const line = chunk.subarray(start, crIndex);

      if (line.length === 0) {
        throw new Error("HL7 message contains an empty segment");
      }

      switch (this.#parseState) {
        case PARSE_STATE.MESSAGE_HEADER: {
          const id = this.#getValidatorSegmentId(line);
          const remainingLine = this.#handlerDelimitersHeader(id, line);
          const fields = this.#handlerFieldContent(remainingLine);

          this.#segments.push({ id, fields });
          this.#parseState = PARSE_STATE.MESSAGE_BODY;

          break;
        }

        case PARSE_STATE.MESSAGE_BODY: {
          const id = this.#getValidatorSegmentId(line);
          const idEndIndex = id.length;
          const remainingLine = line.subarray(idEndIndex + 1);

          const fields = this.#handlerFieldContent(remainingLine);

          this.#segments.push({ id, fields });

          break;
        }
      }

      start = crIndex + 1;
    }

    console.dir(this.#segments.map(inspectSegment), {
      depth: null,
    });
    debugger;
  }

  #handlerDelimitersHeader(id, line) {
    if (this.#delimiters == null && !id.equals(MSH)) {
      throw new Error("message must start with MSH");
    }

    if (line.length < 4) {
      throw new Error("Invalid MSH segment: missing field separator");
    }

    const fieldSeparatorRaw = line[FIELD_SEPARATOR_INDEX];

    const encodingEndIndex = line.indexOf(
      fieldSeparatorRaw,
      FIELD_SEPARATOR_INDEX + 1,
    );

    if (encodingEndIndex === -1) {
      throw new Error(
        "Invalid MSH segment: missing field separator after MSH-2",
      );
    }

    const encodingRaw = line.subarray(
      FIELD_SEPARATOR_INDEX + 1,
      encodingEndIndex,
    );

    this.#delimiters = createDelimiters(fieldSeparatorRaw, encodingRaw);

    const remainingLine = line.subarray(encodingEndIndex + 1);

    return remainingLine;
  }

  #handlerFieldContent(line) {
    const fields = [];
    let repetitions = [];
    let components = [];
    let subcomponents = [];
    let tokenStart = 0;

    const delimiterClassifier = createDelimiterClassifier(this.#delimiters);

    const closeSubcomponent = (index) => {
      const start = index - tokenStart;
      subcomponents.push(line.subarray(start, index).toString());
      tokenStart = 0;
    };

    const closeComponent = (index) => {
      closeSubcomponent(index);
      components.push(subcomponents);
      subcomponents = [];
    };

    const closeRepetition = (index) => {
      closeComponent(index);
      repetitions.push(components);
      components = [];
    };

    const closeField = (index) => {
      closeRepetition(index);
      fields.push(repetitions);
      repetitions = [];
    };

    for (let index = 0; index < line.length; index++) {
      const byte = line[index];

      const classifier = delimiterClassifier(byte);

      switch (classifier) {
        case PARSE_LEVEL.BYTE:
          tokenStart++;
          break;

        case PARSE_LEVEL.SUBCOMPONENT:
          closeSubcomponent(index);
          break;

        case PARSE_LEVEL.COMPONENT:
          closeComponent(index);
          break;

        case PARSE_LEVEL.REPETITION:
          closeRepetition(index);
          break;

        case PARSE_LEVEL.FIELD:
          closeField(index);
          break;
      }
    }
    closeField(line.length);

    return fields;
  }

  #resetMessageState() {
    this.#parseState = PARSE_STATE.MESSAGE_HEADER;
    this.#delimiters = null;
    this.#segments = [];
  }

  #getValidatorSegmentId(line) {
    const segmentId = extractSegmentId(line);

    if (!isValidSegmentId(segmentId)) {
      throw new Error(`invalid segment ID ${JSON.stringify(segmentId)}`);
    }

    return segmentId;
  }
}

// helpers

function extractSegmentId(line) {
  const idLength = line.length;

  if (idLength < 3) {
    throw new Error(
      idLength === 0 ? "empty segment" : "segment ID shorter than 3 characters",
    );
  }

  return line.subarray(0, 3);
}

function isValidSegmentId(segment) {
  return (
    segment[0] >= 0x41 &&
    segment[0] <= 0x5a &&
    segment[1] >= 0x30 &&
    segment[1] <= 0x5a &&
    segment[2] >= 0x30 &&
    segment[2] <= 0x5a
  );
}

function createDelimiterClassifier(delimiters) {
  const { field, component, repetition, subcomponent } = delimiters;

  const LEVEL_SELECTOR = {
    [field]: 1,
    [repetition]: 2,
    [component]: 3,
    [subcomponent]: 4,
  };

  return (byte) => {
    const level = LEVEL_SELECTOR[byte];

    if (level !== undefined) return level;

    const isPrintableLatin1 =
      (byte >= 0x20 && byte <= 0x7e) || (byte >= 0xa0 && byte <= 0xff);

    if (!isPrintableLatin1)
      throw new RangeError(
        `Invalid character: byte 0x${byte.toString(16).toUpperCase().padStart(2, "0")}`,
      );

    return 0;
  };
}

function inspectSegment({ id, fields }) {
  return {
    id: id.toString(),
    fields: fields.map((repetitions) =>
      repetitions.map((components) =>
        components.map((subcomponents) =>
          subcomponents.map((value) => value.toString()),
        ),
      ),
    ),
  };
}
