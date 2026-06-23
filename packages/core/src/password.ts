import { hash, verify } from "@node-rs/argon2";

export async function hashPassword(value: string): Promise<string> {
  if (!value) {
    throw new Error("password cannot be empty");
  }

  return hash(value);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return verify(passwordHash, password);
}
