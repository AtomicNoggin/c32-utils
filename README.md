# Simple Crockford32 Utils

A lightweight, zero dependancy, vanilla JS library for doing basic [Crockford32](href=https://www.crockford.com/base32.html) string generation, encoding and decoding.

Crockford32 strings can be encoded from , and decoded to  
 - BigInt values, 
 - Uint8Array objects,
 - Text strings (iternally using TextEncoder & TextDecoder), 
 - hex encoded strings (internally using Uint8Array.fromHex & uint8.toHex)
 - and base64 encoded text (internally using Uint8Array.fromBase64 & uint8.toBase64)

Utility methods are also provided to 
- sanitize & verify Crockford32 strings, per the decoding spec.
- generate random Crockford32 strings of arbitrary length,
- genreate Ulid key string
- parse ULID jey strings to bas parts

## sanitize

Can be used to manually clean-up a Crockford value passed in by a user.  It converts the string to to uppercase, removes hyphens and does the prescibed character replacements (0 for o, 1 for i & l). For convienience any whitespace used to break up the string is also removed. After that it ensures that no non-valid charcters exist, throwing a RangeError if they do, or returning the santized string.

If you are expecting input values from a server or posted message, you may want to use the strictMatching option, since machines shouldn't make typos.
This will only trim outer whitespace, and do no other 'cleanup', meaning it will fail unless it exactly matches the original encoding output.

Make sure to use the the withChecksum option as needed, so encoded values with checksum endings are properly taken into account.

### Usage
```js
import C32 from "c32-utils";
// alternately import {sanitize} from "c32-utils" if you just want the one method

const cleanC32 = C32.sanitize(' abc-34fz-0o1LI '); // "ABC34FZ00111"

const invalidC32 = C32.sanitize('abc-u3'); // throws RangeError because of the 'u'

const strictC32 = C32.sanitize('LMNO',{strictMatching: true}); // throws RangeError because strict matching doesn't forgive typos

const withAcceptableCheck = C32.sanitize('abc-3*',{withChecksum: true}) // "ABC3*"
const withBadCheck = C32.sanitize('abc-3%',{withChecksum: true}) // throws RangeError

```
### NOTE
Checksum values are only checked for character value correctness, and the actual modulo comparison to the rest of the value is done when the string is actually decoded. All decode methods pre-sanitize anyway, so it's ok to pass an unsanitized string into them directly.

## fromUint8, toUint8, encode & decode

fromUInt8 

Takes in a Uint8Array, serialize it into bits (8 per entry), and encode it as a Crockford32 value, where each digit represents 5 bits of the serialized bits.
* If withChecksum option is true, add a check symbol to the end of the string that can be used to detect wrong-symbol and transposed-symbol errors.

encode is a synonym for fromUint8

toUint8

 Take in a string representing a Crockford32 encoded value, sanitize it, then serialize it into bits (5 per character) and slice it into 8 bit (1 byte) entries in a Uint8Array
 * If the strictMatching option is true,  
 * If the withChecksum option is true, the last charater of the string will be removed and compared to the encoded value modulo 37 result, to o detect wrong-symbol * and transposed-symbol errors.

decode is a synonym for toUint8,

### Usage 
```js
import C32 from "c32-utils";
// or import {fromUint8, toUint8} from "c32-uitls";
// or import {encode, decode} from "c32-uitls";

const arr = new Uint8Array([0xaa,0xbb,0xcc,0xdd,0xee,0xff]); 
const toC32 = C32.fromUint8(arr); // 'NAXWSQFEZW';
const encoded = C32.encode(arr); // encode is a synonym for fromUint8

// sanitizes first, then converts the value to bytes
const fromC32 = C32.toUint8('O4hmasw9'); // Uint8Array(5) [0x01, 0x23, 0x45, 0x67, 0x89]
const decoded = C32.decode('O4hmasw9');  // decode is a synonym for toUint8
// unless strictChecking is true
const fromC32 = C32.toUint8('O4hmasw9'{strictChecking:true}); // throws RangeError because no clean up is done
// uses the final character to do a modulo verification if withChecksum is true
const fromC32 = C32.toUint8('04HMASRU',{withChecksum:true}) // Uint8Array(4) [0x01, 0x23, 0x45, 0x67]
// and fails if it doesn't match
const fromC32 = C32.toUint8('04HMASHU',{withChecksum:true}) // throws RangeError (ends in HHU, instead of SRU)
```

## fromBigInt & toBigInt

fromBigInt 

Takes in a a BigInt, serialize it into a bigendian array bits, and encode it as a Crockford32 value
 * Uses the same options as fromUint8

 toText

 Takes in a Crockford32 encoded value and decodes it into a BigInt
 * Uses the same options as toUint8

### Usage 
```js 
import C32 from "c32-utils";
//or import {fromBigInt, toBigInt} from "c32-utils";

const toC32 = C32.fromBigInt(0xaabbccddeeffn); // 'NAXWSQFEZW';

// sanitizes first, then converts the value to a bigint
const fromC32 = C32.toBigInt('04hmasw9'); // 0x123456789n
```

## fromText & toText
Convenience methods that wrap aroiund TextEncoder.encode() and TextDecoder.decode()

fromText 

Takes in a utf-8 string, decodes it into bytes, and encodes it as a Crockford32 value
 * Uses the same options as fromUint8

 toText

 Takes in a Crockford32 encoded value, decodes it into bytes, and encodes them into a utf-8 string
 * Uses the same options as toUint8

### Usage 
```js 
import C32 from "c32-utils";

const textToC32 = C32.fromText('The quick brown fox jumps over the lazy dog.')
 // 'AHM6A83HENMP6TS0C9S6YXVE41K6YY10D9TPTW3K41QQCSBJ41T6GS90DHGQMY90CHQPEBG'

// this is functionally equivilent to 
const withEncoder = C32.fromUint8(new Encoder().encode('The quick brown dog jumped over the lazy dog.'));

const textFromC32 = C32.toText('AHM6A83HENMP6TS0C9S6YXVE41K6YY10D9TPTW3K41QQCSBJ41T6GS90DHGQMY90CHQPEBG')
 // 'The quick brown fox jumps over the lazy dog.'

// this is functionally equivilent to 
const withDecoder = new TextDecoder(textOptions.lab).decode(C32.toUint8('AHM6A83HENMP6TS0C9S6YXVE41K6YY10D9TPTW3K41QQCSBJ41T6GS90DHGQMY90CHQPEBG'));

// toText can take in options for both C32 and the TextEncoder:
const options = {strictMatching:false};
const textOptions = {label:"utf-8", fatal:true, ignoreBOM: false}
const textFromC32 = C32.toText('AHM6A83HENMP6TS0C9S6YXVE41K6YY10D9TPTW3K41QQCSBJ41T6GS90DHGQMY90CHQPEBG', options, textOptions)
 // 'The quick brown fox jumps over the lazy dog.'

// this is functionally equivilent to 
const options = {strictMatching:false};
const label = "utf-8";
const textOptions = {fatal:true, ignoreBOM: false};
const withDecoder = new TextDecoder(label, textOptions).decode(C32.toUint8('AHM6A83HENMP6TS0C9S6YXVE41K6YY10D9TPTW3K41QQCSBJ41T6GS90DHGQMY90CHQPEBG', options));
```

## fromHex & toHex
Convenience methods that wrap around Uint8Array.fromHex() and uint8.toHex().

fromHex

Takes in a hex encoded string, decodes it into bytes, and encodes it as a Crockford32 value
 * Uses the same options as fromUint8

 toHex

 Takes in a Crockford32 encoded value, decodes it into bytes, and encodes them into a hex encoded string
 * Uses the same options as toUint8

### Usage 
```js 
import C32 from "c32-utils";

const hexToC32 = C32.fromHex('aabbccddeeff');
// 'NAXWSQFEZW'

// this is functionally equivilent to 
const withEncoder = C32.fromUint8(Uint8Array.fromHex('aabbccddeeff'));
// 'NAXWSQFEZW'


const hexFromC32 = C32.toText('NAXWSQFEZW');
 //'aabbccddeeff'

// this is functionally equivilent to 
const withDecoder = C32.toUint8('NAXWSQFEZW').toHex();
```

## fromBase64 & toBase64
Convenience methods that wrap around Uint8Array.fromBase64() and uint8.toBase64().

fromBase64 

Takes in a base64 encoded string, decodes it into bytes, and encodes it as a Crockford32 value
 * Uses the same options as fromUint8

 toText

 Takes in a Crockford32 encoded value, decodes it into bytes, and encodes them into a base64 encoded string
 * Uses the same options as toUint8

### Usage 
```js 
import C32 from "c32-utils";

const string = 'The quick brown fox jumps over the lazy dog.';
const base64 = btoa('The quick brown fox jumps over the lazy dog.')
// 'dGhlIHF1aWNrIGJyb3duIGZveCBqdW1wZWQgb2ZlciB0aGUgbGF6eSBkb2cu'
const base64ToC32 = C32.fromBase64(base64);
 // 'AHM6A83HENMP6TS0C9S6YXVE41K6YY10D9TPTW3K41QQCSBJ41T6GS90DHGQMY90CHQPEBG'

// this is functionally equivilent to 
const withEncoder = C32.fromUint8(Uint8Array.fromBase64(base64));

// fromBase64 can take in options for both C32 and fromBase64:
const options = {strictMatching:false};
const base64Options = {alphabet:"base64", lastChunkHandling: "loose"};
const textFromC32 = C32.fromBase64(base64string, options, textOptions)

// this is functionally equivilent to 
const withEncoder = C32.toUint8(Uint8Array.fromHex(base64string, pase64Options), options);



const base64FromC32 = C32.toText('AHM6A83HENMP6TS0C9S6YXVE41K6YY10D9TPTW3K41QQCSBJ41T6GS90DHGQMY90CHQPEBG');
// 'dGhlIHF1aWNrIGJyb3duIGZveCBqdW1wZWQgb2ZlciB0aGUgbGF6eSBkb2cu'
const string = atob(base64FromC32)
 // 'The quick brown fox jumps over the lazy dog.'

// this is functionally equivilent to 
const withDecoder = C32.toUint8('AHM6A83HENMP6TS0C9S6YXVE41K6YY10D9TPTW3K41QQCSBJ41T6GS90DHGQMY90CHQPEBG').toBase64();

// fromBase64 can take in options for both C32 and toBase64:
const options = {strictMatching:false};
const base64Options = {alphabet:"base64", omitPadding: false};
const textFromC32 = C32.fromBase64(crockfordString, options, textOptions)

// this is functionally equivilent to 
const withEncoder = C32.fromUint8(crockfordString, options).toBase64(base64Options);
```


## getRandomChars
 get a cryptographically secure randomized series of characters within the range of 0-9 & A-Z excluding I, L, O, or U

### Usage
```js

const oneTimeCode = C32.getRandomChars(); // returns 8 characters by default

const checkAgainstUserInput = (inputVal) => {
  return C32.sanitize(inputVal) === oneTimeCode;
}

// or get an arbitarily long value for more secure uses
const verify = C32.getRandomChars(48); 
// like PKCE challanges
const challange = await generateCodeChallange(verify);
```

### NOTE
These values are generated, not encoded and, as such, do not require checksums, nor should they be decoded into anything .

## getUlid & ulidToParts
Create and manipulate [ULID - Universally Unique Lexicographically Sortable Identifier](https://github.com/ulid/spec) values.

These are 26 character long Crockford32 strings of the following format: 

ttttttttttrrrrrrrrrrrrrrrr

where
t is a milisecond precision Unix timestamp (10 characters)
r is cryptographically secure randomness (16 characters, or 80 bits)

getUlid
Generate 26 digit Crockford32 ULID. If repeated subsiquent calls happen with the same millisecond, the previous random value is incremented to ensure monotonic values are produced

If doing batch jobs, it takes in an options argument
 * if values is an object, passes in the folowing optional parameters:
   - timestamp: optional number to use as millisecond precision timestamp. Current system time is used if ommited
   - salt: optional BigInt to initialitilize random value before being incremented. Ignored if not paired with a timestamp. 
   - isStrict : optional. Defaults to false.
     - If true, increments previous random value by 1 for multiple calls that use the same timestamp
     - If false, increments previous random value by an additional 40 bits of randomness, increasing entropy between values
 * if value is String, parsed as a ULID and uses it's timestamp and random bits a seed values,
 * if value is boolean, used as the value for isStrict
an optional second boolean argument can be used as isStrict if not already passed in by the options argument

ulidToParts
Takes in a valid Crockford32 Ulid and return the base elements as an object that can be passed to getUlid as options
an optional second argument can be used to pass through an isStrict value

### Usage
```js
import C32 from "c32-utils";

// use getUlid to create a ulid string 
// using current time as Unix millisecond timestamp and 80 bits of cryptographically secure randomness
const ulid1 = C32.getUlid(); // "01KXEF3Z0JARRDDKNKCDSDPHPA"
// if called more than once in the same millisecond, increment the previous random value with 40 more bits of randomness
const ulid2 = C32.getUlid(); // "01KXEF3Z0JARRDDKNKZRYQ4S2M" (if still same millisecond)
// or use strict implementation to increment by one as per the official spec
const ulid3 = C32.getUlid({isStrict: true}); // "01KXEF3Z0JARRDDKNKZRYQ4S2N" (if still same millisecond)
// simply passing in a booleen works as an isStrict flag as well 
const ulid4 = C32.getUlid(true); // "01KXEF3Z0JARRDDKNKZRYQ4S2P" (if still same millisecond)

await doSomethingExpensive();
// generate a completly new value once the current time ticks forward 
const ulidNext = C32.getUlid(); // "01KXEF3Z0K2JGD6BR5Y25W4P2F"

// use ulidToParts to break up a previous ulid into its base parts
let parts = C32.ulidToParts(ulid4); // {timestamp: 1783970790418, salt: 407024439748536575936204n}
// then you can generate an incremented ulid using the previous ulid parts as seed values (for batch jobs)
const ulid5 =  C32.getUlid(parts); // "01KXEF3Z0JARRDDKNMFK9W7214"
// optionally followed by a strict implementation boolean flag if desired
const ulid6 =  C32.getUlid(C32.ulidToParts(ulid5), true); // "01KXEF3Z0JARRDDKNMFK9W7215"
// you can pass isStrict as with the seeding options as well.
parts = C32.ulidToParts(ulid6);
const ulid7 = C32.getUlid({...parts, isStrict: true}); // "01KXEF3Z0JARRDDKNMFK9W7216"
// or just pass in the last ulid string to increment (with optional strict boolean, or otherwise)
const ulid8 = C32.getUlid(ulid7, true); // "01KXEF3Z0JARRDDKNMFK9W7217" 

// for convienience, you can also call ulidToParts with isStrict as an option to include it in the return value
let parts = C32.ulidToParts(ulid4, {isStrict: true}); // {timestamp: 1783970790418, salt: 407024439748536575936204n, isStrict: true}
// a simple boolean works as well
let parts = C32.ulidToParts(ulid4, true); // {timestamp: 1783970790418, salt: 407024439748536575936204n, isStrict: true}
```
### NOTE
If a timestamp is passed in to getULID without an accompanying random seed value, a new seed value is generated on first call, then incremented on subsiquent calls with ther same timestamp. This will most likely cause ulids to be generated out of order.

As stated above, this implementation differs from the official specification in one important way:
Subsiquent calls using the same timestamp are incremented by another 40 bits of randomness, instead of the standard 1 bit

This provides more entropy between & removes the sequential nature (and guessability) of generated values within the same millisecond under the official specification. Technically, this comes at the cost of a reduced intra-millisecond value count -- that has a theoretical upper limit of 1.21e+24 unique ULIDs per millisecond (minus the intial random value) before erroring out.

During multiple stress tests I was able to create upwards of 5 million unique values with the same (seeded) timestamp. Even though each new ULID increments by a value somewhere between 1 and 1.09+e12, I never risked coming close to reaching the upper bounds. Given that generating ULIDs without seeding never exceeded 400 calls within the same millisecond, this feels like an acceptable compromise.

However, you can use a isStrict flag when generating ULID, if you prefer to stick to the standard.
