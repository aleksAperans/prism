import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import CredentialsProvider from 'next-auth/providers/credentials';

// Debug environment variables
console.log('🔍 Auth Debug:', {
  hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
  nextAuthUrl: process.env.NEXTAUTH_URL,
  hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
  nodeEnv: process.env.NODE_ENV,
  vercelUrl: process.env.VERCEL_URL
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Temporarily disable Prisma adapter to isolate auth issue
  // adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  trustHost: true, // Allow NextAuth to auto-detect the host in production
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // For demo purposes, we'll use a simple check
        // In production, you would validate against a real user database with hashed passwords
        const demoUsers = [
          {
            id: '1',
            email: 'aleksaperans@protonmail.com',
            password: 'admin123', // In production, this would be hashed
            name: 'Aleks Aperans',
            role: 'admin',
          },
          {
            id: '2',
            email: 'demo@prism-screening.com',
            password: 'prism-demo-123', // In production, this would be hashed
            name: 'Prism Demo User',
            role: 'user',
          },
        ];

        const user = demoUsers.find(
          u => u.email === credentials.email && u.password === credentials.password
        );

        if (user) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});

declare module 'next-auth' {
  interface User {
    role?: string;
  }
  
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role?: string;
    };
  }
}

// JWT interface augmentation for NextAuth v5
// Note: JWT types are handled internally by NextAuth v5