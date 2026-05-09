import { useState, useRef } from "react";
import { motion } from "motion/react";
import { Mic, Square, CheckCircle, Trash2, Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface VoiceNoteProps {
    appointmentId: string;
    patientId: string;
    onNoteTranscribed?: (text: string) => void;
}

export default function VoiceNoteRecorder({ appointmentId, patientId, onNoteTranscribed }: VoiceNoteProps) {
    const { t } = useTranslation();
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [savedNotes, setSavedNotes] = useState<string[]>([]);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
            
            chunksRef.current = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };
            
            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                setIsProcessing(true);
                toast.info("Transcribing audio locally via Whisper AI...");
                
                try {
                    const formData = new FormData();
                    formData.append("file", blob, "recording.webm");
                    
                    // Call backend Whisper API directly
                    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
                    const res = await api.post("/api/v1/voice/transcribe/local", formData, {
                        headers: { 
                            "Content-Type": "multipart/form-data",
                            "Authorization": `Bearer ${token}`
                        }
                    });
                    
                    if (res.data?.text) {
                        setTranscription(prev => prev + (prev ? " " : "") + res.data.text);
                        toast.success("Transcription complete!");
                    } else {
                        toast.error("Failed to parse transcription.");
                    }
                } catch (err) {
                    console.error("Transcription error:", err);
                    toast.error("Whisper transcription failed.");
                } finally {
                    setIsProcessing(false);
                }
                
                // Release microphone
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start(1000); // chunk every 1 sec to ensure buffer

            // Start timer
            timerRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            setIsRecording(true);
            toast.success("Recording started — speak clearly");
        } catch (err) {
            console.error(err);
            toast.error("Microphone access was denied or device not found.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsRecording(false);
        setRecordingTime(0);
    };

    const saveNote = async () => {
        if (!transcription.trim()) {
            toast.error("No transcription to save.");
            return;
        }

        setIsProcessing(true);
        try {
            // Send to the AI scribe endpoint to generate SOAP note
            await api.post("/api/v1/doctor/patients/" + patientId + "/notes", {
                content: transcription,
                type: "voice_note",
                appointment_id: appointmentId,
            });
            setSavedNotes(prev => [...prev, transcription]);
            if (onNoteTranscribed) onNoteTranscribed(transcription);
            setTranscription("");
            toast.success("Voice note saved to patient record!");
        } catch {
            toast.error("Failed to save voice note.");
        } finally {
            setIsProcessing(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Volume2 className="w-5 h-5 text-teal-600" />
                <h3 className="font-semibold text-gray-900">{t('components.voice_note_recorder.voice_notes', "Voice Notes")}</h3>
                <span className="ml-auto text-xs text-gray-400 opacity-60">Powered by OpenAI Whisper (Local AI)</span>
            </div>

            {/* Recording Controls */}
            <div className="flex items-center gap-3 mb-4">
                {!isRecording ? (
                    <Button
                        onClick={startRecording}
                        className="bg-red-500 hover:bg-red-600 text-white gap-2 rounded-xl"
                    >
                        <Mic className="w-4 h-4" />{t('components.voice_note_recorder.start_recording_2', "Start Recording")}</Button>
                ) : (
                    <>
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
                        </div>
                        <Button
                            onClick={stopRecording}
                            variant="outline"
                            className="gap-2 border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                        >
                            <Square className="w-4 h-4" />{t('components.voice_note_recorder.stop_3', "Stop")}</Button>
                    </>
                )}
            </div>

            {/* Transcription Area */}
            <div className="relative">
                <textarea
                    value={transcription}
                    onChange={e => setTranscription(e.target.value)}
                    placeholder={isRecording ? "Listening… speak now" : "Transcription will appear here. You can also edit manually."}
                    rows={5}
                    className={`w-full border rounded-xl px-4 py-3 text-sm resize-none outline-none transition-all ${isRecording
                            ? "border-red-300 focus:ring-2 focus:ring-red-200 bg-red-50"
                            : "border-gray-200 focus:ring-2 focus:ring-teal-300 bg-gray-50"
                        }`}
                />
                {isRecording && (
                    <motion.div
                        className="absolute top-3 right-3"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                    >
                        <Mic className="w-4 h-4 text-red-500" />
                    </motion.div>
                )}
            </div>

            {/* Action buttons */}
            {transcription.trim() && (
                <div className="flex gap-2 mt-3">
                    <Button
                        onClick={saveNote}
                        disabled={isProcessing}
                        className="flex-1 bg-teal-600 hover:bg-teal-700 text-white gap-2 rounded-xl"
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Save to Patient Record
                    </Button>
                    <Button
                        onClick={() => setTranscription("")}
                        variant="outline"
                        className="gap-2 rounded-xl border-gray-200 text-gray-500"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* Saved Notes */}
            {savedNotes.length > 0 && (
                <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('components.voice_note_recorder.saved_this_session_4', "Saved this session")}</p>
                    {savedNotes.map((note, i) => (
                        <div key={i} className="px-3 py-2 bg-green-50 border border-green-100 rounded-lg text-sm text-green-800 flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <p className="line-clamp-2">{note}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
