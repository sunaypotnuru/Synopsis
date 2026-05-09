import { motion } from "motion/react";
import { Users, Heart, Globe, TrendingUp, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";

export default function ImpactPage() {
  const { t } = useTranslation();

  const stats = [
    { icon: Users, value: "50,000+", label: t('impact.stats.users', 'Active Users'), color: 'from-blue-500 to-cyan-600' },
    { icon: Heart, value: "200,000+", label: t('impact.stats.screenings', 'Screenings Completed'), color: 'from-red-500 to-pink-600' },
    { icon: Globe, value: "500+", label: t('impact.stats.locations', 'Rural Locations'), color: 'from-green-500 to-emerald-600' },
    { icon: TrendingUp, value: "85%", label: t('impact.stats.early_detection', 'Early Detection Rate'), color: 'from-purple-500 to-indigo-600' }
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">{t('impact.title', 'Our Impact')}</h1>
          <p className="text-xl text-slate-600">{t('impact.subtitle', 'Making healthcare accessible to everyone, everywhere')}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="p-6 text-center">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-4`}>
                  <stat.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">{stat.value}</h3>
                <p className="text-slate-600">{stat.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="p-12 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 text-center">
          <Award className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('impact.mission.title', 'Our Mission')}</h2>
          <p className="text-lg text-slate-700 max-w-3xl mx-auto">{t('impact.mission.desc', 'To democratize healthcare access through AI technology, making quality medical screening and consultations available to underserved communities across India.')}</p>
        </Card>
      </div>
    </div>
  );
}

