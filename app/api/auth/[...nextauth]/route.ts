import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@edgeai.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Demo credentials for development
        if (
          credentials?.email === 'admin@edgeai.com' &&
          credentials?.password === 'admin123'
        ) {
          return {
            id: '1',
            name: 'Fleet Operator',
            email: 'admin@edgeai.com',
          };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET ?? 'dev-secret-change-in-production',
});

export { handler as GET, handler as POST };
