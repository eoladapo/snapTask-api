import config from '@src/config';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

export const generateAccessToken = (user: Types.ObjectId | string): string => {
  return jwt.sign({ user, type: 'access' }, config.ACCESS_TOKEN_SECRET!, {
    expiresIn: config.ACCESS_TOKEN_EXPIRES,
  });
};

export const generateRefreshToken = (user: Types.ObjectId | string): string => {
  return jwt.sign({ user, type: 'refresh' }, config.REFRESH_TOKEN_SECRET!, {
    expiresIn: config.REFRESH_TOKEN_EXPIRES,
  });
};
