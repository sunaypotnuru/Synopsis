import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, UploadCloud, AlertCircle, Activity, ArrowLeft, ListChecks, ShieldCheck, HeartPulse, ArrowRight, Stethoscope } from 'lucide-react';
import { patientAPI } from '@/lib/api';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import Breadcrumb from "@/components/shared/Breadcrumb";

const CataractScanPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  interface CataractResult {
    status: string;
    confidence: number;
    heatmap_url?: string;
    attention_regions?: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      confidence: number;
      feature?: string;
    }>;
  }

  const [result, setResult] = useState<CataractResult | null>(null);
  const [error, setError] = useState('');
  const [qualityStatus, setQualityStatus] = useState<'checking' | 'good' | 'poor' | null>(null);
  const [qualityMessage, setQualityMessage] = useState<string>('');
  interface ScanHistory {
    id: string;
    image_url?: string;
    created_at: string;
    [key: string]: any;
  }

  const [history, setHistory] = useState<ScanHistory[]>([]);
  const [comparing, setComparing] = useState(false);

  React.useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await patientAPI.getScans();
      // Filter for cataract scans if they have a type
      setHistory(res.data || []);
    } catch (err) {
      console.error("Failed to load scan history", err);
    }
  };

  const scanId = (result as { id?: string })?.id;
  const historyItems = history.filter(s => s.id !== scanId);
  const previousScan = historyItems[0];

  const checkImageQuality = async (_file: File) => {
    // Quality check bypassed per user request
    setQualityStatus('good');
    setQualityMessage(t("patient.scan.quality_skipped", "Analyzing image..."));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
      setResult(null);
      setError('');
      checkImageQuality(selectedFile);
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
      const response = await patientAPI.analyzeCataractWithXAI(formData);
      setResult(response.data);
      loadHistory(); // Refresh history after new scan
    } catch (err) {
      const errorDetail = err instanceof Error && 'response' in err && (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(errorDetail || 'Analysis pipeline failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <motion.div 
      className="container mx-auto p-4 max-w-4xl space-y-6"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
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
        <Eye className="w-8 h-8 text-patient-primary" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("patient.cataract.title", "Cataract AI Scan")}</h1>
      </div>

      <p className="text-gray-600 dark:text-gray-300 text-lg">
        {t("patient.cataract.description", "Upload a clear close-up image of your eye to detect early indicators of cataracts using our ML model.")}
      </p>

      <Card className="p-8 shadow-lg border-t-4 border-t-patient-primary glass-card flex flex-col items-center">
        {!preview ? (
          <label className="w-full h-64 border-2 border-dashed border-gray-300 hover:border-patient-primary hover:bg-patient-primary/5 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all">
            <UploadCloud className="w-12 h-12 text-gray-400 mb-2" />
            <span className="text-gray-600 font-medium">{t("patient.cataract.upload_hint", "Click or drag an eye image here")}</span>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
          </label>
        ) : (
          <div className="flex flex-col items-center w-full">
            <div className="relative w-64 h-64 mb-6 rounded-full overflow-hidden border-4 border-patient-primary/20 shadow-lg">
              <img src={preview} alt="Eye preview" className="w-full h-full object-cover" />
              {analyzing && (
                <motion.div 
                  className="absolute left-0 top-0 w-full h-[2px] bg-green-400 shadow-[0_0_8px_4px_rgba(74,222,128,0.6)]"
                  animate={{ y: [0, 256, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              )}
              {qualityStatus && qualityStatus !== 'checking' && (
                <div className={`absolute bottom-0 left-0 right-0 p-3 text-[10px] font-medium backdrop-blur-md flex items-center justify-center gap-2
                  ${qualityStatus === 'good' ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'}`}
                >
                  {qualityStatus === 'good' ? <span>✓</span> : <AlertCircle className="w-4 h-4" />}
                  {qualityMessage}
                </div>
              )}
            </div>

            {!analyzing && !result && (
              <div className="flex gap-4">
                <Button onClick={uploadAndAnalyze} size="lg" className="bg-patient-primary hover:bg-green-700 w-48 shadow-lg">
                  <Activity className="w-5 h-5 mr-2" /> {t("common.start_scan", "Start Scan")}
                </Button>
                <Button onClick={() => setPreview(null)} variant="outline" size="lg" className="w-32">
                  {t("common.retake", "Retake")}
                </Button>
              </div>
            )}
            
            {analyzing && (
              <div className="flex flex-col items-center">
                <p className="text-patient-primary font-bold animate-pulse text-lg flex items-center gap-2">
                   <Activity className="w-5 h-5 animate-spin" /> {t("patient.cataract.analyzing", "Analyzing ocular density...")}
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
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="p-8 glass-card shadow-xl mt-6 relative overflow-hidden bg-gradient-to-tr from-white to-green-50/20 dark:from-slate-800 dark:to-slate-800">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  {t("patient.scan.results_title", "Scan Results")}
                </h2>
                {history.length > 1 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setComparing(!comparing)}
                    className="border-patient-primary text-patient-primary hover:bg-patient-primary/10"
                  >
                    {comparing ? t("common.hide_comparison", "Hide Comparison") : t("common.compare_history", "Compare with History")}
                  </Button>
                )}
              </div>

              {comparing && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs font-bold text-gray-500 uppercase">{t("common.current_scan", "Current")}</p>
                    <div className="w-full aspect-square rounded-lg overflow-hidden border-2 border-patient-primary shadow-sm">
                      <img src={result.heatmap_url || preview || ""} alt="Current" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-sm font-black text-patient-primary">{(result.confidence * 100).toFixed(1)}%</p>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <ArrowRight className="w-8 h-8 text-gray-300 hidden md:block" />
                    <div className="h-8 w-[2px] bg-gray-200 md:hidden" />
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs font-bold text-gray-500 uppercase">{t("common.previous_scan", "Previous Best")}</p>
                    {previousScan ? (
                      <>
                        <div className="w-full aspect-square rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm bg-white dark:bg-gray-800 flex items-center justify-center">
                          {previousScan.image_url ? (
                            <img src={previousScan.image_url} alt="Previous" className="w-full h-full object-cover" />
                          ) : (
                            <Eye className="w-12 h-12 text-gray-200" />
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-600">
                          {new Date(previousScan.created_at).toLocaleDateString()}
                        </p>
                      </>
                    ) : (
                      <div className="w-full aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 italic text-xs p-4 text-center">
                        {t("common.no_prior_scans", "No prior scans found for comparison")}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-6 bg-blue-50/50 dark:bg-blue-900/30 rounded-xl border border-blue-100 dark:border-blue-800/50">
                    <p className="text-blue-600 dark:text-blue-300 font-semibold mb-1">{t("patient.scan.diagnosis_status", "Diagnosis Status")}</p>
                    <p className="text-3xl font-black text-blue-900 dark:text-blue-100">{t(`models.prediction.${(result.status || '').toLowerCase()}`, result.status)}</p>
                  </div>
                  <div className="p-6 bg-green-50/50 dark:bg-green-900/30 rounded-xl border border-green-100 dark:border-green-800/50">
                    <p className="text-green-600 dark:text-green-300 font-semibold mb-1">{t("patient.scan.ai_confidence", "AI Confidence")}</p>
                    <p className="text-3xl font-black text-green-900 dark:text-green-100">{(result.confidence * 100).toFixed(1)}%</p>
                  </div>
                  
                  {result.attention_regions && result.attention_regions.length > 0 && (
                    <div className="p-4 bg-orange-50/50 dark:bg-orange-900/30 rounded-xl border border-orange-100 dark:border-orange-800/50">
                      <p className="text-orange-600 dark:text-orange-300 font-semibold mb-2 text-sm">{t("patient.scan.attention_regions", "Attention Regions")}</p>
                      <div className="flex flex-wrap gap-2">
                        {result.attention_regions.map((region, i) => (
                          <span key={i} className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-xs font-medium text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                            {typeof region === 'string' ? region : `${region.feature || 'Attention Area'} (${Math.round((region.confidence || 0) * 100)}%)`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      {/* What is Cataract Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <Card className="p-8 bg-gradient-to-r from-[#0D9488]/5 to-blue-500/5 border-none shadow-lg">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-md flex items-center justify-center flex-shrink-0">
              <Eye className="w-10 h-10 text-patient-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {t("patient.cataract.what_is_title", "What is Cataract?")}
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {t("patient.cataract.what_is_desc", "A cataract is a cloudy area in the lens of your eye. As we age, the proteins in our eye lens can clump together, causing the lens to become cloudy and yellowish. This prevents light from passing through clearly, leading to blurred or dim vision. Most cataracts develop slowly and don't disturb your eyesight early on, but eventually, they interfere with your vision.")}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* WHO Educational Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 pb-12">
        {/* Cataract Stages Section */}
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <Card className="p-6 h-full glass-card border-none shadow-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-patient-primary">
              <ListChecks className="w-6 h-6" />
              {t("patient.cataract.who_stages", "WHO Cataract Stages")}
            </h3>
            <div className="space-y-4">
              {[
                { title: t('patient.cataract.stage0', 'Immature Cataract'), desc: t('patient.cataract.stage0_desc', 'The lens is partially opaque. Vision is slightly blurred but often manageable with glasses.') },
                { title: t('patient.cataract.stage1', 'Mature Cataract'), desc: t('patient.cataract.stage1_desc', 'The lens is completely opaque. Significant vision loss. Surgery is typically recommended at this stage.') },
                { title: t('patient.cataract.stage2', 'Hypermature Cataract'), desc: t('patient.cataract.stage2_desc', 'The lens has become liquid or shrunken. Can lead to inflammation and glaucoma if left untreated.') },
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
                {t("patient.cataract.prevention", "Prevention Guidelines")}
              </h3>
              <ul className="space-y-3">
                {[
                  { icon: Eye, text: t('patient.cataract.prev1', 'Wear UV-protective sunglasses when outdoors.') },
                  { icon: Activity, text: t('patient.cataract.prev2', 'Manage blood sugar levels (Diabetes increases risk).') },
                  { icon: ShieldCheck, text: t('patient.cataract.prev3', 'Quit smoking and reduce alcohol consumption.') },
                  { icon: HeartPulse, text: t('patient.cataract.prev4', 'Maintain a diet rich in antioxidants (Vitamin C and E).') },
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
                {t("patient.cataract.treatments", "Standard Treatments")}
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-start gap-4 p-4 bg-purple-500/10 rounded-xl">
                  <ArrowRight className="w-5 h-5 text-purple-500 mt-1" />
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">{t('patient.cataract.treat1', 'Phacoemulsification')}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('patient.cataract.treat1_desc', 'Modern ultrasound surgery to break up and remove the cloudy lens.')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-blue-500/10 rounded-xl">
                  <ArrowRight className="w-5 h-5 text-blue-500 mt-1" />
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100">{t('patient.cataract.treat2', 'Laser-Assisted Surgery')}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('patient.cataract.treat2_desc', 'Using femtosecond lasers for higher precision in incision and lens fragmentation.')}</p>
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

export default CataractScanPage;

