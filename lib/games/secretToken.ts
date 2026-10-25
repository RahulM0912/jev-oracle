import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { type Secret, isHint } from "./secret";

// The browser only ever holds an encrypted token, so the secret can't be read from
// React state or the network tab mid-game. The API stays stateless: every call sends the token.

/**
 * GAME_SECRET if set; otherwise derived from the Jev API key (HMAC with a fixed label, so the
 * API key itself is never used as the cipher key). Mock-only setups fall back to a dev key.
 */
function key() {
  if (process.env.GAME_SECRET) return createHash("sha256").update(process.env.GAME_SECRET).digest();
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (apiKey) return createHmac("sha256", apiKey).update("jev-oracle/secret-token/v1").digest();
  return createHash("sha256").update("jev-oracle-dev-only-secret").digest();
}

export function seal(secret: Secret): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(secret), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function open(token: unknown): Secret | null {
  if (typeof token !== "string" || token.length > 1000) return null;
  try {
    const raw = Buffer.from(token, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const s = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8"));
    const ok = typeof s.name === "string" && Array.isArray(s.aliases) && isHint(s.category);
    return ok ? { name: s.name, aliases: s.aliases, category: s.category } : null;
  } catch {
    return null;
  }
}
