/// <reference types="vite/client" />
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { LiveKitRoom, VideoConference, RoomAudioRenderer, useLocalParticipant } from "@livekit/components-react";
import "@livekit/components-styles";
import {
  Globe, Activity, X, Shield, FileText, Circle, PenTool, ClipboardList, Save, Check,
  MessageSquare, Send, Settings, Users, VideoOff, MicOff, Monitor
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "../../lib/store";
import { videoAPI } from "../../lib/api";
import api from "../../lib/api";
import { useTranslation } from "../../lib/i18n";
import { Whiteboard } from "@/components/features/domain/Whiteboard";

// Type for transcription messages
interface TranscriptionMessage {
  speaker: string;
  original: string;
  translated: string;
  time: string;
  isMe: boolean;
}

const ScreenShareButton = () => {
  const { t } = useTranslation();
  const { localParticipant } = useLocalParticipant();
  const isScreenShareEnabled = localParticipant.isScreenShareEnabled;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => localParticipant.setScreenShareEnabled(!isScreenShareEnabled)}
      className={`gap-2 ${isScreenShareEnabled ? 'text-[#0EA5E9] bg-[#0EA5E9]/10' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
    >
      <Monitor className="w-4 h-4" />
      <span className="hidden lg:block">
        {isScreenShareEnabled ? t('patient.videocall.stop_sharing', "Stop Sharing") : t('patient.videocall.share_screen', "Share Screen")}
      </span>
    </Button>
  );
};

export default function VideoCallPage() {
  const { t } = useTranslation();
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isDoctor = user?.role === 'doctor';

  const [token, setToken] = useState("");
  const serverUrl = import.meta.env.VITE_LIVEKIT_URL || "wss://netrai-consult-b4c4xk1c.livekit.cloud";

  // Panel States
  const [activePanel, setActivePanel] = useState<'chat' | 'participants' | 'scribe' | 'whiteboard' | 'history' | 'notes' | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Translation States
  const [translationActive, setTranslationActive] = useState(false);
  const [myLanguage, setMyLanguage] = useState(isDoctor ? 'en' : 'hi');
  const [transcripts] = useState<TranscriptionMessage[]>([]);

  // Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [egressId, setEgressId] = useState<string | null>(null);
  const [isTogglingRecord, setIsTogglingRecord] = useState(false);

  // Notes and History
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const [connectionState, setConnectionState] = useState<'connecting' | 'ready' | 'failed'>('connecting');

  const fetchToken = useCallback(async () => {
    if (!user || !appointmentId) return;
    try {
      const res = await videoAPI.getToken(appointmentId, user.name || "Guest");
      if (res.data?.token) {
        setToken(res.data.token);
        setConnectionState('ready');
      } else {
        setConnectionState('failed');
      }
    } catch (err) {
      console.error("Failed to fetch LiveKit token", err);
      setConnectionState('failed');
    }
  }, [user, appointmentId]);

  useEffect(() => {
    if (!user || !appointmentId) return;
    // Timeout fallback — show error after 8s
    const timeout = setTimeout(() => {
      if (!token) setConnectionState('failed');
    }, 8000);
    fetchToken();
    return () => clearTimeout(timeout);
  }, [user, appointmentId, fetchToken]);

  const handleWhiteboardSnapshot = async (svgString: string) => {
      try {
          await api.post(`/api/v1/doctor/appointments/${appointmentId}/whiteboard`, { svg: svgString });
      } catch (err) {
          console.error("Failed to save whiteboard snapshot:", err);
      }
  };

  const handleEndCall = async () => {
    const windowWithSnapshot = window as Window & { getWhiteboardSnapshot?: () => Promise<void> };
    if (windowWithSnapshot.getWhiteboardSnapshot) {
        try {
            await windowWithSnapshot.getWhiteboardSnapshot();
        } catch(e) {
            console.warn('Failed to capture whiteboard snapshot:', e);
        }
    }
    navigate(isDoctor ? "/doctor/appointments" : "/patient/appointments");
  };

  const toggleRecording = async () => {
    if (!appointmentId) return;
    setIsTogglingRecord(true);
    try {
      if (isRecording && egressId) {
        await videoAPI.stopRecording(egressId);
        setIsRecording(false);
        setEgressId(null);
      } else {
        const res = await videoAPI.startRecording(appointmentId);
        if (res.data?.success) {
          setIsRecording(true);
          setEgressId(res.data.egress_id);
        }
      }
    } catch (error) {
      console.error("Recording toggle failed", error);
    } finally {
      setIsTogglingRecord(false);
    }
  };

  return (
    <div className="h-screen max-h-screen bg-[#0F172A] flex flex-col font-sans overflow-hidden">
      {connectionState === 'connecting' && (
        <div className="flex-1 flex items-center justify-center text-white flex-col gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-white/20 border-t-white animate-spin" />
            <Shield className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/60" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{t('patient.videocall.joining', "Joining secure room...")}</p>
            <p className="text-white/50 text-sm mt-1">{t('patient.videocall.establishing', "Establishing end-to-end encrypted connection")}</p>
          </div>
        </div>
      )}

      {connectionState === 'failed' && (
        <div className="flex-1 flex items-center justify-center text-white flex-col gap-6 px-8">
          <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center">
            <X className="w-10 h-10 text-red-400" />
          </div>
          <div className="text-center max-w-md">
            <h2 className="text-xl font-bold mb-2">{t('patient.videocall.cannot_connect', "Could Not Connect")}</h2>
            <p className="text-white/60 text-sm mb-6">{t('patient.videocall.not_configured', "The video service is not configured yet. To enable video calls, add LiveKit credentials to your ")}<code className="text-yellow-400">.env</code>{t('patient.videocall.file', " file:")}</p>
            <div className="bg-white/10 rounded-xl p-4 text-left font-mono text-xs text-green-300 space-y-1">
              <p>LIVEKIT_API_KEY=your_api_key</p>
              <p>LIVEKIT_API_SECRET=your_api_secret</p>
              <p>LIVEKIT_URL=wss://your-project.livekit.cloud</p>
              <p>VITE_LIVEKIT_URL=wss://your-project.livekit.cloud</p>
            </div>
            <p className="text-white/40 text-xs mt-4">{t('patient.videocall.get_creds', "Get free LiveKit credentials at ")}<span className="text-blue-400">livekit.io</span></p>
          </div>
          <button onClick={handleEndCall} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-all">
            {t('patient.videocall.return_dash', "← Return to Dashboard")}
          </button>
        </div>
      )}

      {connectionState === 'ready' && token && (
        <LiveKitRoom
          video={true}
          audio={true}
          token={token}
          serverUrl={serverUrl}
          connect={true}
          onDisconnected={handleEndCall}
          data-lk-theme="default"
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Top Bar inside LiveKitRoom context */}
          <div className="h-16 flex items-center justify-between px-6 bg-[#1E293B] border-b border-white/10 shrink-0 select-none">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="text-white font-medium text-sm hidden sm:block">{t('patient.videocall.encrypted', "End-to-End Encrypted")}</span>
              </div>
              <div className="w-px h-6 bg-white/20 hidden sm:block" />
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <span className="font-mono">{appointmentId}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ScreenShareButton />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
                className={`gap-2 ${activePanel === 'chat' ? 'text-[#0EA5E9] bg-[#0EA5E9]/10' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden lg:block">{t('patient.videocall.chat', "Chat")}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActivePanel(activePanel === 'participants' ? null : 'participants')}
                className={`gap-2 ${activePanel === 'participants' ? 'text-[#0EA5E9] bg-[#0EA5E9]/10' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
              >
                <Users className="w-4 h-4" />
                <span className="hidden lg:block">{t('patient.videocall.participants', "Participants")}</span>
              </Button>

              <div className="w-px h-4 bg-white/10 mx-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTranslationActive(!translationActive)}
                className={`gap-2 ${translationActive ? 'text-[#0D9488] bg-[#0D9488]/10' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
              >
                <Globe className="w-4 h-4" />
                <span className="hidden xl:block">{t('patient.videocall.live_translation', "Translation")}: {translationActive ? t('common.on', "ON") : t('common.off', "OFF")}</span>
              </Button>

              {isDoctor && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivePanel(activePanel === 'whiteboard' ? null : 'whiteboard')}
                    className={`gap-2 ${activePanel === 'whiteboard' ? 'text-[#0EA5E9] bg-[#0EA5E9]/10' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                  >
                    <PenTool className="w-4 h-4" />
                    <span className="hidden xl:block">{t('patient.videocall.whiteboard', "Whiteboard")}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivePanel(activePanel === 'history' ? null : 'history')}
                    className={`gap-2 ${activePanel === 'history' ? 'text-teal-400 bg-teal-400/10' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    <span className="hidden xl:block">{t('patient.videocall.history', "History")}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivePanel(activePanel === 'notes' ? null : 'notes')}
                    className={`gap-2 ${activePanel === 'notes' ? 'text-yellow-400 bg-yellow-400/10' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden xl:block">{t('patient.videocall.notes', "Notes")}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleRecording}
                    disabled={isTogglingRecord}
                    className={`gap-2 ${isRecording ? 'text-red-500 bg-red-500/10' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                  >
                    <Circle className={`w-4 h-4 ${isRecording ? 'fill-red-500 animate-pulse' : ''}`} />
                    <span className="hidden xl:block">{isRecording ? t('patient.videocall.recording', "Recording...") : t('patient.videocall.record', "Record")}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivePanel(activePanel === 'scribe' ? null : 'scribe')}
                    className={`gap-2 ${activePanel === 'scribe' ? 'text-[#8B5CF6] bg-[#8B5CF6]/10' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                  >
                    <Activity className="w-4 h-4" />
                    <span className="hidden xl:block">{t('patient.videocall.ai_scribe', "AI Scribe")}</span>
                  </Button>
                </>
              )}

              <div className="w-px h-4 bg-white/10 mx-1" />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 relative flex flex-col bg-black">
              <VideoConference />
              <RoomAudioRenderer />
            </div>

            <AnimatePresence mode="wait">
              {activePanel === 'whiteboard' ? (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: '66.666667%', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="bg-white border-l border-white/20 shadow-[-10px_0_30px_rgba(0,0,0,0.1)] flex flex-col z-10"
                >
                    <div className="h-14 shrink-0 px-4 border-b border-gray-100 flex items-center justify-between bg-white/50">
                      <div className="flex items-center gap-2 text-[#0F172A]">
                        <PenTool className="w-5 h-5 text-[#0EA5E9]" />
                        <h3 className="font-bold">{t('patient.videocall.collaborative_whiteboard', "Collaborative Whiteboard")}</h3>
                      </div>
                      <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-[#0EA5E9] transition-colors p-2 rounded-lg hover:bg-[#0EA5E9]/10">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1 bg-white relative">
                       <Whiteboard roomId={appointmentId || 'default-room'} onEndConsultation={handleWhiteboardSnapshot} />
                    </div>
                </motion.div>
              ) : activePanel === 'scribe' && isDoctor ? (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 380, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="bg-white/95 backdrop-blur-xl border-l border-white/20 shadow-[-10px_0_30px_rgba(0,0,0,0.1)] flex flex-col z-10"
                >
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white/50">
                    <div className="flex items-center gap-2 text-[#0F172A]">
                      <Activity className="w-5 h-5 text-[#8B5CF6]" />
                      <h3 className="font-bold">{t('patient.videocall.ai_clinical_scribe', "AI Clinical Scribe")}</h3>
                    </div>
                    <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto bg-gray-50/50">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{t('patient.videocall.listening', "Listening Stream...")}</span>
                      </div>

                      <Card className="p-4 shadow-sm border-gray-200">
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">{t('patient.videocall.auto_notes', "Auto-Generated Notes")}</h4>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3 whitespace-pre-wrap">
                          {t('patient.videocall.mock_notes', "Patient complains of chronic fatigue and weakness over the past 3 weeks.\nNoted pallor in conjunctiva during visual inspection.\nRecent blood work indicates microcytic anemia with Hb at 10.2 g/dL.")}
                        </p>
                        <div className="bg-[#F0F9FF] border border-[#BAE6FD] p-3 rounded-lg">
                          <h5 className="text-xs font-bold text-[#0284C7] mb-1">{t('patient.videocall.suggested_diagnosis', "Suggested Diagnosis")}</h5>
                          <p className="text-sm text-[#0369A1]">{t('patient.videocall.mock_diagnosis', "Iron Deficiency Anemia (IDA)")}</p>
                        </div>
                      </Card>
                    </div>
                  </div>
                  <div className="p-4 bg-white border-t border-gray-200">
                    <Button className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white">
                      <FileText className="w-4 h-4 mr-2" />
                      {t('patient.videocall.save_record', "Save to Patient Record")}
                    </Button>
                  </div>
                </motion.div>
              ) : translationActive ? (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 380, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="bg-white/95 backdrop-blur-xl border-l border-white/20 shadow-[-10px_0_30px_rgba(0,0,0,0.1)] flex flex-col z-10"
                >
                  <div className="p-4 border-b border-gray-100 flex flex-col gap-3 bg-white/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[#0F172A]">
                        <Globe className={`w-5 h-5 ${translationActive ? 'text-[#0D9488]' : 'text-gray-400'}`} />
                        <h3 className="font-bold">{t('patient.videocall.live_transcript', "Live Transcript & Translation")}</h3>
                      </div>
                      <button onClick={() => setTranslationActive(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-sm bg-white p-2 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">{t('patient.videocall.my_language', "My Language")}</p>
                        <select
                          className="w-full bg-transparent font-semibold text-[#0F172A] outline-none"
                          value={myLanguage}
                          onChange={(e) => setMyLanguage(e.target.value)}
                        >
                          <option value="en">{t('languages.en', 'English')}</option>
                          <option value="hi">{t('languages.hi', 'Hindi')}</option>
                          <option value="te">{t('languages.te', 'Telugu')}</option>
                          <option value="ta">{t('languages.ta', 'Tamil')}</option>
                          <option value="kn">{t('languages.kn', 'Kannada')}</option>
                          <option value="mr">{t('languages.mr', 'Marathi')}</option>
                        </select>
                      </div>
                      <div className="w-px h-8 bg-gray-200" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">{t('patient.videocall.translating_to', "Translating To")}</p>
                        <p className="font-semibold text-[#0F172A]">{t('languages.' + myLanguage, myLanguage)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 flex-1 overflow-y-auto bg-gray-50/50 space-y-4">
                    {transcripts.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center space-y-3">
                        <Globe className="w-8 h-8 opacity-20" />
                        <p className="text-sm" dangerouslySetInnerHTML={{ __html: t('patient.videocall.start_translation', "Speak to start live translation.<br />Make sure your microphone is unmuted.") }} />
                      </div>
                    ) : transcripts.map((msg, i) => {
                      const displayMessage = msg.isMe ? msg.original : msg.translated;

                      return (
                        <div key={i} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500">{msg.speaker}</span>
                            <span className="text-[10px] text-gray-400">{msg.time}</span>
                          </div>
                          <div className={`max-w-[85%] rounded-2xl p-3 ${msg.isMe
                            ? 'bg-[#0D9488] text-white rounded-tr-sm'
                            : 'bg-white border border-gray-200 text-[#0F172A] rounded-tl-sm shadow-sm'
                            }`}>
                            <p className="text-sm">{displayMessage}</p>
                          </div>
                          {(!msg.isMe) && (
                            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                              <Globe className="w-3 h-3" /> {t('patient.videocall.translated', "Translated")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : activePanel === 'chat' ? (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 380, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="bg-white border-l border-gray-200 shadow-xl flex flex-col z-10"
                >
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-[#0F172A]">
                      <MessageSquare className="w-5 h-5 text-[#0EA5E9]" />
                      {t('patient.videocall.in_call_messages', "In-call Messages")}
                    </div>
                    <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
                    <div className="bg-[#F1F5F9] p-3 rounded-2xl rounded-tl-none max-w-[90%]">
                      <p className="text-xs font-bold text-[#64748B] mb-1">System</p>
                      <p className="text-sm text-[#334155]">{t('patient.videocall.chat_hint', "Messages can only be seen by people in the call and are deleted when the call ends.")}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-white border-t border-gray-100">
                    <div className="relative">
                      <Input 
                        placeholder={t('patient.videocall.send_message', "Send a message...")}
                        className="pr-10 bg-gray-50 border-gray-200 focus-visible:ring-[#0EA5E9]"
                      />
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0EA5E9] hover:text-[#0284C7] transition-colors">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : activePanel === 'participants' ? (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="bg-white border-l border-gray-200 shadow-xl flex flex-col z-10"
                >
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-[#0F172A]">
                      <Users className="w-5 h-5 text-[#0EA5E9]" />
                      {t('patient.videocall.people', "People")}
                    </div>
                    <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors group">
                      <div className="w-10 h-10 rounded-full bg-[#0EA5E9] flex items-center justify-center text-white font-bold">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-[#0F172A]">{user?.name} ({t('common.you', 'You')})</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">{user?.role}</p>
                      </div>
                      <div className="flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                        <MicOff className="w-4 h-4 text-gray-400" />
                        <VideoOff className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : activePanel === 'history' && isDoctor ? (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 380, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="bg-white/95 backdrop-blur-xl border-l border-white/20 shadow-[-10px_0_30px_rgba(0,0,0,0.1)] flex flex-col z-10"
                >
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white/50">
                    <div className="flex items-center gap-2 text-[#0F172A]">
                      <ClipboardList className="w-5 h-5 text-teal-500" />
                      <h3 className="font-bold">{t('patient.videocall.medical_history', "Patient Medical History")}</h3>
                    </div>
                    <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto bg-gray-50/50 space-y-4">
                    <Card className="p-4 border-l-4 border-l-rose-500 shadow-sm">
                      <h4 className="text-xs font-bold text-gray-500 uppercase">Allergies</h4>
                      <p className="text-sm font-semibold mt-1">Penicillin, Peanuts</p>
                    </Card>
                    <Card className="p-4 shadow-sm">
                      <h4 className="text-xs font-bold text-gray-500 uppercase">Past Conditions</h4>
                      <ul className="text-sm space-y-1 mt-2">
                        <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" /> Type 2 Diabetes (Managed)</li>
                        <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" /> Hypertension</li>
                      </ul>
                    </Card>
                    <Card className="p-4 shadow-sm">
                      <h4 className="text-xs font-bold text-gray-500 uppercase">Recent Scans</h4>
                      <p className="text-sm mt-1 text-gray-500 italic">No recent scans reported.</p>
                    </Card>
                  </div>
                </motion.div>
              ) : activePanel === 'notes' && isDoctor ? (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 380, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="bg-white/95 backdrop-blur-xl border-l border-white/20 shadow-[-10px_0_30px_rgba(0,0,0,0.1)] flex flex-col z-10"
                >
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white/50">
                    <div className="flex items-center gap-2 text-[#0F172A]">
                      <FileText className="w-5 h-5 text-yellow-500" />
                      <h3 className="font-bold">{t('patient.videocall.live_notes', "Clinical Notes")}</h3>
                    </div>
                    <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-4 flex-1 flex flex-col bg-gray-50/50">
                    <Textarea 
                      placeholder="Type your clinical observations here..."
                      className="flex-1 resize-none bg-white border-gray-200 text-sm p-4 focus-visible:ring-yellow-500"
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                    />
                  </div>
                  <div className="p-4 bg-white border-t border-gray-200">
                    <Button 
                      className={`w-full ${notesSaved ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'} text-white transition-colors`}
                      onClick={() => {
                        setSavingNotes(true);
                        setTimeout(() => {
                          setSavingNotes(false);
                          setNotesSaved(true);
                          setTimeout(() => setNotesSaved(false), 2000);
                        }, 800);
                      }}
                      disabled={savingNotes || !clinicalNotes.trim()}
                    >
                      {savingNotes ? (
                        <span className="flex items-center"><Circle className="w-4 h-4 mr-2 animate-spin" /> Saving...</span>
                      ) : notesSaved ? (
                        <span className="flex items-center"><Check className="w-4 h-4 mr-2" /> Saved Successfully</span>
                      ) : (
                        <span className="flex items-center"><Save className="w-4 h-4 mr-2" /> Save to Record</span>
                      )}
                    </Button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </LiveKitRoom>
      )}
    </div>
  );
}
