import { useState, useEffect, useCallback } from "react";
import {
  X, Save, Sparkles, Copy, Download,
  ChevronDown, ChevronUp, Mic, MicOff
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SOAPEditor from "../domain/SOAPEditor";
import api from "@/lib/api";
import { useTranslation } from "react-i18next";

interface ScribePanelProps {
  appointmentId: string;
  patientId: string;
  patientName: string;
  onClose: () => void;
}

interface SOAPNotes {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export default function ScribePanel({ appointmentId, patientId = '', patientName, onClose }: ScribePanelProps) {
  const { t } = useTranslation();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [soapNotes, setSOAPNotes] = useState<SOAPNotes>({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Load existing SOAP notes on mount
  const loadExistingNotes = useCallback(async () => {
    try {
      const response = await api.get(`/api/v1/scribe/notes/${appointmentId}`);
      if (response.data.found) {
        const data = response.data.data;
        setSOAPNotes({
          subjective: data.subjective || "",
          objective: data.objective || "",
          assessment: data.assessment || "",
          plan: data.plan || "",
        });
        setTranscript(data.transcript || "");
        setAutoSaveStatus("saved");
      }
    } catch (error) {
      console.error("Failed to load existing notes:", error);
    }
  }, [appointmentId]);

  useEffect(() => {
    loadExistingNotes();
  }, [loadExistingNotes]);

  // Auto-save every 30 seconds
  const handleSave = useCallback(async (isAutoSave = false) => {
    setAutoSaveStatus("saving");

    try {
      await api.post('/api/v1/scribe/save', {
        appointment_id: appointmentId,
        patient_id: patientId || '',
        subjective: soapNotes.subjective,
        objective: soapNotes.objective,
        assessment: soapNotes.assessment,
        plan: soapNotes.plan,
        transcript: transcript,
        is_ai_generated: false,
      });

      setAutoSaveStatus("saved");
      setLastSaved(new Date());

      if (!isAutoSave) {
        toast.success("SOAP notes saved successfully");
      }
    } catch (error) {
      setAutoSaveStatus("unsaved");
      toast.error("Failed to save notes");
      console.error("Save error:", error);
    }
  }, [appointmentId, patientId, soapNotes, transcript]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (autoSaveStatus === "unsaved") {
        handleSave(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoSaveStatus, handleSave]);

  // Mark as unsaved when notes change
  useEffect(() => {
    setAutoSaveStatus("unsaved");
  }, [soapNotes]);

  const handleAIAssist = async () => {
    if (!transcript.trim()) {
      toast.error("No transcript available for AI analysis");
      return;
    }

    setIsAnalyzing(true);
    toast.info("AI is analyzing the conversation...");

    try {
      const response = await api.post('/api/v1/scribe/analyze', {
        transcript: transcript,
        patient_context: `Patient: ${patientName}`
      });

      setSOAPNotes({
        subjective: response.data.subjective || "",
        objective: response.data.objective || "",
        assessment: response.data.assessment || "",
        plan: response.data.plan || "",
      });

      toast.success("AI analysis complete!");
    } catch (error) {
      toast.error("AI analysis failed");
      console.error("AI analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      toast.success("Recording stopped");
    } else {
      // Start recording
      setIsRecording(true);
      toast.success("Recording started");

      // Simulate transcription
      setTimeout(() => {
        setTranscript(prev => prev + "\nDoctor: How are you feeling today?\nPatient: I've been feeling very tired lately and having headaches.");
      }, 3000);
    }
  };

  const handleCopyNotes = () => {
    const notesText = `SOAP Notes for ${patientName}\n\nSubjective:\n${soapNotes.subjective}\n\nObjective:\n${soapNotes.objective}\n\nAssessment:\n${soapNotes.assessment}\n\nPlan:\n${soapNotes.plan}`;
    navigator.clipboard.writeText(notesText);
    toast.success("Notes copied to clipboard");
  };

  const handleExportPDF = async () => {
    if (!soapNotes.subjective && !soapNotes.objective && !soapNotes.assessment && !soapNotes.plan) {
      toast.error("No SOAP notes to export");
      return;
    }

    try {
      toast.info("Generating PDF...");
      
      // Import jsPDF dynamically
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('SOAP Notes', 20, 20);
      
      // Add patient info if available
      doc.setFontSize(12);
      doc.text(`Patient: ${patientName}`, 20, 30);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 40);
      
      let yPosition = 55;
      
      // Add SOAP sections
      const sections = [
        { title: 'SUBJECTIVE', content: soapNotes.subjective },
        { title: 'OBJECTIVE', content: soapNotes.objective },
        { title: 'ASSESSMENT', content: soapNotes.assessment },
        { title: 'PLAN', content: soapNotes.plan }
      ];
      
      sections.forEach(section => {
        if (section.content) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(section.title, 20, yPosition);
          yPosition += 10;
          
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(section.content, 170);
          doc.text(lines, 20, yPosition);
          yPosition += lines.length * 5 + 10;
        }
      });
      
      // Save the PDF
      doc.save(`soap-notes-${patientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF exported successfully");
      
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error("Failed to export PDF");
    }
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className={`fixed right-0 top-16 bottom-0 bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col ${isMinimized ? "w-16" : "w-96"
        }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED]">
        <div className="flex items-center gap-2">
          {!isMinimized && (
            <>
              <Sparkles className="w-5 h-5 text-white" />
              <div>
                <h3 className="font-semibold text-white">{t('components.scribe_panel.ai_scribe', "AI Scribe")}</h3>
                <p className="text-xs text-white/80">{patientName}</p>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            {isMinimized ? (
              <ChevronUp className="w-5 h-5 text-white" />
            ) : (
              <ChevronDown className="w-5 h-5 text-white" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Auto-save Status */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              {autoSaveStatus === "saving" && (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  <span className="text-gray-600">{t('components.scribe_panel.saving_1', "Saving...")}</span>
                </>
              )}
              {autoSaveStatus === "saved" && (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-gray-600">
                    Saved {lastSaved ? `at ${lastSaved.toLocaleTimeString()}` : ""}
                  </span>
                </>
              )}
              {autoSaveStatus === "unsaved" && (
                <>
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  <span className="text-gray-600">{t('components.scribe_panel.unsaved_changes_2', "Unsaved changes")}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleRecording}
                className={`p-1 rounded transition-colors ${isRecording
                    ? "bg-red-500 text-white animate-pulse"
                    : "hover:bg-gray-200 text-gray-600"
                  }`}
                title={isRecording ? "Stop recording" : "Start recording"}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Transcript Section */}
          {transcript && (
            <div className="p-4 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700">{t('components.scribe_panel.live_transcript_3', "Live Transcript")}</h4>
                <Button
                  size="sm"
                  onClick={handleAIAssist}
                  disabled={isAnalyzing || !transcript.trim()}
                  className="bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {isAnalyzing ? "Analyzing..." : "AI Analyze"}
                </Button>
              </div>
              <div className="text-xs text-gray-600 max-h-32 overflow-y-auto bg-white p-2 rounded border border-blue-200">
                {transcript}
              </div>
            </div>
          )}

          {/* SOAP Notes Editor */}
          <div className="flex-1 overflow-y-auto">
            <SOAPEditor notes={soapNotes} onChange={setSOAPNotes} />
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
            <Button
              onClick={() => handleSave(false)}
              disabled={autoSaveStatus === "saved"}
              className="w-full bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white"
            >
              <Save className="w-4 h-4 mr-2" />{t('components.scribe_panel.save_notes_4', "Save Notes")}</Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyNotes}
                className="text-xs"
              >
                <Copy className="w-3 h-3 mr-1" />{t('components.scribe_panel.copy_5', "Copy")}</Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                className="text-xs"
              >
                <Download className="w-3 h-3 mr-1" />{t('components.scribe_panel.export_pdf_6', "Export PDF")}</Button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
