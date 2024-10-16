import NextAuth, { AuthOptions, type DefaultSession } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '../server/prisma';
import GoogleProvider from 'next-auth/providers/google';
import { Adapter, AdapterAccount } from 'next-auth/adapters';

export const adapter: Adapter = {
  ...PrismaAdapter(prisma),
  createUser: async (user) => prisma.user.create({
    data: {
      displayName: user.name,
      name: user.name,
      email: user.email,
    }
  }),
  updateUser: async ({ id, ...data }) =>
    prisma.user.update({
      where: { id },
      data: { displayName: data.name, ...data }
    }),
  linkAccount: async (data) => {
    await prisma.account.create({ data });
    return data;
  },
  unlinkAccount: async (provider_providerAccountId) => {
    const account = await prisma.account.delete({
      where: { provider_providerAccountId }
    });
    return account as unknown as AdapterAccount;
  },
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: 'user' | 'admin';
    } & DefaultSession["user"];
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
    async session({ session, user }) {
      const { admin } = await prisma.user.findFirstOrThrow({
        where: { id: user.id },
        select: { admin: true }
      });
      session.user.id = user.id;
      session.user.role = admin ? 'admin' : 'user';
      return session;
    }
  }
};

export default NextAuth(authOptions);