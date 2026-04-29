/**
 * Take in a  value, convert it to a trimmed and lower case string, and ensure it only conatians the digits 0-9 & a-v
 * @param {String} base32 the value to be sanitized
 * @returns {String} the cleaned up Base32 value
 * @throws {RangeError} if any character in the passed in value is not a valid Base32 digit
 */
export const sanitizeBase32 = (base32) =>
  (base32 + "")
    .trim()
    .toLowerCase()
    .replace(/[^0-9a-v]/, (match) => {
      throw RangeError(`character '${match} is not a valid base 32 digit`);
    });

/**
 * Take in a string value and optional strict matching boolean flag, convert the value to a trimmed upper case string and  
 *  -- if the strict matching flag is false or ommited -- strips any dashes (-), and replaces 'I' or 'L' with 1, and 'O' with 0.
 * Finally, ensure the value only contains the digits 0-9 & A-Z excluding I, L, O, or U.
 *  
 * @param {String} crockford the value to be santized
 * @param {Boolean} strictMatching defaults to false. If true, throws a RangeError if 'I','L','O' or '-' are present, 
 *   otherwise strips any dashes (-), and replaces 'I' or 'L' with 1, and 'O' with 0.
 * @returns {String} the cleaned up Crockford32 value
 * @throws {RangeError} if any character in the passed in value is not a valid Crockford32 digit
 */
export const sanitizeCrockford = (crockford, strictMatching = false) =>
  (crockford + "")
    .trim()
    .toUpperCase()
    .replace(/[IL]/g, (match) => (strictMatching ? match : "1")) 
    .replace(/O/g, (match) => (strictMatching ? match : "0")) 
    .replace(/-/g, (match) => (strictMatching ? match : "")) 
    .replace(/[^0-9A-HJKMNP-TV-Z]/, (match) => { 
      throw RangeError(`character '${match}' is not a Crockford 32 digit`);
    });
/**
 * Take in a Uint8Array, serialize it into bits (8 per entry), and encode it as a Base32 value, where each digit represents 5 bits of the serialized bits
 * @param {Uint8Array} uint8 the bytes to be encoded
 * @param {Boolean} sanitized defaults to false, if true skip uint8 validation
 * @returns {String} the resulting a Base32 value
 * @throws {TypeError} if value is not an instance of Uint8Array
 */
export const uint8ToBase32 = (uint8, sanitized = false) => {
  if (!sanitized  && (!uint8) instanceof Uint8Array) {
    throw TypeError(`value provided is not a Uint8Array`);
  }
  const bytes = Array.from(uint8),
    buffer = [];
  let read = 0,
    bits = 0;
  while (bytes.length) {
    bits |= bytes.pop() << read;
    read += 8;
    while (read >= 5) {
      buffer.push((bits & 31).toString(32));
      read -= 5;
      bits >>= 5;
    }
  }
  if (read > 0) {
    buffer.push((bits & 31).toString(32));
  }
  return buffer.reverse().join("");
};
/**
 * Take in a string representing a Base32 encoded value, serialize it into bits (5 per character) and slice it into 8 bit (1 byte) entries in a Uint8Array
 * @param {String} base32 a Base32 encoded value, whare each character represents 5 bits of information
 * @param {Boolean} sanitized Defaults to false. If true skips validation of the Base32 value 
 * @returns {Uint8Array} the encoded bits, in 1 byte (8 bits) entires
 * @throws {RangeError} if any character in the value is not a valid base32 digit
 */
const base32toUint8 = (base32, sanitized = false) => {
  const chars = (sanitized ? base32 : sanitizeBase32(base32)).split("");
  buffer = [];
  let read = 0,
    bits = 0;
  while (chars.length) {
    bits |= parseInt(chars.pop(), 32) << read;
    read += 5;
    while (read >= 8) {
      buffer.push(bits & 255);
      read -= 8;
      bits >>= 8;
    }
  }
  if (read >= 5 || bits > 0) {
    buffer.push(bits);
  }
  return new Uint8Array(buffer.reverse());
};

/**
 * Take in a utf-8 string, serialize it into bits, and encode it as a Base32 value, where each digit represents 5 bits of the serialized bits
 * @param {String} string the text to encode
 * @returns {String} the Base32 encoded value.
 */
const textToBase32 = (string) => {
  const te = new TextEncoder();
  return uint8ToBase32(te.encode(string + ""), true);
};

/**
 * Take in a string representing a Base32 value, serialize it into bits (5 per character) and decode it back into a utf-8 string
 * @param {String} base32 the Base32 value to decode
 * @param {Boolean} sanitized Defaults to false. If true skips sanitization of the Base32 value 
 * @returns {String} the decoded utf-8 text value.
 * @throws {RangeError} if any character in the value is not a valid Base32 digit
 */
const base32ToText = (base32, sanitized = false) => {
  return new TextDecoder().decode(base32toUint8(base32, sanitized));
};

/**
 * Take in a string representing a standard Base32 value, and convert it to Crockford32 formatting
 * @param {String} base32 the Base32 value
 * @param {Boolean} sanitized defaults to false, if true skips sanitization of the Base32 value
 * @returns {String} the resulting Crockford32 value
 * @throws {RangeError} if any character in the passed in value is not a valid Base32 digit
 */
const base32ToCrockford = (base32, sanitized = false) =>
  (sanitized ? base32 : sanitiztizedBase32(base32))
    .toUpperCase()
    .replace(/[R-V]/g, (match) => String.fromCharCode(match.charCodeAt(0) + 4))
    .replace(/[M-Q]/g, (match) => String.fromCharCode(match.charCodeAt(0) + 3))
    .replace(/[KL]/g, (match) => String.fromCharCode(match.charCodeAt(0) + 2))
    .replace(/[IJ]/g, (match) => String.fromCharCode(match.charCodeAt(0) + 1));

/**
 * Take in a string representing a standard Crockford32 value, and convert it to a standard Base32 formatting
 * @param {String} crockford the Crockford32 value to convert
 * @param {Boolean} strictMatching defaults to false. If true, throws a RangeError if 'i','I','l','L','o','O' or '-' are present
 * @returns {String} the standard Base32 value
 * @throws {RangeError} if any character in the passed in value is not a valid Crockford32 digit
 */
const crockfordToBase32 = (crockford,  strictMatching = false) =>
  sanitizeCrockford(crockford, strictMatching)
    .toLowerCase()
    .replace(/[jk]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 1))
    .replace(/[mn]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 2))
    .replace(/[p-t]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 3))
    .replace(/[v-z]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 4));
/**
 * Take in a Uint8Array, serialize it into bits (8 per entry), and encode it as a Crockford32 value, where each digit represents 5 bits of the serialized bits
 * @param {Uint8Array} uint8 
 * @param {Boolean} sanitized defaults to false, if true skip Uint8Array validation
 * @returns {String} the encoded Crockford32 value
 * @throws {TypeError} if value is not an instance of Uint8Array
 */
uint8ToCrockford = (uint8) => {
  return base32ToCrockford(uint8ToBase32(uint8), true);
};
/**
 * Take in a string representing a Crockford32 encoded value, serialize it into bits (5 per character) and slice it into 8 bit (1 byte) entries in a Uint8Array
 * @param {String} crockford a Crockford32 encoded value, whare each character represents 5 bits of information
 * @param {Boolean} scricktMatching Defaults to false. If true, throws a RangeError if 'i','I','l','L','o','O' or '-' are present
 * @returns {Uint8Array} the decoded bits, in 1 byte (8 bits) entries
 * @throws {RangeError} if any character in the value is not a valid Crockford32 digit
 */
crockfortToUint8 = (crockford, strickMatching = false) => {
  return base32toUint8(crockfordToBase32(crockford, strickMatching), true);
};
/**
 * Take in a utf-8 string, serialize it into bits, and encode it as a Crockford32 value, where each digit represents 5 bits of ihnformation
 * @param {String} string the text to encode
 * @returns {String} the Crockford32 encoded value.
 */
textToCrockford = (string) => {
  return base32ToCrockford(textToBase32(string), true);
};
/**
 * Take in a string representing a Crockford32 encoded value, serialize it into bits (5 per character) and decode the bits into a utf-8 string value
 * @param {String} crockford a Crockford32 encoded value, whare each character represents 5 bits of information
 * @param {Boolean} scricktMatching Defaults to false. If true, throws a RangeError if 'i','I','l','L','o','O' or '-' are present
 * @returns {String} the decoded utf-8 string, 
 * @throws {RangeError} if any character in the value is not a valid Crockford32 digit
 */
crockfortToText = (crockford, strictMatching = false) => {
  return base32toText(crockfordToBase32(crockford, strictMatching), true);
};
/**
 * generate a BigInt from 40 bits of crytpographically secure randomness
 * @returns {BigInt}
 */
const get40RandomBits = () =>
  crypto
    .getRandomValues(new Uint8Array(5))
    .reduce((value, bits) => (value << 8n) + BigInt(bits), 0n);

const maxR = 1208925819614629174706175n;
const maxTime = 281474976710655;

let lastTS = 0,
  lastR = 0n;

/**
 * Generate a valid, easily indexable 26 digit Crockford32 ULID where the first 10 digits represent a milisecond 
 * precision Unix timestamp and the remaining 16 digits are 80 bits of randomness.
 * If repeated subsiquent calls happen with the same timestamp, the previous random value is incremented to reasonably ensure monotonic values 
 * @param {JSON} options used to pass in the folowing optional parameters:
 *     - timestamp: optional seed timestamp to use for use with batch jobs. Current system time is used if ommited
 *     - strictImplenetation : optional. Defaults to false.
 *          If true, increments previous random value by 1  when multiple batch calls that use the same timestamp 
 *             and may throw a RangeError if value exceeds max allowable value during exceedingly large batch jobs.
 *          If false, incements previous random value by an aditional 40 bits of randomness, 
 *             increasing enrtopy between values, 
 *             and clamps at 80 bits, which may produce a non-monotonic values for exceedingly large batch jobs.
 * @returns {String} a valid ULIDtheoretically 
 * @throws {RangeError} if provided timestamp exceeds maximum allowable value
 * @throws {RangeError} if provided strictImplentation is true and random value exceeds maximum alowable value
 */  
const getULID = (options = {}) => {
  const {timestamp, strictImplentation} = {
    timestamp: Date.now(),
    strictImplementation: false,
    ...options  
  };
  if (+timestamp !== +timestamp) {
    throw TypeError(`provided timestamp '${timestamp}' is not a number`);
  }
  const now = +timestamp;
  if (now < 0 || now !== Math.floor(now)) {
    throw TypeError(`provided timestamp '${now}' is not a unsigned integer`);
  } else if (now > maxTime) {
    throw RangeError(
      `provided timestamp '${now}' exceeds maximum value for a timestamp`,
    );
  } else if (now !== lastTS || !lastR) {
    lastTS = now;
    const a = get40RandomBits(),
      b = get40RandomBits();
    // non-strict implementation
    // put the lowest random 40 first to reduce chance of incrementing beyond 80 bits
    lastR = (strictImplementation || a < b ? (a << 40n) + b : (b << 40n) + a);
  } else {
    // non-strict implementation
    // add 40 more bits of randomness to increase entropy between keys
    lastR = lastR + (strictImplementation ? 1 : get40RandomBits());
    if (strictImplementation & (lastR > maxR)) {
      throw RangeError(
        `monotonic increment for timestamp '${now}' exceeds max Random value available`,
      );
    } else {
      // non-strict implementation
      // clamp to 80 bits, which may theoretically cause non-monotonic values
      lastR &= maxR;
    }
  }
  return base32ToCrockford(
    lastTS.toString(32).padStart(10, "0") +
      lastR.toString(32).padStart(16, "0"),
  );
};
/**
 * Take in a valid Crockford32 ULID and return the base elements
 * @param {String} ulid 
 * @returns {Array} Two values, the timestamp, as a number, and the 80 bit random value, as a BigInt.
 * @throws {RangeError} if ulid is the improper length, or contains a character that is not a valid Crockford32 digit
 */
const ulidToParts = (ulid) => {
  if (("" + ulid).length !== 26) {
    throw RangeError(`provided value '${ulid}' is of improper length`);
  }
  const b32 = crockfordToBase32(ulid),
    timestamp = parseInt(b32.slice(0, 10), 32),
    random = // break it into two 40 bit chunks so it won't exceed MAX_SAFE_INTEGER
      (BigInt(parseInt(b32.slice(10, 17), 32)) << 40n) +
      BigInt(parseInt(b32.slice(18), 32));
  return [timestamp, random];
};
