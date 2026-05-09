import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function MFAEnforcement() {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>MFA Required</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Your organization requires Multi-Factor Authentication for this account.
        </p>
        <Button className="w-full">Set up MFA now</Button>
      </CardContent>
    </Card>
  );
}
