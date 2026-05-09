import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    Bot, Send, X, Loader2, User, AlertCircle,
    Activity, Sparkles, RefreshCw, MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatbotStore } from "@/lib/chatbotStore";
import { useAuthStore } from "@/lib/store";
import { useNavigate } from "react-router";
import api from "@/lib/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    isLoading?: boolean;
    timestamp: Date;
}

const QUICK_PROMPTS = [
    { label: "Tired & pale", prompt: "I've been feeling very tired and my palms look pale." },
    { label: "Eye discomfort", prompt: "I have redness and mild pain in my eyes." },
    { label: "Low haemoglobin", prompt: "My blood test showed low haemoglobin. What should I do?" },
    { label: "Headaches", prompt: "I get frequent headaches, especially in the morning." },
];

export default function ChatbotWidget() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { isOpen, toggle, close } = useChatbotStore();

    const WELCOME: Message = useMemo(() => ({
        id: "welcome",
        role: "assistant" as const,
        content: user 
            ? `👋 Hi **${user.name || 'there'}**! I'm **Netra AI**.\n\nDescribe your symptoms and I'll give you preliminary health guidance.`
            : `👋 Welcome to **Netra AI**!\n\nPlease **Login** or **Sign Up** to use our advanced AI health triage assistant.\n\n[Login Now](/login)`,
        timestamp: new Date(),
    }), [user]);

    const [messages, setMessages] = useState<Message[]>([WELCOME]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Update welcome message when user status changes
    useEffect(() => {
        setMessages([WELCOME]);
    }, [WELCOME]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async (text?: string) => {
        if (!user) {
            toast.error("Please login to use the AI assistant.");
            navigate("/login");
            return;
        }
        const userText = text || input.trim();
        if (!userText || isTyping) return;

        const userMsg: Message = { id: Date.now().toString(), role: "user", content: userText, timestamp: new Date() };
        const loadingMsg: Message = { id: Date.now() + "-l", role: "assistant", content: "", isLoading: true, timestamp: new Date() };

        setMessages((prev) => [...prev, userMsg, loadingMsg]);
        setInput("");
        setIsTyping(true);

        try {
            const response = await api.post("/api/v1/ai/triage", { symptoms: userText });
            const data = response.data || {};
            const emergencyDetected = Boolean(data?.emergency_detected);
            if (emergencyDetected) {
                toast.error(
                    t(
                        'patient.chatbot.emergency_warning',
                        "Possible emergency symptoms detected. Please contact emergency services immediately."
                    )
                );
            }

            const causes = Array.isArray(data?.possible_causes) ? data.possible_causes : [];
            const steps = Array.isArray(data?.immediate_steps) ? data.immediate_steps : [];

            const content = [
                `**Urgency:** ${data?.urgency || "routine"}`,
                data?.risk_level ? `**Risk level:** ${data.risk_level}` : null,
                typeof data?.risk_score === "number" ? `**Risk score:** ${data.risk_score}/10` : null,
                data?.suggested_specialty ? `**Suggested specialty:** ${data.suggested_specialty}` : null,
                "",
                data?.summary ? `**Summary:** ${data.summary}` : null,
                causes.length ? `\n**Possible causes:**\n${causes.map((c: string) => `- ${c}`).join("\n")}` : null,
                steps.length ? `\n**Immediate steps:**\n${steps.map((s: string) => `- ${s}`).join("\n")}` : null,
                data?.when_to_seek_care ? `\n**When to seek care:** ${data.when_to_seek_care}` : null,
                data?.medical_disclaimer ? `\n\n_${data.medical_disclaimer}_` : null,
            ]
                .filter(Boolean)
                .join("\n");

            setMessages((prev) => prev.filter((m) => !m.isLoading).concat({
                id: Date.now() + "-ai",
                role: "assistant",
                content,
                timestamp: new Date(),
            }));
        } catch {
            setMessages((prev) => prev.filter((m) => !m.isLoading));
            toast.error("AI temporarily unavailable.");
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            <motion.button
                onClick={() => {
                    if (!user) {
                        toast.error(t('components.chatbot_widget.please_login_to_1', "Please login to use the AI assistant."));
                        navigate("/login");
                        return;
                    }
                    toggle();
                }}
                title={t('components.chatbot_widget.ai_health_assistant_title_3', "AI Health Assistant")}
                aria-label={t('components.chatbot_widget.open_ai_health_assistant_aria-label_4', "Open AI Health Assistant")}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 transition-all"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                {/* Pulse ring */}
                {!isOpen && (
                    <span className="absolute w-full h-full rounded-full bg-violet-400 animate-ping opacity-30" />
                )}
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                            <X className="w-6 h-6" />
                        </motion.div>
                    ) : (
                        <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                            <MessageCircle className="w-6 h-6" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Chatbot Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 28 }}
                        className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
                        role="dialog"
                        aria-modal="true"
                        aria-label={t('components.chatbot_widget.ai_health_assistant_title_3', "AI Health Assistant")}
                    >
                        {/* Header */}
                        <div className="px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 flex items-center gap-3">
                            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-white text-sm flex items-center gap-1">{t('components.chatbot_widget.netra_ai_assistant', "Netra AI Assistant")}<Sparkles className="w-3 h-3" />
                                </p>
                                <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
                                    <span className="text-[10px] text-white/80">{t('components.chatbot_widget.online_1', "Online")}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setMessages([WELCOME])}
                                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                                title={t('components.chatbot_widget.clear_chat_title_6', "Clear chat")}
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={close}
                                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                                aria-label={t('components.chatbot_widget.close_chatbot_aria-label_7', "Close chatbot")}
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Disclaimer */}
                        <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-100 flex items-center gap-1.5">
                            <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                            <p className="text-[10px] text-amber-700">AI guidance only — consult a real doctor for diagnosis.</p>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-gradient-to-br from-[#0D9488] to-[#0F766E]" : "bg-gradient-to-br from-violet-500 to-purple-600"}`}>
                                        {msg.role === "user" ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <div className={`max-w-[78%] px-3 py-2 rounded-xl text-sm shadow-sm ${msg.role === "user" ? "bg-gradient-to-br from-[#0D9488] to-[#0F766E] text-white rounded-tr-sm" : "bg-gray-50 border border-gray-100 text-[#0F172A] rounded-tl-sm"}`}>
                                        {msg.isLoading ? (
                                            <div className="flex items-center gap-1.5">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                                                <span className="text-xs text-gray-400">{t('components.chatbot_widget.thinking_2', "Thinking...")}</span>
                                            </div>
                                        ) : (
                                            <div
                                                className="text-xs leading-relaxed whitespace-pre-wrap"
                                                dangerouslySetInnerHTML={{
                                                    __html: msg.content
                                                        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
                                                        .replace(/\n/g, "<br/>"),
                                                }}
                                            />
                                        )}
                                        <p className={`text-[9px] mt-1 ${msg.role === "user" ? "text-white/60" : "text-gray-400"}`}>
                                            {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {/* Quick prompts when only welcome */}
                            {messages.length === 1 && (
                                <div className="grid grid-cols-2 gap-1.5 mt-1">
                                    {QUICK_PROMPTS.map((p) => (
                                        <button
                                            key={p.label}
                                            onClick={() => sendMessage(p.prompt)}
                                            className="text-left p-2 bg-white border border-gray-100 rounded-lg text-[10px] text-[#0F172A] hover:border-violet-200 hover:bg-violet-50 transition-all shadow-sm"
                                        >
                                            <Activity className="w-3 h-3 text-violet-500 mb-0.5" />
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="border-t border-gray-100 p-3 bg-white">
                            <div className="flex gap-2 items-end">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                    placeholder={t('components.chatbot_widget.describe_symptoms_enter_to_placeholder_8', "Describe symptoms… (Enter to send)")}
                                    rows={2}
                                    className="flex-1 resize-none px-3 py-2 rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-200 outline-none text-xs bg-gray-50 transition-all"
                                    aria-label={t('components.chatbot_widget.message_input_aria-label_9', "Message input")}
                                />
                                <Button
                                    onClick={() => sendMessage()}
                                    disabled={!input.trim() || isTyping}
                                    className="bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white h-10 w-10 rounded-xl p-0 shadow-md shrink-0"
                                    aria-label={t('components.chatbot_widget.send_message_aria-label_10', "Send message")}
                                >
                                    {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
