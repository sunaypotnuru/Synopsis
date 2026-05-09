/**
 * Context Viewer Component
 * 
 * Displays patient context and conversation history for AI consultations
 * Features:
 * - Patient demographics
 * - Medical history
 * - Current medications
 * - Allergies
 * - Recent lab results
 * - Collapsible sections
 */

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  User,
  Calendar,
  Heart,
  Pill,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface ContextViewerProps {
  context?: {
    age?: number;
    gender?: string;
    medical_history?: string[];
    current_medications?: string[];
    allergies?: string[];
    recent_labs?: Array<{
      test: string;
      value: string;
      date: string;
    }>;
  };
}

interface SectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Icon className="w-4 h-4 text-purple-600" />
          </div>
          <span className="font-semibold text-gray-900 text-sm">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export function ContextViewer({ context }: ContextViewerProps) {
  if (!context) {
    return (
      <div className="p-8 text-center text-gray-400">
        <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No patient context available</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 bg-purple-50 border-b border-purple-200">
        <h3 className="text-lg font-bold text-gray-900">Patient Context</h3>
        <p className="text-xs text-gray-600 mt-1">
          Information used for AI consultation
        </p>
      </div>

      <div>
        {/* Demographics */}
        <CollapsibleSection title="Demographics" icon={User}>
          <div className="space-y-2 text-sm">
            {context.age && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Age</span>
                <span className="font-medium text-gray-900">{context.age} years</span>
              </div>
            )}
            {context.gender && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Gender</span>
                <span className="font-medium text-gray-900 capitalize">
                  {context.gender}
                </span>
              </div>
            )}
            {!context.age && !context.gender && (
              <p className="text-xs text-gray-400 italic">No demographic data</p>
            )}
          </div>
        </CollapsibleSection>

        {/* Medical History */}
        <CollapsibleSection title="Medical History" icon={Heart}>
          {context.medical_history && context.medical_history.length > 0 ? (
            <ul className="space-y-2">
              {context.medical_history.map((condition, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-1.5 flex-shrink-0" />
                  {condition}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 italic">No medical history recorded</p>
          )}
        </CollapsibleSection>

        {/* Current Medications */}
        <CollapsibleSection title="Current Medications" icon={Pill}>
          {context.current_medications && context.current_medications.length > 0 ? (
            <ul className="space-y-2">
              {context.current_medications.map((medication, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <Pill className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  {medication}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 italic">No current medications</p>
          )}
        </CollapsibleSection>

        {/* Allergies */}
        <CollapsibleSection title="Allergies" icon={AlertCircle}>
          {context.allergies && context.allergies.length > 0 ? (
            <ul className="space-y-2">
              {context.allergies.map((allergy, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-2 rounded-lg"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {allergy}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 italic">No known allergies</p>
          )}
        </CollapsibleSection>

        {/* Recent Lab Results */}
        {context.recent_labs && context.recent_labs.length > 0 && (
          <CollapsibleSection title="Recent Lab Results" icon={FileText} defaultOpen={false}>
            <div className="space-y-3">
              {context.recent_labs.map((lab, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {lab.test}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(lab.date).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700">{lab.value}</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>

      {/* Footer Note */}
      <div className="p-4 bg-amber-50 border-t border-amber-200">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            This context is automatically included in AI consultations to provide
            personalized recommendations.
          </p>
        </div>
      </div>
    </div>
  );
}
