import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findFirst: jest.Mock } };
  let jwtService: { signAsync: jest.Mock };
  let user: User;

  beforeAll(async () => {
    user = {
      id: 'user-1',
      email: 'admin@ferreteria.local',
      name: 'Admin',
      passwordHash: await bcrypt.hash('correct-password', 10),
      role: Role.ADMIN,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  beforeEach(async () => {
    prisma = { user: { findFirst: jest.fn() } };
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed-jwt') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('returns the user when the password matches', async () => {
      prisma.user.findFirst.mockResolvedValue(user);

      const result = await service.validateUser(user.email, 'correct-password');

      expect(result).toEqual(user);
    });

    it('returns null when the user does not exist', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await service.validateUser(
        'missing@ferreteria.local',
        'whatever',
      );

      expect(result).toBeNull();
    });

    it('returns null when the password does not match', async () => {
      prisma.user.findFirst.mockResolvedValue(user);

      const result = await service.validateUser(user.email, 'wrong-password');

      expect(result).toBeNull();
    });

    it('returns null for a deleted user even with correct credentials', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await service.validateUser(user.email, 'correct-password');

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: user.email, deletedAt: null },
      });
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('signs a JWT with sub/email/role and returns the user on success', async () => {
      prisma.user.findFirst.mockResolvedValue(user);

      const result = await service.login(user.email, 'correct-password');

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      expect(result).toEqual({
        accessToken: 'signed-jwt',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    });

    it('throws UnauthorizedException on invalid credentials', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login('missing@ferreteria.local', 'x'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
