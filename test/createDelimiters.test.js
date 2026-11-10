import { describe, it } from "node:test";
import { createDelimiters } from "../src/createDelimiters.js";

describe("createDelimiters", () => {
  it("creates delimiters with four encoding characters", ({ assert }) => {
    const delimiters = Buffer.from("|^~\\&");

    assert.deepStrictEqual(createDelimiters(delimiters), {
      field: 0x7c,
      component: 0x5e,
      repetition: 0x7e,
      escape: 0x5c,
      subcomponent: 0x26,
      truncation: null,
    });
  });

  it("creates delimiters with five encoding characters", ({ assert }) => {
    const delimiters = Buffer.from("|^~\\&#");

    assert.deepStrictEqual(createDelimiters(delimiters), {
      field: 0x7c,
      component: 0x5e,
      repetition: 0x7e,
      escape: 0x5c,
      subcomponent: 0x26,
      truncation: 0x23,
    });
  });

  it("throws TypeError when input is not a Buffer", ({ assert }) => {
    assert.throws(() => createDelimiters("|^~\\&"), TypeError);
  });

  it("throws RangeError when MSH-2 has fewer than four characters", ({
    assert,
  }) => {
    assert.throws(() => createDelimiters(Buffer.from("|^~")), RangeError);
  });

  it("throws RangeError when MSH-2 has more than five characters", ({
    assert,
  }) => {
    assert.throws(() => createDelimiters(Buffer.from("|^~\\&#$")), RangeError);
  });

  it("throws when delimiters contain duplicate characters", ({ assert }) => {
    assert.throws(
      () => createDelimiters(Buffer.from("|^~\\|")),
      /must not repeat/,
    );
  });

  it("throws when a delimiter is alphanumeric", ({ assert }) => {
    assert.throws(
      () => createDelimiters(Buffer.from("A^~\\&")),
      /cannot be used as an HL7 delimiter/,
    );
  });

  it("throws when a delimiter is a space", ({ assert }) => {
    assert.throws(
      () => createDelimiters(Buffer.from("|^~\\ ")),
      /cannot be used as an HL7 delimiter/,
    );
  });
});
