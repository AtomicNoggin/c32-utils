import assert from "node:assert/strict";
import { afterEach, describe, mock, test } from "node:test";
import C32 from "./index.js";
import { TextEncoder, TextDecoder } from "util";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const cleanup = () => {
  mock.reset();
  C32.defaultTtl = 5000;
  C32.defaultIsStrict = false;
  C32.defaultAsUlid120 = false;
  C32.clearCache();
  C32.unobserveCacheUpdates();
};

const mockRandomValues = (uint8) => {
  for (let i = 0; i < uint8.length; i++) {
    uint8[i] = i;
  }
  return uint8;
};
// returns [0,1,2,3,4], which becomes 1020304n or 000G40R4

describe("calling C32.sanitize()", () => {
  afterEach(cleanup);

  test("accepts the following characters : '0123456789ABCDEFGHJKMNPQRSTVWXYZ' ", () => {
    const send = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    assert.equal(C32.sanitize(send), send);
  });

  test("throws a RangeError if the string contains a character not listed above", () => {
    for (const char of "*~+=U") {
      assert.throws(() => C32.sanitize(char), RangeError);
    }
  });

  describe("with options.strictMatching ommited or false ", () => {
    afterEach(cleanup);

    const options = { strictMatching: false };
    afterEach(cleanup);

    test("returns an uppercase version of the provided string", () => {
      const send = "abcd";
      const recieve = "ABCD";
      assert.equal(C32.sanitize(send), recieve);
      assert.equal(C32.sanitize(send, options), recieve);
    });

    test("returns a version of the provided string with hyphens and whitespace removed", () => {
      const send = " A-B C-DE F\nG  ";
      const recieve = "ABCDEFG";
      assert.equal(C32.sanitize(send), recieve);
      assert.equal(C32.sanitize(send, options), recieve);
    });

    test("returns a version of the provided string with I & L replaced with 1", () => {
      const send = "IL";
      const recieve = "11";
      assert.equal(C32.sanitize(send), recieve);
      assert.equal(C32.sanitize(send, options), recieve);
    });

    test("returns a version of the provided string with  O replaced with 0", () => {
      const send = "O";
      const recieve = "0";
      assert.equal(C32.sanitize(send), recieve);
      assert.equal(C32.sanitize(send, options), recieve);
    });
  });

  describe("with options.strictMatching = true", () => {
    afterEach(cleanup);

    const options = { strictMatching: true };
    afterEach(cleanup);

    test("throws a RangeError if the string contains an otherwise in-range lowercase letter", () => {
      for (const char of "abcdefghijklmnopqrstvxyz") {
        assert.throws(() => C32.sanitize(char, options), RangeError);
      }
    });

    test("throws a RangeError if the string contains hyphen or whitespace", () => {
      for (const char of "- \t\n") {
        assert.throws(() => C32.sanitize(`A${char}B`, options), RangeError);
      }
    });

    test("throws a RangeError if the string contains I, L or O", () => {
      for (const char of "ILO") {
        assert.throws(() => C32.sanitize(char, options), RangeError);
      }
    });
  });

  describe("with options.withChecksum = true", () => {
    afterEach(cleanup);
    const options = { withChecksum: true };
    test("accepts a string where the last character is one of : '0123456789ABCDEFGHJKMNPQRSTVWXYZ*~$=U' ", () => {
      for (const char of "0123456789ABCDEFGHJKMNPQRSTVWXYZ*~$=U") {
        const send = "0";
        assert.equal(C32.sanitize(send + char, options), send + char);
      }
    });

    test("throws a RangeError if the last character is NOT one of the the above", () => {
      const send = "0%";
      assert.throws(() => C32.sanitize(send, options), RangeError);
    });
  });
});

describe("calling C32.fromUint8()", () => {
  afterEach(cleanup);

  test("will return a Crockford32 encoded string", () => {
    const send = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89]);
    const recieve = "04HMASW9";
    assert.equal(C32.fromUint8(send), recieve);
  });

  describe("with options.withChecksum = true", () => {
    afterEach(cleanup);

    const options = { withChecksum: true };
    afterEach(cleanup);

    test("will return a Crockford32 encoded string with a checksum at the end", () => {
      const send = new Uint8Array([0x01, 0x23, 0x45, 0x67]);
      const recieve = "04HMASRU";
      assert.equal(C32.fromUint8(send, options), recieve);
    });
  });
});

describe("calling C32.toUint8()", () => {
  afterEach(cleanup);

  test("will return the decoded bytes in a Uint8Array", () => {
    const expected = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89]);
    const value = "04HMASW9";
    assert.deepEqual(C32.toUint8(value), expected);
  });

  describe("with options.withChecksum = true", () => {
    afterEach(cleanup);

    test("will throw a RangeError when a digit character is off", () => {
      const options = { withChecksum: true };
      const value = "04HMASPU";
      assert.throws(() => C32.toUint8(value, options), RangeError);
    });

    test("will throw a RangeError when the checksum character is off", () => {
      const options = { withChecksum: true };
      const value = "04HMASR*";
      assert.throws(() => C32.toUint8(value, options), RangeError);
    });

    test("will return the decoded bytes in a Uint8Array when the checksum is valid", () => {
      const options = { withChecksum: true };
      const expected = new Uint8Array([0x01, 0x23, 0x45, 0x67]);
      const value = "04HMASRU";
      assert.deepEqual(C32.toUint8(value, options), expected);
    });
  });
});

describe("calling C32.fromBigInt()", () => {
  afterEach(cleanup);

  const value = 0x123456789n;
  const expected = "04HMASW9";

  test("will return an encoded crockford32 string value", () => {
    assert.equal(C32.fromBigInt(value), expected);
  });
});

describe("calling C32.toBigInt()", () => {
  afterEach(cleanup);

  const expected = 0x123456789n;
  const value = "04HMASW9";

  test("will return a decoded BigInt", () => {
    assert.equal(C32.toBigInt(value), expected);
  });
});

describe("calling C32.fromText()", () => {
  afterEach(cleanup);
  test(
    "encodes text to a Crockford32 string",
    { skip: "No need to test Browser built in functionality" },
    () => {},
  );
});

describe("calling C32.toText()", () => {
  afterEach(cleanup);

  test(
    "decodes a Crockford32 string back to the original text",
    { skip: "No need to test Browser built in functionality" },
    () => {},
  );

  test(
    "accepts textOptions for the TextDecoder",
    { skip: "No need to test Browser built in functionality" },
    () => {},
  );
});

describe("calling C32.fromHex()", () => {
  afterEach(cleanup);

  test(
    "converts a hex string to Crockford32",
    { skip: "No need to test Browser built in functionality" },
    () => {},
  );
});

describe("calling C32.toHex()", () => {
  afterEach(cleanup);

  test(
    "converts a Crockford32 string back to hex",
    { skip: "No need to test Browser built in functionality" },
    () => {},
  );
});

describe("calling C32.fromBase64()", () => {
  afterEach(cleanup);

  test(
    "converts a base64 string to Crockford32",
    { skip: "No need to test Browser built in functionality" },
    () => {},
  );
});

describe("calling C32.toBase64()", () => {
  afterEach(cleanup);

  test(
    "converts a Crockford32 string back to base64",
    { skip: "No need to test Browser built in functionality" },
    () => {},
  );
});

describe("calling getRandomChars()", () => {
  afterEach(cleanup);

  test("returns eight Crockford32 characters when called without an argument", () => {
    const rand = C32.getRandomChars();
    assert.equal(rand.length, 8);
    assert.equal(C32.sanitize(rand), rand);
  });

  test("returns the number of characters specified in the argument", () => {
    const amount = 9 + Math.trunc(Math.random() * 10);
    const rand = C32.getRandomChars(amount);
    assert.equal(rand.length, amount);
  });
  test("can return values with a leading zero", () => {
    const mockRandom = mock.method(crypto, "getRandomValues", mockRandomValues);
    const rand = C32.getRandomChars();
    assert.equal(rand[0], "0");
    mockRandom.mock.restore();
  });
});

describe("calling getUlid()", () => {
  afterEach(cleanup);

  test("returns a uses Date.now() for the timestamp and crypto.getRandomValues to generate the 80 bit salt", () => {
    C32.clearCache();
    const mockRandom = mock.method(crypto, "getRandomValues", mockRandomValues);
    const mockNow = mock.method(Date, "now", () => 1);
    // will generate a ulid with the mock values of timestamp: 1 and salt: 1020304001020304n
    const ulid = C32.getUlid();
    assert.equal(ulid, "0000000001000G40R4000G40R4");
  });

  test("returns a second ulid thats 'larger' that the first when called twice in the same millisecond", () => {
    C32.clearCache();
    const mockRandom = mock.method(crypto, "getRandomValues", mockRandomValues);
    const mockNow = mock.method(Date, "now", () => 1);
    // will generate a ulid with the mock values of timestamp: 1 and salt: 1020304001020304n
    const ulid1 = C32.getUlid();
    // will increment the salt by 1020304n
    const ulid2 = C32.getUlid();
    assert.equal(ulid2, "0000000001000G40R4001GC28C");
  });
  test("Uses the timestamp and salt provided in options to generate a ULID with the same timestamp and incermentally larger random value", () => {
    C32.clearCache();
    const mockRandom = mock.method(crypto, "getRandomValues", mockRandomValues);
    const options = { timestamp: 10, salt: 1n };
    const crockTime = "000000000A";
    // incremented by the mock random values [0,1,2,3,4]
    const crockSalt = "00000000000G40R5";
    // bottom half will be incremented with 40 bits of randomness
    const ulid = C32.getUlid(options);
    // top half of salt remains untouched
    assert.equal(ulid.slice(0, 10), crockTime);
    assert.equal(ulid.slice(10, 26), crockSalt);
  });
  test("Passing in a timestamp of 0 works as expected", () => {
    C32.clearCache();
    const options = { timestamp: 0, salt: 1n };
    const crockTime = "0000000000";
    const ulid = C32.getUlid(options);
    assert.equal(ulid.slice(0, 10), crockTime);
  });
  test("Passing in a salt of 0n works as expected", () => {
    C32.clearCache();
    const mockRandom = mock.method(crypto, "getRandomValues", mockRandomValues);
    const options = { timestamp: 10, salt: 0n };
    const crockSalt = "00000000000G40R4";
    // incremented by the mock random values [0,1,2,3,4]
    const ulid = C32.getUlid(options);
    assert.equal(ulid.slice(10, 26), crockSalt);
  });
  test("increments by 1 if isStrict is true", () => {
    const options = { timestamp: 2, salt: 1n, isStrict: true };
    const crockSalt = "0000000000000002";
    const ulid = C32.getUlid(options);
    assert.equal(ulid.slice(10, 26), crockSalt);
  });
  test("ignores salt if timestamp not provided", () => {
    const ulid = C32.getUlid({ salt: 1n, isStrict: true });
    const crockSalt = "0000000000000002";
    assert.notEqual(ulid.slice(10, 26), crockSalt);
  });
  test("generates a ULID120 if extra option is true", () => {
    const ulid = C32.getUlid({ extra: true });
    assert.equal(ulid.length, 34);
  });
  test("generates a ULID120 if extra option is a bigint", () => {
    const ulid = C32.getUlid({ extra: 1n });
    assert.equal(ulid.length, 34);
  });
  test("works as expected if extra is 0n", () => {
    const ulid = C32.getUlid({ extra: 0n });
    assert.equal(ulid.length, 34);
  });
  test("accepts a ulid as first argument provided in options to generate a ulid", () => {
    const crockTime = "0123456789";
    const crockSaltTopHalf = "00000000";
    const crockSaltBottomHalf = "00000001";
    const ulid = C32.getUlid(
      crockTime + crockSaltTopHalf + crockSaltBottomHalf,
    );
    assert.equal(ulid.slice(0, 10), crockTime);
    assert.equal(ulid.slice(10, 18), crockSaltTopHalf);
  });

  test("accepts isStrict as an optional boolean second argument", () => {
    const crockTime = "0000000004";
    const crockSaltTopHalf = "00000000";
    const crockSaltBottomHalf = "00000001";
    const incrementedBottomHalf = "00000002";
    const ulid = C32.getUlid(
      crockTime + crockSaltTopHalf + crockSaltBottomHalf,
      true,
    );
    assert.equal(ulid.slice(0, 10), crockTime);
    assert.equal(ulid.slice(10, 18), crockSaltTopHalf);
    assert.equal(ulid.slice(18), incrementedBottomHalf);
  });

  test("uses the ttl option to control cache duration", async () => {
    const options = { timestamp: 100, salt: 5n, ttl: 5, isStrict: true };
    const ulid = C32.getUlid(options);
    assert.equal(ulid.length, 26);
    const ulidParts = C32.ulidToParts(ulid);
    assert.equal(ulidParts.salt, 6n);
    // Wait for cache to expire
    await new Promise((resolve) =>
      setTimeout(() => {
        const ulid2 = C32.getUlid({ timestamp: 100, salt: 5n, isStrict: true });
        assert.equal(ulid, ulid2);
        resolve();
      }, 10),
    );
  });
});

describe("calling ulidToParts()", () => {
  afterEach(cleanup);

  test("returns timestamp and salt from a valid ULID", () => {
    const timestamp = Date.now() + 100000; // avoid collision with previous tests
    const ulid = C32.getUlid({ timestamp, salt: 12345n });
    const parts = C32.ulidToParts(ulid);
    assert.equal(parts.timestamp, timestamp);
    // salt is incremented by getUlid, so it won't equal the original salt
    assert.ok(parts.salt > 12345n);
  });

  test("passes through isStrict option", () => {
    const ulid = C32.getUlid({ timestamp: 1000, salt: 1n });
    const parts = C32.ulidToParts(ulid, { isStrict: true });
    assert.equal(parts.isStrict, true);
  });

  test("passes through ttl option", () => {
    const ulid = C32.getUlid({ timestamp: 1000, salt: 1n });
    const parts = C32.ulidToParts(ulid, { ttl: 5000 });
    assert.equal(parts.ttl, 5000);
  });

  test("passes through both isStrict and ttl options", () => {
    const ulid = C32.getUlid({ timestamp: 1000, salt: 1n });
    const parts = C32.ulidToParts(ulid, { isStrict: true, ttl: 10000 });
    assert.equal(parts.isStrict, true);
    assert.equal(parts.ttl, 10000);
  });

  test("accepts isStrict as boolean second argument", () => {
    const ulid = C32.getUlid({ timestamp: 2000, salt: 2n });
    const parts = C32.ulidToParts(ulid, true);
    assert.equal(parts.isStrict, true);
  });
  test("accepts ttl as numeric third argument", () => {
    const ulid = C32.getUlid({ timestamp: 2000, salt: 2n });
    const parts = C32.ulidToParts(ulid, {}, 3000);
    assert.equal(parts.ttl, 3000);
  });
});

describe("calling C32.setCacheValue()", () => {
  afterEach(cleanup);
  test(
    "sets a cache value for a given timestamp",
    () => {
      const ts = 1000;
      C32.setCacheValue(ts, 1n);
      const parts = C32.ulidToParts(C32.getUlid({timestamp:ts, isStrict:true}));
      console.log(parts);
      assert.equal(parts.salt, 2n);
    },
  );
});

describe("calling C32.getCacheValue()", () => {
  afterEach(cleanup);
  test(
    "returns the cached salt for a timestamp",
    () => {
      const ts = Date.now();
      C32.setCacheValue(ts, 1n);
      assert.equal(C32.getCacheValue(ts), 1n);
    },
  );
  test(
    "returns undefined if no cache entry exists",
    () => {
      assert.equal(C32.getCacheValue(Date.now()), undefined);
    },
  );
});

describe("calling C32.hasCacheValue()", () => {
  afterEach(cleanup);
  test(
    "returns true if a cache entry exists",
    () => {
      const ts = Date.now();
      C32.setCacheValue(ts, 1n);
      assert.equal(C32.hasCacheValue(ts), true);
    },
  );
  test(
    "returns false if no cache entry exists",
    () => {
      const ts = Date.now();
      assert.equal(C32.hasCacheValue(ts), false);
    },
  );
});

describe("calling C32.deleteCacheValue()", () => {
  afterEach(cleanup);

  test("removes a cache entry and returns true", () => {
    const ts = Date.now();
    C32.setCacheValue(ts, 1n);
    assert.equal(C32.hasCacheValue(ts), true);
    assert.equal(C32.deleteCacheValue(ts), true);
    assert.equal(C32.hasCacheValue(ts), false);
  });
  test("returns false if no cache entry exists", () => {
    assert.equal(C32.deleteCacheValue(Date.now()), false);
  });
});

describe("calling C32.clearCache()", () => {
  afterEach(cleanup);

  test("removes all cache entries", () => {
    const ts = Date.now();
    C32.setCacheValue(ts, 1n);
    C32.setCacheValue(ts + 1, 1n);
    C32.clearCache();
    assert.equal(C32.hasCacheValue(ts), false);
    assert.equal(C32.hasCacheValue(ts + 1), false);
  });
});

describe("calling C32.prefillCache()", () => {
  afterEach(cleanup);

  test("prefills cache with future random values", () => {
    const ts = Date.now();
    C32.prefillCache(10);
    assert.ok(C32.hasCacheValue(ts));
    assert.ok(C32.hasCacheValue(ts + 9));
  });
  test("does not overwrite existing cache entries", () => {
    const ts = Date.now();
    C32.setCacheValue(ts, 1n);
    C32.setCacheValue(ts + 9, 1n);
    C32.prefillCache(10);
    assert.equal(C32.getCacheValue(ts), 1n);
    assert.equal(C32.getCacheValue(ts + 9), 1n);
  });
  test("notifies the observeMethod if set", () => {
    let ts;
    const mockMethod = mock.fn((actions) => {
      assert.equal(actions.length, 10);
      assert.equal(actions[0].timestamp, ts);
      assert.equal(actions[9].timestamp, ts + 9);
    });
    C32.observeCacheUpdates(mockMethod);
    ts = Date.now();
    C32.prefillCache(10);
    C32.unobserveCacheUpdates();
  });
  test("does nothing if defaultTtl is 0", () => {
    C32.defaultTtl = 0;
    C32.prefillCache(10);
    assert.equal(C32.hasCacheValue(Date.now()), false);
  });
});

describe("using cache observation", () => {
  afterEach(cleanup);

  test("getObserveMethod returns the observer function and unobserveCacheUpdates clears the observer", () => {
    const mockMethod = mock.fn();
    C32.observeCacheUpdates(mockMethod);
    assert.equal(C32.getObserveMethod(), mockMethod);
    C32.unobserveCacheUpdates();
    assert.equal(C32.getObserveMethod(), null);
  });
  test("observeMethod fires when a timestamp is set and again when the ttl expires", async () => {
    let lastAction = null;
    const mockMethod = mock.fn((actions) => {
      lastAction = actions.pop();
    });
    C32.observeCacheUpdates(mockMethod);
    C32.setCacheValue(1, 1n, 5);
    await new Promise((r) =>
      setTimeout(async () => {
        assert.equal(mockMethod.mock.calls.length, 1);
        assert.equal(lastAction, "set");
        await new Promise((r) =>
          setTimeout(() => {
            assert.equal(mockMethod.mock.calls.length, 2);
            assert.equal(lastAction, "delete");
            C32.unobserveCacheUpdates();
            r();
          }, 10),
        );
        r();
      }, 0),
    );
  });
  test("observeMethod fires when a value is manually deleted", async () => {
    let lastAction = null;
    const mockMethod = mock.fn((actions) => {
      lastAction = actions.pop();
    });
    const ts = Date.now();
    C32.setCacheValue(ts, 1n);
    C32.observeCacheUpdates(mockMethod);
    C32.deleteCacheValue(ts);
    await new Promise((r) =>
      setTimeout(() => {
        assert.equal(mockMethod.mock.calls.length, 1);
        assert.equal(lastAction, "delete");
        C32.unobserveCacheUpdates();
        r();
      }, 0),
    );
  });
  test("observeMethod only fires once if multiple updates happen synchronously", async() => {
    const actions = [];
    const mockMethod = mock.fn((acts) => {actions = acts});
    C32.observeCacheUpdates(mockMethod);
    const ts = Date.now();
    C32.setCacheValue(ts, 1n);
    C32.setCacheValue(ts+1, 2n);
    await new Promise((r) =>
      setTimeout(() => {
        assert.equal(mockMethod.mock.calls.length, 1);
        assert.equal(actions.length, 2);
        C32.unobserveCacheUpdates();
        r();
      }, 0),
    );
  });
  describe("calling C32.flushCacheUpdates()", () => {
    afterEach(cleanup);
    test("returns pending update records", () => {
      const ts = Date.now();
      C32.observeCacheUpdates(mock.fn());
      C32.setCacheValue(ts, 1n);
      const actions = C32.flushCacheUpdates();
      assert.ok(Array.isArray(actions));
      assert.equal(actions.length, 1);
      assert.equal(actions[0].action, "set");
      assert.equal(actions[0].timestamp, ts);
    });
    test("clears the records after flushing", () => {
      const ts = Date.now();
      C32.observeCacheUpdates(mock.fn());
      C32.setCacheValue(ts, 1n);
      C32.flushCacheUpdates();
      assert.equal(C32.flushCacheUpdates().length, 0);
    });
  });
});


describe("calling C32.getUlid() with asUlid120", () => {
  afterEach(cleanup);

  test.todo("returns a 34-character ULID120 when asUlid120 is true", () => {
    const ulid = C32.getUlid({}, false, 0, true);
    assert.equal(ulid.length, 34);
  });
  test.todo("returns a 26-character ULID when asUlid120 is false");
  test.todo("extra characters are valid Crockford32");
});

describe("calling C32.ulidToParts() with ULID120", () => {
  afterEach(cleanup);

  test.todo("extracts extra from a 34-character ULID120");
  test.todo("returns timestamp and salt from the first 26 characters");
});

describe("setting defaultAsUlid120", () => {
  afterEach(cleanup);

  test.todo("changes the default asUlid120 used by getUlid");
  test.todo("converts non-boolean to boolean");
});

describe("calling C32.sanitize() edge cases", () => {
  afterEach(cleanup);

  test.todo("handles empty string input");
  test.todo("handles null and undefined input");
  test.todo("handles non-string input types");
});

describe("calling C32.fromBigInt() with options", () => {
  afterEach(cleanup);

  test.todo("returns a string with checksum when withChecksum is true");
});

describe("calling C32.toBigInt() with options", () => {
  afterEach(cleanup);

  test.todo("validates checksum when withChecksum is true");
  test.todo("throws RangeError for invalid checksum");
});

describe("calling C32.getRandomChars() edge cases", () => {
  afterEach(cleanup);

  test.todo("handles length of 0");
  test.todo("handles non-numeric length input");
  test.todo("handles negative length input");
});

describe("calling C32.getUlid() error cases", () => {
  afterEach(cleanup);

  test.todo("throws TypeError for non-numeric timestamp");
  test.todo("throws RangeError for timestamp exceeding max value");
  test.todo("throws TypeError for non-BigInt salt");
  test.todo("throws RangeError for salt exceeding max value");
  test.todo(
    "throws RangeError for monotonic increment exceeding max random value",
  );
});

describe("calling C32.ulidToParts() error cases", () => {
  afterEach(cleanup);

  test.todo("throws TypeError for non-string input");
  test.todo("throws RangeError for wrong length");
  test.todo("throws RangeError for invalid characters");
});

describe("setting defaultTtl", () => {
  afterEach(cleanup);

  test("changes the default ttl used by getUlid", () => {
    const originalTtl = C32.defaultTtl;
    const observer = (actions) => {
      const action = actions[0].ttl;
      assert.equal(C32.defaultTtl, 100);
      C32.clearCache();
      C32.unobserveCacheUpdates();
      C32.defaultTtl = originalTtl;
    };
    C32.defaultTtl = 100;
    C32.observeCacheUpdates(observer);
    C32.getUlid();
  });

  test("clamps negative ttl values to 0", () => {
    const originalTtl = C32.defaultTtl;
    C32.defaultTtl = -100;
    assert.equal(C32.defaultTtl, 0);
    C32.defaultTtl = originalTtl;
  });

  test("caps ttl values above 3600000 (1 hour)", () => {
    const originalTtl = C32.defaultTtl;
    C32.defaultTtl = 4000000;
    assert.equal(C32.defaultTtl, 3600000);
    C32.defaultTtl = originalTtl;
  });

  test("ignores non-numeric ttl values", () => {
    const originalTtl = C32.defaultTtl;
    C32.defaultTtl = "not a number";
    assert.equal(C32.defaultTtl, originalTtl);
  });
});

describe("setting defaultIsStrict", () => {
  afterEach(cleanup);

  test("changes the default isStrict used by getUlid", () => {
    const original = C32.defaultIsStrict;
    const now = Date.now();
    C32.defaultIsStrict = true;
    const parts = C32.ulidToParts(C32.getUlid({ timestamp: now, salt: 0n }));
    assert.equal(parts.salt, 1n);
    C32.defaultIsStrict = original;
  });
  test("converts non-boolean to boolean", () => {
    const original = C32.defaultIsStrict;
    C32.defaultIsStrict = "true";
    assert.equal(C32.defaultIsStrict, true);
    C32.defaultIsStrict = original;
  });
});
