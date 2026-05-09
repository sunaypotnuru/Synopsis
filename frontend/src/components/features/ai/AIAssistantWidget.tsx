import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';
import { useAuth } from "@/app/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from 'sonner';
import { useTranslation } from "react-i18next";

export function AIAssistantWidget() {
  const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'ai' | 'user', text: string }[]>([
        { role: 'ai', text: 'Hi! I am the Netra AI Assistant. How can I help you today?' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuth();

    if (!user) return null; // Only show if logged in

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMsg = inputValue;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInputValue('');
        setIsLoading(true);

        try {
            // Note: Update url to your actual conversational RAG endpoint when ready
            const res = await api.post('/api/v1/ai/chat', { message: userMsg, role: user?.role });
            setMessages(prev => [...prev, { role: 'ai', text: res.data.response || "I didn't quite catch that." }]);
        } catch (error) {
            console.error("AI Assistant Error:", error);
            toast.error("Failed to connect to AI server. Trying fallback mode...");
            // Fallback response if the backend RAG isn't deployed yet
            setTimeout(() => {
                let response = "I'm having trouble connecting to the knowledge base right now. Please try again later.";
                if (user?.role === 'patient') response = "Based on typical queries: I recommend scheduling a consultation with your doctor.";
                setMessages(prev => [...prev, { role: 'ai', text: response }]);
            }, 1000);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 left-6 z-40">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="absolute bottom-16 left-0 mb-4 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden flex flex-col"
                        style={{ height: '400px' }}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-teal-500 to-teal-700 p-4 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5" />
                                <h3 className="font-semibold text-sm">{t('components.a_i_assistant_widget.netra_ai_assistant', "Netra AI Assistant")}</h3>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Chat History */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-2xl p-3 text-sm ${msg.role === 'user'
                                            ? 'bg-teal-600 text-white rounded-br-sm'
                                            : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-sm'
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder={t('components.a_i_assistant_widget.ask_me_anything_placeholder_1', "Ask me anything...")}
                                disabled={isLoading}
                                className="flex-1 text-sm outline-none px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 focus:border-teal-500 transition-colors disabled:opacity-50"
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !inputValue.trim()}
                                className="w-10 h-10 flex items-center justify-center rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 rounded-full bg-slate-900 text-white shadow-xl flex items-center justify-center ring-4 ring-white relative group"
            >
                <div className="absolute inset-0 bg-teal-500 rounded-full blur group-hover:opacity-100 opacity-60 transition-opacity -z-10" />
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
            </motion.button>
        </div>
    );
}
