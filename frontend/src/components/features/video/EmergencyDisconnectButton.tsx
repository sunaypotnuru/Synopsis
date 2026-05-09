/**
 * Emergency Disconnect Button Component
 * 
 * Allows immediate termination of video call in emergency situations
 */

import React, { useState } from 'react';
import { videoAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, X } from 'lucide-react';

interface EmergencyDisconnectButtonProps {
  consultationId: string;
  onDisconnect: () => void;
}

export function EmergencyDisconnectButton({
  consultationId,
  onDisconnect,
}: EmergencyDisconnectButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons = [
    { value: 'medical_emergency', label: 'Medical Emergency', severity: 'critical' },
    { value: 'technical_failure', label: 'Technical Failure', severity: 'high' },
    { value: 'security_concern', label: 'Security Concern', severity: 'high' },
    { value: 'patient_distress', label: 'Patient Distress', severity: 'medium' },
    { value: 'inappropriate_behavior', label: 'Inappropriate Behavior', severity: 'high' },
    { value: 'other', label: 'Other', severity: 'low' },
  ];

  const handleEmergencyDisconnect = async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);
    try {
      await videoAPI.initiateEmergencyDisconnect(consultationId, {
        reason: selectedReason as any,
        description: description || undefined,
      });
      onDisconnect();
    } catch (err) {
      console.error('Failed to initiate emergency disconnect:', err);
      alert('Failed to disconnect. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showDialog) {
    return (
      <Button
        onClick={() => setShowDialog(true)}
        variant="destructive"
        size="lg"
        className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
        title="Emergency Disconnect"
      >
        <AlertTriangle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Emergency Disconnect</h2>
          <button
            onClick={() => setShowDialog(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          This will immediately end the consultation and log the incident. Please select a reason:
        </p>

        <div className="space-y-2 mb-4">
          {reasons.map((reason) => (
            <label
              key={reason.value}
              className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <input
                type="radio"
                name="reason"
                value={reason.value}
                checked={selectedReason === reason.value}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="mr-3"
              />
              <span className="flex-1">{reason.label}</span>
              <span className={`text-xs px-2 py-1 rounded ${
                reason.severity === 'critical' ? 'bg-red-100 text-red-700' :
                reason.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                reason.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {reason.severity}
              </span>
            </label>
          ))}
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional details (optional)"
          className="w-full p-3 border rounded-lg mb-4"
          rows={3}
        />

        <div className="flex space-x-3">
          <Button
            onClick={() => setShowDialog(false)}
            variant="outline"
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEmergencyDisconnect}
            variant="destructive"
            className="flex-1"
            disabled={!selectedReason || isSubmitting}
          >
            {isSubmitting ? 'Disconnecting...' : 'Disconnect Now'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
