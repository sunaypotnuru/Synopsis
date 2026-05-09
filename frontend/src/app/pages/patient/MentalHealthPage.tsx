import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { patientAPI } from '@/lib/api';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Mic, Square, Activity, AlertCircle, CheckCircle2, ChevronRight, FileText, Phone, Shield, Clock, TrendingUp, Brain, ArrowLeft, Heart, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AIVoicePulse } from '../../../components/AIVoicePulse';
import Breadcrumb from "@/components/shared/Breadcrumb";

// Mock historical data for Recharts
const mockHistory = [
  { day: 'Mon', depression: 40, anxiety: 30, stress: 35 },
  { day: 'Tue', depression: 45, anxiety: 35, stress: 38 },
  { day: 'Wed', depression: 35, anxiety: 25, stress: 30 },
  { day: 'Thu', depression: 30, anxiety: 20, stress: 28 },
  { day: 'Fri', depression: 25, anxiety: 45, stress: 50 },
  { day: 'Sat', depression: 20, anxiety: 15, stress: 20 },
  { day: 'Sun', depression: 15, anxiety: 10, stress: 15 },
];

const MentalHealthPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  interface MentalHealthResult {
    transcription: string;
    transcription_confidence: number;
    depression_score: number;
    anxiety_score: number;
    stress_score: number;
    confidence: number;
    risk_level: string;
    risk_score: number;
    crisis_detected: boolean;
    crisis_message?: string;
    hotlines?: Array<{ name: string; number: string; description: string }>;
    immediate_steps?: string[];
    coping_strategy: string;
    processing_time_seconds: number;
  }

  const [result, setResult] = useState<MentalHealthResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState(mockHistory);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [chunks, setChunks] = useState<Blob[]>([]);

  // Load history from timeline
  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await patientAPI.getTimeline({ event_type: 'mental' });
      if (response.data && response.data.records) {
        // Filter out demo data and parse mental health details
        const realRecords = response.data.records.filter((r: { id: string }) => !r.id.startsWith('demo-'));
        
        if (realRecords.length > 0) {
          const chartData = realRecords.map((r: { details?: string; date: string }) => {
            // details format: "Depression: 25% | Anxiety: 30% | Stress: 35%"
            const depMatch = r.details?.match(/Depression: (\d+)%/);
            const anxMatch = r.details?.match(/Anxiety: (\d+)%/);
            const stressMatch = r.details?.match(/Stress: (\d+)%/);
            
            return {
              day: r.date.split(',')[0], // e.g. "May 05"
              depression: depMatch ? parseInt(depMatch[1]) : 0,
              anxiety: anxMatch ? parseInt(anxMatch[1]) : 0,
              stress: stressMatch ? parseInt(stressMatch[1]) : 0,
              fullDate: r.date
            };
          }).reverse(); // Chronological order for chart
          
          setHistory(chartData);
        }
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  React.useEffect(() => {
    loadHistory();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const newChunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => newChunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(newChunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      setMediaRecorder(recorder);
      setChunks(newChunks);
      recorder.start();
      setRecording(true);
      setError('');
      setResult(null);
    } catch (err) {
      setError(t('mentalHealth.micPermissionError', 'Microphone permission denied.'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const uploadAndAnalyze = async () => {
    if (!audioBlob) return;
    setAnalyzing(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      
      // Call the backend API which proxies to the mental health service
      const response = await patientAPI.analyzeMentalHealth(formData);
      
      setResult(response.data);
      
      // Reload history after successful scan
      await loadHistory();
    } catch (err) {
      console.error('Analysis error:', err);
      let errorMessage = 'Analysis failed. ';
      
      if (err instanceof Error && (err.message?.includes('Failed to fetch') || ('response' in err && (err as { response?: { status?: number } }).response?.status === 404))) {
        errorMessage += 'Mental health analysis service is currently unavailable. Please try again later.';
      } else if (err instanceof Error) {
        const errorDetail = 'response' in err && (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
        errorMessage += errorDetail || err.message || 'Unknown error occurred';
      } else {
        errorMessage += 'Unknown error occurred';
      }
      
      setError(errorMessage);
    } finally {
      setAnalyzing(false);
      setAudioBlob(null); // Reset blob after analysis to keep the flow pristine
    }
  };

  const getMoodColor = () => {
    if (!result) return 'neutral';
    if (result.anxiety_score > 0.6 || result.depression_score > 0.6) return 'anxious';
    return 'calm';
  };

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 197, 94, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 197, 94, 0.5);
        }
      `}</style>
      <motion.div 
        className="container mx-auto p-4 max-w-5xl space-y-6"
        initial="hidden" animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
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
        <Activity className="w-8 h-8 text-patient-primary" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('mentalHealth.title', 'Clinical Voice Triage')}
        </h1>
      </div>
      
      <p className="text-gray-600 dark:text-gray-300 text-lg">
        {t('mentalHealth.description', 'Our conversational AI guides you through validated clinical assessments (PHQ-9 & GAD-7) simply by listening to your voice.')}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Voice Interaction UI */}
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Card className="p-8 shadow-lg border-t-4 border-t-patient-primary glass-card h-full flex flex-col justify-center relative overflow-hidden">
            
            <div className="flex flex-col items-center gap-8 z-10">
              <AIVoicePulse isRecording={recording} scoreCategory={getMoodColor()} />
              
              <div className="text-center h-12">
                {!recording && !audioBlob && !analyzing && (
                   <p className="text-gray-500 font-medium">Click start and say, "I've been feeling..."</p>
                )}
                {recording && (
                   <p className="text-patient-primary font-bold animate-pulse">Listening securely...</p>
                )}
                {audioBlob && !analyzing && (
                   <p className="text-green-600 font-medium">Recording saved. Ready to analyze.</p>
                )}
                {analyzing && (
                   <p className="text-blue-500 font-bold animate-pulse">Transcribing & Analyzing with Clinical AI...</p>
                )}
              </div>

              {!audioBlob && !recording && !analyzing && (
                <Button onClick={startRecording} size="lg" className="rounded-full w-48 h-16 text-lg bg-patient-primary hover:bg-green-700 flex items-center justify-center gap-2">
                  <Mic className="w-6 h-6" /> {t('mentalHealth.start', 'Start Check-in')}
                </Button>
              )}

              {recording && (
                <Button onClick={stopRecording} size="lg" variant="destructive" className="rounded-full w-48 h-16 text-lg flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all">
                  <Square className="w-6 h-6" /> {t('common.stop', 'Finish')}
                </Button>
              )}

              {audioBlob && !analyzing && !recording && (
                <div className="flex gap-4">
                  <Button onClick={uploadAndAnalyze} size="lg" className="bg-green-600 hover:bg-green-700 w-40">
                     Analyze Voice
                  </Button>
                  <Button onClick={() => setAudioBlob(null)} variant="outline" size="lg" className="w-32 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-300">
                    Discard
                  </Button>
                </div>
              )}

              {error && (
                <Alert variant="destructive" className="w-full flex items-center gap-2 bg-red-50/90 dark:bg-red-900/40">
                  <AlertCircle className="w-5 h-5" /> {error}
                </Alert>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Right Column: Dynamic Analysis / Active Transcript */}
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Card className="p-8 shadow-lg bg-gradient-to-br from-green-50/50 to-white dark:from-slate-800 dark:to-slate-900 h-full border border-gray-100 dark:border-gray-800 glass-card">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-patient-primary" /> Session Insights
            </h2>
            
            <AnimatePresence mode="wait">
              {!result && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-64 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl"
                >
                  <p>Your transcribed clinical notes will appear here.</p>
                </motion.div>
              )}
              
              {result && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar"
                >
                  {/* Crisis Alert Banner */}
                  {result.crisis_detected && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 bg-red-50 dark:bg-red-900/30 rounded-xl border-2 border-red-500 shadow-lg"
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h3 className="font-bold text-red-900 dark:text-red-100 text-lg mb-2">
                            {result.risk_level} Risk Detected
                          </h3>
                          <p className="text-red-800 dark:text-red-200 mb-4">
                            {result.crisis_message}
                          </p>
                          
                          {/* Hotlines */}
                          {result.hotlines && result.hotlines.length > 0 && (
                            <div className="space-y-2 mb-4">
                              <p className="font-semibold text-red-900 dark:text-red-100 flex items-center gap-2">
                                <Phone className="w-4 h-4" /> Crisis Hotlines (24/7):
                              </p>
                              {result.hotlines.map((hotline, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded-lg">
                                  <p className="font-bold text-gray-900 dark:text-white">{hotline.name}</p>
                                  <p className="text-lg font-mono text-red-600 dark:text-red-400">{hotline.number}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{hotline.description}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Immediate Steps */}
                          {result.immediate_steps && result.immediate_steps.length > 0 && (
                            <div>
                              <p className="font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Immediate Steps:
                              </p>
                              <ul className="space-y-1">
                                {result.immediate_steps.map((step, idx) => (
                                  <li key={idx} className="text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
                                    <span className="text-red-600 dark:text-red-400 mt-0.5">•</span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Risk Level Badge */}
                  <div className="flex items-center justify-between">
                    <div className={`px-4 py-2 rounded-full font-bold text-sm ${
                      result.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' :
                      result.risk_level === 'HIGH' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200' :
                      result.risk_level === 'MODERATE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' :
                      'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                    }`}>
                      Risk Level: {result.risk_level}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      {result.processing_time_seconds}s
                    </div>
                  </div>

                  {/* Transcription */}
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                     <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                       <FileText className="w-4 h-4" /> Transcription
                       <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                         {(result.transcription_confidence * 100).toFixed(0)}% confidence
                       </span>
                     </p>
                     <p className="text-gray-800 dark:text-gray-200 italic">"{result.transcription}"</p>
                  </div>
                  
                  {/* Mental Health Scores */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-100 dark:border-blue-800/50">
                      <p className="text-xs text-blue-600 dark:text-blue-300 mb-1">Depression</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{(result.depression_score * 100).toFixed(0)}%</p>
                    </div>
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-100 dark:border-amber-800/50">
                      <p className="text-xs text-amber-600 dark:text-amber-300 mb-1">Anxiety</p>
                      <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{(result.anxiety_score * 100).toFixed(0)}%</p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl border border-purple-100 dark:border-purple-800/50">
                      <p className="text-xs text-purple-600 dark:text-purple-300 mb-1">Stress</p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{(result.stress_score * 100).toFixed(0)}%</p>
                    </div>
                  </div>

                  {/* Overall Confidence */}
                  <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-100 dark:border-green-800/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Brain className="w-4 h-4" /> Analysis Confidence
                      </span>
                      <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {(result.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${result.confidence * 100}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                      />
                    </div>
                  </div>

                  {/* Coping Strategy */}
                  <div className="p-5 bg-patient-primary/10 rounded-xl border border-patient-primary/20">
                     <p className="text-sm font-bold text-patient-primary mb-2 flex items-center gap-2">
                       <CheckCircle2 className="w-4 h-4"/> Recommended Coping Strategy
                     </p>
                     <p className="text-gray-700 dark:text-gray-200">{result.coping_strategy}</p>
                  </div>

                  {/* Risk Score Visualization */}
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> Risk Assessment Score
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${result.risk_score}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={`h-full ${
                              result.risk_score >= 30 ? 'bg-red-500' :
                              result.risk_score >= 20 ? 'bg-orange-500' :
                              result.risk_score >= 10 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                          />
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {result.risk_score}/100
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </div>

      {/* WHO Educational Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 pb-12">
        {/* Mental Health Scales Section */}
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <Card className="p-6 h-full glass-card border-none shadow-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-600">
              <Brain className="w-6 h-6" />
              {t("patient.mental.who_guidelines", "WHO Mental Health Criteria")}
            </h3>
            <div className="space-y-4">
              {[
                { title: t('patient.mental.depression', 'Clinical Depression'), desc: t('patient.mental.depression_desc', 'Characterized by persistent sadness and a lack of interest or pleasure in previously rewarding or enjoyable activities.') },
                { title: t('patient.mental.anxiety', 'Anxiety Disorders'), desc: t('patient.mental.anxiety_desc', 'Excessive fear and worry and related behavioral disturbances. Symptoms are severe enough to cause significant distress.') },
                { title: t('patient.mental.stress', 'Stress Management'), desc: t('patient.mental.stress_desc', 'A state of mental or emotional strain resulting from adverse or very demanding circumstances.') },
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
          {/* Wellness Tips Section */}
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <Card className="p-6 glass-card border-none shadow-xl bg-gradient-to-br from-indigo-500/5 to-transparent">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Heart className="w-6 h-6" />
                {t("patient.mental.wellness_tips", "Daily Wellness Strategies")}
              </h3>
              <ul className="space-y-3">
                {[
                  { icon: CheckCircle2, text: t('patient.mental.tip1', 'Maintain a regular sleep schedule (7-9 hours).') },
                  { icon: Activity, text: t('patient.mental.tip2', 'Practice 30 minutes of daily physical movement.') },
                  { icon: Brain, text: t('patient.mental.tip3', 'Engage in mindfulness or meditation for 10 minutes.') },
                  { icon: Activity, text: t('patient.mental.tip4', 'Stay connected with friends and family regularly.') },
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <item.icon className="w-5 h-5 flex-shrink-0 text-indigo-500" />
                    {item.text}
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>

          {/* Crisis Help Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Card className="p-6 glass-card border-none shadow-xl bg-gradient-to-br from-rose-500/5 to-transparent border-l-4 border-l-rose-500">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-6 h-6" />
                {t("patient.mental.crisis_support", "Immediate Crisis Support")}
              </h3>
              <div className="p-4 bg-rose-500/10 rounded-xl">
                 <p className="text-sm font-bold text-rose-700 dark:text-rose-300 mb-2">
                   {t('patient.mental.need_help', "If you are in immediate danger or feeling suicidal:")}
                 </p>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase">National Helpline</p>
                      <p className="text-lg font-black text-rose-600">988</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase">Text Support</p>
                      <p className="text-lg font-black text-rose-600">HOME to 741741</p>
                    </div>
                 </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Bottom Section: Progress Tracking */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6 glass-card shadow-md mt-6 mb-12">
           <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center">
             {t("patient.mental.historical_progression", "Historical Progression")} <ChevronRight className="w-4 h-4 ml-1 opacity-50"/> 
           </h2>
           
           <div className="h-[300px] w-full relative">
             {loadingHistory ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 rounded-xl">
                 <Activity className="w-10 h-10 text-patient-primary animate-spin mb-2" />
                 <p className="text-gray-500 font-medium">Loading clinical history...</p>
               </div>
             ) : history.length === 0 ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                 <TrendingUp className="w-12 h-12 mb-2 opacity-20" />
                 <p>No historical screenings found.</p>
               </div>
             ) : null}
             
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={history} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                 <XAxis dataKey="day" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                 <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                 <Tooltip 
                   contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                 />
                 <Line type="monotone" dataKey="depression" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Depression" />
                 <Line type="monotone" dataKey="anxiety" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Anxiety" />
                 <Line type="monotone" dataKey="stress" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Stress" />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </Card>
      </motion.div>

    </motion.div>
    </>
  );
};

export default MentalHealthPage;

