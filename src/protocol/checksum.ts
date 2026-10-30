/** XOR de tous les octets de `bytes` (le checksum lui-même ne doit pas y figurer). */
export function xorChecksum(bytes: Uint8Array): number {
  let checksum = 0;
  for (const byte of bytes) {
    checksum ^= byte;
  }
  return checksum;
}
