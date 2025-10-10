"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/graph');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Redirecting to graph...</p>
    </div>
  );
}
