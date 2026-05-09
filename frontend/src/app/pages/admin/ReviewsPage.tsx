import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Star, Trash2, User, Stethoscope, Calendar, MessageSquare, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

interface Review {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  rating: number;
  review?: string;
  created_at: string;
  patient_name: string;
  patient_email: string;
  doctor_name: string;
  doctor_specialty?: string;
  appointment?: {
    id: string;
    scheduled_at: string;
    type: string;
    status: string;
  };
}

export default function ReviewsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filterRating, setFilterRating] = useState<number | null>(null);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/reviews");
      return response.data as Review[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/admin/reviews/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Review deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete review");
    },
  });

  const getRatingBadgeColor = (rating: number) => {
    if (rating >= 4) return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
    if (rating >= 3) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
  };

  const filteredReviews = reviews?.filter(
    (review) => filterRating === null || review.rating === filterRating
  );

  const averageRating = reviews?.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews?.filter((r) => r.rating === rating).length || 0,
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#64748B] dark:text-gray-400">{t('admin.reviews_page.loading_reviews', "Loading reviews...")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-[#0F172A] dark:text-white mb-2">{t('admin.reviews_page.patient_reviews_ratings_1', "Patient Reviews & Ratings")}</h1>
              <p className="text-[#64748B] dark:text-gray-400">{t('admin.reviews_page.view_and_manage_all_2', "View and manage all patient feedback")}</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-lg px-4 py-2">
                <Star className="w-5 h-5 mr-2 text-yellow-500" />
                {averageRating} Average
              </Badge>
              <Badge className="text-lg px-4 py-2 bg-blue-500">
                {reviews?.length || 0} Total Reviews
              </Badge>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar - Rating Distribution */}
            <div className="lg:col-span-1">
              <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                <h2 className="text-xl font-bold text-[#0F172A] dark:text-white mb-4 flex items-center gap-2">
                  <Filter className="w-5 h-5" />{t('admin.reviews_page.filter_by_rating_3', "Filter by Rating")}</h2>
                
                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => setFilterRating(null)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      filterRating === null
                        ? "bg-[#0D9488] text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    All Reviews ({reviews?.length || 0})
                  </button>
                  {ratingDistribution.map(({ rating, count }) => (
                    <button
                      key={rating}
                      onClick={() => setFilterRating(rating)}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        filterRating === rating
                          ? "bg-[#0D9488] text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                          <span>{rating} Stars</span>
                        </div>
                        <span className="text-sm">({count})</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Rating Distribution Chart */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[#64748B] dark:text-gray-400 mb-3">{t('admin.reviews_page.distribution_4', "Distribution")}</h3>
                  {ratingDistribution.map(({ rating, count }) => {
                    const percentage = reviews?.length
                      ? (count / reviews.length) * 100
                      : 0;
                    return (
                      <div key={rating} className="flex items-center gap-2">
                        <span className="text-sm w-8">{rating}★</span>
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-yellow-500 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-[#64748B] dark:text-gray-400 w-12 text-right">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Reviews List */}
            <div className="lg:col-span-3 space-y-4">
              {filteredReviews && filteredReviews.length > 0 ? (
                filteredReviews.map((review) => (
                  <Card
                    key={review.id}
                    className="p-6 dark:bg-gray-800 dark:border-gray-700 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Patient Info */}
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-[#0F172A] dark:text-white">
                              {review.patient_name}
                            </h3>
                            <Badge className={`${getRatingBadgeColor(review.rating)} flex items-center gap-1`}>
                              <Star className="w-3 h-3 fill-current" />
                              {review.rating}/5
                            </Badge>
                          </div>
                          <p className="text-sm text-[#64748B] dark:text-gray-400">
                            {review.patient_email}
                          </p>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this review?")) {
                            deleteMutation.mutate(review.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Rating Stars */}
                    <div className="flex items-center gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= review.rating
                              ? "fill-yellow-500 text-yellow-500"
                              : "text-gray-300 dark:text-gray-600"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Review Text */}
                    {review.review && (
                      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-[#64748B] dark:text-gray-400 mt-1 flex-shrink-0" />
                          <p className="text-[#0F172A] dark:text-white">{review.review}</p>
                        </div>
                      </div>
                    )}

                    {/* Doctor Info */}
                    <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 flex-1">
                        <Stethoscope className="w-4 h-4 text-[#0D9488] dark:text-teal-400" />
                        <span className="text-sm text-[#64748B] dark:text-gray-400">{t('admin.reviews_page.doctor_5', "Doctor:")}</span>
                        <span className="text-sm font-semibold text-[#0F172A] dark:text-white">
                          {review.doctor_name}
                        </span>
                        {review.doctor_specialty && (
                          <Badge variant="outline" className="text-xs">
                            {review.doctor_specialty}
                          </Badge>
                        )}
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-2 text-sm text-[#64748B] dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(review.created_at), "MMM dd, yyyy")}
                      </div>
                    </div>

                    {/* Appointment Info */}
                    {review.appointment && (
                      <div className="mt-3 text-xs text-[#64748B] dark:text-gray-400">
                        Appointment: {format(new Date(review.appointment.scheduled_at), "MMM dd, yyyy HH:mm")} •{" "}
                        {review.appointment.type} • {review.appointment.status}
                      </div>
                    )}
                  </Card>
                ))
              ) : (
                <Card className="p-12 dark:bg-gray-800 dark:border-gray-700 text-center">
                  <Star className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-[#0F172A] dark:text-white mb-2">{t('admin.reviews_page.no_reviews_found_6', "No Reviews Found")}</h3>
                  <p className="text-[#64748B] dark:text-gray-400">
                    {filterRating !== null
                      ? `No reviews with ${filterRating} stars yet`
                      : "No patient reviews have been submitted yet"}
                  </p>
                </Card>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

