"use client";
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PromotionLedgerPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Promotion Ledger</CardTitle>
            <CardDescription>
              Track node promotions from Level 1 to Level 0
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page is temporarily under maintenance. The promotion ledger will display
              a comprehensive history of node verifications and promotions to the truth layer.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
