import { useState } from "react";
import { motion } from "motion/react";
import { Search, Book, Video, MessageCircle, FileText, HelpCircle, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";

export default function HelpCenterPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    {
      icon: Book,
      title: t('help.getting_started.title', 'Getting Started'),
      description: t('help.getting_started.desc', 'Learn the basics of Netra AI'),
      articles: 12,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      icon: Video,
      title: t('help.video_tutorials.title', 'Video Tutorials'),
      description: t('help.video_tutorials.desc', 'Watch step-by-step guides'),
      articles: 8,
      color: 'from-purple-500 to-pink-600'
    },
    {
      icon: FileText,
      title: t('help.user_guides.title', 'User Guides'),
      description: t('help.user_guides.desc', 'Detailed documentation'),
      articles: 24,
      color: 'from-green-500 to-emerald-600'
    },
    {
      icon: HelpCircle,
      title: t('help.troubleshooting.title', 'Troubleshooting'),
      description: t('help.troubleshooting.desc', 'Fix common issues'),
      articles: 16,
      color: 'from-red-500 to-orange-600'
    }
  ];

  const popularArticles = [
    t('help.articles.1', 'How to book a doctor appointment'),
    t('help.articles.2', 'Understanding your AI screening results'),
    t('help.articles.3', 'Setting up video consultations'),
    t('help.articles.4', 'Managing your medical records'),
    t('help.articles.5', 'Using the AI health chatbot'),
    t('help.articles.6', 'Medication reminders setup')
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            {t('help.title', 'Help Center')}
          </h1>
          <p className="text-xl text-slate-600">
            {t('help.subtitle', 'Find answers, guides, and support')}
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-6 h-6 text-slate-400" />
            <input
              type="text"
              placeholder={t('help.search_placeholder', 'Search for help...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-16 pr-6 py-5 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg shadow-lg"
            />
          </div>
        </motion.div>

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {categories.map((category, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Card className="p-6 hover:shadow-xl transition-all cursor-pointer group">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <category.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {category.title}
                </h3>
                <p className="text-slate-600 text-sm mb-3">
                  {category.description}
                </p>
                <p className="text-blue-600 text-sm font-medium">
                  {category.articles} {t('help.articles', 'articles')}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Popular Articles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            {t('help.popular_articles', 'Popular Articles')}
          </h2>
          <Card className="divide-y divide-slate-200">
            {popularArticles.map((article, index) => (
              <div
                key={index}
                className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between group"
              >
                <span className="text-slate-700 group-hover:text-blue-600 transition-colors">
                  {article}
                </span>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
            ))}
          </Card>
        </motion.div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="p-12 bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">
              {t('help.cant_find', 'Can\'t find what you\'re looking for?')}
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              {t('help.contact_support', 'Our support team is available 24/7 to help you')}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/contact"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors"
              >
                {t('help.contact_us', 'Contact Us')}
              </a>
              <a
                href="/faq"
                className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white/10 transition-colors"
              >
                {t('help.view_faq', 'View FAQ')}
              </a>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

