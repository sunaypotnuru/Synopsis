import { useState } from "react";
import { motion } from "motion/react";
import { Search, FileText, FileSignature, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import axios from "axios";
import { useTranslation } from "../../lib/i18n";
import { AnimatePresence } from 'motion/react';

export default function SemanticSearchPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{documents: Array<{title: string; description?: string; similarity: number}>, soap_notes: Array<{created_at: string; assessment?: string; plan?: string; similarity: number}>}>({ documents: [], soap_notes: [] });
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      // Direct axios call because semantic search isn't in api.ts yet
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/search/semantic`, {
        params: { q: query },
        headers: { Authorization: `Bearer ${token}` }
      });
      setResults(res.data);
    } catch (err) {
      console.error(err);
      toast.error(t('search.error', 'Semantic search failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-6 bg-slate-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      <div className="max-w-4xl mx-auto relative z-10 w-full space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10 mt-6">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Search className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">{t('search.title', 'AI Semantic Search')}</h1>
          <p className="text-slate-500 mt-2 text-lg">{t('search.subtitle', 'Search through your medical history, documents, and doctor\'s notes using natural language.')}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <form onSubmit={handleSearch} className="relative w-full max-w-2xl mx-auto flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('search.placeholder', 'Try \'recent blood tests\' or \'headache medicine\'...')}
                className="pl-12 py-6 text-lg rounded-2xl shadow-sm border-slate-200 focus:ring-indigo-500/30 w-full"
              />
            </div>
            <Button type="submit" disabled={loading} className="py-6 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md text-lg font-bold">
              {loading ? t('search.searching', 'Searching...') : t('common.search', 'Search')}
            </Button>
          </form>
        </motion.div>

        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center py-20">
              <div className="flex items-center gap-3 text-indigo-600 font-semibold bg-indigo-50 px-6 py-3 rounded-full">
                <Search className="w-5 h-5 animate-pulse" />
                <span>{t('search.analyzing', 'Running vector inference across medical records...')}</span>
              </div>
            </motion.div>
          )}

          {!loading && hasSearched && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-8">
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Documents Column */}
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-slate-800">
                    <FileText className="w-5 h-5 text-indigo-500" /> {t('search.documents', 'Documents')} ({results.documents?.length || 0})
                  </h2>
                  <div className="space-y-4">
                    {results.documents?.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">{t('search.no_documents', 'No documents found')}</div>
                    ) : (
                      results.documents?.map((doc, i: number) => (
                        <Card key={'doc'+i} className="p-4 hover:shadow-md transition-shadow border-slate-200 relative overflow-hidden">
                          <div className="absolute top-0 right-0 py-1 px-3 bg-indigo-100 text-indigo-700 font-bold text-xs rounded-bl-lg">
                            {Math.round(doc.similarity * 100)}% {t('search.match', 'Match')}
                          </div>
                          <h3 className="font-bold text-slate-900 mt-2">{doc.title}</h3>
                          {doc.description && <p className="text-sm text-slate-600 mt-1 line-clamp-2">{doc.description}</p>}
                          <Button variant="link" className="p-0 h-auto mt-2 text-indigo-600 text-xs gap-1">{t('search.view_document', 'View Document')} <ArrowRight className="w-3 h-3"/></Button>
                        </Card>
                      ))
                    )}
                  </div>
                </div>

                {/* Clinical Notes Column */}
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-slate-800">
                    <FileSignature className="w-5 h-5 text-purple-500" /> {t('search.clinical_notes', 'Clinical Notes')} ({results.soap_notes?.length || 0})
                  </h2>
                  <div className="space-y-4">
                    {results.soap_notes?.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">{t('search.no_notes', 'No clinical notes found')}</div>
                    ) : (
                      results.soap_notes?.map((note, i: number) => (
                        <Card key={'note'+i} className="p-4 hover:shadow-md transition-shadow border-slate-200 relative overflow-hidden">
                          <div className="absolute top-0 right-0 py-1 px-3 bg-purple-100 text-purple-700 font-bold text-xs rounded-bl-lg">
                            {Math.round(note.similarity * 100)}% {t('search.match', 'Match')}
                          </div>
                          <h3 className="font-bold text-slate-900 mt-2 text-sm">{t('search.consultation_on', 'Consultation on')} {new Date(note.created_at).toLocaleDateString()}</h3>
                          <div className="mt-2 text-sm text-slate-600 space-y-1">
                            {note.assessment && <p><span className="font-semibold text-slate-800">{t('search.assessment', 'Assessment')}:</span> {note.assessment}</p>}
                            {note.plan && <p><span className="font-semibold text-slate-800">{t('search.plan', 'Plan')}:</span> {note.plan}</p>}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
