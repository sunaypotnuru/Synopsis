import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";

export default function ResearchPage() {
  const { t } = useTranslation();

  const publications = [
    { title: t('research.pub1.title', 'AI-Powered Anemia Detection Using Conjunctival Images'), journal: 'Journal of Medical AI', year: '2025', citations: 45 },
    { title: t('research.pub2.title', 'Deep Learning for Diabetic Retinopathy Screening'), journal: 'Healthcare Technology Review', year: '2025', citations: 32 },
    { title: t('research.pub3.title', 'Voice Analysis for Early Parkinson\'s Detection'), journal: 'Neurology & AI', year: '2024', citations: 28 }
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">{t('research.title', 'Research & Publications')}</h1>
          <p className="text-xl text-slate-600">{t('research.subtitle', 'Advancing healthcare through AI research')}</p>
        </motion.div>

        <div className="space-y-6">
          {publications.map((pub, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="p-6 hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{pub.title}</h3>
                <p className="text-slate-600 mb-2">{pub.journal} • {pub.year}</p>
                <p className="text-sm text-slate-500">{pub.citations} citations</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

