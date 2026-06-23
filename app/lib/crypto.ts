// Crypto helpers for local-first auth.
// Uses Web Crypto API so it works in the browser without extra dependencies.

const SALT_BYTES = 16;
const RECOVERY_CODE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const RECOVERY_CODE_LENGTH = 24;

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBuffer(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function getCrypto(): Crypto {
  if (typeof crypto === "undefined") {
    throw new Error("Web Crypto API tidak tersedia. Pastikan akses aman (HTTPS/localhost) dan browser mendukungnya.");
  }
  return crypto;
}

function getSubtleCrypto(): SubtleCrypto {
  const c = getCrypto();
  if (!c.subtle) {
    throw new Error("Web Crypto API tidak tersedia. Pastikan akses aman (HTTPS/localhost) dan browser mendukungnya.");
  }
  return c.subtle;
}

async function sha256(input: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  return getSubtleCrypto().digest("SHA-256", data);
}

export async function hashPassword(password: string): Promise<string> {
  const saltBytes = getCrypto().getRandomValues(new Uint8Array(SALT_BYTES));
  const salt = bufferToBase64Url(saltBytes.buffer);
  const hashBuffer = await sha256(salt + password);
  const hash = bufferToBase64Url(hashBuffer);
  return `${salt}:${hash}`;
}

export async function verifyPassword(
  password: string,
  hashWithSalt: string
): Promise<boolean> {
  const [salt, hash] = hashWithSalt.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = await sha256(salt + password);
  const computed = bufferToBase64Url(hashBuffer);
  if (computed.length !== hash.length) return false;

  // Constant-time comparison to mitigate timing attacks.
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return diff === 0;
}

export function generateRecoveryCode(): string {
  const array = new Uint8Array(RECOVERY_CODE_LENGTH);
  getCrypto().getRandomValues(array);
  let code = "";
  for (let i = 0; i < RECOVERY_CODE_LENGTH; i++) {
    code += RECOVERY_CODE_CHARS[array[i] % RECOVERY_CODE_CHARS.length];
  }
  // Add dashes for readability: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

export async function hashRecoveryCode(code: string): Promise<string> {
  return hashPassword(code);
}

export async function verifyRecoveryCode(
  code: string,
  hashWithSalt: string
): Promise<boolean> {
  return verifyPassword(code, hashWithSalt);
}

/** Deterministic SHA-256 digest as base64url. */
export async function sha256Base64(input: string): Promise<string> {
  const buffer = await sha256(input);
  return bufferToBase64Url(buffer);
}
