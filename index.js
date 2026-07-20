const crypto = globalThis.crypto; // for older versions of Node
const crockfordPad = "0123456789ABCDEFGHJKMNPQRSTVWXYZ*~$=U";

const uint8ToBigint = (bytes) =>
  bytes.reduce((value, bits) => (value << 8n) | BigInt(bits), 0n);

const bigintToUint8 = (bigint) => {
  bigint = BigInt(bigint);
  const bytes = [];
  do {
    bytes.push(Number(bigint & 255n));
  } while ((bigint >>= 8n));
  return new Uint8Array(bytes.reverse());
};

const charsToBigint = (chars) => {
  let bytes = chars.reduce(
    (bytes, char) => (bytes << 5n) | BigInt(crockfordPad.indexOf(char)),
    0n,
  );
  return bytes;
};

const bigintToChars = (bytes, chars = []) => {
  // don't worry about trailing zero bits or leading zeros
  do {
    chars.push(crockfordPad.charAt(Number(bytes & 31n)));
  } while ((bytes >>= 5n));
  return chars.reverse();
};

const bigintToEncodedChars = (bytes, bitCount) => {
  const mod = bitCount % 5n;
  // crockford encoding adds trailing zero bit values if bitcount not a multiple of 5
  if (mod) {
    const bitShift = 5n - mod;
    bytes <<= bitShift;
    bitCount += bitShift;
  }
  const chars = [];
  do {
    chars.push(crockfordPad.charAt(Number(bytes & 31n)));
    bytes >>= 5n;
    // check bitCount in case we need a leading 0 to complete the first byte
  } while ((bitCount -= 5n) > 0);
  return chars.reverse();
};

const getCheckSymbol = (number) => crockfordPad.charAt(Number(number));

const validate = (withChecksum, bytes, expect) => {
  let checksum;
  if (
    withChecksum &&
    (checksum = crockfordPad.charAt(Number(bytes % 37n))) !== expect
  ) {
    throw new RangeError(
      `unexpected checksum value '${checksum}' (expecting '${expect}') while decoding crockford32 value`,
    );
  }
};

const get40RandomBits = () =>
  uint8ToBigint(crypto.getRandomValues(new Uint8Array(5)));

/** @typedef {{ withChecksum?: boolean, strictMatching?: boolean }} SanitizeOptions */
/**
 * Take in a string value and optional options object and do the following;
 * if strictMatching options is false or ommited, convert the value to a upper case string,
 * strip out whitespace and hyphens, then replace 'I' or 'L' with 1, and 'O' with 0;
 * if withChecksum option is true, ensure the last character matches a valid checksum digit;
 * finally, ensure the non-checksum characters only contain the digits 0-9 & A-Z excluding I, L, O, or U;
 *
 * @param {string} crockford the value to be santized
 * @param {SanitizeOptions} options optional, passes in boolean values for withChecksum or strictMatching options
 * @returns {string} the cleaned up Crockford32 value
 * @throws {RangeError} if any character in the passed in value is not a valid Crockford32 digit
 */
export const sanitize = (crockford, options = {}) => {
  crockford = String(crockford).trim();
  const { strictMatching, withChecksum } = {
      strictMatching: false,
      withChecksum: false,
      ...Object(options),
    };
  if (!strictMatching) {
    crockford = crockford
      .toUpperCase()
      .replace(/[\s-]/g, "") // remove any whitespace or hyphens
      .replace(/[IL]/g, "1") // forgive typos for 1
      .replace(/O/g, "0"); // forgive typos for 0
  }
  const  checksum = withChecksum ? crockford.slice(-1) : "";
  if (checksum) {
    if (crockfordPad.indexOf(checksum) === -1) {
      throw new RangeError(
        `invalid checksum character '${checksum}' while decoding Crockford32 string${strictMatching && ' with strictMatching on'}`,
      );
    }
    crockford = crockford.slice(0, -1);
  }
  const illegal = crockford.match(/[^0-9A-HJKMNP-TV-Z]/)
  if (illegal) {
    throw RangeError(`invalid digit character '${illegal.shift()}' while decoding Crockford32 string${strictMatching && ' with strictMatching on'}`);
  }
  return crockford + checksum;
};

/**
 * Take in a BigInt, serialize it into bytes, and encode it as a Crockford32 value
 * If withChecksum option is true, adds a check symbol to the end of the Crockford32 string
 * @param {bigint} value
 * @param {SanitizeOptions} options optional boolean value for withChecksum
 * @returns {String} the encoded Crockford32 value
 */
export const fromBigInt = (value, options = {}) => {
  let bytes = BigInt(value);
  if (bytes !== bytes) {
    throw new TypeError(
      `unxpected value '${value}' could not be coersed to a BigInt`,
    );
  }
  const { withChecksum } = {
      withChecksum: false,
      ...Object(options), // coerse to an object so it won't fail if not one
    },
    checksum = withChecksum ? crockfordPad.charAt(Number(bytes % 37n)) : "";
  let bitCount = 0n;
  do {
    bitCount += 8n;
  } while (bytes > 1n << bitCount);
  return bigintToEncodedChars(bytes, bitCount).join("").padStart() + checksum;
};

/**
 * Take in a string representing a Crockford32 encoded value, sanitize it, and convert it to a BigInt
 * @param {string} crockford a Crockford32 encoded value
 * @param {SanitizeOptions} options optional boolean values for strictMatching and/or withChecksum to pass to sanitize
 * @returns {bigint} the decoded bytes, as a BigInt
 * @throws {RangeError} if any character in the value is not a valid Crockford32 digit
 */
export const toBigInt = (crockford, options = {}) => {
  crockford = sanitize(crockford, options).split("");
  const { withChecksum } = {
      withChecksum: false,
      ...Object(options), // coerse to an object so it won't fail if not one
    },
    checksum = withChecksum ? crockford.pop() : "",
    bitCount = BigInt(crockford.length) * 5n,
    // shift off any zero bit values that may have been added during encoding
    bytes = charsToBigint(crockford) >> (bitCount % 8n);
  validate(withChecksum, bytes, checksum);
  return bytes;
};

/**
 * Take in a Uint8Array, and encode it as a Crockford32 string
 * If withChecksum option is true, adds a check symbol to the end of the Crockford32 string
 * @param {Uint8Array} value
 * @param {SanitizeOptions} options optional boolean value for withChecksum
 * @returns {string} the encoded Crockford32 value
 */
export const encode = (value, options = {}) => {
  const uint8 = new Uint8Array(value);
  if (!uint8.length) {
    return "";
  }
  const { withChecksum } = {
      withChecksum: false,
      ...Object(options), // coerse to an object so it won't fail if not one
    },
    bitCount = BigInt(uint8.byteLength) * 8n,
    bytes = uint8ToBigint(uint8),
    checksum = withChecksum ? getCheckSymbol(Number(bytes % 37n)) : "";
  return bigintToEncodedChars(bytes, bitCount).join("") + checksum;
};
export const fromUint8 = encode;

/**
 * Take in a Crockford32 encoded string, sanitize it, and decode it into a Uint8Array
 * @param {string} crockford a Crockford32 encoded string
 * @param {SanitizeOptions} options optional boolean values for strictMatching and/or withChecksum to pass to sanitize
 * @returns {Uint8Array} the decoded bits, in 1 byte (8 bits) entries
 * @throws {RangeError} if any character in the value is not a valid Crockford32 digit or checksum comparison fails
 */
export const decode = (crockford, options = {}) => {
  const { withChecksum, strictMatching } = {
      withChecksum: false,
      ...Object(options), // coerse to an object so it won't fail if not one
    },
    chars = sanitize(crockford, options).split(""),
    checksum = withChecksum ? chars.pop() : "",
    bitCount = BigInt(chars.length) * 5n,
    // clear any zero bit values that may have been added during encoding
    bytes = charsToBigint(chars) >> (bitCount % 8n);
  validate(withChecksum, bytes, checksum);
  return bigintToUint8(bytes);
};
export const toUint8 = decode;

/**
 * Takes in a hexidecimal string value, converts it into bytes, then encodes them as a Crockford32 value
 * @param {string} string the text to encode
 * @param {SanitizeOptions} options optional boolean value for withChecksum
 * @returns {string} the Crockford32 encoded value.
 * @throws {TypeError} if value is not a string
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromHex
 */
export const fromHex = (value, options = {}) => {
  return encode(Uint8Array.fromHex(value), options);
};

/**
 * Take in a Crockford32 encoded string, decodes it into bytes, then converts them into a hexidecimal string value
 * @param {string} crockford a Crockford32 encoded string
 * @param {string} options optional boolean values for strictMatching and/or withChecksum to pass to sanitize
 * @returns {string} the decoded utf-8 string,
 * @throws {RangeError} if any character in the value is not a valid Crockford32 digit
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/toHex
 */
export const toHex = (crockford, options = {}) => {
  return decode(crockford, options).toHex();
};

/** @typedef {{ alphabet?: "base64" | "base64url", lastChunkHandling?: "loose" | "strict" | "stop-before-partial" }} FromBase64Options */
/**
 * Takes in a base64 encoded string, decodes it into bytes, then encodes it as a Crockford32 string
 * @param {string} string the text to encode
 * @param {SanitizeOptions} options optional boolean value for withChecksum
 * @param {FromBase64Options} base64Options optional base64 decoding options
 * @returns {String} the Crockford32 encoded value
 * @throws {TypeError} if value is not a string
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromBase64
 */
export const fromBase64 = (value, options = {}, base64Options = {}) => {
  return encode(Uint8Array.fromHex(value, base64Options), options);
};

/** @typedef {{ alphabet?: 'base64' | 'base64url', omitPadding?: boolean }} ToBase64Options */
/**
 * Take in a Crockford32 encoded string, decodes it into bytes, then encodes them into a base64 encoded string
 * @param {string} crockford a Crockford32 encoded value
 * @param {SanitizeOptions} options optional boolean value for strictMatching and/or withChecksum to pass to sanitize
 * @param {ToBase64Options} base64Options optional base64 encoding options
 * @returns {string} the decoded utf-8 string,
 * @throws {RangeError} if any character in the value is not a valid Crockford32 digit
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/toBase64
 */
export const toBase64 = (crockford, options = {}, base64Options = {}) => {
  return decode(crockford, options).toHex(base64Options);
};

/**
 * Takes in a utf-8 string, encodes it into bytes, and encode them as a Crockford32 value
 * @param {string} string the text to encode
 * @param {SanitizeOptions} options optional boolean value for withChecksum
 * @returns {string} the Crockford32 encoded value
 * @throws {TypeError} if value is not a string
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder/encode
 */
export const fromText = (string, options) => {
  return encode(new TextEncoder().encode(string), options);
};
/** @typedef {{label?:string, fatal?: boolean, ignoreBOM?: boolean}} TextDecoderOptions */
/**
 * Take in a Crockford32 encoded string, decodes it into bytes and decodes them into a utf-8 string value
 * @param {string} crockford a Crockford32 encoded value, whare each character represents 5 bits of information
 * @param {SanitizeOptions} options optional boolean values for strictMatching and/or withChecksum to pass to sanitize
 * @param {TextDecoderOptions} textOptions optional text decoding options
 * @returns {string} the decoded string
 * @throws {RangeError} if any character in the value is not a valid Crockford32 digit
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/TextDecoder#options
 * @see https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/decode
 */
export const toText = (crockford, options = {}, textOptions = {}) => {
  const {label, fata, ignoreBOM } = {
    label: "utf-8",
    fatal: false,
    ignoreBOM : false,
    ...Object(textOptions)
  }
  return new TextDecoder(label, {fatal,ignoreBOM}).decode(decode(crockford, options));
};

/**
 * get a cryptographically secure randomized series of characters within the range of 0-9 & A-Z excluding I, L, O, or U
 * @param {number} length the length of the string to generate. defaults to 8.
 * @returns {string} the randomized characters
 */
export const getRandomChars = (length = 8) => {
  length = Number(length);
  if (length !== length) {
    length = 8;
  }
  let chars = [];
  while (chars.length < length) {
    chars = chars.concat(bigintToChars(get40RandomBits()));
  }
  return chars.slice(0, length).join("");
};

const maxR = 0xffffffffffffffffffffn;
const maxTime = 0xffffffffffff;

let lastTS = 0,
  lastR = 0n;

/**  @typedef {{isStrict?: boolean, timestamp?: number, salt?: bigint }} UlidOptions */  
/**
 * Generate a valid, easily indexable 26 digit Crockford32 ULID where the first 10 digits represent a milisecond
 * precision Unix timestamp and the remaining 16 digits are 80 bits of randomness.
 * If repeated subsiquent calls happen with the same timestamp, the previous random value is incremented to ensure monotonic values are produced
 * @param {UlidOptions|string|boolean} options if an object, pass in the folowing optional parameters:
 *     - timestamp: optional number to use as millisecond precision timestamp. Current system time is used if ommited
 *     - seed: optional BigInt to initialitilize random value before being incremented. Ignored if not paired with a timestamp.
 *     - isStrict : optional. Defaults to false.
 *          If true, increments previous random value by 1 for multiple batch calls that use the same timestamp
 *          If false, increments previous random value by an additional 40 bits of randomness, increasing entropy between values
 *     if value is String, parsed as a ULID and broken into timestamp and seed,
 *     if value is boolean, used as the value for isStrict
 * @param  {boolean} strictImplementation optional. used as isStrict value if not already passed in by the options argument
 * @returns {string} a valid ULID
 * @throws {TypeError} if provided timestamp is not an unsigned int
 * @throws {TypeError} if provided salt could not be coersed to a BigInt
 * @throws {RangeError} if provided timestamp exceeds maximum allowable value
 * @throws {RangeError} if provided seed or incremented random value exceeds maximum alowable value
 * @throws {RangeError} if provied ulid string is the improper length, or contains a character that is not a valid Crockford32 digit
 */
export const getUlid = (options = {}, strictImplementation = undefined) => {
  let now = Date.now();
  if (typeof options === "string") {
    options = ulidToParts(options);
  } else if (
    typeof options === "boolean" &&
    typeof strictImplementation === "undefined"
  ) {
    strictImplementation = options;
    options = {};
  }
  // get passed in options, if any.
  const { timestamp, salt, isStrict } = {
    isStrict: !!strictImplementation,
    ...Object(options),
  };
  if (timestamp) {
    now = Number(timestamp);
    if (now !== now || now !== Math.floor(now)) {
      throw TypeError(
        `provided timestamp '${timestamp}' could not be coerced to a unigned integer`,
      );
    } else if (now > maxTime) {
      throw RangeError(
        `provided timestamp '${now}' exceeds max value for a timestamp`,
      );
    }
    lastR = now;
    if (salt) {
      try {
        lastR = BigInt(salt);
      } catch (e) {
        throw TypeError(
          `provided salt '${salt}' could not be coerced to a BigInt`,
        );
      }
      if (lastR > maxR) {
        throw RangeError(
          `provided salt '${salt}' exceeds max Random value allowed`,
        );
      }
      // ensure we don't regenerate lastR;
      lastTS = now;
    }
  }
  if (now !== lastTS || !lastR) {
    lastTS = now;
    lastR = (get40RandomBits() << 40n) + get40RandomBits();
  } else {
    // add 1 if strict implementation, otherwise
    // add 40 more bits of randomness to increase entropy between keys
    lastR = lastR + (isStrict ? 1n : get40RandomBits());
    if (lastR > maxR) {
      throw RangeError(
        `monotonic increment for timestamp '${now}' exceeds max Random value available`,
      );
    }
  }
  return (
    bigintToChars(BigInt(lastTS)).join("").padStart(10, "0") +
    bigintToChars(lastR).join("").padStart(16, "0")
  );
};
/** @typedef {{isStrict?: boolean}} IsStrictPassthrough */
/**
 * Take in a valid Crockford32 ULID and return the base elements: time 
 * @param {String} ulid
 * @param {IsStrictPassthrough|boolean} options optioanl value for isStrict
 * @returns {UlidOptions} containing the entries timestamp as a number, and seed as a BigInt. optioanlly passes isStrict if present in options
 * @throws {RangeError} if ulid is the improper length, or contains a character that is not a valid Crockford32 digit
 */
export const ulidToParts = (ulid, options = {}) => {
  if (String(ulid).length !== 26) {
    throw RangeError(`provided value '${ulid}' is of improper length`);
  }
  if (typeof options === "boolean") {
    options = { isStrict: options };
  }
  ulid = sanitize(ulid);
  const addIsStrict = Object(options).hasOwnProperty("isStrict"),
    timestamp = Number(charsToBigint(ulid.slice(0, 10).split(""))),
    salt = charsToBigint(ulid.slice(10).split(""));
  return addIsStrict
    ? { timestamp, salt, isStrict: !!options.isStrict }
    : { timestamp, salt };
};

export const C32 = {
  sanitize,
  encode,
  decode,
  toUint8,
  fromUint8,
  toBigInt,
  fromBigInt,
  toHex,
  fromHex,
  toBase64,
  fromBase64,
  toText,
  fromText,
  getRandomChars,
  getUlid,
  ulidToParts,
};
export default C32;
