import { Adapter, AdapterAccount, AdapterUser } from 'next-auth/adapters';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '../server/prisma';
import { DefaultSession, getServerSession, NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from 'next';
import process from 'node:process';

const andrewPattern = new RegExp('([A-Za-z0-9]+)@(andrew|alumni).cmu.edu');

const tryExtractAndrewId = (email: string) => {
  const match = email.match(andrewPattern);
  return match ? match[1] : null;
};

export const adapter: Adapter = {
  ...PrismaAdapter(prisma),
  createUser: async ({ name, email, emailVerified }: AdapterUser) => {
    return prisma.user.create({
      data: {
        displayName: name,
        name,
        email,
        andrew: tryExtractAndrewId(email),
        emailVerified,
      },
    });
  },
  getUserByEmail: async (email: string) => {
    const andrew = tryExtractAndrewId(email);
    if (andrew) {
      return prisma.user.findFirst({ where: { andrew } });
    }
    return prisma.user.findUnique({ where: { email } });
  },
  updateUser: async ({ id, ...data }) => {
    const andrew = (data.email && tryExtractAndrewId(data.email)) ?? undefined;
    return prisma.user.update({
      where: { id },
      data: { displayName: data.name, andrew, ...data },
    });
  },
  linkAccount: async ({
    type,
    provider,
    providerAccountId,
    refresh_token: refreshToken,
    access_token: accessToken,
    expires_at: accessTokenExpires,
    userId,
  }: AdapterAccount) => {
    await prisma.account.create({
      data: {
        userId,
        providerType: type,
        provider,
        providerAccountId,
        accessToken,
        accessTokenExpires,
        refreshToken,
      },
    });
  },
  unlinkAccount: async (provider_providerAccountId) => {
    await prisma.account.delete({
      where: { provider_providerAccountId },
    });
  },
};

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'user' | 'admin';
    } & DefaultSession['user'];
  }
}

const getEnv = <T extends keyof typeof process.env>(
  key: T,
): NonNullable<NodeJS.ProcessEnv[T]> => {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(
      `Did not find value for required environment variable: ${key}`,
    );
  }
  return value;
};

const authOptions = {
  adapter,
  providers: [
    GoogleProvider({
      clientId: getEnv('GOOGLE_CLIENT_ID'),
      clientSecret: getEnv('GOOGLE_CLIENT_SECRET'),
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      const { admin, name, displayName } = await prisma.user.findFirstOrThrow({
        where: { id: user.id },
        select: { admin: true, name: true, displayName: true },
      });
      session.user.id = user.id;
      session.user.role = admin ? 'admin' : 'user';
      session.user.name = displayName ?? name ?? session.user.name;
      return session;
    },
  },
  pages: {
    newUser: '/profile/edit',
  },
} satisfies NextAuthOptions;

export default authOptions;

export function auth(
  ...args:
    | [GetServerSidePropsContext['req'], GetServerSidePropsContext['res']]
    | [NextApiRequest, NextApiResponse]
    | []
) {
  return getServerSession(...args, authOptions);
}
