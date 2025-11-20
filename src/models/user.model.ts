import { IUser } from '../common/interface/user-interface';
import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    bio: { type: String },
    profilePicture: { type: String },
    phoneNumber: { type: String },
    phoneVerified: { type: Boolean, default: false },
    notificationPreferences: {
      type: {
        whatsappEnabled: { type: Boolean, default: false },
        taskReminders: { type: Boolean, default: true },
        statusUpdates: { type: Boolean, default: true },
        dailySummary: { type: Boolean, default: false },
        quietHoursStart: { type: String },
        quietHoursEnd: { type: String },
      },
      default: {
        whatsappEnabled: false,
        taskReminders: true,
        statusUpdates: true,
        dailySummary: false,
      },
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  } else {
    next();
  }
});

userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

const User = model<IUser>('User', userSchema);

export default User;
