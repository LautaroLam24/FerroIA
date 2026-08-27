import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  email!: string;

  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name!: string;

  @IsIn([Role.ADMIN, Role.OPERARIO], {
    message: 'El rol debe ser ADMIN u OPERARIO',
  })
  role!: Role;

  @IsString({ message: 'La contraseña debe ser un texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'La contraseña debe incluir al menos una letra y un número',
  })
  password!: string;
}
