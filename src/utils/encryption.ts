import crypto from 'crypto';

// Algorithm for encryption
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Get encryption key from environment variable
 * @returns Buffer containing the encryption key
 * @throws Error if PHONE_ENCRYPTION_KEY is not set
 */
function getEncryptionKey(): Buffer {
  const key = process.env.PHONE_ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('PHONE_ENCRYPTION_KEY environment variable is not set');
  }
  
  // Derive a key from the environment variable using PBKDF2
  const salt = Buffer.from('snaptask-phone-encryption-salt'); // Static salt for key derivation
  return crypto.pbkdf2Sync(key, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt a phone number
 * @param phoneNumber - The phone number to encrypt (E.164 format)
 * @returns Encrypted phone number as a base64 string with format: salt:iv:tag:encrypted
 */
export function encrypt(phoneNumber: string): string {
  if (!phoneNumber) {
    throw new Error('Phone number is required for encryption');
  }

  try {
    const key = getEncryptionKey();
    
    // Generate random IV for each encryption
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the phone number
    let encrypted = cipher.update(phoneNumber, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine iv, tag, and encrypted data
    // Format: iv:tag:encrypted
    const result = `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    
    return result;
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt an encrypted phone number
 * @param encryptedData - The encrypted phone number string (format: iv:tag:encrypted)
 * @returns Decrypted phone number in E.164 format
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    throw new Error('Encrypted data is required for decryption');
  }

  try {
    const key = getEncryptionKey();
    
    // Split the encrypted data
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt the phone number
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate if a string is properly encrypted
 * @param encryptedData - The string to validate
 * @returns true if the string appears to be properly encrypted
 */
export function isEncrypted(encryptedData: string): boolean {
  if (!encryptedData) {
    return false;
  }
  
  const parts = encryptedData.split(':');
  return parts.length === 3 && parts.every(part => /^[0-9a-f]+$/i.test(part));
}
