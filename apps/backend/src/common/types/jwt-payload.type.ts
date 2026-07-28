import { Role } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  role: Role;
  iat?: number;
  exp?: number;
}
