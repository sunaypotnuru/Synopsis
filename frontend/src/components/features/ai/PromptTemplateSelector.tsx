/**
 * Prompt Template Selector Component
 * 
 * Allows selection of pre-defined prompt templates for common medical scenarios
 * Features:
 * - Template categories
 * - Template preview
 * - Variable substitution
 * - Quick selection
 */

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Search, ChevronRight } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  prompt: string;
  variables?: string[];
}

interface PromptTemplateSelectorProps {
  onSelect: (templateId: string, prompt: string) => void;
}

const TEMPLATES: Template[] = [
  {
    id: 'symptom-analysis',
    name: 'Symptom Analysis',
    category: 'Diagnosis',
    description: 'Analyze patient symptoms and suggest possible conditions',
    prompt: 'Please analyze the following symptoms and provide:\n1. Possible conditions\n2. Recommended tests\n3. Urgency level\n4. Next steps\n\nSymptoms: ',
  },
  {
    id: 'differential-diagnosis',
    name: 'Differential Diagnosis',
    category: 'Diagnosis',
    description: 'Generate differential diagnosis based on symptoms',
    prompt: 'Generate a differential diagnosis for a patient presenting with:\n\nChief Complaint: \nSymptoms: \nDuration: \nMedical History: \n\nPlease provide:\n1. Top 3-5 differential diagnoses\n2. Key distinguishing features\n3. Recommended diagnostic workup',
  },
  {
    id: 'medication-review',
    name: 'Medication Review',
    category: 'Treatment',
    description: 'Review medication interactions and contraindications',
    prompt: 'Review the following medications for:\n1. Drug interactions\n2. Contraindications\n3. Dosage appropriateness\n4. Alternative options\n\nCurrent Medications: ',
  },
  {
    id: 'treatment-plan',
    name: 'Treatment Plan',
    category: 'Treatment',
    description: 'Generate comprehensive treatment plan',
    prompt: 'Create a treatment plan for:\n\nDiagnosis: \nPatient Age: \nComorbidities: \n\nInclude:\n1. First-line treatment\n2. Alternative options\n3. Monitoring parameters\n4. Follow-up schedule\n5. Patient education points',
  },
  {
    id: 'lab-interpretation',
    name: 'Lab Result Interpretation',
    category: 'Diagnostics',
    description: 'Interpret laboratory test results',
    prompt: 'Interpret the following lab results:\n\nTest Results: \n\nProvide:\n1. Clinical significance\n2. Possible causes of abnormalities\n3. Recommended follow-up tests\n4. Clinical correlation needed',
  },
  {
    id: 'patient-education',
    name: 'Patient Education',
    category: 'Education',
    description: 'Generate patient education material',
    prompt: 'Create patient education material about:\n\nCondition: \n\nInclude:\n1. What is this condition?\n2. Causes and risk factors\n3. Symptoms to watch for\n4. Treatment options\n5. Lifestyle modifications\n6. When to seek medical help\n\nUse simple, patient-friendly language.',
  },
  {
    id: 'referral-letter',
    name: 'Referral Letter',
    category: 'Documentation',
    description: 'Draft specialist referral letter',
    prompt: 'Draft a referral letter to:\n\nSpecialty: \nReason for Referral: \nRelevant History: \nCurrent Management: \n\nInclude:\n1. Clinical summary\n2. Specific questions for specialist\n3. Urgency level\n4. Relevant investigations',
  },
  {
    id: 'discharge-summary',
    name: 'Discharge Summary',
    category: 'Documentation',
    description: 'Generate discharge summary',
    prompt: 'Generate a discharge summary for:\n\nAdmission Date: \nDischarge Date: \nPrimary Diagnosis: \nProcedures: \nCourse in Hospital: \n\nInclude:\n1. Hospital course\n2. Discharge medications\n3. Follow-up instructions\n4. Warning signs\n5. Activity restrictions',
  },
];

export function PromptTemplateSelector({ onSelect }: PromptTemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(TEMPLATES.map((t) => t.category)))];

  // Filter templates
  const filteredTemplates = TEMPLATES.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Prompt Templates</h3>
        <p className="text-sm text-gray-600">
          Select a template to quickly start a consultation
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search templates..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:border-purple-400 focus:ring-2 focus:ring-purple-200 outline-none text-sm"
        />
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
        {filteredTemplates.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No templates found</p>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => onSelect(template.id, template.prompt)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">
                      {template.name}
                    </h4>
                    <span className="text-xs text-gray-500">{template.category}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">
                {template.description}
              </p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
