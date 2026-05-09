import { motion } from "motion/react";
import { Briefcase, MapPin, Clock, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";

export default function CareersPage() {
  const { t } = useTranslation();

  const openings = [
    { title: t('careers.job1', 'Senior AI Engineer'), location: 'Bangalore', type: 'Full-time', department: 'Engineering' },
    { title: t('careers.job2', 'Product Manager'), location: 'Remote', type: 'Full-time', department: 'Product' },
    { title: t('careers.job3', 'Healthcare Data Scientist'), location: 'Bangalore', type: 'Full-time', department: 'Data Science' },
    { title: t('careers.job4', 'UX Designer'), location: 'Hybrid', type: 'Full-time', department: 'Design' }
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">{t('careers.title', 'Join Our Team')}</h1>
          <p className="text-xl text-slate-600">{t('careers.subtitle', 'Help us revolutionize healthcare with AI')}</p>
        </motion.div>

        <div className="space-y-6">
          {openings.map((job, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="p-6 hover:shadow-xl transition-all cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{job.title}</h3>
                    <div className="flex flex-wrap gap-4 text-slate-600">
                      <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {job.location}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {job.type}</span>
                      <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {job.department}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-2 transition-all" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-12">
          <Card className="p-12 bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-center">
            <h2 className="text-3xl font-bold mb-4">{t('careers.cta.title', 'Don\'t see a perfect fit?')}</h2>
            <p className="text-xl text-blue-100 mb-8">{t('careers.cta.subtitle', 'Send us your resume and we\'ll keep you in mind for future opportunities')}</p>
            <a href="mailto:careers@netra-ai.com" className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors">
              {t('careers.cta.button', 'Send Resume')}
            </a>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

