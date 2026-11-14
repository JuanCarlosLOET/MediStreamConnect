const isAlphanumeric = (ch) =>
  (ch >= 0x30 && ch <= 0x39) || // 0-9
  (ch >= 0x41 && ch <= 0x5a) || // A-Z
  (ch >= 0x61 && ch <= 0x7a); // a-z

const isValidDelimiter = (byte) =>
  byte >= 0x21 && byte <= 0x7e && !isAlphanumeric(byte);

export function createDelimiters(separator, delimiters) {
  if (!Buffer.isBuffer(delimiters)) {
    throw new TypeError("delimiters must be a Buffer");
  }

  if (typeof separator !== "number") {
    throw new TypeError("separator must be a number");
  }

  if (delimiters.length !== 4) {
    throw new RangeError(
      `MSH-2 must have 4  characters, got ${encodingCharacters.length}.`,
    );
  }

  const all = Buffer.concat([Buffer.from([separator]), delimiters]);

  if (new Set(all).size !== all.length) {
    throw new Error("MSH-1 and MSH-2 must not repeat a delimiter character");
  }

  for (const byte of all) {
    if (!isValidDelimiter(byte)) {
      throw new Error(
        `0x${byte.toString(16).padStart(2, "0")} cannot be used as an HL7 delimiter`,
      );
    }
  }

  const [component, repetition, escape, subcomponent] = delimiters;

  return {
    field: separator,
    component,
    repetition,
    escape,
    subcomponent,
  };
}
