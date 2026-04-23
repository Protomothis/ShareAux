import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALG = 'aes-256-gcm' as const;

/** JWT_SECRET에서 AES-256 키 파생 */
function deriveKey(jwtSecret: string): Buffer {
  return createHash('sha256').update(jwtSecret).digest();
}

/** AES-256-GCM 암호화 → "iv:authTag:ciphertext" (hex) */
export function encrypt(plaintext: string, jwtSecret: string): string {
  const key = deriveKey(jwtSecret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/** AES-256-GCM 복호화 */
export function decrypt(ciphertext: string, jwtSecret: string): string {
  const [ivHex, authTagHex, encHex] = ciphertext.split(':');
  if (!ivHex || !authTagHex || !encHex) throw new Error('Invalid ciphertext format');
  const key = deriveKey(jwtSecret);
  const decipher = createDecipheriv(ALG, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return decipher.update(encHex, 'hex', 'utf8') + decipher.final('utf8');
}

/** 마스킹: "sk-abc...xyz" → "sk-a****xyz" */
export function mask(value: string): string {
  if (value.length <= 8) return '****';
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}
