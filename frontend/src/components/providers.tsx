"use client";

import client from "@/lib/apollo-client";
import { ApolloProvider as Provider } from "@apollo/client";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider client={client}>
      <SessionProvider>{children}</SessionProvider>
    </Provider>
  );
}