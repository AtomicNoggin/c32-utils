# Changelog

## [1.5]

### Fixed
- `getRandomChars()` 
  - fixed bug tha loweredthe frequency of Zeros (especially leading ones)
- `getUlid()` 
  - fixed bug where passing in 0 for timestamp used current time instead
  - fixed bug where passing in 0n for salt generated new random salt instead

## [1.0.1] - 2026-09-03

### Added
- `index.d.ts` TypeScript type definitions

### Changed
- Pre-publish package updates
- Converted tests to Node builtin test runner
- Documentation improvements

## [1.0.0] - 2026-08-21

### Added
- Core Crockford32 encoding/decoding utilities
- `sanitize()` for input cleanup and validation
- `encode()`/`decode()` for Uint8Array conversion
- `fromBigInt()`/`toBigInt()` for BigInt conversion
- `fromText()`/`toText()` for text encoding
- `fromHex()`/`toHex()` for hex conversion
- `fromBase64()`/`toBase64()` for base64 conversion
- `getRandomChars()` for random string generation
- `getUlid()` for ULID generation with monotonic increment
- `ulidToParts()` for ULID parsing
- `setDefaultTtl()` for cache TTL configuration

## [0.1.0] - 2026-07-19

### Added
- Initial project structure
- Full project files
- README documentation
- Test suite

## [0.0.1] - 2026-04-29

### Added
- Initial commit

