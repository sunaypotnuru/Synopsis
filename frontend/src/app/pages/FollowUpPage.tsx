import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Star, MessageSquare, CheckCircle, ArrowRight, Heart } from "lucide-react";
import { patientAPI } from "../../lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTranslation } from "../../lib/i18n";

export default function FollowUpPage() {
    const { t } = useTranslation();
    const { appointmentId } = useParams();
    const navigate = useNavigate();
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [review, setReview] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        // Check if already submitted
        if (appointmentId) {
            patientAPI.getFollowUp(appointmentId).then((res) => {
                if (res.data) setSubmitted(true);
            }).catch(() => { });
        }
    }, [appointmentId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            toast.error(t('patient.followup.select_rating', "Please select a rating before submitting."));
            return;
        }

        setIsSubmitting(true);
        try {
            await patientAPI.submitFollowUp({
                appointment_id: appointmentId,
                rating,
                review
            });
            toast.success(t('patient.followup.thank_you', "Thank you for your feedback!"));
            setSubmitted(true);
        } catch (error) {
            toast.error(t('patient.followup.submit_failed', "Failed to submit feedback. Ensure this is a valid appointment."));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 pt-24">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white max-w-md w-full rounded-3xl p-8 text-center shadow-xl border border-gray-100"
                >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                        <CheckCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('patient.followup.received', "Feedback Received!")}</h2>
                    <p className="text-gray-500 mb-8">{t('patient.followup.received_desc', "Thank you for helping us improve our care. Your response has been securely logged.")}</p>
                    <Button
                        onClick={() => navigate("/patient/dashboard")}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-6"
                    >
                        {t('patient.followup.return_dashboard', "Return to Dashboard")} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex flex-col items-center justify-center p-4 pt-24">

            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-8 h-8 text-pink-500" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">{t('patient.followup.title', "How did we do?")}</h1>
                <p className="text-gray-500 mt-2 max-w-sm mx-auto">{t('patient.followup.subtitle', "Please rate your recent consultation. Your feedback is strictly confidential.")}</p>
            </div>

            <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleSubmit}
                className="bg-white max-w-lg w-full rounded-3xl p-8 shadow-xl border border-gray-100"
            >
                <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-700 text-center mb-4">{t('patient.followup.overall_experience', "Overall Experience")}</label>
                    <div className="flex items-center justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                type="button"
                                key={star}
                                className={`p-2 transition-transform hover:scale-110 focus:outline-none`}
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHover(star)}
                                onMouseLeave={() => setHover(rating)}
                            >
                                <Star
                                    className={`w-10 h-10 ${star <= (hover || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                                />
                            </button>
                        ))}
                    </div>
                    <div className="text-center text-sm font-medium text-gray-400 mt-3 h-5">
                        {rating > 0 && [t('patient.followup.rating_poor', "Poor"), t('patient.followup.rating_fair', "Fair"), t('patient.followup.rating_good', "Good"), t('patient.followup.rating_verygood', "Very Good"), t('patient.followup.rating_excellent', "Excellent")][rating - 1]}
                    </div>
                </div>

                <div className="mb-8 relative">
                    <div className="absolute top-4 left-4 text-gray-400">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <textarea
                        rows={4}
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                        placeholder={t('patient.followup.review_placeholder', "Tell us what went well or what could be improved...")}
                        className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                    ></textarea>
                </div>

                <Button
                    type="submit"
                    disabled={isSubmitting || rating === 0}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-xl text-lg font-medium shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                    {isSubmitting ? t('common.submitting', "Submitting...") : t('patient.followup.submit', "Submit Feedback")}
                </Button>

                <button
                    type="button"
                    onClick={() => navigate("/patient/dashboard")}
                    className="w-full mt-4 text-gray-400 text-sm hover:text-gray-600 transition-colors"
                >
                    {t('patient.followup.skip', "Skip for now")}
                </button>
            </motion.form>
        </div>
    );
}
