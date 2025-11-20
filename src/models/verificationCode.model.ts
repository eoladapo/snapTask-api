import { Schema, model, Document } from 'mongoose';

export interface IVerificationCode extends Document {
  userId: Schema.Types.ObjectId;
  phoneNumber: string;
  code: string;
  expiresAt: Date;
  verified: boolean;
  createdAt: Date;
}

const verificationCodeSchema = new Schema<IVerificationCode>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    phoneNumber: { type: String, required: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

// Index for efficient querying and automatic cleanup
verificationCodeSchema.index({ userId: 1, phoneNumber: 1 });
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup

const VerificationCode = model<IVerificationCode>('VerificationCode', verificationCodeSchema);

export default VerificationCode;
