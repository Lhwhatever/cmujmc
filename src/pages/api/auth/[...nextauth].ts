import { createCache } from 'cache-manager';
import { Adapter, AdapterAccount, AdapterUser } from 'next-auth/adapters';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '../../../server/prisma';
import NextAuth, { AuthOptions, DefaultSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const andrewPattern = new RegExp('([A-Za-z0-9]+)@(andrew|alumni).cmu.edu');

const tryExtractAndrewId = (email: string) => {
  const match = email.match(andrewPattern);
  return match ? match[1] : null;
};

const newUserDataCache = createCache({ ttl: 180000 });

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
  linkAccount: async ({ type, ...data }: AdapterAccount) => {
    await prisma.account.create({
      data: {
        ...data,
        providerType: type,
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
