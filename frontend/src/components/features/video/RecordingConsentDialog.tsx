/**
 * Recording Consent Dialog Component
 * 
 * HIPAA-compliant recording consent dialog
 * All participants must consent before recording can start
 */

import React, { useState } from 'react';
import { videoAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Video, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface RecordingConsentDialogProps {
  consultationId: string;
  onConsent: () => void;
  onDecline: () => void;
}

export function RecordingConsentDialog({
  consultationId,
  onConsent,
  onDecline,
}: RecordingConsentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRead, setHasRead] = useState(false);

  /**
   * Submit consent
   */
  const submitConsent = async (consentGiven: boolean) => {
    setIsSubmitting(true);

    try {
      await videoAPI.submitRecordingConsent(consultationId, {
        consent_given: consentGiven,
      });

      if (consentGiven) {
        onConsent();
      } else {
        onDecline();
      }
    } catch (err) {
      console.error('Failed to submit consent:', err);
      alert('Failed to submit consent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full">
            <Video className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Recording Consent Required
            </h2>
            <p className="text-sm text-gray-600">
              HIPAA-Compliant Consent Form
            </p>
          </div>
        </div>

        {/* Important Notice */}
        <Card className="p-4 bg-yellow-50 border-yellow-200 mb-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-900">
                Important: Recording Consent
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                This video consultation will be recorded for medical documentation and quality assurance purposes. All participants must consent before the recording can begin.
              </p>
            </div>
          </div>
        </Card>

        {/* Consent Information */}
        <div className="space-y-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              What You're Consenting To:
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Video and Audio Recording</p>
                  <p className="text-sm text-gray-600">
                    The entire consultation, including video and audio, will be recorded
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Medical Documentation</p>
                  <p className="text-sm text-gray-600">
                    Recording will be part of your medical record
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Secure Storage</p>
                  <p className="text-sm text-gray-600">
                    Recording will be encrypted and stored securely for 7 years (HIPAA requirement)
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Limited Access</p>
                  <p className="text-sm text-gray-600">
                    Only authorized healthcare providers and administrators can access the recording
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Your Rights:
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>You can decline consent and continue without recording</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>You can request access to the recording at any time</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>You can request deletion of the recording (subject to legal requirements)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>You can revoke consent during the consultation (recording will stop immediately)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* HIPAA Compliance */}
        <Card className="p-4 bg-blue-50 border-blue-200 mb-6">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                HIPAA Compliance
              </p>
              <p className="text-sm text-blue-700 mt-1">
                This recording process complies with HIPAA regulations. Your protected health information (PHI) will be handled according to federal privacy laws.
              </p>
            </div>
          </div>
        </Card>

        {/* Confirmation Checkbox */}
        <label className="flex items-start space-x-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={hasRead}
            onChange={(e) => setHasRead(e.target.checked)}
            className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            I have read and understood the recording consent information above. I understand my rights and the purposes for which the recording will be used.
          </span>
        </label>

        {/* Actions */}
        <div className="flex space-x-3">
          <Button
            onClick={() => submitConsent(false)}
            variant="outline"
            className="flex-1"
            disabled={isSubmitting}
          >
            Decline Recording
          </Button>
          <Button
            onClick={() => submitConsent(true)}
            className="flex-1"
            disabled={!hasRead || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'I Consent to Recording'}
          </Button>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-gray-500 text-center mt-4">
          By clicking "I Consent to Recording", you acknowledge that you have read and agree to the terms above.
        </p>
      </Card>
    </div>
  );
}
