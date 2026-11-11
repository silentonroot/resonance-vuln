import "dotenv/config";
import { Buffer } from "node:buffer";
import { SignJWT, jwtVerify } from "jose";

const secretHex = process.env.JWT_SECRET;

if (!secretHex || !/^[0-9a-f]{64}$/i.test(secretHex)) {
  throw new Error("JWT_SECRET must contain exactly 64 hexadecimal characters");
}

const signingKey = Buffer.from(secretHex, "hex");

export async function createAccessToken(
  userId: number 
): Promise<string> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(userId))
    .setIssuer("resonance")
    .setAudience("resonance-api")
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(signingKey);

  return token;
}

export async function verifyAccessToken(
  token:string
): Promise<number> {
  const { payload } = await jwtVerify(token, signingKey, {
    algorithms: ["HS256"],
    issuer: "resonance",
    audience: "resonance-api",
    typ: "JWT", 
    requiredClaims: ["sub", "iat", "exp"],
  });

  const userId = Number(payload.sub);

  if (!Number.isSafeInteger(userId) || userId < 1) {
    throw new Error("Invalid token subject");
  }

  return userId;
}

