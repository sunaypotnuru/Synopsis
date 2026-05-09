import { motion } from "motion/react";
import { Building, Heart, Users, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";

export default function PartnersPage() {
  const { t } = useTranslation();

  const partners = [
    { name: t('partners.hospitals', 'Partner Hospitals'), count: '50+', icon: Building, color: 'from-blue-500 to-cyan-600' },
    { name: t('partners.ngos', 'NGO Partners'), count: '20+', icon: Heart, color: 'from-red-500 to-pink-600' },
    { name: t('partners.doctors', 'Healthcare Professionals'), count: '500+', icon: Users, color: 'from-green-500 to-emerald-600' },
    { name: t('partners.institutions', 'Academic Institutions'), count: '15+', icon: Globe, color: 'from-purple-500 to-indigo-600' }
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">{t('partners.title', 'Our Partners')}</h1>
          <p className="text-xl text-slate-600">{t('partners.subtitle', 'Collaborating to improve healthcare access')}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {partners.map((partner, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="p-6 text-center">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${partner.color} flex items-center justify-center mx-auto mb-4`}>
                  <partner.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">{partner.count}</h3>
                <p className="text-slate-600">{partner.name}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

