const SECRET = "payproof-demo-secret";

function toHex(num: number): string {
  return num.toString(16).padStart(64, "0");
}

export function encryptNumber(value: number): string {
  const salted = value + SECRET.length;
  return `0x${toHex(salted)}`;
}

export function decryptNumber(ciphertext: string): number {
  if (!ciphertext.startsWith("0x")) {
    throw new Error("Invalid ciphertext");
  }
  const numeric = Number(BigInt(ciphertext));
  return numeric - SECRET.length;
}
