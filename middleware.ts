import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ token }) => Boolean(token?.sub && (token.role === "ADMIN" || token.role === "EDITOR")),
  },
});

export const config = { matcher: ["/admin/:path*"] };
