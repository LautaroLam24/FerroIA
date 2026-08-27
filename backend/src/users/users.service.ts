import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

const userPublicSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

type PublicUser = Prisma.UserGetPayload<{ select: typeof userPublicSelect }>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const rounds = Math.max(
      10,
      Number(this.configService.get<string>('BCRYPT_ROUNDS') ?? '10'),
    );
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    try {
      return await this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          passwordHash,
          role: dto.role,
        },
        select: userPublicSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('El email ya está registrado');
      }
      throw error;
    }
  }

  async findAll(): Promise<PublicUser[]> {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: userPublicSelect,
    });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
