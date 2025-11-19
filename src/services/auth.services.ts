import { IAuth, ILogin } from '../common/interface/user-interface';
import User from '../models/user.model';
import { omit } from 'lodash';
import { Types } from 'mongoose';

export interface IAuthResponse extends Omit<IAuth, 'password'> {
  _id: string | Types.ObjectId;
}

export const registerUser = async (user: IAuth): Promise<IAuthResponse> => {
  // check existingUser
  const existingUser = await User.findOne({ email: user.email });

  // throw error if user already exist in the Database
  if (existingUser) {
    throw new Error('User already exist');
  }

  const result = await User.create(user);
  const userData = omit(result.toObject(), ['password']);
  return userData as IAuthResponse;
};

export const loginUser = async (user: ILogin): Promise<IAuthResponse> => {
  // find the user
  const userExist = await User.findOne({ email: user.email });

  // throw error if user does not exist
  if (!userExist) {
    throw new Error('User not found');
  }

  // compare password
  const isPasswordMatch = userExist.comparePassword(userExist.password);

  // return error if password is not match
  if (!isPasswordMatch) {
    throw new Error('Invalid password');
  }

  // omit password
  const userData = omit(userExist.toObject(), ['password']);

  // return user
  return userData as IAuthResponse;
};
