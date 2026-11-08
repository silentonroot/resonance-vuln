import * as argon2 from "argon2";

export async function hashPassword(
  password: string
): Promise<string> {
  const hash = await argon2.hash(password);
  return hash;
}

export async function VerifyPassword(
  hash: string,
  password: string 
): Promise<boolean> {
  const matches = await argon2.verify(hash, password);
  return matches;
}
