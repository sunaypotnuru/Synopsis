import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";

export default function ContactPage() {
    const { t } = useTranslation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        message: ""
    });

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.firstName || !formData.email || !formData.message) {
            toast.error(t("public.contact.required_fields", "Please fill in all required fields"));
            return;
        }
        
        if (!validateEmail(formData.email)) {
            toast.error(t("public.contact.invalid_email", "Please enter a valid email address"));
            return;
        }
        
        setIsSubmitting(true);
        try {
            // Combine first and last name for the API
            const fullName = `${formData.firstName} ${formData.lastName}`.trim();
            await api.post("/api/v1/contact/submit", {
                name: fullName,
                email: formData.email,
                phone: "", // Optional field not in this form
                message: formData.message
            });
            toast.success(t("public.contact.success_msg", "Message sent successfully! We will get back to you soon."));
            setFormData({ firstName: "", lastName: "", email: "", message: "" });
            (e.target as HTMLFormElement).reset();
        } catch (error) {
            console.error("Failed to send message:", error);
            toast.error(t("public.contact.error_msg", "Failed to send message. Please try again."));
        } finally {
            setIsSubmitting(false);
        }
    };
    return (
        <div className="min-h-screen pt-24 bg-gray-50 pb-16">
            <div className="max-w-6xl mx-auto px-6 lg:px-12">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-[#0F172A] mb-4">{t("public.contact.title", "Contact Us")}</h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">{t("public.contact.description", "Have questions about our platform or need technical support? We're here to help.")}</p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Info cards */}
                    <div className="lg:col-span-1 space-y-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex gap-4">
                            <div className="w-12 h-12 rounded-full bg-[#0D9488]/10 flex items-center justify-center flex-shrink-0">
                                <Mail className="w-6 h-6 text-[#0D9488]" />
                            </div>
                            <div>
                                <h4 className="font-bold text-[#0F172A] mb-1">{t("public.contact.email_us", "Email Us")}</h4>
                                <p className="text-gray-600 text-sm mb-1">support@netraai.com</p>
                                <p className="text-gray-600 text-sm">sales@netraai.com</p>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex gap-4">
                            <div className="w-12 h-12 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center flex-shrink-0">
                                <Phone className="w-6 h-6 text-[#0EA5E9]" />
                            </div>
                            <div>
                                <h4 className="font-bold text-[#0F172A] mb-1">{t("public.contact.call_us", "Call Us")}</h4>
                                <p className="text-gray-600 text-sm mb-1">+91 1800-NETRA-AI</p>
                                <p className="text-red-500 font-semibold text-xs mt-2 border border-red-200 bg-red-50 rounded px-2 py-1 inline-block">{t("public.contact.emergency", "Emergency: 108")}</p>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex gap-4">
                            <div className="w-12 h-12 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-6 h-6 text-[#8B5CF6]" />
                            </div>
                            <div>
                                <h4 className="font-bold text-[#0F172A] mb-1">{t("public.contact.headquarters", "Headquarters")}</h4>
                                <p className="text-gray-600 text-sm">Universal AI University<br />{t("public.contact.location", "Mumbai, India")}</p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Form */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                        <h3 className="text-2xl font-bold text-[#0F172A] mb-6">{t("public.contact.form_title", "Send us a message")}</h3>
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">{t("public.contact.first_name", "First Name")}</label>
                                    <input 
                                        id="firstName"
                                        type="text" 
                                        required
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition-all" 
                                        placeholder={t("public.contact.first_name_placeholder", "John")}
                                        aria-label={t("public.contact.first_name", "First Name")}
                                        aria-required="true"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">{t("public.contact.last_name", "Last Name")}</label>
                                    <input 
                                        id="lastName"
                                        type="text" 
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition-all" 
                                        placeholder={t("public.contact.last_name_placeholder", "Doe")}
                                        aria-label={t("public.contact.last_name", "Last Name")}
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">{t("public.contact.email_address", "Email Address")}</label>
                                <input 
                                    id="email"
                                    type="email" 
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition-all" 
                                    placeholder={t("public.contact.email_placeholder", "john@example.com")}
                                    aria-label={t("public.contact.email_address", "Email Address")}
                                    aria-required="true"
                                    aria-describedby="email-error"
                                />
                            </div>
                            <div>
                                <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">{t("public.contact.message", "Message")}</label>
                                <textarea 
                                    id="message"
                                    rows={5} 
                                    required
                                    value={formData.message}
                                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0D9488] focus:border-transparent outline-none transition-all" 
                                    placeholder={t("public.contact.message_placeholder", "How can we help you?")}
                                    aria-label={t("public.contact.message", "Message")}
                                    aria-required="true"
                                />
                            </div>
                            <Button type="submit" disabled={isSubmitting} className="w-full bg-[#0D9488] hover:bg-[#0F766E] text-white py-4 rounded-xl text-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-70">
                                <Send className="w-5 h-5" /> {isSubmitting ? t("public.contact.sending", "Sending...") : t("public.contact.send", "Send Message")}
                            </Button>
                        </form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

