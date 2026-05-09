import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function MFASetup() {
  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Set Up Multi-Factor Authentication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <div className="w-48 h-48 bg-white border border-gray-200 flex items-center justify-center mb-4">
             {/* QR Code Placeholder */}
             <span className="text-xs text-gray-400">QR CODE PLACEHOLDER</span>
          </div>
          <p className="text-sm text-center text-gray-600 max-w-xs">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>
        </div>
        <Button className="w-full">Complete Setup</Button>
      </CardContent>
    </Card>
  );
}
