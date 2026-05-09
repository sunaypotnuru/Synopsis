/**
 * AI Quality Feedback Component
 * 
 * Allows users to provide feedback on AI-generated responses
 * Features:
 * - Rating system (1-5 stars)
 * - Feedback categories
 * - Free-text comments
 * - Submission tracking
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Star, ThumbsUp, ThumbsDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { aiAPI } from '@/services/api';

interface AIQualityFeedbackProps {
  messageId: string;
  onClose: () => void;
}

const FEEDBACK_CATEGORIES = [
  { id: 'accurate', label: 'Accurate', icon: CheckCircle, color: 'text-green-600' },
  { id: 'helpful', label: 'Helpful', icon: ThumbsUp, color: 'text-blue-600' },
  { id: 'incomplete', label: 'Incomplete', icon: AlertTriangle, color: 'text-amber-600' },
  { id: 'inaccurate', label: 'Inaccurate', icon: ThumbsDown, color: 'text-red-600' },
];

export function AIQualityFeedback({ messageId, onClose }: AIQualityFeedbackProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please provide a rating');
      return;
    }

    setIsSubmitting(true);

    try {
      await aiAPI.submitFeedback({
        request_id: messageId,
        rating: rating as 1 | 2 | 3 | 4 | 5,
        feedback_type: selectedCategories.length > 0 ? selectedCategories[0] as any : 'general',
        comment: comment.trim() || undefined,
        is_helpful: rating >= 3,
      });

      toast.success('Thank you for your feedback!');
      onClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="w-full max-w-md p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Rate AI Response Quality
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Star Rating */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Overall Quality
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= (hoveredRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {rating === 0 && 'Click to rate'}
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </p>
            </div>

            {/* Feedback Categories */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Feedback Categories (Optional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FEEDBACK_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  const isSelected = selectedCategories.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryToggle(category.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${category.color}`} />
                      <span className="text-xs font-medium text-gray-700">
                        {category.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Comments (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts on how we can improve..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-400 focus:ring-2 focus:ring-purple-200 outline-none text-sm resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                disabled={rating === 0 || isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
