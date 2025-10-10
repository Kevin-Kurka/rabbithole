import NextAuth from "next-auth"
console.log("NextAuth route loaded");
import CredentialsProvider from "next-auth/providers/credentials"
import { gql } from '@apollo/client';
import client from "@/lib/apollo-client";

const LOGIN_MUTATION = gql`
  mutation Login($input: UserInput!) {
    login(input: $input) {
      id
      username
      email
    }
  }
`;

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "jsmith@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("Authorizing...");
        if (!credentials) {
          console.log("No credentials");
          return null;
        }

        try {
          const { data } = await client.mutate({
            mutation: LOGIN_MUTATION,
            variables: { input: { email: credentials.email, password: credentials.password, username: "" } },
          });

          console.log("Login mutation data:", data);

          if (data && data.login) {
            console.log("Login successful");
            return data.login;
          } else {
            console.log("Login failed");
            return null;
          }
        } catch (e) {
          console.error("Login error:", e);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.username as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }