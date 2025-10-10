import type { Metadata } from "next";
import type { NextWebVitalsMetric } from "next/app";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import PerformanceMonitor from "@/components/PerformanceMonitor";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rabbit Hole - Collaborative Knowledge Graphs",
  description: "Build and explore interconnected knowledge graphs with collaborative verification",
};

/**
 * Report Web Vitals for performance monitoring
 */
export function reportWebVitals(metric: NextWebVitalsMetric) {
  // Log Core Web Vitals
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      id: metric.id,
    });
  }

  // In production, send to analytics
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        metric_id: metric.id,
        metric_value: metric.value,
      });
    }
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
        </Providers>
      </body>
    </html>
  );
}
