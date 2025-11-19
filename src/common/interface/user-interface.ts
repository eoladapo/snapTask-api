export interface IUser {
  username: string;
  email: string;
  password: string;
  bio: string;
  profilePicture: string;
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
