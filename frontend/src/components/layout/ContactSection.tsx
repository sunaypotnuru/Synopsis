import { useState } from "react";
import { Send, MapPin, Phone, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { useTranslation } from "react-i18next";

export function ContactSection() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await api.post("/api/v1/contact/submit", formData);
      toast.success("Message sent successfully! We will get back to you soon.");
      setFormData({ name: "", email: "", phone: "", message: "" });
      (e.target as HTMLFormElement).reset();
    } catch (error: unknown) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <section id="contact" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-[#0F172A] mb-4">
            {t('home.contact.title', "Get In Touch")}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('home.contact.subtitle', "Have questions? Our team is here to help.")}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-gradient-to-br from-[#F8F9FA] to-white rounded-3xl p-8 shadow-xl">
            <h3 className="text-2xl font-bold text-[#0F172A] mb-6">{t('home.contact.form_title', "Send Us a Message")}</h3>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('home.contact.name_label', "Full Name *")}</label>
                <input 
                  type="text" 
                  placeholder={t('home.contact.name_placeholder', "John Doe")} 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#0D9488] focus:outline-none transition-colors" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('home.contact.email_label', "Email Address *")}</label>
                <input 
                  type="email" 
                  placeholder={t('home.contact.email_placeholder', "john@example.com")} 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#0D9488] focus:outline-none transition-colors" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('home.contact.phone_label', "Phone (Optional)")}</label>
                <input 
                  type="tel" 
                  placeholder={t('home.contact.phone_placeholder', "+1 (555) 123-4567")} 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#0D9488] focus:outline-none transition-colors" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('home.contact.message_label', "Message *")}</label>
                <textarea 
                  rows={4} 
                  placeholder={t('home.contact.message_placeholder', "How can we help you?")} 
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#0D9488] focus:outline-none transition-colors resize-none" 
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-[#0D9488] to-[#0EA5E9] text-white font-semibold py-6 text-lg shadow-lg hover:shadow-xl transition-shadow disabled:opacity-70">
                <Send className="w-5 h-5 mr-2" />
                {isSubmitting ? t('home.contact.submitting', "Sending...") : t('home.contact.submit_button', "Send Message")}
              </Button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#0D9488] to-[#0EA5E9] rounded-3xl p-8 text-white shadow-xl">
              <h3 className="text-2xl font-bold mb-6">{t('home.contact.info_title', "Contact Information")}</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{t('home.contact.address', "Address")}</h4>
                    <p className="text-white/90">{t('home.contact.address_value1', "123 Medical Street, Health City")}<br />{t('home.contact.address_value2', "HC 12345")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{t('home.contact.phone', "Phone")}</h4>
                    <p className="text-white/90">{t('home.contact.phone_placeholder', "+1 (555) 123-4567")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{t('home.contact.email', "Email")}</h4>
                    <p className="text-white/90">netraai@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{t('home.contact.hours', "Business Hours")}</h4>
                    <p className="text-white/90">{t('home.contact.hours_value', "Mon-Fri: 9AM-6PM | Sat: 10AM-4PM")}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#F8F9FA] rounded-3xl p-8 border-2 border-[#0D9488]/20">
              <h4 className="text-xl font-bold text-[#0F172A] mb-3">{t('home.contact.emergency_title', "Emergency Support")}</h4>
              <p className="text-gray-700 mb-4">
                {t('home.contact.emergency_desc', "For urgent medical concerns, please contact your healthcare provider or emergency services immediately.")}
              </p>
              <p className="text-sm text-gray-600">
                {t('home.contact.emergency_note', "This AI screening tool is not a substitute for professional medical advice.")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
