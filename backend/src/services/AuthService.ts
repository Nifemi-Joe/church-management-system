import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '@repositories/UserRepository';
import { AppError } from '@utils/AppError';
import { RegisterDTO } from '@/types/auth.types';
import logger from '@config/logger';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async register(data: RegisterDTO) {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser) {
        throw new AppError('Email already registered', 409);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 12);

      // Create user
      const user = await this.userRepository.create({
        ...data,
        password: hashedPassword
      });

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        ...tokens
      };
    } catch (error) {
      logger.error('Error in register service:', error);
      throw error;
    }
  }

  async login(email: string, password: string) {
    try {
      // Find user
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401);
      }

      // Check if user is active
      if (user.status !== 'active') {
        throw new AppError('Account is not active', 403);
      }

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        ...tokens
      };
    } catch (error) {
      logger.error('Error in login service:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
      if (!jwtRefreshSecret) {
        throw new AppError('Server configuration error', 500);
      }

      const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as any;
      const user = await this.userRepository.findById(decoded.id);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (user.status !== 'active') {
        throw new AppError('Account is not active', 403);
      }

      return this.generateTokens(user);
    } catch (error) {
      logger.error('Error in refreshToken service:', error);
      throw error;
    }
  }

  private generateTokens(user: any) {
    const jwtSecret = process.env.JWT_SECRET;
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

    if (!jwtSecret || !jwtRefreshSecret) {
      throw new AppError('Server configuration error', 500);
    }

    const payload = {
      id: user.id,
      email: user.email,
      churchId: user.church_id,
      role: user.role
    };

    const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
    const refreshToken = jwt.sign({ id: user.id }, jwtRefreshSecret, { expiresIn: jwtRefreshExpiresIn });

    return { accessToken, refreshToken };
  }
}
