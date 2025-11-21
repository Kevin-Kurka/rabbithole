"use client";

import client from "@/lib/apollo-client";
import { ApolloProvider as Provider } from "@apollo/client";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider client={client}>
      <SessionProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </SessionProvider>
    </Provider>
  );
}