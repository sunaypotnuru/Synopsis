import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Eye, Mail, Lock, User, Phone, Globe, FileText, ChevronRight, ChevronLeft, Check, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "../../lib/store";
import { toast } from "sonner";
import { useTranslation } from "../../lib/i18n";

const getSteps = (t: (key: string, defaultValue?: string) => string) => [
  { title: t("auth.signup.account", "Account"), icon: User },
  { title: t("auth.signup.language", "Language"), icon: Globe },
  { title: t("auth.signup.medical_history", "Medical History"), icon: FileText },
];

const languages = [
  "English", "Hindi", "Telugu", "Tamil", "Bengali", "Marathi",
  "Gujarati", "Kannada", "Malayalam", "Punjabi", "Urdu", "Odia",
];

export default function SignUpPage() {
  const { t } = useTranslation();
  const steps = getSteps(t);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "patient",
    preferred_language: "English",
    medical_conditions: "",
    allergies: "",
    current_medications: "",
    blood_group: "",
  });
  const { signUp, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email, password, ...userData } = formData;
    const result = await signUp(email, password, userData);
    if (result.success) {
      toast.success(t('auth.signup.account_created', 'Account created! Welcome to Netra AI.'));
      navigate("/patient/dashboard");
    } else {
      toast.error(result.error?.message || t('errors.generic', 'Failed to create account'));
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  return (
    <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#CCFBF1] flex items-center justify-center relative overflow-hidden">
      {/* Background shapes - static CSS */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-[#0D9488]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#0EA5E9]/5 rounded-full blur-3xl" />

      {/* Floating icons - static */}
      {[
        { Icon: Eye, x: "12%", y: "25%" },
        { Icon: Activity, x: "82%", y: "18%" },
      ].map(({ Icon, x, y }, i) => (
        <div key={i} className="absolute pointer-events-none opacity-[0.06]" style={{ left: x, top: y }}>
          <Icon className="w-10 h-10 text-[#0D9488]" />
        </div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full max-w-lg relative z-10"
      >
        <Card className="p-8 shadow-2xl backdrop-blur-sm bg-white/80 border border-white/50">
          <div className="flex flex-col items-center mb-6">
            <motion.div
              className="w-16 h-16 bg-gradient-to-br from-[#0D9488] to-[#0F766E] rounded-2xl flex items-center justify-center mb-4 shadow-lg"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <Eye className="w-8 h-8 text-white" />
            </motion.div>
            <motion.h1 className="text-3xl font-bold text-[#0F172A]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              {t('auth.signup.create_account', 'Create Account')}
            </motion.h1>
            <motion.p className="text-[#64748B] mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
              {t('auth.signup.patient_subtitle', 'Join Netra AI as a Patient')}
            </motion.p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${index < currentStep ? "bg-[#0D9488] text-white" :
                  index === currentStep ? "bg-[#0D9488]/20 text-[#0D9488] border-2 border-[#0D9488]" :
                    "bg-gray-100 text-gray-400"
                  }`}>
                  {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 transition-colors ${index < currentStep ? "bg-[#0D9488]" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('auth.signup.full_name', 'Full Name')}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                      <Input placeholder="John Doe" value={formData.full_name} onChange={(e) => updateField("full_name", e.target.value)} className="pl-11" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('auth.login.email', 'Email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                      <Input type="email" placeholder="you@example.com" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className="pl-11" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('auth.signup.phone', 'Phone')}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                      <Input type="tel" placeholder="+91 98765 43210" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} className="pl-11" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('auth.login.password', 'Password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                      <Input type="password" placeholder="••••••••" value={formData.password} onChange={(e) => updateField("password", e.target.value)} className="pl-11" required minLength={6} />
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('auth.signup.preferred_language', 'Preferred Language')}</Label>
                    <Select value={formData.preferred_language} onValueChange={(v) => updateField("preferred_language", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-[#64748B]">{t('auth.signup.language_note', 'This language will be used for real-time translation during video consultations.')}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('auth.signup.blood_group', 'Blood Group')}</Label>
                    <Select value={formData.blood_group} onValueChange={(v) => updateField("blood_group", v)}>
                      <SelectTrigger><SelectValue placeholder={t('auth.signup.select_blood_group', 'Select blood group')} /></SelectTrigger>
                      <SelectContent>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                          <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-4 bg-[#0D9488]/5 rounded-xl border border-[#0D9488]/20">
                    <div className="flex items-start gap-2">
                      <Globe className="w-5 h-5 text-[#0D9488] mt-0.5 shrink-0" />
                      <p className="text-sm text-[#0F172A]/70">
                        {t('auth.signup.translation_info', 'Netra AI supports real-time translation. If your doctor speaks Hindi and you speak Bengali, the system will translate automatically during your consultation.')}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('auth.signup.medical_conditions', 'Existing Medical Conditions')}</Label>
                    <textarea placeholder={t('auth.signup.medical_conditions_placeholder', 'e.g. Diabetes, Hypertension, Thyroid...')} value={formData.medical_conditions} onChange={(e) => updateField("medical_conditions", e.target.value)} rows={2}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#0D9488] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 transition-all resize-none bg-[#F8FAFC]" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('auth.signup.allergies', 'Allergies')}</Label>
                    <textarea placeholder={t('auth.signup.allergies_placeholder', 'Drug allergies, food allergies...')} value={formData.allergies} onChange={(e) => updateField("allergies", e.target.value)} rows={2}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#0D9488] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 transition-all resize-none bg-[#F8FAFC]" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('auth.signup.current_medications', 'Current Medications')}</Label>
                    <textarea placeholder={t('auth.signup.medications_placeholder', "List any medications you're currently taking...")} value={formData.current_medications} onChange={(e) => updateField("current_medications", e.target.value)} rows={2}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#0D9488] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 transition-all resize-none bg-[#F8FAFC]" />
                  </div>
                  <div className="p-4 bg-[#0D9488]/5 rounded-xl border border-[#0D9488]/20">
                    <p className="text-sm text-[#0F172A]/70">
                      {t('auth.signup.medical_info_note', 'This information will be securely shared with your doctor when you book a consultation, so they can be prepared beforehand.')}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-between mt-8 gap-4">
              {currentStep > 0 ? (
                <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-1" /> {t('common.back', 'Back')}
                </Button>
              ) : <div className="flex-1" />}
              {currentStep < steps.length - 1 ? (
                <Button type="button" onClick={nextStep} className="flex-1 bg-gradient-to-r from-[#0D9488] to-[#0F766E] text-white">
                  {t('common.next', 'Next')} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-[#0D9488] to-[#0F766E] text-white">
                  {loading ? t('auth.signup.creating', 'Creating...') : t('auth.signup.create_account', 'Create Account')}
                </Button>
              )}
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[#64748B]">
              {t('auth.login.have_account', 'Already have an account?')}{" "}
              <Link to="/login/patient" className="text-[#0D9488] font-semibold hover:underline">{t('auth.login.sign_in', 'Sign in')}</Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
