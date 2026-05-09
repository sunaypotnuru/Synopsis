import { useState } from "react";
import { Star, Send, User, MessageSquare, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";

export function ReviewSection() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    if (!comment.trim()) {
      toast.error("Please leave a comment");
      return;
    }

    setIsSubmitting(true);
    try {
      // Map to contact submission as a "Review" category
      await api.post("/api/v1/contact/submit", {
        name: name || "Anonymous Patient",
        email: "anonymous@netra.ai",
        phone: "",
        message: `[STARS: ${rating}/5] ${comment}`
      });
      
      toast.success("Thank you for your feedback!");
      setRating(0);
      setComment("");
      setName("");
    } catch (error) {
      console.error("Failed to submit review:", error);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-24 bg-gray-50 dark:bg-slate-900 overflow-hidden">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            How was your experience?
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Your feedback helps us industrialize healthcare for everyone.
          </p>
        </motion.div>

        <Card className="p-8 shadow-2xl glass-card border-none bg-white dark:bg-slate-800">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Star Rating */}
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Tap to Rate</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    className="transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`w-12 h-12 transition-colors ${
                        star <= (hover || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-lg font-bold text-[#0D9488]">
                  {rating === 5 ? "Excellent!" : rating === 4 ? "Very Good" : rating === 3 ? "Good" : rating === 2 ? "Fair" : "Poor"}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Your Name (Optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-slate-900 focus:border-[#0D9488] focus:outline-none transition-all"
                />
              </div>

              <div className="relative">
                <div className="absolute top-4 left-4 pointer-events-none">
                  <MessageSquare className="w-5 h-5 text-gray-400" />
                </div>
                <textarea
                  rows={4}
                  placeholder="Tell us what you liked or what we can improve..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-slate-900 focus:border-[#0D9488] focus:outline-none transition-all resize-none"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-[#0D9488] to-[#0EA5E9] text-white py-8 text-xl font-bold shadow-xl hover:shadow-2xl hover:scale-[1.01] transition-all disabled:opacity-70"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Activity className="w-5 h-5 animate-spin" /> Submitting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-6 h-6" /> Submit My Review
                </span>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`rounded-3xl ${className}`}>
      {children}
    </div>
  );
}
