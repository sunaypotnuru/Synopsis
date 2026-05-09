import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Upload, Activity, AlertCircle, ArrowLeft, ShieldCheck, Stethoscope, HeartPulse } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { anemiaAPI } from "../../lib/api";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "../../lib/i18n";
import Breadcrumb from "@/components/shared/Breadcrumb";

interface AnemiaResult {
  prediction: "anemic" | "normal";
  confidence: number;
  hemoglobin_level: number;
  recommendation: string;
}

export default function AnemiaDetectionPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnemiaResult | null>(null);
  const [qualityStatus, setQualityStatus] = useState<'checking' | 'good' | 'poor' | null>(null);
  const [qualityMessage, setQualityMessage] = useState<string>('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (file: File) => anemiaAPI.detectAnemia(file),
    onSuccess: (res: { data: AnemiaResult }) => {
      setResult(res.data);
      toast.success(t("patient.scan.analysis_complete", "Analysis complete!"));
      queryClient.invalidateQueries({ queryKey: ['patientDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['patientHistory'] });
    },
    onError: (error: { response?: { data?: { detail?: string } }; message?: string }) => {
      console.error("Analysis error:", error);
      const errorMessage = error?.response?.data?.detail || error?.message || t("patient.scan.analysis_failed_msg", "Analysis failed. Please try again.");
      toast.error(errorMessage);
    }
  });

  const checkImageQuality = async (_file: File) => {
    // Quality check bypassed per user request
    setQualityStatus('good');
    setQualityMessage(t("patient.scan.quality_skipped", "Analyzing image..."));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // always clear value to allow re-selection of same file
    if (e.target) e.target.value = "";

    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error(t("patient.scan.err_invalid_type", "Please upload a valid image file (JPG, PNG, or WebP)"));
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(t("patient.scan.err_too_large", "Image size must be less than 10MB"));
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      mutation.reset(); // Reset error state
      checkImageQuality(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error(t("patient.scan.err_no_image", "Please select an image first"));
      return;
    }
    mutation.mutate(selectedFile);
  };
  const analyzing = mutation.isPending;

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setQualityStatus(null);
    setQualityMessage('');
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb />
        
        {/* Back to Models Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/patient/models")}
          className="mb-4 text-[#0D9488] hover:text-[#0F766E] hover:bg-[#F0FDFA]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("common.back_to_models", "Back to AI Models")}
        </Button>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{t('patient.scan.title', 'AI Anemia Detection')}</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            {t('patient.scan.subtitle', 'Upload an eye image for instant conjunctiva analysis')}
          </p>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('patient.scan.upload_image', 'Upload Image')}</h2>

              {!previewUrl ? (
                <div>
                  <label
                    htmlFor="file-upload"
                    className="block border-4 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-12 text-center hover:border-[#0D9488] transition-colors cursor-pointer bg-white dark:bg-gray-800"
                  >
                    <Upload className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-900 dark:text-white font-semibold mb-2">
                      {t('patient.scan.click_to_upload', 'Click to upload or drag and drop')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('patient.scan.file_types', 'PNG, JPG up to 10MB')}
                    </p>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div>
                  <div className="relative rounded-xl overflow-hidden mb-4 border border-gray-100 shadow-sm">
                    <img
                      src={previewUrl}
                      alt="Selected"
                      className="w-full h-64 object-cover"
                    />
                    {qualityStatus && qualityStatus !== 'checking' && (
                      <div className={`absolute bottom-0 left-0 right-0 p-3 text-sm font-medium backdrop-blur-md flex items-center justify-center gap-2
                        ${qualityStatus === 'good' ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'}`}
                      >
                        {qualityStatus === 'good' ? <span className="text-xl">✓</span> : <AlertCircle className="w-5 h-5" />}
                        {qualityMessage}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="flex-1 bg-[#0D9488] hover:bg-[#0F766E]"
                    >
                      {analyzing ? t('patient.scan.analyzing', 'Analyzing...') : t('patient.scan.analyze_btn', 'Analyze Image')}
                    </Button>
                    <Button variant="outline" onClick={handleReset}>
                      {t('common.reset', 'Reset')}
                    </Button>
                  </div>
                </div>
              )}

              {analyzing && (
                <div className="mt-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('patient.scan.analyzing_image', 'Analyzing image...')}</p>
                  <Progress value={75} className="h-2" />
                </div>
              )}

              {/* Guidelines */}
              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  {t('patient.scan.image_guidelines', 'Image Guidelines')}
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 ml-7">
                  <li>• {t('patient.scan.clear_image', 'Clear, well-lit eye image')}</li>
                  <li>• {t('patient.scan.focus_eyelid', 'Focus on lower eyelid conjunctiva')}</li>
                  <li>• {t('patient.scan.avoid_blurry', 'Avoid blurry or low-quality images')}</li>
                  <li>• {t('patient.scan.frontal_view', 'Frontal view works best')}</li>
                </ul>
              </div>
            </Card>

            {/* Results Section */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('patient.scan.analysis_results', 'Analysis Results')}</h2>

              {mutation.isError ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('patient.scan.analysis_err', 'Analysis Failed')}</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 max-w-sm">
                    {(mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || t('patient.scan.analysis_err_desc', "Unable to analyze the image. Please try again with a different image.")}
                  </p>
                  <Button onClick={() => mutation.reset()} variant="outline">
                    {t('common.try_again', 'Try Again')}
                  </Button>
                </div>
              ) : !result ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Activity className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('patient.scan.upload_to_see', 'Upload and analyze an image to see results')}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Prediction */}
                  <div className="text-center p-6 rounded-xl bg-gradient-to-br from-[#F43F5E]/10 to-[#C0392B]/10 dark:from-[#F43F5E]/20 dark:to-[#C0392B]/20 border-2 border-[#F43F5E]/20 dark:border-[#F43F5E]/30">
                    <h3 className="text-lg text-gray-600 dark:text-gray-300 mb-2">{t('patient.scan.prediction', 'Prediction')}</h3>
                    <p className={`text-4xl font-bold ${result.prediction === "anemic" ? "text-[#F43F5E]" : "text-[#0D9488]"
                      }`}>
                      {result.prediction === "anemic" ? t('models.prediction.anemic', "Anemic") : t('models.prediction.normal', "Normal")}
                    </p>
                  </div>

                  {/* Confidence */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{t('patient.scan.confidence', 'Confidence')}</span>
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {(result.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={result.confidence * 100}
                      className="h-3"
                    />
                  </div>

                  {/* Hemoglobin */}
                  <div className="p-4 bg-[#0EA5E9]/10 dark:bg-[#0EA5E9]/20 rounded-lg border border-[#0EA5E9]/20 dark:border-[#0EA5E9]/30">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{t('patient.scan.estimated_hb', 'Estimated Hemoglobin')}</p>
                    <p className="text-3xl font-bold text-[#0EA5E9]">
                      {result.hemoglobin_level?.toFixed(1)} <span className="text-lg">g/dL</span>
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {t('patient.scan.hb_range', 'Normal range: 12-16 g/dL (female), 14-18 g/dL (male)')}
                    </p>
                  </div>

                  {/* Recommendation */}
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t('patient.scan.recommendation', 'Recommendation')}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{result.recommendation}</p>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3 pt-4">
                    <Button
                      className="w-full bg-[#0EA5E9] hover:bg-[#0284C7]"
                      onClick={() => navigate("/patient/doctors")}
                    >
                      {t('patient.scan.book_consultation', 'Book Consultation')}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleReset}
                    >
                      {t('patient.scan.new_scan', 'New Scan')}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* WHO Educational Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 pb-12">
            {/* Anemia Severity Section */}
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <Card className="p-6 h-full glass-card border-none shadow-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#E11D48]">
                  <Activity className="w-6 h-6" />
                  {t("patient.anemia.who_severity", "WHO Anemia Severity (Adults)")}
                </h3>
                <div className="space-y-4">
                  {[
                    { title: t('patient.anemia.normal', 'Normal'), desc: t('patient.anemia.normal_desc', 'Hemoglobin ≥ 13.0 g/dL (Men) or ≥ 12.0 g/dL (Women). Healthy iron stores.') },
                    { title: t('patient.anemia.mild', 'Mild Anemia'), desc: t('patient.anemia.mild_desc', 'Hemoglobin 11.0 - 12.9 g/dL. May cause mild fatigue or shortness of breath.') },
                    { title: t('patient.anemia.moderate', 'Moderate Anemia'), desc: t('patient.anemia.moderate_desc', 'Hemoglobin 8.0 - 10.9 g/dL. Significant fatigue, pallor, and headache.') },
                    { title: t('patient.anemia.severe', 'Severe Anemia'), desc: t('patient.anemia.severe_desc', 'Hemoglobin < 8.0 g/dL. Medical emergency. Requires immediate clinical intervention.') },
                  ].map((stage, idx) => (
                    <div key={idx} className="p-3 bg-white/50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-[#E11D48]/30 transition-colors">
                      <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{stage.title}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{stage.desc}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            <div className="space-y-6">
              {/* Dietary Section */}
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <Card className="p-6 glass-card border-none shadow-xl bg-gradient-to-br from-red-500/5 to-transparent">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-600 dark:text-red-400">
                    <ShieldCheck className="w-6 h-6" />
                    {t("patient.anemia.dietary", "Dietary Recommendations")}
                  </h3>
                  <ul className="space-y-3">
                    {[
                      { icon: Activity, text: t('patient.anemia.diet1', 'Increase Heme iron (Red meat, poultry, seafood).') },
                      { icon: HeartPulse, text: t('patient.anemia.diet2', 'Plant-based iron (Spinach, lentils, beans, fortified cereals).') },
                      { icon: Activity, text: t('patient.anemia.diet3', 'Pair iron with Vitamin C (Oranges, peppers) for 3x absorption.') },
                      { icon: AlertCircle, text: t('patient.anemia.diet4', 'Avoid tea or coffee within 1 hour of meals (inhibits iron).') },
                    ].map((item, idx) => (
                      <li key={idx} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <item.icon className="w-5 h-5 flex-shrink-0 text-red-500" />
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>

              {/* Clinical Steps Section */}
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <Card className="p-6 glass-card border-none shadow-xl bg-gradient-to-br from-blue-500/5 to-transparent">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Stethoscope className="w-6 h-6" />
                    {t("patient.anemia.next_steps", "Recommended Next Steps")}
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-start gap-4 p-4 bg-blue-500/10 rounded-xl">
                      <Activity className="w-5 h-5 text-blue-500 mt-1" />
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-gray-100">{t('patient.anemia.step1', 'Complete Blood Count (CBC)')}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{t('patient.anemia.step1_desc', 'Confirm AI screening results with a standard laboratory venous blood test.')}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-green-500/10 rounded-xl">
                      <Activity className="w-5 h-5 text-green-500 mt-1" />
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-gray-100">{t('patient.anemia.step2', 'Tele-Consultation')}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{t('patient.anemia.step2_desc', 'Book a call with a Netra AI hematologist to discuss supplementation.')}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
