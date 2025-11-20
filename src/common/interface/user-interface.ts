export interface INotificationPreferences {
  whatsappEnabled: boolean;
  taskReminders: boolean;
  statusUpdates: boolean;
  dailySummary: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface IUser {
  username: string;
  email: string;
  password: string;
  bio: string;
  profilePicture: string;
  phoneNumber?: string;
  phoneVerified: boolean;
  notificationPreferences: INotificationPreferences;
  comparePassword(password: string): boolean;
  refreshToken(token: string): void;
}

export interface IAuth {
  username: string;
  email: string;
  password?: string;
}

export interface ILogin {
  email: string;
  password: string;
}
