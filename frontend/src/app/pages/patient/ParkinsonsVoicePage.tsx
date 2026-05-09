import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Activity, AlertCircle, PlayCircle, ArrowLeft, Brain, Heart, ShieldCheck, Stethoscope, ArrowRight } from 'lucide-react';
import { patientAPI } from '@/lib/api';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { AIVoicePulse } from '../../../components/AIVoicePulse';
import Breadcrumb from "@/components/shared/Breadcrumb";

const ParkinsonsVoicePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  interface ParkinsonsResult {
    risk_score: number;
    confidence: number;
    recommendation: string;
  }

  const [result, setResult] = useState<ParkinsonsResult | null>(null);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.start();
      setRecording(true);
      setError('');
      setResult(null);
    } catch (err) {
      setError('Microphone permission denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const uploadAndAnalyze = async () => {
    if (!audioBlob) return;
    setAnalyzing(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'parkinsons_ahhh.webm');
      const response = await patientAPI.analyzeParkinsons(formData);
      setResult(response.data);
    } catch (err) {
      const errorDetail = err instanceof Error && 'response' in err && (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(errorDetail || 'Analysis pipeline failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <motion.div 
      className="container mx-auto p-4 max-w-4xl space-y-6"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    >
      <Breadcrumb />
      
      <Button 
        variant="ghost" 
        onClick={() => navigate("/patient/models")} 
        className="mb-4 text-[#0D9488] hover:text-[#0F766E] hover:bg-[#F0FDFA]"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t("common.back_to_models", "Back to AI Models")}
      </Button>

      <div className="flex items-center gap-3">
        <PlayCircle className="w-8 h-8 text-patient-primary" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("patient.parkinsons.title", "Parkinson's Voice Analysis")}</h1>
      </div>
      
      <p className="text-gray-600 dark:text-gray-300 text-lg">
        {t("patient.parkinsons.description", "Please take a deep breath and say Ahhh as steadily and clearly as possible for 10 seconds. Our AI maps micro-tremors in your vocal frequency.")}
      </p>

      <Card className="p-8 shadow-xl border-t-4 border-t-patient-primary glass-card">
        <div className="flex flex-col items-center gap-6">
          <AIVoicePulse isRecording={recording} scoreCategory="neutral" />

          {!audioBlob && !recording && (
            <Button onClick={startRecording} size="lg" className="rounded-full w-56 h-16 text-lg bg-patient-primary hover:bg-green-700 font-bold shadow-lg">
              <Mic className="w-6 h-6 mr-2" /> {t("common.start_recording", "Start Recording")}
            </Button>
          )}

          {recording && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="flex items-center gap-2 text-red-500 font-bold animate-pulse text-lg">
                {t("patient.parkinsons.recording_hint", "Say Ahhh for 10 seconds...")}
              </div>
              <Button onClick={stopRecording} size="lg" variant="destructive" className="rounded-full w-48 h-12 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                <Square className="w-5 h-5 mr-2" /> {t("common.stop_recording", "Stop Recording")}
              </Button>
            </div>
          )}

          {audioBlob && !analyzing && !recording && (
            <div className="flex flex-col items-center gap-6 w-full mt-4">
              <audio controls src={URL.createObjectURL(audioBlob)} className="w-full max-w-sm rounded-full bg-gray-100 dark:bg-gray-800" />
              <div className="flex gap-4">
                <Button onClick={uploadAndAnalyze} size="lg" className="bg-green-600 hover:bg-green-700 w-56 shadow-lg">
                  <Activity className="w-5 h-5 mr-2" /> {t("common.analyze_tremors", "Analyze Vocal Tremors")}
                </Button>
                <Button onClick={() => setAudioBlob(null)} variant="outline" size="lg" className="w-32">
                  {t("common.retake", "Retake")}
                </Button>
              </div>
            </div>
          )}

          {analyzing && (
            <div className="flex flex-col items-center gap-4 text-patient-primary w-full mt-4">
              <Activity className="w-12 h-12 animate-spin" />
              <p className="font-bold text-lg animate-pulse">{t("patient.parkinsons.analyzing", "Running Vocal Frequency Map...")}</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="w-full max-w-md mt-4">
              <AlertCircle className="w-5 h-5 mr-2" /> {error}
            </Alert>
          )}
        </div>
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="p-8 shadow-2xl glass-card mt-6 bg-gradient-to-tr from-white to-blue-50/30 dark:from-slate-800 dark:to-slate-800">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100 flex items-center gap-2">
                {t("patient.scan.spectrogram_results", "Spectrogram Analysis Results")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-red-50/50 dark:bg-red-900/30 rounded-xl border border-red-100 dark:border-red-800/50">
                  <p className="text-red-800 dark:text-red-300 font-medium mb-2">{t("patient.scan.biomarker_risk", "Biomarker Risk Score")}</p>
                  <p className="text-4xl font-black text-red-900 dark:text-red-100">{(result.risk_score * 100).toFixed(0)}%</p>
                </div>
                <div className="p-6 bg-green-50/50 dark:bg-green-900/30 rounded-xl border border-green-100 dark:border-green-800/50">
                  <p className="text-green-800 dark:text-green-300 font-medium mb-2">{t("patient.scan.ai_confidence", "AI Confidence")}</p>
                  <p className="text-4xl font-black text-green-900 dark:text-red-100">{(result.confidence * 100).toFixed(0)}%</p>
                </div>
                <div className="p-6 bg-blue-50/50 dark:bg-blue-900/30 rounded-xl border border-blue-100 dark:border-blue-800/50 flex flex-col justify-center">
                  <p className="text-blue-800 dark:text-blue-300 font-medium mb-2">{t("patient.scan.recommendation", "Recommendation")}</p>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{result.recommendation}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>


      {/* What is Parkinson's Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <Card className="p-8 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border-none shadow-lg">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-2xl shadow-md flex items-center justify-center flex-shrink-0">
              <Brain className="w-10 h-10 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {t("patient.parkinsons.what_is_title", "What is Parkinson's Disease?")}
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {t("patient.parkinsons.what_is_desc", "Parkinson's disease is a progressive disorder that affects the nervous system and the parts of the body controlled by the nerves. Symptoms start slowly. The first symptom may be a barely noticeable tremor in just one hand. Tremors are common, but the disorder also commonly causes stiffness or slowing of movement. Vocal changes, such as reduced volume and monotone pitch, often appear in the early stages.")}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* WHO Educational Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 pb-12">
        {/* Vocal Biomarkers Section */}
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <Card className="p-6 h-full glass-card border-none shadow-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-600">
              <Brain className="w-6 h-6" />
              {t("patient.parkinsons.vocal_biomarkers", "Common Vocal Symptoms")}
            </h3>
            <div className="space-y-4">
              {[
                { title: t('patient.parkinsons.hypophonia', 'Hypophonia'), desc: t('patient.parkinsons.hypophonia_desc', 'Reduced voice volume or a soft, whisper-like quality. One of the earliest indicators.') },
                { title: t('patient.parkinsons.dysarthria', 'Dysarthria'), desc: t('patient.parkinsons.dysarthria_desc', 'Slurred or slow speech that can be difficult to understand. Caused by muscle weakness.') },
                { title: t('patient.parkinsons.monotone', 'Monotone Speech'), desc: t('patient.parkinsons.monotone_desc', 'Loss of natural inflection and pitch variation. Speech sounds flat and emotionless.') },
              ].map((stage, idx) => (
                <div key={idx} className="p-3 bg-white/50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-indigo-500/30 transition-colors">
                  <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{stage.title}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{stage.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <div className="space-y-6">
          {/* Prevention Section */}
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <Card className="p-6 glass-card border-none shadow-xl bg-gradient-to-br from-indigo-500/5 to-transparent">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-6 h-6" />
                {t("patient.parkinsons.prevention", "Monitoring & Prevention")}
              </h3>
              <ul className="space-y-3">
                {[
                  { icon: Activity, text: t('patient.parkinsons.prev1', 'Regular vocal exercises to maintain speech clarity.') },
                  { icon: Brain, text: t('patient.parkinsons.prev2', 'Maintain cognitive activity through puzzles and social engagement.') },
                  { icon: Heart, text: t('patient.parkinsons.prev3', 'Physical exercise (Aerobic) is linked to neuroprotection.') },
                  { icon: ShieldCheck, text: t('patient.parkinsons.prev4', 'Avoid environmental toxins (Pesticides, heavy metals).') },
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <item.icon className="w-5 h-5 flex-shrink-0 text-indigo-500" />
                    {item.text}
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>

          {/* Standard Treatment Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Card className="p-6 glass-card border-none shadow-xl bg-gradient-to-br from-purple-500/5 to-transparent">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Stethoscope className="w-6 h-6" />
                {t("patient.parkinsons.treatments", "Therapeutic Interventions")}
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-start gap-4 p-4 bg-purple-500/10 rounded-xl">
                  <ArrowRight className="w-5 h-5 text-purple-500 mt-1" />
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">{t('patient.parkinsons.treat1', 'LSVT LOUD® Therapy')}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('patient.parkinsons.treat1_desc', 'Evidence-based speech treatment to improve vocal loudness and clarity.')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-blue-500/10 rounded-xl">
                  <ArrowRight className="w-5 h-5 text-blue-500 mt-1" />
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">{t('patient.parkinsons.treat2', 'Dopaminergic Medication')}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('patient.parkinsons.treat2_desc', 'Levodopa and other medications to manage motor and vocal symptoms.')}</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default ParkinsonsVoicePage;

