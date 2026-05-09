import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";

interface SOAPNotes {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface SOAPEditorProps {
  notes: SOAPNotes;
  onChange: (notes: SOAPNotes) => void;
}

const SOAP_SECTIONS = [
  {
    key: "subjective" as keyof SOAPNotes,
    label: "Subjective",
    icon: "💬",
    color: "blue",
    placeholder: "Patient's symptoms, complaints, and history...\n\nExample:\n- Chief complaint\n- History of present illness\n- Past medical history\n- Medications\n- Allergies",
    tips: [
      "Record patient's own words",
      "Include onset, duration, severity",
      "Note relevant medical history",
    ],
  },
  {
    key: "objective" as keyof SOAPNotes,
    label: "Objective",
    icon: "🔬",
    color: "green",
    placeholder: "Physical examination findings and test results...\n\nExample:\n- Vital signs (BP, HR, Temp, RR)\n- Physical exam findings\n- Lab results\n- Imaging results",
    tips: [
      "Record measurable data",
      "Include vital signs",
      "Note physical exam findings",
    ],
  },
  {
    key: "assessment" as keyof SOAPNotes,
    label: "Assessment",
    icon: "🎯",
    color: "yellow",
    placeholder: "Diagnosis and clinical impression...\n\nExample:\n- Primary diagnosis\n- Differential diagnoses\n- Severity assessment\n- Prognosis",
    tips: [
      "State primary diagnosis",
      "List differential diagnoses",
      "Assess severity and prognosis",
    ],
  },
  {
    key: "plan" as keyof SOAPNotes,
    label: "Plan",
    icon: "📋",
    color: "purple",
    placeholder: "Treatment plan and follow-up...\n\nExample:\n- Medications prescribed\n- Tests ordered\n- Referrals\n- Follow-up instructions\n- Patient education",
    tips: [
      "List medications with dosages",
      "Specify follow-up timeline",
      "Include patient instructions",
    ],
  },
];

const TEMPLATES = {
  "Anemia Consultation": {
    subjective: "Patient reports fatigue, weakness, and shortness of breath on exertion for the past 2 weeks. No chest pain or palpitations. History of heavy menstrual periods.",
    objective: "Vital Signs: BP 110/70, HR 88, RR 16, Temp 98.4°F\nGeneral: Pale conjunctiva noted\nCardiovascular: Regular rhythm, no murmurs\nRespiratory: Clear to auscultation bilaterally",
    assessment: "Iron deficiency anemia, likely secondary to menorrhagia\nMild severity based on symptoms",
    plan: "1. Order CBC with differential, iron panel, ferritin\n2. Start ferrous sulfate 325mg PO daily\n3. Dietary counseling - increase iron-rich foods\n4. Follow-up in 2 weeks with lab results\n5. Consider gynecology referral if heavy periods persist",
  },
  "General Check-up": {
    subjective: "Patient presents for annual physical examination. No acute complaints. Feels generally well.",
    objective: "Vital Signs: BP 120/80, HR 72, RR 14, Temp 98.6°F\nGeneral: Well-appearing, no acute distress\nAll systems reviewed and within normal limits",
    assessment: "Healthy adult, no acute issues identified",
    plan: "1. Continue current health maintenance\n2. Age-appropriate screening tests ordered\n3. Return in 1 year for next annual exam\n4. Call with any concerns",
  },
};

export default function SOAPEditor({ notes, onChange }: SOAPEditorProps) {
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["subjective", "objective", "assessment", "plan"])
  );
  const [showTemplates, setShowTemplates] = useState(false);

  const toggleSection = (key: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSections(newExpanded);
  };

  const handleChange = (key: keyof SOAPNotes, value: string) => {
    onChange({ ...notes, [key]: value });
  };

  const applyTemplate = (templateName: string) => {
    const template = TEMPLATES[templateName as keyof typeof TEMPLATES];
    if (template) {
      onChange(template);
      setShowTemplates(false);
    }
  };

  return (
    <div className="p-4 space-y-3">
      {/* Templates Button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <FileText className="w-4 h-4" />{t('components.s_o_a_p_editor.soap_notes', "SOAP Notes")}</h3>
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="text-xs text-[#8B5CF6] hover:text-[#7C3AED] font-medium flex items-center gap-1"
        >
          <Lightbulb className="w-3 h-3" />{t('components.s_o_a_p_editor.templates_1', "Templates")}</button>
      </div>

      {/* Templates Dropdown */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2"
          >
            <p className="text-xs font-semibold text-purple-900">{t('components.s_o_a_p_editor.quick_templates_2', "Quick Templates:")}</p>
            {Object.keys(TEMPLATES).map((templateName) => (
              <button
                key={templateName}
                onClick={() => applyTemplate(templateName)}
                className="w-full text-left px-3 py-2 bg-white hover:bg-purple-100 rounded border border-purple-200 text-xs text-gray-700 transition-colors"
              >
                {templateName}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SOAP Sections */}
      {SOAP_SECTIONS.map((section) => {
        const isExpanded = expandedSections.has(section.key);
        const colorClasses = {
          blue: "bg-blue-50 border-blue-200 text-blue-900",
          green: "bg-green-50 border-green-200 text-green-900",
          yellow: "bg-yellow-50 border-yellow-200 text-yellow-900",
          purple: "bg-purple-50 border-purple-200 text-purple-900",
        };

        return (
          <div key={section.key} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.key)}
              className={`w-full flex items-center justify-between p-3 ${
                colorClasses[section.color as keyof typeof colorClasses]
              } border-b transition-colors`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{section.icon}</span>
                <span className="font-semibold text-sm">{section.label}</span>
                {notes[section.key] && (
                  <span className="text-xs opacity-60">
                    ({notes[section.key].length} chars)
                  </span>
                )}
              </div>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {/* Section Content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 space-y-2">
                    <textarea
                      value={notes[section.key]}
                      onChange={(e) => handleChange(section.key, e.target.value)}
                      placeholder={section.placeholder}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/30 focus:border-[#8B5CF6]"
                    />

                    {/* Tips */}
                    <div className="bg-gray-50 rounded p-2 space-y-1">
                      <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" />{t('components.s_o_a_p_editor.tips_3', "Tips:")}</p>
                      {section.tips.map((tip, idx) => (
                        <p key={idx} className="text-xs text-gray-600 pl-4">
                          • {tip}
                        </p>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
