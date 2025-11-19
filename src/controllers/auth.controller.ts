import { generateAccessToken, generateRefreshToken } from '../lib/jwt';
import { loginUser, registerUser } from '../services/auth.services';
import { Request, Response } from 'express';

// signup
export const signup = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ message: 'Please provide all required fields' });

    const user = await registerUser({ username, email, password });

    // generate Token
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(201).json({
      message: 'User created successfully',
      user,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Internal server error, Error signing up user, Please try again' });
    console.log('Error signing up user', error);
  }
};

// login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Please provide all required fields' });

    const user = await loginUser({ email, password });

    // generate Token
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      message: 'User logged in successfully',
      user,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Internal server error, Error logging in user, Please try again' });
    console.log('Error logging in user', error);
  }
};

// refresh token
export const refreshToken = async (_req: Request, _res: Response) => {};

// logout
export const logout = async (_req: Request, _res: Response) => {};

// get user
export const getUser = async (_req: Request, _res: Response) => {};
