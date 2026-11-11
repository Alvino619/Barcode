import { compare } from "bcryptjs";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { credentialsSchema } from "@/lib/schemas/auth";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [CredentialsProvider({
    name: "Email dan kata sandi",
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Kata sandi", type: "password" } },
    async authorize(credentials) {
      const result = credentialsSchema.safeParse(credentials);
      if (!result.success) return null;
      const user = await prisma.user.findUnique({ where: { email: result.data.email } });
      if (!user || !(await compare(result.data.password, user.passwordHash))) return null;
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

// Use in every future server action / protected route handler as well as layouts.
export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) redirect("/login");
  return user;
}
