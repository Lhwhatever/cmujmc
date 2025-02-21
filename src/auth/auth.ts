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

const andrewPattern = new RegExp('([A-Za-z0-9]+)@(andrew|alumni).cmu.edu');

const tryExtractAndrewId = (email: string) => {
  const match = email.match(andrewPattern);
  return match ? match[1] : null;
};

export const adapter: Adapter = {
  ...PrismaAdapter(prisma),
  createUser: async ({ id: _, ...user }: AdapterUser) => {
    return prisma.user.create({
      data: {
        displayName: user.name,
        name: user.name,
        email: user.email,
        andrew: tryExtractAndrewId(user.email),
        emailVerified: user.emailVerified,
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
    scope: _scope,
    session_state: _session_state,
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

const authOptions = {
  adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
