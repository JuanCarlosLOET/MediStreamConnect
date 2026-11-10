const isAlphanumeric = (ch) =>
  (ch >= 0x30 && ch <= 0x39) || // 0-9
  (ch >= 0x41 && ch <= 0x5a) || // A-Z
  (ch >= 0x61 && ch <= 0x7a); // a-z

const isValidDelimiter = (byte) =>
  byte >= 0x21 && byte <= 0x7e && !isAlphanumeric(byte);

export function createDelimiters(delimiters) {
  if (!Buffer.isBuffer(delimiters)) {
    throw new TypeError("delimiters must be a Buffer");
  }

  const [field, ...encodingCharacters] = delimiters;

  if (encodingCharacters.length !== 4 && encodingCharacters.length !== 5) {
    throw new RangeError(
      `MSH-2 must have 4 or 5 characters, got ${encodingCharacters.length}.`,
    );
  }

  if (new Set(delimiters).size !== delimiters.length) {
    throw new Error("MSH-1 and MSH-2 must not repeat a delimiter character");
  }

  for (const byte of delimiters) {
    if (!isValidDelimiter(byte)) {
      throw new Error(
        `0x${byte.toString(16).padStart(2, "0")} cannot be used as an HL7 delimiter`,
      );
    }
  }

  const [component, repetition, escape, subcomponent, truncation = null] =
    encodingCharacters;

  return {
    field,
    component,
    repetition,
    escape,
    subcomponent,
    truncation,
  };
}
