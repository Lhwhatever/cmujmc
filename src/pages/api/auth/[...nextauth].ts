import { createCache } from 'cache-manager';
import { Adapter, AdapterAccount } from 'next-auth/adapters';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '../../../server/prisma';
import { User } from '../../../utils/usernames';
import NextAuth, { AuthOptions, DefaultSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const newUserDataCache = createCache({ ttl: 180000 });

export const adapter: Adapter = {
  ...PrismaAdapter(prisma),
  createUser: async (user) =>
    prisma.user.create({
      data: {
        displayName: user.name,
        name: user.name,
        email: user.email,
      },
    }),
  updateUser: async ({ id, ...data }) =>
    prisma.user.update({
      where: { id },
      data: { displayName: data.name, ...data },
    }),
  linkAccount: async (data) => {
    await prisma.account.create({ data });
    const value = await newUserDataCache.get<Partial<User>>(data.userId);
    if (value !== null) {
      await prisma.user.update({
        where: { id: data.userId },
        data: value,
      });
    }
    return data;
  },
  unlinkAccount: async (provider_providerAccountId) => {
    const account = await prisma.account.delete({
      where: { provider_providerAccountId },
    });
    return account as unknown as AdapterAccount;
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

const andrewPattern = new RegExp('([A-Za-z0-9]+)@andrew.cmu.edu');

export const authOptions: AuthOptions = {
  adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account !== null) {
        if (account.provider === 'google') {
          const match = profile?.email?.match(andrewPattern);
          if (match) {
            const andrew = match[1];
            try {
              await prisma.user.update({
                where: { id: user.id },
                data: { andrew },
              });
            } catch (e) {
              await newUserDataCache.set(user.id, { andrew });
            }
          }
        }
      }

      return true;
    },
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
};

export default NextAuth(authOptions);
