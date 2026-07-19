import {
  describe,
  expect,
  test,
  jest,
  afterAll,
  beforeAll,
} from "@jest/globals";
import C32  from "./index.js";
import { TextEncoder, TextDecoder } from "util";
import {Blob as BlobPolyfill} from 'node:buffer';

global.Blob = BlobPolyfill;
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

describe("calling C32.sanitize()", () => {
  test("accepts the following characters : '0123456789ABCDEFGHJKMNPQRSTVWXYZ' ", () => {
    const send = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    expect(C32.sanitize(send)).toBe(send);
  });
  test("throws a RangeError if the string contains a character not listed above", () => {
    for (const char of "*~+=U") { // just testing the extra checksum chars.
      expect(() => C32.sanitize(char)).toThrow(RangeError);
    }
  });
  describe("with options.strictMatching ommited or false ", () => {
    const options = { strictMatching: false };
    test("returns an uppercase version of the provided string", () => {
      const send = "abcd";
      const recieve = "ABCD";
      expect(C32.sanitize(send)).toBe(recieve);
      expect(C32.sanitize(send,options)).toBe(recieve);
    });
    test("returns a version of the provided string with hyphens and whitespace removed", () => {
      const send = " A-B C-DE F\nG  ";
      const recieve = "ABCDEFG";
      expect(C32.sanitize(send)).toBe(recieve);
      expect(C32.sanitize(send,options)).toBe(recieve);
    });
    test("returns a version of the provided string with I & L replaced with 1", () => {
      const send = "IL";
      const recieve = "11";
      expect(C32.sanitize(send)).toBe(recieve);
      expect(C32.sanitize(send,options)).toBe(recieve);
    });
    test("returns a version of the provided string with  O replaced with 0", () => {
      const send = "O";
      const recieve = "0";
      expect(C32.sanitize(send)).toBe(recieve);
      expect(C32.sanitize(send,options)).toBe(recieve);
    });
  });
  describe("with options.strictMatching = true", () => {
    const options = { strictMatching: true };
    test("throws a RangeError if the string contains an otherwise in-range lowercase letter", () => {
      for (const char of "abcdefghijklmnopqrstvxyz") { // including i l o for completeness
        expect(() => C32.sanitize(char,options)).toThrow(RangeError);
      }
    });
    test("throws a RangeError if the string contains hyphen or whitespace", () => {
      for (const char of "- \t\n") { // just checking the most likely whitespace chars
        expect(() => C32.sanitize(`A${char}B`,options)).toThrow(RangeError);
      }
    });
    test("throws a RangeError if the string contains I, L or O", () => {
      for (const char of "ILO") {
        expect(() => C32.sanitize(char, options)).toThrow(RangeError);
      }
    });
  });
  describe("with options.withChecksum = true", () => {
    const options = { withChecksum: true };
    test("accepts a string where the last character is one of : '0123456789ABCDEFGHJKMNPQRSTVWXYZ*~$=U' ", () => {
      for (const char of "0123456789ABCDEFGHJKMNPQRSTVWXYZ*~$=U") {
        const send = "0";
        expect(C32.sanitize(send + char, options)).toBe(send + char);
      }
    });
    test("throws a RangeError if the last character is NOT one of the the above", () => {
      const send = "0%";
      expect(() => C32.sanitize(send, options)).toThrow(RangeError);
    });
  });
});
describe("calling C32.fromUint8()", () => {
  test("will return a Crockford32 encoded string", () => {
    const send = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89]);
    const recieve = '04HMASW9';
    expect(C32.fromUint8(send)).toBe(recieve);
  });
  describe("with options.withChecksum = true", () => {
    const options = {withChecksum: true}
    test("will return a Crockford32 encoded string with a checksum at the end", () => {
      const send = new Uint8Array([0x01, 0x23, 0x45, 0x67]);
      const recieve = '04HMASRU';
      expect(C32.fromUint8(send, options)).toBe(recieve);
    });
  })
});
describe("calling C32.toUint8()", () => {
  test("will return the decoded bytes in a Uint8Array", () => {
    const expected = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89]);
    const value = '04HMASW9';
    expect(C32.toUint8(value)).toStrictEqual(expected);
  });
  describe("with options.withChecksum = true", () => {
    test("will throw a RangeError when a digit character is off", () => {
      const options = {withChecksum: true}
      const value = '04HMASPU';
      expect(() => C32.toUint8(value, options)).toThrow(RangeError);
    });
    test("will throw a RangeError when the checksum character is off", () => {
      const options = {withChecksum: true}
      const value = '04HMASR*';
      expect(() => C32.toUint8(value, options)).toThrow(RangeError);
    });
    test("will return the decoded bytes in a Uint8Array when the checksum is valid", () => {
      const options = {withChecksum: true}
      const expected = new Uint8Array([0x01, 0x23, 0x45, 0x67]);
      const value = '04HMASRU';
      expect(C32.toUint8(value, options)).toStrictEqual(expected);
    });
  })
});
describe("calling C32.fromBigInt()", () => {
  const value = 0x123456789n;
  const expected = '04HMASW9';
  test("will return an encoded crockford32 string value", () => {
    expect(C32.fromBigInt(value)).toBe(expected);
  });
});
describe("calling C32.toBigInt()", () => {
  const expected = 0x123456789n;
  const value = '04HMASW9';
  test("will return a decoded BigInt", () => {
    expect(C32.toBigInt(value)).toBe(expected);
  });
});
// Do not need to test the functionality of browser built-in TextEncoder, TextDecoder & Uint8Array methods.

//TODO: tests for getRandomChars getUlid & ulidToParts