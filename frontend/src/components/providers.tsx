"use client";

import client from "@/lib/apollo-client";
import { ApolloProvider as Provider } from "@apollo/client";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/contexts/ToastContext";
import { ToastContainer } from "@/components/ToastContainer";

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
          <ToastProvider>
            {children}
            <ToastContainer />
          </ToastProvider>
        </ThemeProvider>
      </SessionProvider>
    </Provider>
  );
}