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

describe("calling getRandomChars()", () => {
  test("returns eight Crockford32 characters when called without an argument", () => {
    const rand = C32.getRandomChars();
    expect(rand.length).toBe(8);
    expect(C32.sanitize(rand)).toBe(rand);
  });
  test("returns the number of characters specified in the argument", () => {
    // make sure its not 8;
    const amount = 9 + Math.trunc(Math.random() * 10);
    const rand = C32.getRandomChars(amount);
  })
});
describe("calling getUlid()", () => {
  test("returns a 26 character long string of Crockford23 characters", () => {
    const ulid = C32.getUlid();
    expect(ulid.length).toBe(26);
    expect(C32.sanitize(ulid)).toBe(ulid);
  });
  test("returns a second ulid thats 'larger' that the first when called twice", () => {
    const ulid1 = C32.getUlid();
    const ulid2 = C32.getUlid();
    expect(ulid2 > ulid1).toBe(true);
  });
  test('Uses the timestamp and seed provided in options to generate a ulid', () => {
    const options = {timestamp:10,salt:1n};
    const crockTime = '000000000A';
    const crockSaltTopHalf =  '00000000'; 
    const crockSaltBottomHalf =  '00000002'; // seed incremented by one
    const ulid = C32.getUlid(options);
    expect(ulid.slice(0,10)).toBe(crockTime);
    expect(ulid.slice(10,18)).toBe(crockSaltTopHalf);  // 1 in 1.09+e12 chance of this failing legitimatly
    expect(ulid.slice(18)).not.toBe(crockSaltBottomHalf);  // 1 in 1.09+e12 chance of this failing legitimatly
  });
  test('increments by 1 if isStrict is true', () => {
    const options = {timestamp:1,salt:1n, isStrict:true};
    const crockSaltTopHalf =  '00000000'; 
    const crockSaltBottomHalf =  '00000002'; 
    const ulid = C32.getUlid(options);
    expect(ulid.slice(10,18)).toBe(crockSaltTopHalf); 
    expect(ulid.slice(18)).toBe(crockSaltBottomHalf);  // 1 in 1.09+e12 chance of this being a false positive
  });
  test('increments by 1 if isStrict is true', () => {
    const options = {timestamp:2,salt:1n, isStrict:true};
    const crockSaltTopHalf =  '00000000'; 
    const crockSaltBottomHalf =  '00000002'; 
    const ulid = C32.getUlid(options);
    expect(ulid.slice(10,18)).toBe(crockSaltTopHalf);
    expect(ulid.slice(18)).toBe(crockSaltBottomHalf);
  });
  test('accepts a ulid as first argument provided in options to generate a ulid', () => {
    const crockTime = '0123456789';
    const crockSaltTopHalf =  '00000000'; 
    const crockSaltBottomHalf =  '00000001'; // seed
    const incrementedBottomHalf =  '00000002'; // seed incremented by one
    const ulid = C32.getUlid(crockTime+crockSaltTopHalf+crockSaltBottomHalf);
    expect(ulid.slice(0,10)).toBe(crockTime);
    expect(ulid.slice(10,18)).toBe(crockSaltTopHalf);  
    expect(ulid.slice(18)).not.toBe(incrementedBottomHalf);  
  });
  test('accepts isStrict as an optional boolean second argument', () => {
    const crockTime = '0000000004';
    const crockSaltTopHalf =  '00000000'; 
    const crockSaltBottomHalf =  '00000001'; 
    const incrementedBottomHalf =  '00000002';
    const ulid = C32.getUlid(crockTime+crockSaltTopHalf+crockSaltBottomHalf,true);
    expect(ulid.slice(0,10)).toBe(crockTime);
    expect(ulid.slice(10,18)).toBe(crockSaltTopHalf);  
    expect(ulid.slice(18)).toBe(incrementedBottomHalf); 
  });
});