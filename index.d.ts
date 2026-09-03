export interface SanitizeOptions {
  strictMatching?: boolean;
  withChecksum?: boolean;
}

export interface FromBase64Options {
  alphabet?: "base64" | "base64url";
  lastChunkHandling?: "loose" | "strict" | "stop-before-partial";
}

export interface ToBase64Options {
  alphabet?: "base64" | "base64url";
  omitPadding?: boolean;
}

export interface TextDecoderOptions {
  label?: string;
  fatal?: boolean;
  ignoreBOM?: boolean;
}

export interface UlidOptions {
  isStrict?: boolean;
  timestamp?: number;
  salt?: bigint;
}

export type UlidInput = UlidOptions | string | boolean;

export interface UlidParts {
  timestamp: number;
  salt: bigint;
  isStrict?: boolean;
}

export const sanitize: (
  crockford: string,
  options?: SanitizeOptions,
) => string;

export const fromBigInt: (
  value: bigint | number | string,
  options?: SanitizeOptions,
) => string;

export const toBigInt: (
  crockford: string,
  options?: SanitizeOptions,
) => bigint;

export const encode: (
  value: Uint8Array | ArrayLike<number> | ArrayBuffer,
  options?: SanitizeOptions,
) => string;

export const fromUint8: typeof encode;

export const decode: (
  crockford: string,
  options?: SanitizeOptions,
) => Uint8Array;

export const toUint8: typeof decode;

export const fromHex: (
  value: string,
  options?: SanitizeOptions,
) => string;

export const toHex: (
  crockford: string,
  options?: SanitizeOptions,
) => string;

export const fromBase64: (
  value: string,
  options?: SanitizeOptions,
  base64Options?: FromBase64Options,
) => string;

export const toBase64: (
  crockford: string,
  options?: SanitizeOptions,
  base64Options?: ToBase64Options,
) => string;

export const fromText: (
  value: string,
  options?: SanitizeOptions,
) => string;

export const toText: (
  crockford: string,
  options?: SanitizeOptions,
  textOptions?: TextDecoderOptions,
) => string;

export const getRandomChars: (length?: number) => string;

export function getUlid(
  options?: UlidOptions,
  strictImplementation?: boolean,
): string;
export function getUlid(
  options: string | boolean,
  strictImplementation?: boolean,
): string;

export function ulidToParts(
  ulid: string,
  options?: boolean | { isStrict?: boolean },
): UlidParts;

export interface C32Api {
  sanitize: typeof sanitize;
  encode: typeof encode;
  decode: typeof decode;
  toUint8: typeof toUint8;
  fromUint8: typeof fromUint8;
  toBigInt: typeof toBigInt;
  fromBigInt: typeof fromBigInt;
  toHex: typeof toHex;
  fromHex: typeof fromHex;
  toBase64: typeof toBase64;
  fromBase64: typeof fromBase64;
  toText: typeof toText;
  fromText: typeof fromText;
  getRandomChars: typeof getRandomChars;
  getUlid: typeof getUlid;
  ulidToParts: typeof ulidToParts;
}

export const C32: C32Api;
export default C32;
