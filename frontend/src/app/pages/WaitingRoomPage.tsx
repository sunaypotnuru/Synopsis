import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
    Clock, Users, FileText, Video, ArrowLeft,
    Stethoscope, Star, Mic, MicOff, Camera, CameraOff,
    ShieldCheck, CheckCircle
} from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from '../../lib/api';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';

const initialWait = 15 * 60; // 15 minutes default

export default function WaitingRoomPage() {
    const { t } = useTranslation();
    const { appointmentId } = useParams();
    const navigate = useNavigate();
    const [symptoms, setSymptoms] = useState('');
    const [submittingIntake, setSubmittingIntake] = useState(false);
    const [intakeDone, setIntakeDone] = useState(false);

    // Camera/mic test
    const videoRef = useRef<HTMLVideoElement>(null);
    const [cameraOn, setCameraOn] = useState(false);
    const [micOn, setMicOn] = useState(false);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

    // Queue and countdown
    const [queuePos, setQueuePos] = useState(Math.floor(Math.random() * 3) + 1);
    const [waitTime, setWaitTime] = useState(queuePos * 5 * 60);
    const [isCallReady, setIsCallReady] = useState(false);

    // Doctor info (mocked — in production fetch from appointment details)
    const doctor = {
        name: 'Dr. Assigned Physician',
        specialty: 'General Medicine',
        rating: 4.8,
        avatar: null,
    };

    useEffect(() => {
        const timer = setInterval(() => setWaitTime(w => (w > 0 ? w - 1 : 0)), 1000);
        return () => clearInterval(timer);
    }, []);

    // Real-time subscription for waiting queue updates
    useEffect(() => {
        if (!appointmentId) return;

        const fetchQueueStatus = async () => {
            try {
                const response = await api.get(`/api/v1/appointments/${appointmentId}/queue-status`);
                if (response.data) {
                    setQueuePos(response.data.position || 1);
                    setWaitTime(response.data.estimated_wait_minutes * 60 || initialWait);
                    if (response.data.status === 'called') {
                        setIsCallReady(true);
                        toast.success(t('patient.waiting.doctor_ready', "🎉 The doctor is ready for you!"), {
                            duration: 10000,
                            action: {
                                label: t('patient.waiting.join_now', "Join Now"),
                                onClick: () => joinCall()
                            }
                        });
                        // Play notification sound
                        const audio = new Audio('/notification.mp3');
                        audio.play().catch(() => { });
                    }
                }
            } catch (_error) {
                console.log('Queue status not available yet');
            }
        };

        fetchQueueStatus();

        // Set up real-time subscription
        const channel = supabase
            .channel(`waiting_queue_${appointmentId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'waiting_queue',
                filter: `appointment_id=eq.${appointmentId}`
            }, (payload: { new?: { position?: number; estimated_wait_minutes?: number; status?: string } }) => {
                console.log('Queue update received:', payload);

                if (payload.new) {
                    const newData = payload.new;
                    setQueuePos(newData.position || 1);
                    setWaitTime((newData.estimated_wait_minutes || 5) * 60);

                    if (newData.status === 'called') {
                        setIsCallReady(true);
                        toast.success(t('patient.waiting.doctor_ready', "🎉 The doctor is ready for you!"), {
                            duration: 10000,
                            action: {
                                label: t('patient.waiting.join_now', "Join Now"),
                                onClick: () => joinCall()
                            }
                        });
                        // Play notification sound
                        const audio = new Audio('/notification.mp3');
                        audio.play().catch(() => { });
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
         
    }, [appointmentId, t]);

    useEffect(() => {
        return () => {
            // Clean up media stream on unmount
            mediaStream?.getTracks().forEach(t => t.stop());
        };
    }, [mediaStream]);

    const toggleCamera = async () => {
        if (cameraOn) {
            mediaStream?.getVideoTracks().forEach(t => t.stop());
            if (videoRef.current) videoRef.current.srcObject = null;
            setCameraOn(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: micOn });
                setMediaStream(stream);
                if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
                setCameraOn(true);
                toast.success(t('patient.waiting.camera_ready', "Camera ready"));
            } catch {
                toast.error(t('patient.waiting.camera_denied', "Camera access denied. Please check browser permissions."));
            }
        }
    };

    const toggleMic = async () => {
        if (micOn) {
            mediaStream?.getAudioTracks().forEach(t => t.stop());
            setMicOn(false);
        } else {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                setMicOn(true);
                toast.success(t('patient.waiting.mic_ready', "Microphone ready"));
            } catch {
                toast.error(t('patient.waiting.mic_denied', "Mic access denied."));
            }
        }
    };

    const submitIntake = async () => {
        if (!symptoms.trim()) { toast.error(t('patient.waiting.enter_symptoms', "Please enter your symptoms")); return; }
        setSubmittingIntake(true);
        try {
            await api.post(`/api/v1/appointments/${appointmentId}/intake`, { symptoms });
            setIntakeDone(true);
            toast.success(t('patient.waiting.notes_submitted_msg', "Pre-consultation notes submitted securely."));
        } catch {
            toast.error(t('patient.waiting.notes_failed', "Failed to submit notes. Please try again."));
        } finally {
            setSubmittingIntake(false);
        }
    };

    const joinCall = () => {
        if (!isCallReady && waitTime > 0) {
            toast.error(t('patient.waiting.not_ready', "Doctor has not admitted you yet."));
            return;
        }
        mediaStream?.getTracks().forEach(t => t.stop());
        navigate(`/patient/consultation/${appointmentId}`);
    };

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    // SVG countdown ring
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const progress = initialWait > 0 ? (waitTime / initialWait) : 0;
    const dashOffset = circumference * (1 - progress);

    return (
        <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-br from-[#F0FDFA] via-[#EFF6FF] to-[#F5F3FF] relative overflow-hidden">
            {/* Calming animated background pattern */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full border-2 border-[#0D9488]"
                        style={{
                            width: 200 + i * 100,
                            height: 200 + i * 100,
                            top: '50%',
                            left: '50%',
                            x: '-50%',
                            y: '-50%',
                        }}
                        animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.15, 0.3] }}
                        transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5 }}
                    />
                ))}
            </div>

            <div className="max-w-3xl mx-auto relative z-10">
                <button
                    onClick={() => navigate('/patient/appointments')}
                    className="flex items-center gap-2 text-[#64748B] hover:text-[#0F172A] transition-colors mb-6 text-sm"
                >
                    <ArrowLeft className="w-4 h-4" /> {t('patient.waiting.back_appointments', "Back to appointments")}
                </button>

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#0F172A] mb-2">{t('patient.waiting.title', "Virtual Waiting Room")}</h1>
                    <p className="text-[#64748B]">{t('patient.waiting.desc', "Your appointment is being prepared. Please stay on this page.")}</p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Left Column */}
                    <div className="space-y-5">
                        {/* Doctor Card */}
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                            <Card className="p-5 bg-white/80 backdrop-blur-sm border border-teal-100 shadow-md">
                                <p className="text-xs text-[#64748B] uppercase tracking-widest font-bold mb-4">{t('patient.waiting.your_doctor', "Your Doctor")}</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-[#0D9488] to-[#0F766E] rounded-2xl flex items-center justify-center shadow-lg">
                                        <Stethoscope className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#0F172A] text-lg">{doctor.name}</p>
                                        <p className="text-sm text-[#64748B]">{doctor.specialty}</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                            <span className="text-sm font-semibold text-[#0F172A]">{doctor.rating}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>

                        {/* Countdown Timer */}
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                            <Card className="p-5 bg-white/80 backdrop-blur-sm border border-teal-100 shadow-md text-center">
                                <p className="text-xs text-[#64748B] uppercase tracking-widest font-bold mb-4">{t('patient.waiting.estimated_wait', "Estimated Wait")}</p>
                                <div className="relative w-36 h-36 mx-auto mb-4">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                        <circle cx="60" cy="60" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="8" />
                                        <circle
                                            cx="60" cy="60" r={radius} fill="none"
                                            stroke={waitTime < 60 ? "#F43F5E" : "#0D9488"} strokeWidth="8"
                                            strokeLinecap="round"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={dashOffset}
                                            style={{ transition: "stroke-dashoffset 1s linear" }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-bold text-[#0F172A]">{formatTime(waitTime)}</span>
                                        <span className="text-xs text-[#64748B]">{t('patient.waiting.remaining', "remaining")}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-sm text-[#64748B]">
                                    <Users className="w-4 h-4" />
                                    <span>
                                        {queuePos === 1 ? t('patient.waiting.next_in_line', "You're next in line! 🎉") : t('patient.waiting.patients_ahead', { defaultValue: "{{count}} patient(s) ahead of you", count: queuePos - 1 })}
                                    </span>
                                </div>
                                {(waitTime === 0 || isCallReady) && (
                                    <Button onClick={joinCall} className="mt-4 w-full bg-gradient-to-r from-[#0D9488] to-[#0F766E] text-white animate-pulse">
                                        <Video className="w-4 h-4 mr-2" /> {t('patient.waiting.join_now_btn', "Join Now")}
                                    </Button>
                                )}
                            </Card>
                        </motion.div>

                        {/* Camera/Mic Test */}
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                            <Card className="p-5 bg-white/80 backdrop-blur-sm border border-teal-100 shadow-md">
                                <p className="text-xs text-[#64748B] uppercase tracking-widest font-bold mb-4">{t('patient.waiting.test_av', "Test Your Camera & Mic")}</p>
                                {cameraOn ? (
                                    <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-xl bg-black aspect-video object-cover mb-3" />
                                ) : (
                                    <div className="w-full aspect-video bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                                        <Camera className="w-10 h-10 text-gray-300" />
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        onClick={toggleCamera}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all border ${cameraOn ? "bg-[#0D9488] text-white border-[#0D9488]" : "bg-white text-gray-500 border-gray-200 hover:border-[#0D9488]"}`}
                                    >
                                        {cameraOn ? <><Camera className="w-4 h-4" /> {t('common.on', "On")}</> : <><CameraOff className="w-4 h-4" /> {t('common.off', "Off")}</>}
                                    </button>
                                    <button
                                        onClick={toggleMic}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all border ${micOn ? "bg-[#0D9488] text-white border-[#0D9488]" : "bg-white text-gray-500 border-gray-200 hover:border-[#0D9488]"}`}
                                    >
                                        {micOn ? <><Mic className="w-4 h-4" /> {t('common.on', "On")}</> : <><MicOff className="w-4 h-4" /> {t('common.off', "Off")}</>}
                                    </button>
                                </div>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-5">
                        {/* Pre-consultation Notes */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                            <Card className="p-5 bg-white/80 backdrop-blur-sm border border-teal-100 shadow-md">
                                <p className="text-xs text-[#64748B] uppercase tracking-widest font-bold mb-1">{t('patient.waiting.pre_notes_title', "Pre-Consultation Notes")}</p>
                                <p className="text-xs text-[#64748B] mb-4">{t('patient.waiting.pre_notes_desc', "Describe your symptoms so the doctor can prepare. This saves time during your consultation.")}</p>

                                {intakeDone ? (
                                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                                        <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                                        <div>
                                            <p className="font-semibold text-green-800 text-sm">{t('patient.waiting.notes_submitted', "Notes submitted!")}</p>
                                            <p className="text-xs text-green-600">{t('patient.waiting.notes_reviewed', "Your doctor will review them before the call.")}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <textarea
                                            value={symptoms}
                                            onChange={e => setSymptoms(e.target.value)}
                                            placeholder={t('patient.waiting.symptoms_placeholder', "E.g. I've had a headache for 3 days, especially in the morning. Also feeling tired and dizzy at times...")}
                                            rows={6}
                                            className="w-full resize-none px-4 py-3 rounded-xl border border-gray-200 focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 outline-none text-sm bg-gray-50 transition-all mb-3"
                                            maxLength={1000}
                                        />
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs text-gray-400">{symptoms.length}/1000</span>
                                        </div>
                                        <Button
                                            onClick={submitIntake}
                                            disabled={!symptoms.trim() || submittingIntake}
                                            className="w-full bg-gradient-to-r from-[#0D9488] to-[#0F766E] hover:from-[#0F766E] hover:to-[#065F46] text-white"
                                        >
                                            {submittingIntake ? (
                                                <span className="flex items-center gap-2"><Clock className="w-4 h-4 animate-pulse" /> {t('common.submitting', "Submitting...")}</span>
                                            ) : (
                                                <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> {t('patient.waiting.submit_notes', "Submit Notes")}</span>
                                            )}
                                        </Button>
                                    </>
                                )}
                            </Card>
                        </motion.div>

                        {/* Tips & Privacy Notice */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                            <Card className="p-5 bg-white/80 backdrop-blur-sm border border-teal-100 shadow-md">
                                <div className="flex items-center gap-2 mb-3">
                                    <ShieldCheck className="w-5 h-5 text-[#0D9488]" />
                                    <p className="text-sm font-semibold text-[#0F172A]">{t('patient.waiting.privacy_tips', "Privacy & Tips")}</p>
                                </div>
                                <ul className="space-y-2 text-xs text-[#64748B]">
                                    <li className="flex items-start gap-2"><span className="text-[#0D9488] font-bold shrink-0">•</span> {t('patient.waiting.tip1', "All consultations are end-to-end encrypted")}</li>
                                    <li className="flex items-start gap-2"><span className="text-[#0D9488] font-bold shrink-0">•</span> {t('patient.waiting.tip2', "Find a quiet, well-lit location before joining")}</li>
                                    <li className="flex items-start gap-2"><span className="text-[#0D9488] font-bold shrink-0">•</span> {t('patient.waiting.tip3', "Have your medication list and reports handy")}</li>
                                    <li className="flex items-start gap-2"><span className="text-[#0D9488] font-bold shrink-0">•</span> {t('patient.waiting.tip4', "Test your camera and mic above before the call")}</li>
                                </ul>
                            </Card>
                        </motion.div>

                        {/* Join button always visible */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                            <Button
                                onClick={joinCall}
                                disabled={!isCallReady && waitTime > 0}
                                className="w-full h-14 bg-gradient-to-r from-[#0D9488] to-[#0F766E] hover:from-[#0F766E] hover:to-[#065F46] text-white rounded-2xl text-base font-bold shadow-xl"
                            >
                                <Video className="w-5 h-5 mr-2" /> {t('patient.waiting.join_video', "Join Video Consultation")}
                            </Button>
                            <p className="text-center text-xs text-[#64748B] mt-2">{t('patient.waiting.doctor_admit', "The doctor will admit you when ready")}</p>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
