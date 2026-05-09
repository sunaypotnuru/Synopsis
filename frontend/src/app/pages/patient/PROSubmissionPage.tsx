import { useState, FormEvent, ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { patientAPI } from "@/lib/api";
import { ClipboardList, Send, CheckCircle, Clock, Calendar, ArrowLeft, Loader2, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";

export default function PROSubmissionPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  interface Question {
    id: string;
    text: string;
    type: string;
    options?: string[];
  }

  interface Questionnaire {
    id: string;
    name: string;
    frequency?: string;
    questions: Question[];
  }

  interface PROSubmission {
    questionnaire_id: string;
    submitted_at: string;
  }

  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Fetch assigned questionnaires
  const { data: questionnaires = [], isLoading } = useQuery({
    queryKey: ["patientPROQuestionnaires"],
    queryFn: () => patientAPI.getPROQuestionnaires().then((res: { data: Questionnaire[] }) => res.data)
  });

  // Fetch submission history
  const { data: submissions = [] } = useQuery({
    queryKey: ["patientPROSubmissions"],
    queryFn: (): Promise<PROSubmission[]> => (patientAPI.submitPROQuestionnaire({} as Parameters<typeof patientAPI.submitPROQuestionnaire>[0]) as Promise<{ data: PROSubmission[] }>).then((res) => res.data).catch(() => [])
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: (data: { questionnaire_id: string; responses: Array<{ question_id: string; question_text: string; answer: string }> }) => patientAPI.submitPROQuestionnaire(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patientPROSubmissions"] });
      queryClient.invalidateQueries({ queryKey: ["patientPROQuestionnaires"] });
      toast.success(t("patient.pro.submit_success", "Questionnaire submitted successfully!"));
      setSelectedQuestionnaire(null);
      setResponses({});
      setCurrentQuestionIndex(0);
    },
    onError: () => toast.error(t("patient.pro.submit_error", "Failed to submit questionnaire"))
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!selectedQuestionnaire) return;
    
    // Validate all questions answered
    const allAnswered = selectedQuestionnaire.questions.every(
      (q: Question) => responses[q.id] !== undefined && responses[q.id] !== ""
    );
    
    if (!allAnswered) {
      return toast.error(t("patient.pro.error_incomplete", "Please answer all questions"));
    }

    submitMutation.mutate({
      questionnaire_id: selectedQuestionnaire.id,
      responses: selectedQuestionnaire.questions.map((q: Question) => ({
        question_id: q.id,
        question_text: q.text,
        answer: responses[q.id]
      }))
    });
  };

  const handleNext = () => {
    if (!selectedQuestionnaire) return;
    const currentQuestion = selectedQuestionnaire.questions[currentQuestionIndex];
    if (!responses[currentQuestion.id] || responses[currentQuestion.id] === "") {
      return toast.error(t("patient.pro.error_answer_required", "Please answer this question before continuing"));
    }
    if (currentQuestionIndex < selectedQuestionnaire.questions.length - 1) {
      setCurrentQuestionIndex((prev: number) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev: number) => prev - 1);
    }
  };

  // Check if questionnaire is due based on frequency
  const isQuestionnaireDue = (q: Questionnaire) => {
    const lastSubmission = submissions.find((s: { questionnaire_id: string; submitted_at: string }) => s.questionnaire_id === q.id);
    if (!lastSubmission) return true;
    
    const lastDate = new Date(lastSubmission.submitted_at);
    const now = new Date();
    
    if (q.frequency === 'daily') {
      return lastDate.toDateString() !== now.toDateString();
    } else if (q.frequency === 'weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return lastDate < weekAgo;
    } else if (q.frequency === 'monthly') {
      return lastDate.getMonth() !== now.getMonth() || lastDate.getFullYear() !== now.getFullYear();
    } else if (q.frequency === 'once') {
      return false; // Already submitted once
    }
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0EA5E9]" />
      </div>
    );
  }

  // If viewing a specific questionnaire
  if (selectedQuestionnaire) {
    const currentQuestion = selectedQuestionnaire.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / selectedQuestionnaire.questions.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <Button 
            variant="ghost" 
            onClick={() => {
              setSelectedQuestionnaire(null);
              setResponses({});
              setCurrentQuestionIndex(0);
            }}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back", "Back to Questionnaires")}
          </Button>

          <Card className="p-8 shadow-xl border-2 border-blue-100">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-[#0F172A]">{selectedQuestionnaire.name}</h1>
                <span className="text-sm font-semibold text-[#0EA5E9] bg-[#0EA5E9]/10 px-3 py-1 rounded-full">
                  {currentQuestionIndex + 1} / {selectedQuestionnaire.questions.length}
                </span>
              </div>
              <Progress value={progress} className="h-2 mb-2" />
              <p className="text-sm text-gray-600">
                {t("patient.pro.progress_text", "Your responses help your doctor provide better care")}
              </p>
            </div>

            {/* Question Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="bg-gradient-to-r from-blue-50 to-teal-50 p-6 rounded-xl border-2 border-blue-100">
                  <Label className="text-xl font-bold text-[#0F172A] mb-4 block">
                    {currentQuestion.text}
                  </Label>

                  {currentQuestion.type === 'number' && (
                    <div className="space-y-4">
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={responses[currentQuestion.id] || ""}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setResponses({ ...responses, [currentQuestion.id]: e.target.value })}
                        placeholder={t("patient.pro.placeholder_number", "Enter a number from 1 to 10")}
                        className="text-lg p-6 text-center font-bold border-2 border-blue-200 focus:border-blue-400"
                      />
                      <div className="flex justify-between text-sm text-gray-600 px-2">
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-red-400"></span>
                          1 ({t("patient.pro.scale_low", "Low")})
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-green-400"></span>
                          10 ({t("patient.pro.scale_high", "High")})
                        </span>
                      </div>
                      {/* Visual scale */}
                      <div className="flex gap-2 justify-center mt-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setResponses({ ...responses, [currentQuestion.id]: num.toString() })}
                            className={`w-10 h-10 rounded-lg font-bold transition-all ${
                              responses[currentQuestion.id] === num.toString()
                                ? 'bg-[#0EA5E9] text-white scale-110 shadow-lg'
                                : 'bg-white border-2 border-gray-200 hover:border-[#0EA5E9] text-gray-600'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentQuestion.type === 'text' && (
                    <Textarea
                      value={responses[currentQuestion.id] || ""}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setResponses({ ...responses, [currentQuestion.id]: e.target.value })}
                      placeholder={t("patient.pro.placeholder_text", "Type your answer here...")}
                      rows={6}
                      className="text-lg border-2 border-blue-200 focus:border-blue-400"
                    />
                  )}

                  {currentQuestion.type === 'multiple_choice' && (
                    <div className="space-y-3">
                      {currentQuestion.options?.map((option) => (
                        <label 
                          key={option} 
                          className={`flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            responses[currentQuestion.id] === option
                              ? 'border-[#0EA5E9] bg-[#0EA5E9]/10 shadow-md'
                              : 'border-gray-200 hover:border-[#0EA5E9]/50 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={currentQuestion.id}
                            value={option}
                            checked={responses[currentQuestion.id] === option}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setResponses({ ...responses, [currentQuestion.id]: e.target.value })}
                            className="w-5 h-5 text-[#0EA5E9]"
                          />
                          <span className="text-lg font-medium">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between gap-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                    className="px-8"
                  >
                    {t("common.previous", "Previous")}
                  </Button>

                  {currentQuestionIndex < selectedQuestionnaire.questions.length - 1 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="px-8 bg-[#0EA5E9] hover:bg-[#0284C7]"
                    >
                      {t("common.next", "Next")}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitMutation.isPending}
                      className="px-8 bg-green-500 hover:bg-green-600"
                    >
                      {submitMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      {t("patient.pro.submit", "Submit")}
                    </Button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </Card>
        </div>
      </div>
    );
  }

  // Main view: List of questionnaires
  const pendingQuestionnaires = (questionnaires as Questionnaire[]).filter(isQuestionnaireDue);
  const completedSubmissions = (submissions as Array<{ id: string; questionnaire_id: string; submitted_at: string; pro_questionnaires?: { name?: string } }>).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="bg-gradient-to-r from-blue-500 to-teal-500 text-white p-8 rounded-2xl shadow-xl">
        <h1 className="text-4xl font-bold mb-2">{t("patient.pro.title", "Health Questionnaires")}</h1>
        <p className="text-blue-100 text-lg">
          {t("patient.pro.subtitle", "Complete these questionnaires to help your doctor track your progress")}
        </p>
      </div>

      {/* Pending Questionnaires */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-[#0F172A]">
          <Clock className="w-6 h-6 text-orange-500" />
          {t("patient.pro.pending", "Pending Questionnaires")}
          {pendingQuestionnaires.length > 0 && (
            <span className="text-sm font-semibold bg-orange-100 text-orange-600 px-3 py-1 rounded-full">
              {pendingQuestionnaires.length}
            </span>
          )}
        </h2>
        
        {pendingQuestionnaires.length === 0 ? (
          <Card className="p-12 text-center border-2 border-dashed border-gray-200">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {String(t("patient.pro.all_complete", "All Caught Up!"))}
            </h3>
            <p className="text-gray-600">
              {String(t("patient.pro.no_pending", "You have no pending questionnaires at this time."))}
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingQuestionnaires.map((q) => (
              <Card 
                key={q.id} 
                className="p-6 hover:shadow-2xl transition-all cursor-pointer border-2 border-blue-100 hover:border-blue-300 group"
                onClick={() => setSelectedQuestionnaire(q)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded-full uppercase tracking-wider">
                    {String(t(`patient.pro.freq_${q.frequency}`, { defaultValue: q.frequency || 'unknown' }))}
                  </span>
                </div>
                <h3 className="font-bold text-xl mb-2 text-[#0F172A] group-hover:text-[#0EA5E9] transition-colors">
                  {q.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {q.questions?.length || 0} {t("patient.pro.questions", "questions")} • 
                  {t("patient.pro.takes", "Takes")} ~{Math.ceil((q.questions?.length || 0) * 0.5)} {t("patient.pro.min", "min")}
                </p>
                <Button className="w-full bg-[#0EA5E9] hover:bg-[#0284C7] group-hover:scale-105 transition-transform">
                  {t("patient.pro.start", "Start Questionnaire")}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed Submissions */}
      {completedSubmissions.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-[#0F172A]">
            <CheckCircle className="w-6 h-6 text-green-500" />
            {t("patient.pro.recent", "Recent Submissions")}
          </h2>
          <div className="space-y-3">
            {completedSubmissions.map((submission) => (
              <Card key={submission.id} className="p-5 flex items-center justify-between hover:shadow-lg transition-shadow border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0F172A]">{submission.pro_questionnaires?.name || "Questionnaire"}</h4>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {t("patient.pro.submitted", "Submitted")} {new Date(submission.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <TrendingUp className="w-5 h-5 text-gray-400" />
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

