
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { gql } from '@apollo/client';
import client from "@/lib/apollo-client";

// Define the login mutation
const LOGIN_MUTATION = gql`
  mutation Login($input: UserInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      user {
        id
        username
        email
      }
    }
  }
`;

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text", placeholder: "jsmith@example.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials) return null;

                try {
                    // NOTE: Using the Apollo Client here might be tricky if it depends on browser APIs.
                    // Ideally, we'd use a raw fetch or verify client works in Node.
                    // Assuming client is configured for SSR/Server side too.
                    const { data } = await client.mutate({
                        mutation: LOGIN_MUTATION,
                        variables: { input: { email: credentials.email, password: credentials.password, username: "" } },
                    });

                    if (data && data.login && data.login.user) {
                        return {
                            ...data.login.user,
                            accessToken: data.login.accessToken,
                            refreshToken: data.login.refreshToken,
                        };
                    }
                    return null;
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
                // @ts-ignore
                token.accessToken = user.accessToken;
                // @ts-ignore
                token.refreshToken = user.refreshToken;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                // @ts-ignore
                session.user.id = token.id as string;
                // @ts-ignore
                session.user.name = token.username as string;
                // @ts-ignore
                session.accessToken = token.accessToken as string;
                // @ts-ignore
                session.refreshToken = token.refreshToken as string;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
    },
    // v5 doesn't need secret in config if NEXTAUTH_SECRET env is set
})
