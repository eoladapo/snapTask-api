import crypto from 'crypto';
import VerificationCode from '../models/verificationCode.model';
import { Types } from 'mongoose';

// Verification code configuration
const CODE_LENGTH = 6;
const CODE_EXPIRATION_MINUTES = 5;

/**
 * Generate a random 6-digit verification code
 * @returns A 6-digit numeric string
 */
function generateVerificationCode(): string {
  // Generate a random 6-digit number
  const code = crypto.randomInt(100000, 999999).toString();
  return code;
}

/**
 * Generate and store a verification code for a phone number
 * @param userId - The user's ID
 * @param phoneNumber - The phone number to verify (E.164 format)
 * @returns The generated verification code
 */
export async function generateAndStoreCode(
  userId: string | Types.ObjectId,
  phoneNumber: string,
): Promise<string> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!phoneNumber) {
    throw new Error('Phone number is required');
  }

  // Generate a new verification code
  const code = generateVerificationCode();

  // Calculate expiration time (5 minutes from now)
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRATION_MINUTES);

  // Delete any existing unverified codes for this user and phone number
  await VerificationCode.deleteMany({
    userId,
    phoneNumber,
    verified: false,
  });

  // Store the new verification code
  await VerificationCode.create({
    userId,
    phoneNumber,
    code,
    expiresAt,
    verified: false,
  });

  return code;
}

/**
 * Validate a verification code
 * @param userId - The user's ID
 * @param phoneNumber - The phone number being verified
 * @param code - The verification code to validate
 * @returns true if the code is valid, false otherwise
 */
export async function validateVerificationCode(
  userId: string | Types.ObjectId,
  phoneNumber: string,
  code: string,
): Promise<boolean> {
  if (!userId || !phoneNumber || !code) {
    throw new Error('User ID, phone number, and code are required');
  }

  // Find the verification code
  const verificationRecord = await VerificationCode.findOne({
    userId,
    phoneNumber,
    code,
    verified: false,
  });

  // Check if code exists
  if (!verificationRecord) {
    return false;
  }

  // Check if code has expired
  // Ask Has the code already expired? 
  const now = new Date();
  if (verificationRecord.expiresAt < now) {
    // Delete expired code
    await VerificationCode.deleteOne({ _id: verificationRecord._id });
    return false;
  }

  // Mark the code as verified
  verificationRecord.verified = true;
  await verificationRecord.save();

  // Delete all other unverified codes for this user and phone number
  await VerificationCode.deleteMany({
    userId,
    phoneNumber,
    verified: false,
    _id: { $ne: verificationRecord._id },
  });

  return true;
}

/**
 * Check if a verification code exists and is still valid
 * @param userId - The user's ID
 * @param phoneNumber - The phone number
 * @returns true if a valid code exists, false otherwise
 */
export async function hasValidCode(
  userId: string | Types.ObjectId,
  phoneNumber: string,
): Promise<boolean> {
  const now = new Date();

  const verificationRecord = await VerificationCode.findOne({
    userId,
    phoneNumber,
    verified: false,
    expiresAt: { $gt: now },
  });

  return !!verificationRecord;
}

/**
 * Delete all verification codes for a user and phone number
 * @param userId - The user's ID
 * @param phoneNumber - The phone number
 */
export async function deleteVerificationCodes(
  userId: string | Types.ObjectId,
  phoneNumber: string,
): Promise<void> {
  await VerificationCode.deleteMany({
    userId,
    phoneNumber,
  });
}

/**
 * Clean up expired verification codes (can be run periodically)
 * This is a maintenance function, though MongoDB TTL index handles this automatically
 */
export async function cleanupExpiredCodes(): Promise<number> {
  const now = new Date();
  const result = await VerificationCode.deleteMany({
    expiresAt: { $lt: now },
  });

  return result.deletedCount || 0;
}
