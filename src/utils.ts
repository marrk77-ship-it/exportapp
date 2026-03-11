// Base64 encoding/decoding utilities for UTF-8 strings
export function base64Encode(str: string): string {
  // Convert string to UTF-8 bytes, then to base64
  const bytes = new TextEncoder().encode(str)
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('')
  return btoa(binString)
}

export function base64Decode(base64: string): string {
  // Decode base64 to bytes, then to UTF-8 string
  const binString = atob(base64)
  const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!)
  return new TextDecoder().decode(bytes)
}
