import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import {
    Bot, Send, User, Loader2, ArrowLeft, AlertCircle,
    Activity, Sparkles, RefreshCw, CalendarPlus
} from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import api from "../../lib/api";
import { toast } from "sonner";
import { useTranslation } from "../../lib/i18n";

interface LocationData {
  lat: number;
  lng: number;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    isLoading?: boolean;
    timestamp: Date;
    triageData?: {
        urgency: string;
        suggested_specialty: string;
        summary: string;
        possible_causes: string[];
        immediate_steps: string[];
        when_to_seek_care: string;
    } | null;
}

export default function PatientChatbotPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [mode, setMode] = useState<"assistant" | "triage">("assistant");

    const QUICK_PROMPTS = [
        { label: t('patient.chatbot.prompt_tired_label', "Tired & pale"), prompt: t('patient.chatbot.prompt_tired', "I've been feeling very tired and my palms look pale. What could this mean?") },
        { label: t('patient.chatbot.prompt_eye_label', "Eye discomfort"), prompt: t('patient.chatbot.prompt_eye', "I have redness and mild pain in my eyes for the past 2 days") },
        { label: t('patient.chatbot.prompt_headache_label', "Headaches"), prompt: t('patient.chatbot.prompt_headache', "I get frequent headaches, especially in the morning") },
        { label: t('patient.chatbot.prompt_haemoglobin_label', "Low haemoglobin"), prompt: t('patient.chatbot.prompt_haemoglobin', "My recent blood test showed low haemoglobin. What should I do?") },
    ];
    const ASSISTANT_PROMPTS = [
        { label: t('patient.chatbot.prompt_diet_label', "Healthy Diet"), prompt: t('patient.chatbot.prompt_diet', "What are some general tips for maintaining a healthy balanced diet?") },
        { label: t('patient.chatbot.prompt_sleep_label', "Better Sleep"), prompt: t('patient.chatbot.prompt_sleep', "How can I improve my sleep hygiene?") },
        { label: t('patient.chatbot.prompt_exercise_label', "Exercise"), prompt: t('patient.chatbot.prompt_exercise', "How many minutes of exercise should I aim for weekly?") },
        { label: t('patient.chatbot.prompt_stress_label', "Stress Relief"), prompt: t('patient.chatbot.prompt_stress', "What are some quick techniques to manage daily stress?") },
    ];

    const getWelcomeMessage = (currentMode: "assistant" | "triage"): Message => ({
        id: `welcome-${currentMode}`,
        role: "assistant",
        content: currentMode === "triage"
            ? t('patient.chatbot.welcome_triage', "👋 Hello! I'm your **Smart Triage Assistant**. Describe your symptoms, and I'll analyze urgency and suggest the right specialist. Please remember to consult a real doctor.")
            : t('patient.chatbot.welcome_assistant', "👋 Hello! I'm **Netra AI**, your intelligent health companion. Ask me general health questions, wellness tips, or healthy habits! (Note: I cannot diagnose conditions or prescribe medications.)"),
        timestamp: new Date(),
    });

    const [messages, setMessages] = useState<Message[]>([getWelcomeMessage("assistant")]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [age] = useState<number | undefined>();
    const [locationConsent, setLocationConsent] = useState(false);
    const [coordinates, setCoordinates] = useState<LocationData | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (locationConsent) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => { 
                    toast.error("Could not fetch location for epidemic tracking."); 
                    setLocationConsent(false); 
                }
            );
        } else {
            setCoordinates(null);
        }
    }, [locationConsent]);

    useEffect(() => {
        setMessages([getWelcomeMessage(mode)]);
    }, [mode]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const activePrompts = mode === "triage" ? QUICK_PROMPTS : ASSISTANT_PROMPTS;

    const sendMessage = async (text?: string) => {
        const userText = text || input.trim();
        if (!userText || isTyping) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: userText,
            timestamp: new Date(),
        };

        const loadingMsg: Message = {
            id: Date.now().toString() + "-loading",
            role: "assistant",
            content: "",
            isLoading: true,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg, loadingMsg]);
        setInput("");
        setIsTyping(true);

        try {
            if (mode === "triage") {
                const response = await api.post("/api/v1/ai/triage", {
                    symptoms: userText,
                    age: age,
                    location: coordinates ? `POINT(${coordinates.lng} ${coordinates.lat})` : null
                });

                const data = response.data;
                let aiMsg: Message;

                if (data.urgency && data.suggested_specialty) {
                    aiMsg = {
                        id: Date.now().toString() + "-ai",
                        role: "assistant",
                        content: "", // Content is rendered visually via triageData
                        timestamp: new Date(),
                        triageData: data
                    };
                } else {
                    aiMsg = {
                        id: Date.now().toString() + "-ai",
                        role: "assistant",
                        content: data.response || t('patient.chatbot.error_triage', "Sorry, I could not process your symptoms."),
                        timestamp: new Date(),
                    };
                }
                setMessages((prev) => prev.filter((m) => !m.isLoading).concat(aiMsg));
            } else {
                // Assistant Mode
                const historyStream = messages
                    .filter(m => m.id !== "welcome-assistant" && !m.isLoading)
                    .map(m => ({ role: m.role, content: m.content }));

                const response = await api.post("/api/v1/ai/assistant", {
                    message: userText,
                    history: historyStream,
                    patient_context: age ? `${t('patient.chatbot.patient_age', "Patient Age: ")}${age}` : ""
                });
                const emergencyDetected = Boolean(response.data?.emergency_detected);
                if (emergencyDetected) {
                    toast.error(
                        t(
                            'patient.chatbot.emergency_warning',
                            "Possible emergency symptoms detected. Please contact emergency services immediately."
                        )
                    );
                }

                const aiMsg: Message = {
                    id: Date.now().toString() + "-ai",
                    role: "assistant",
                    content: response.data.reply || t('patient.chatbot.error_assistant', "Pardon, I encountered an error answering that."),
                    timestamp: new Date(),
                };

                setMessages((prev) => prev.filter((m) => !m.isLoading).concat(aiMsg));
            }
        } catch (err) {
            setMessages((prev) => prev.filter((m) => !m.isLoading));
            toast.error(t('patient.chatbot.error_service', "AI service temporarily unavailable. Please try again."));
        } finally {
            setIsTyping(false);
        }
    };

    const handleBookAppointment = (specialty: string) => {
        // Navigate to doctors page and potentially pass specialty as state/query
        navigate(`/patient/doctors?specialty=${encodeURIComponent(specialty.toLowerCase())}`);
    };

    const renderMessage = (msg: Message) => {
        return (
            <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${msg.role === "user"
                    ? "bg-gradient-to-br from-[#0D9488] to-[#0F766E]"
                    : "bg-gradient-to-br from-violet-500 to-purple-600"
                    }`}>
                    {msg.role === "user" ? (
                        <User className="w-4 h-4 text-white" />
                    ) : (
                        <Bot className="w-4 h-4 text-white" />
                    )}
                </div>

                <div className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm ${msg.role === "user"
                    ? "bg-gradient-to-br from-[#0D9488] to-[#0F766E] text-white rounded-tr-sm"
                    : "bg-white border border-gray-100 text-[#0F172A] rounded-tl-sm"
                    }`}>
                    {msg.isLoading ? (
                        <div className="flex items-center gap-2 py-1">
                            <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                            <span className="text-sm text-gray-400">{t('patient.chatbot.analyzing', "Netra AI is analyzing your symptoms...")}</span>
                        </div>
                    ) : msg.triageData ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
                                <h3 className="font-semibold text-gray-900 border-l-4 border-violet-500 pl-2">{t('patient.chatbot.triage_analysis', "Triage Analysis")}</h3>
                                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider
                                    ${msg.triageData.urgency.toLowerCase().includes('emergency') ? 'bg-red-100 text-red-700' :
                                        msg.triageData.urgency.toLowerCase().includes('urgent') ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                    {msg.triageData.urgency}
                                </span>
                            </div>

                            <div>
                                <p className="text-sm text-gray-600 mb-3">{msg.triageData.summary}</p>

                                <div className="space-y-3">
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <h4 className="text-xs font-semibold text-gray-700 uppercase mb-1">{t('patient.chatbot.possible_causes', "Possible Causes")}</h4>
                                        <ul className="list-disc pl-4 text-sm text-gray-600 space-y-1">
                                            {msg.triageData.possible_causes.map((cause, i) => (
                                                <li key={i}>{cause}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <h4 className="text-xs font-semibold text-blue-800 uppercase mb-1">{t('patient.chatbot.immediate_steps', "Immediate Steps")}</h4>
                                        <ul className="list-disc pl-4 text-sm text-blue-700 space-y-1">
                                            {msg.triageData.immediate_steps.map((step, i) => (
                                                <li key={i}>{step}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                                        <h4 className="text-xs font-semibold text-amber-800 uppercase mb-1">{t('patient.chatbot.when_to_seek_care', "When to seek care")}</h4>
                                        <p className="text-sm text-amber-700">{msg.triageData.when_to_seek_care}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-gray-100 mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <p className="text-xs text-gray-500 italic flex-1">
                                    {t('patient.chatbot.suggested_specialty', "Suggested Specialty: ")} <strong className="text-violet-600 capitalize">{msg.triageData.suggested_specialty}</strong>
                                </p>
                                <Button
                                    onClick={() => handleBookAppointment(msg.triageData!.suggested_specialty)}
                                    className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white gap-2 shadow-md shadow-violet-200"
                                    size="sm"
                                >
                                    <CalendarPlus className="w-4 h-4" />
                                    {t('patient.chatbot.book_consultation', "Book Consultation")}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="text-sm leading-relaxed whitespace-pre-wrap"
                            style={{ fontFamily: "inherit" }}
                            dangerouslySetInnerHTML={{
                                __html: msg.content
                                    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
                                    .replace(/\n/g, "<br/>"),
                            }}
                        />
                    )}
                    <p className={`text-[10px] mt-1.5 text-right ${msg.role === "user" ? "text-white/60" : "text-gray-400"}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen pt-20 pb-0 flex flex-col bg-gradient-to-br from-[#F0FDFA] via-white to-[#F5F3FF]">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex items-center gap-4 max-w-4xl mx-auto w-full">
                <button
                    onClick={() => navigate("/patient/dashboard")}
                    className="flex items-center gap-2 text-[#64748B] hover:text-[#0F172A] transition-colors text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-[#0F172A] flex items-center gap-1.5">
                            {t('patient.chatbot.netra_ai', "Netra AI ")} {mode === "assistant" ? t('patient.chatbot.assistant', "Assistant") : t('patient.chatbot.smart_triage', "Smart Triage")}
                            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                        </h1>
                        <div className="flex items-center gap-1 mt-1">
                            <button
                                onClick={() => setMode("assistant")}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${mode === "assistant" ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                            >
                                {t('patient.chatbot.assistant', "Assistant")}
                            </button>
                            <button
                                onClick={() => setMode("triage")}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${mode === "triage" ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                            >
                                {t('patient.chatbot.smart_triage', "Smart Triage")}
                            </button>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setMessages([getWelcomeMessage(mode)])}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    title={t('patient.chatbot.clear_chat', "Clear chat")}
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Disclaimer banner */}
            <div className="mx-4 mb-2 max-w-4xl mx-auto w-full flex flex-col sm:flex-row gap-2">
                <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 flex-1">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-[11px] text-amber-800">{t('patient.chatbot.disclaimer', "AI-generated guidance only. Consult a qualified doctor for medical decisions.")}</p>
                </div>
                {mode === "triage" && (
                    <button 
                        onClick={() => setLocationConsent(!locationConsent)}
                        className={`px-4 py-2 text-[11px] rounded-xl border flex items-center gap-2 transition-colors ${locationConsent ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                    >
                        <Activity className="w-3.5 h-3.5" />
                        {locationConsent ? t('patient.chatbot.tracking_active', "Epidemic Tracking Active") : t('patient.chatbot.enable_tracking', "Enable Epidemic Tracking")}
                    </button>
                )}
            </div>

            {/* Chat area */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 max-w-4xl mx-auto w-full">
                {messages.map(renderMessage)}

                {/* Quick prompts when only welcome message */}
                {messages.length === 1 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-2 gap-2 mt-1"
                    >
                        {activePrompts.map((p) => (
                            <button
                                key={p.label}
                                onClick={() => sendMessage(p.prompt)}
                                className="text-left p-3 bg-white border border-gray-100 rounded-xl text-xs text-[#0F172A] hover:border-violet-200 hover:bg-violet-50 transition-all shadow-sm"
                            >
                                <Activity className="w-3.5 h-3.5 text-violet-500 mb-1" />
                                {p.label}
                            </button>
                        ))}
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-gray-100 bg-white/90 backdrop-blur-sm px-4 py-4 max-w-4xl mx-auto w-full">
                <div className="flex gap-3 items-end">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        placeholder={t('patient.chatbot.placeholder', "Describe your symptoms... (Enter to send)")}
                        rows={2}
                        className="flex-1 resize-none px-4 py-3 rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-200 outline-none text-sm bg-gray-50 transition-all"
                    />
                    <Button
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || isTyping}
                        className="bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-4 h-12 rounded-xl shadow-md"
                    >
                        {isTyping ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
