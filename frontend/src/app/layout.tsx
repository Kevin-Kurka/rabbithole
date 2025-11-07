import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import PerformanceMonitor from "@/components/PerformanceMonitor";

export const metadata: Metadata = {
  title: "Rabbit Hole - Collaborative Knowledge Graphs",
  description: "Build and explore interconnected knowledge graphs with collaborative verification",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
        </Providers>
      </body>
    </html>
  );
}
