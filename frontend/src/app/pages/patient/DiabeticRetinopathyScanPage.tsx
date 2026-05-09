import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanFace, UploadCloud, AlertCircle, Activity, Eye, AlertTriangle, CheckCircle, ShieldCheck, Stethoscope, HeartPulse, Info, ListChecks, ArrowRight, ArrowLeft } from 'lucide-react';
import { patientAPI } from '@/lib/api';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import Breadcrumb from "@/components/shared/Breadcrumb";

// DR Grade color mapping
const gradeColors = {
  0: { bg: 'bg-green-50 dark:bg-green-900/30', border: 'border-green-200 dark:border-green-800', text: 'text-green-900 dark:text-green-100', icon: CheckCircle },
  1: { bg: 'bg-yellow-50 dark:bg-yellow-900/30', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-900 dark:text-yellow-100', icon: AlertCircle },
  2: { bg: 'bg-orange-50 dark:bg-orange-900/30', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-900 dark:text-orange-100', icon: AlertTriangle },
  3: { bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800', text: 'text-red-900 dark:text-red-100', icon: AlertTriangle },
  4: { bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800', text: 'text-red-900 dark:text-red-100', icon: AlertTriangle }
};

const DiabeticRetinopathyScanPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  interface DRResult {
    grade: number;
    grade_name: string;
    description: string;
    confidence: number;
    referable: boolean;
    recommendation: string;
    probabilities?: Record<string, number>;
    heatmap_url?: string;
  }

  const [result, setResult] = useState<DRResult | null>(null);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
      setResult(null);
      setError('');
    }
  };

  const uploadAndAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError('');
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      const response = await patientAPI.analyzeDRWithXAI(formData);
      setResult(response.data);
    } catch (err) {
      const errorDetail = err instanceof Error && 'response' in err && (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(errorDetail || 'Analysis pipeline failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const gradeStyle = result ? gradeColors[result.grade as keyof typeof gradeColors] : gradeColors[0];
  const GradeIcon = gradeStyle?.icon || Eye;

  return (
    <motion.div 
      className="container mx-auto p-4 max-w-4xl space-y-6"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
    >
      <Breadcrumb />
      
      <Button 
        variant="ghost" 
        onClick={() => navigate("/patient/models")} 
        className="mb-4 text-[#0D9488] hover:text-[#0F766E] hover:bg-[#F0FDFA]"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t("common.back_to_models", "Back to AI Models")}
      </Button>

      <div className="flex items-center gap-3">
        <ScanFace className="w-8 h-8 text-patient-primary" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("patient.dr.title", "Diabetic Retinopathy AI")}</h1>
      </div>

      <p className="text-gray-600 dark:text-gray-300 text-lg">
        {t("patient.dr.description", "FDA-compliant AI screening for diabetic retinopathy. Upload a retinal fundus image for instant analysis.")}
      </p>

      {/* Model Info Badge */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Eye className="w-4 h-4" />
        <span>EfficientNet-B5 • Kappa: 0.8527 • Sensitivity: 85.62% • FDA Compliant</span>
      </div>

      <Card className="p-8 shadow-2xl glass-card flex flex-col items-center border-[3px] border-gray-100 dark:border-gray-800 bg-black/5 dark:bg-black/40">
        {!preview ? (
          <label className="w-full h-72 border border-dashed border-patient-primary/50 hover:bg-patient-primary/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all">
            <UploadCloud className="w-16 h-16 text-patient-primary mb-2 opacity-80" />
            <span className="text-patient-primary font-medium">{t("patient.dr.upload_hint", "Select Fundus Image")}</span>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
          </label>
        ) : (
          <div className="flex flex-col items-center w-full">
            <div className="relative w-full max-w-md h-72 mb-6 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.3)] bg-black">
              <img src={preview} alt="Fundus preview" className="w-full h-full object-contain opacity-90" />
              
              {/* Fundus camera targeting overlay */}
              <div className="absolute inset-0 border-2 border-patient-primary/30 rounded-2xl pointer-events-none" />
              <div className="absolute inset-x-1/2 top-0 bottom-0 w-[1px] bg-patient-primary/30" />
              <div className="absolute inset-y-1/2 left-0 right-0 h-[1px] bg-patient-primary/30" />
              
              {analyzing && (
                <motion.div 
                  className="absolute left-0 top-0 w-full h-[3px] bg-red-500 shadow-[0_0_12px_4px_rgba(239,68,68,0.8)] mix-blend-screen"
                  animate={{ y: [0, 288, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </div>

            {!analyzing && !result && (
              <div className="flex gap-4">
                <Button onClick={uploadAndAnalyze} size="lg" className="bg-patient-primary hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white w-56 font-bold shadow-lg">
                  <ScanFace className="w-5 h-5 mr-2" /> {t("common.start_scan", "Start Retinal Scan")}
                </Button>
                <Button onClick={() => setPreview(null)} variant="outline" size="lg" className="w-32 dark:text-gray-200 dark:hover:text-gray-100">
                  {t("common.retake", "Retake")}
                </Button>
              </div>
            )}
            
            {analyzing && (
              <div className="flex flex-col items-center">
                <p className="text-red-500 font-bold animate-pulse text-lg flex items-center gap-2">
                   <Activity className="w-5 h-5 animate-spin" /> {t("patient.dr.analyzing", "Analyzing with EfficientNet-B5...")}
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-6 w-full max-w-md">
            <AlertCircle className="w-5 h-5" /> {error}
          </Alert>
        )}
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-8 glass-card shadow-2xl mt-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800 dark:text-gray-100">
                <Eye className="w-6 h-6" />
                {t("patient.scan.results_title", "Diagnostic Results")}
              </h2>
              
              {/* Main Result */}
              <div className={`p-6 ${gradeStyle.bg} rounded-xl border-2 ${gradeStyle.border} mb-6`}>
                <div className="flex items-center gap-3 mb-2">
                  <GradeIcon className={`w-8 h-8 ${gradeStyle.text}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {t("patient.dr.grade", "DR Grade")} {result.grade}
                    </p>
                    <p className={`text-3xl font-black ${gradeStyle.text}`}>
                      {result.grade_name}
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mt-2">
                  {result.description}
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/30 rounded-xl border border-blue-100 dark:border-blue-800/50">
                  <p className="text-blue-600 dark:text-blue-300 font-semibold mb-1 text-sm">
                    {t("patient.scan.confidence", "Confidence")}
                  </p>
                  <p className="text-2xl font-black text-blue-900 dark:text-blue-100">
                    {(result.confidence * 100).toFixed(1)}%
                  </p>
                </div>
                <div className={`p-4 rounded-xl border ${result.referable ? 'bg-red-50/50 dark:bg-red-900/30 border-red-100 dark:border-red-800/50' : 'bg-green-50/50 dark:bg-green-900/30 border-green-100 dark:border-green-800/50'}`}>
                  <p className={`font-semibold mb-1 text-sm ${result.referable ? 'text-red-600 dark:text-red-300' : 'text-green-600 dark:text-green-300'}`}>
                    {t("patient.dr.referable", "Referable")}
                  </p>
                  <p className={`text-2xl font-black ${result.referable ? 'text-red-900 dark:text-red-100' : 'text-green-900 dark:text-green-100'}`}>
                    {result.referable ? t("common.yes", "Yes") : t("common.no", "No")}
                  </p>
                </div>
              </div>

              {/* Clinical Recommendation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="p-6 bg-purple-50/50 dark:bg-purple-900/30 rounded-xl border border-purple-100 dark:border-purple-800/50">
                  <p className="text-purple-600 dark:text-purple-300 font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {t("patient.dr.recommendation", "Clinical Recommendation")}
                  </p>
                  <p className="text-lg text-purple-900 dark:text-purple-100 font-medium">
                    {result.recommendation}
                  </p>
                </div>

                {result.heatmap_url && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-patient-primary" /> {t("patient.scan.explainability_map", "Explainability Heatmap")}
                    </p>
                    <div className="relative rounded-xl overflow-hidden border-2 border-patient-primary/20 shadow-md aspect-square bg-slate-100">
                      <img src={result.heatmap_url} alt="XAI Heatmap" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                        <p className="text-[10px] text-white/90 leading-tight">
                          {t("patient.scan.heatmap_desc", "Red regions indicate high-importance features used by the AI for this diagnosis.")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Probability Distribution */}
              {result.probabilities && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
                    {t("patient.dr.probability_distribution", "Probability Distribution")}
                  </p>
                  {Object.entries(result.probabilities).map(([grade, prob]) => (
                    <div key={grade} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">{grade}</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {(prob * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-patient-primary to-green-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${prob * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Retake Button */}
              <div className="mt-6 flex justify-center">
                <Button 
                  onClick={() => { setPreview(null); setResult(null); }} 
                  variant="outline" 
                  size="lg"
                  className="w-full max-w-xs dark:text-gray-200 dark:hover:text-gray-100"
                >
                  {t("common.scan_another", "Scan Another Image")}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* What is DR Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <Card className="p-8 bg-gradient-to-r from-red-500/5 to-orange-500/5 border-none shadow-lg">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-2xl shadow-md flex items-center justify-center flex-shrink-0">
              <Activity className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {t("patient.dr.what_is_title", "What is Diabetic Retinopathy?")}
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {t("patient.dr.what_is_desc", "Diabetic retinopathy is a diabetes complication that affects eyes. It's caused by damage to the blood vessels of the light-sensitive tissue at the back of the eye (retina). At first, diabetic retinopathy might cause no symptoms or only mild vision problems. Eventually, it can cause blindness. The condition can develop in anyone who has type 1 or type 2 diabetes.")}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* WHO Educational Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 pb-12">
        {/* DR Stages Section */}
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <Card className="p-6 h-full glass-card border-none shadow-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-patient-primary">
              <ListChecks className="w-6 h-6" />
              WHO DR Stages
            </h3>
            <div className="space-y-4">
              {[
                { title: 'Grade 0: No DR', desc: 'No visible abnormalities. High-quality annual screening is recommended.' },
                { title: 'Grade 1: Mild NPDR', desc: 'Microaneurysms only. Requires annual monitoring of blood glucose levels.' },
                { title: 'Grade 2: Moderate NPDR', desc: 'Microaneurysms, hemorrhages, and hard exudates. Referral within 3-6 months.' },
                { title: 'Grade 3: Severe NPDR', desc: 'Extensive hemorrhages or venous beading. Urgent referral to an ophthalmologist.' },
                { title: 'Grade 4: Proliferative DR', desc: 'New vessel growth or vitreous hemorrhage. Immediate surgical consultation required.' },
              ].map((stage, idx) => (
                <div key={idx} className="p-3 bg-white/50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-patient-primary/30 transition-colors">
                  <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{stage.title}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{stage.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <div className="space-y-6">
          {/* Prevention Section */}
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <Card className="p-6 glass-card border-none shadow-xl bg-gradient-to-br from-patient-primary/5 to-transparent">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-6 h-6" />
                Prevention Guidelines
              </h3>
              <ul className="space-y-3">
                {[
                  { icon: Activity, text: 'Maintain HbA1c < 7.0% through diet and medication.' },
                  { icon: HeartPulse, text: 'Strict Blood Pressure control (< 130/80 mmHg).' },
                  { icon: ListChecks, text: 'Manage serum lipids and cholesterol levels.' },
                  { icon: Info, text: 'Get a comprehensive dilated eye exam at least once a year.' },
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <item.icon className="w-5 h-5 flex-shrink-0 text-blue-500" />
                    {item.text}
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>

          {/* Treatment Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Card className="p-6 glass-card border-none shadow-xl bg-gradient-to-br from-purple-500/5 to-transparent">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Stethoscope className="w-6 h-6" />
                Standard Treatments
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-start gap-4 p-4 bg-purple-500/10 rounded-xl">
                  <ArrowRight className="w-5 h-5 text-purple-500 mt-1" />
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">Anti-VEGF Therapy</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Injections like Aflibercept to reduce swelling and abnormal vessel growth.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-blue-500/10 rounded-xl">
                  <ArrowRight className="w-5 h-5 text-blue-500 mt-1" />
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">Laser Photocoagulation</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Uses laser light to seal leaking vessels or shrink abnormal growth.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-green-500/10 rounded-xl">
                  <ArrowRight className="w-5 h-5 text-green-500 mt-1" />
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">Vitrectomy</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Surgical removal of vitreous gel to treat severe hemorrhage or detachment.</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default DiabeticRetinopathyScanPage;

