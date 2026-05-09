import { useState, useRef, useEffect } from 'react';
import { Video, Square } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from "react-i18next";

interface VideoRecorderProps {
    consultationId: string;
    roomName: string;
    onRecordingComplete?: (recordingId: string) => void;
}

export function VideoRecorder({ consultationId, roomName, onRecordingComplete }: VideoRecorderProps) {
  const { t } = useTranslation();
    const [isRecording, setIsRecording] = useState(false);
    const [recordingId, setRecordingId] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);
    
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            setError(null);
            
            const response = await fetch('/api/v1/video/enhanced/recordings/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    consultation_id: consultationId,
                    room_name: roomName,
                    quality: 'medium',
                    include_audio: true,
                    include_video: true
                })
            });

            if (!response.ok) {
                throw new Error('Failed to start recording');
            }

            const data = await response.json();
            setRecordingId(data.recording_id);
            setIsRecording(true);
            setDuration(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start recording');
        }
    };

    const stopRecording = async () => {
        try {
            if (!recordingId) return;

            const response = await fetch('/api/v1/video/enhanced/recordings/stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    recording_id: recordingId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to stop recording');
            }

            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

            if (onRecordingComplete) {
                onRecordingComplete(recordingId);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to stop recording');
        }
    };

    const formatDuration = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <Video className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">{t('components.video_recorder.consultation_recording', "Consultation Recording")}</h3>
                        <p className="text-sm text-slate-500">
                            {isRecording ? 'Recording in progress' : 'Ready to record'}
                        </p>
                    </div>
                </div>

                {isRecording && (
                    <motion.div
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg"
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        <div className="w-3 h-3 rounded-full bg-red-600" />
                        <span className="text-sm font-medium text-red-600">
                            REC {formatDuration(duration)}
                        </span>
                    </motion.div>
                )}
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            <div className="flex gap-3">
                {!isRecording ? (
                    <button
                        onClick={startRecording}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                        aria-label={t('components.video_recorder.start_recording_aria-label_4', "Start recording")}
                    >
                        <Video className="w-5 h-5" />{t('components.video_recorder.start_recording_1', "Start Recording")}</button>
                ) : (
                    <button
                        onClick={stopRecording}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors"
                        aria-label={t('components.video_recorder.stop_recording_aria-label_5', "Stop recording")}
                    >
                        <Square className="w-5 h-5" />{t('components.video_recorder.stop_recording_2', "Stop Recording")}</button>
                )}
            </div>

            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <h4 className="text-sm font-medium text-slate-700 mb-2">{t('components.video_recorder.recording_info_3', "Recording Info")}</h4>
                <ul className="space-y-1 text-sm text-slate-600">
                    <li>• Video quality: Medium (720p)</li>
                    <li>• Audio: Enabled</li>
                    <li>• Storage: Cloud-based</li>
                    <li>• Automatic transcription available</li>
                </ul>
            </div>
        </div>
    );
}
