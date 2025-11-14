import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { UniversalFileViewer } from "@/components/universal-file-viewer";

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
          <UniversalFileViewer />
        </Providers>
      </body>
    </html>
  );
}
