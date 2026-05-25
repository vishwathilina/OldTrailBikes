import { Language, UserRole, type User } from '@prisma/client';
import { prisma } from '../../config/db';
import { hashPassword, comparePassword } from '../../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { ApiError } from '../../utils/ApiError';

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  preferredLanguage?: Language;
  role?: Extract<UserRole, 'CUSTOMER' | 'SHOP'>;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthPayload {
  user: PublicUser;
  tokens: AuthTokens;
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  preferredLanguage: Language;
  createdAt: Date;
}

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    role: u.role,
    preferredLanguage: u.preferredLanguage,
    createdAt: u.createdAt,
  };
}

function issueTokens(user: User): AuthTokens {
  const payload = { sub: user.id, role: user.role, email: user.email };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function registerUser(input: RegisterInput): Promise<AuthPayload> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone,
      preferredLanguage: input.preferredLanguage ?? Language.EN,
      role: input.role ?? UserRole.CUSTOMER,
    },
  });

  return { user: toPublicUser(user), tokens: issueTokens(user) };
}

export async function loginUser(input: LoginInput): Promise<AuthPayload> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('Account is deactivated');

  const ok = await comparePassword(input.password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');

  return { user: toPublicUser(user), tokens: issueTokens(user) };
}

export async function refreshSession(refreshToken: string): Promise<AuthTokens> {
  const decoded = verifyRefreshToken(refreshToken);
  const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
  if (!user || !user.isActive) throw ApiError.unauthorized('Account not found or inactive');
  return issueTokens(user);
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');
  return toPublicUser(user);
}
