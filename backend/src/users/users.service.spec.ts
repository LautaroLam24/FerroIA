import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let configService: { get: jest.Mock };

  const publicUser = {
    id: 'user-1',
    email: 'operario@ferreteria.local',
    name: 'Operario',
    role: 'OPERARIO',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    configService = { get: jest.fn().mockReturnValue('10') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('creates the user and returns it without passwordHash', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(publicUser);

      const result = await service.create({
        email: publicUser.email,
        name: publicUser.name,
        role: 'OPERARIO',
        password: 'Super123',
      });

      const createCall = prisma.user.create.mock.calls as Array<
        [
          {
            data: { email: string; passwordHash: string };
            select: Record<string, unknown>;
          },
        ]
      >;
      const createArg = createCall[0][0];
      expect(createArg.data).toMatchObject({ email: publicUser.email });
      expect(createArg.data.passwordHash).toEqual(expect.any(String));
      expect(createArg.select).not.toHaveProperty('passwordHash');
      expect(result).toEqual(publicUser);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws ConflictException when the email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({
          email: publicUser.email,
          name: 'Otro',
          role: 'OPERARIO',
          password: 'Super123',
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when Prisma raises P2002 (race)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint',
        {
          code: 'P2002',
          clientVersion: '6',
        },
      );
      prisma.user.create.mockRejectedValue(p2002);

      await expect(
        service.create({
          email: publicUser.email,
          name: 'Otro',
          role: 'OPERARIO',
          password: 'Super123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('returns active users without passwordHash', async () => {
      prisma.user.findMany.mockResolvedValue([publicUser]);

      const result = await service.findAll();

      const findManyCall = prisma.user.findMany.mock.calls as Array<
        [
          {
            where: { deletedAt: null };
            orderBy: { createdAt: 'desc' };
            select: Record<string, unknown>;
          },
        ]
      >;
      const findManyArg = findManyCall[0][0];
      expect(findManyArg.where).toEqual({ deletedAt: null });
      expect(findManyArg.orderBy).toEqual({ createdAt: 'desc' });
      expect(findManyArg.select).not.toHaveProperty('passwordHash');
      expect(result).toEqual([publicUser]);
      expect(result[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('remove', () => {
    it('sets deletedAt without deleting the record', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: publicUser.id });

      await service.remove(publicUser.id);

      const updateCall = prisma.user.update.mock.calls as Array<
        [{ where: { id: string }; data: { deletedAt: Date } }]
      >;
      const updateArg = updateCall[0][0];
      expect(updateArg.where).toEqual({ id: publicUser.id });
      expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the user is already deleted', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.remove(publicUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
