import { motion } from "motion/react";
import { Newspaper } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";

export default function PressPage() {
  const { t } = useTranslation();

  const pressReleases = [
    { title: t('press.release1', 'Netra AI Launches Mental Health Chatbot'), date: 'April 2026', outlet: 'TechCrunch India' },
    { title: t('press.release2', 'AI Healthcare Platform Reaches 50,000 Users'), date: 'March 2026', outlet: 'Healthcare IT News' },
    { title: t('press.release3', 'Netra AI Wins Best Healthcare Innovation Award'), date: 'February 2026', outlet: 'Indian Express' }
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">{t('press.title', 'Press & Media')}</h1>
          <p className="text-xl text-slate-600">{t('press.subtitle', 'Latest news and press releases')}</p>
        </motion.div>

        <div className="space-y-6">
          {pressReleases.map((release, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Newspaper className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{release.title}</h3>
                    <p className="text-slate-600">{release.outlet} • {release.date}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

