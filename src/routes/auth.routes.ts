import { login, signup } from '@src/controllers/auth.controller';
import express, { Router } from 'express';

const router: Router = express.Router();

router.post('/signup', signup);
router.post('/login', login);

export default router;
