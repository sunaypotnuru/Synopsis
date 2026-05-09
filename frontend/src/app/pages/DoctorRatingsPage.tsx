import { useState } from 'react';
import { useTranslation } from '../../lib/i18n';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Star, MessageSquare, AlertCircle, ThumbsUp, Award } from 'lucide-react';
import { doctorAPI } from '../../lib/api';
import { Skeleton } from "@mui/material";

export default function DoctorRatingsPage() {
    const { t } = useTranslation();
    const [filterRating, setFilterRating] = useState('all');

    const { data: ratingsData, isLoading, error } = useQuery({
        queryKey: ['doctorRatings'],
        queryFn: () => doctorAPI.getRatings().then(res => res.data)
    });

    if (isLoading) {
        return (
            <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
                <div className="max-w-7xl mx-auto space-y-6">
                    <Skeleton width={300} height={40} />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} height={120} variant="rounded" />)}
                    </div>
                    <Card className="p-8">
                        <Skeleton height={400} variant="rounded" />
                    </Card>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen pt-20 px-6 flex flex-col items-center justify-center text-center bg-gray-50">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-lg font-bold text-red-900">{t("doctor.ratings.failed_load", "Failed to load ratings")}</h3>
                <p className="text-red-700">{(error as Error).message}</p>
            </div>
        );
    }

    const stats = ratingsData?.stats || {
        average_rating: 0,
        total_reviews: 0,
        five_star: 0,
        four_star: 0,
        three_star: 0,
        two_star: 0,
        one_star: 0
    };

    const reviews = ratingsData?.reviews || [];

    interface ReviewRecord {
        id: string;
        rating: number;
        patient_name?: string;
        created_at: string;
        comment?: string;
        appointment_id?: string;
    }

    const filteredReviews = filterRating === 'all'
        ? reviews
        : reviews.filter((r: ReviewRecord) => r.rating === parseInt(filterRating));

    const ratingDistribution = [
        { stars: 5, count: stats.five_star, percentage: (stats.five_star / stats.total_reviews * 100) || 0 },
        { stars: 4, count: stats.four_star, percentage: (stats.four_star / stats.total_reviews * 100) || 0 },
        { stars: 3, count: stats.three_star, percentage: (stats.three_star / stats.total_reviews * 100) || 0 },
        { stars: 2, count: stats.two_star, percentage: (stats.two_star / stats.total_reviews * 100) || 0 },
        { stars: 1, count: stats.one_star, percentage: (stats.one_star / stats.total_reviews * 100) || 0 },
    ];

    return (
        <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
            <div className="max-w-7xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-[#0F172A] mb-1">{t("doctor.ratings.title", "Patient Reviews & Ratings")}</h1>
                        <p className="text-[#64748B]">{t("doctor.ratings.subtitle", "See what your patients are saying about you")}</p>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-6 border border-gray-100 bg-white shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                                    <Star className="w-6 h-6 text-yellow-600 fill-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-[#0F172A]">
                                        {stats.average_rating.toFixed(1)}
                                    </p>
                                    <p className="text-sm text-gray-600">{t("doctor.ratings.average_rating", "Average Rating")}</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 border border-gray-100 bg-white shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                    <MessageSquare className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-[#0F172A]">{stats.total_reviews}</p>
                                    <p className="text-sm text-gray-600">{t("doctor.ratings.total_reviews", "Total Reviews")}</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 border border-gray-100 bg-white shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                                    <ThumbsUp className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-[#0F172A]">
                                        {Math.round((stats.five_star + stats.four_star) / stats.total_reviews * 100) || 0}%
                                    </p>
                                    <p className="text-sm text-gray-600">{t("doctor.ratings.positive", "Positive")}</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 border border-gray-100 bg-white shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                                    <Award className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-[#0F172A]">{stats.five_star}</p>
                                    <p className="text-sm text-gray-600">{t("doctor.ratings.five_star_reviews", "5-Star Reviews")}</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Rating Distribution */}
                        <Card className="p-6 border border-gray-100 bg-white shadow-sm">
                            <h3 className="text-lg font-bold text-[#0F172A] mb-4">{t("doctor.ratings.rating_distribution", "Rating Distribution")}</h3>
                            <div className="space-y-3">
                                {ratingDistribution.map((item) => (
                                    <div key={item.stars} className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 w-16">
                                            <span className="text-sm font-medium text-gray-700">{item.stars}</span>
                                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-yellow-500"
                                                    style={{ width: `${item.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                        <span className="text-sm text-gray-600 w-12 text-right">
                                            {item.count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Reviews List */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-[#0F172A]">{t("doctor.ratings.patient_reviews", "Patient Reviews")}</h3>
                                <div className="flex gap-2">
                                    {['all', '5', '4', '3', '2', '1'].map(rating => (
                                        <button
                                            key={rating}
                                            onClick={() => setFilterRating(rating)}
                                            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${filterRating === rating
                                                ? "bg-[#0EA5E9] text-white"
                                                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                                                }`}
                                        >
                                            {rating === 'all' ? t("common.all", "All") : `${rating}★`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {filteredReviews.length === 0 ? (
                                    <Card className="p-12 text-center border border-gray-100 bg-white">
                                        <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 font-medium">{t("doctor.ratings.no_reviews", "No reviews yet")}</p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            {t("doctor.ratings.reviews_appear_here", "Reviews will appear here after patients rate your consultations")}
                                        </p>
                                    </Card>
                                ) : (
                                    filteredReviews.map((review: ReviewRecord) => (
                                        <motion.div
                                            key={review.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <Card className="p-5 border border-gray-100 bg-white hover:shadow-md transition-shadow">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center text-[#0EA5E9] font-bold">
                                                            {review.patient_name?.charAt(0).toUpperCase() || 'P'}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-[#0F172A]">
                                                                {review.patient_name || t("doctor.ratings.anonymous_patient", "Anonymous Patient")}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {new Date(review.created_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={`w-4 h-4 ${i < review.rating
                                                                    ? 'text-yellow-500 fill-yellow-500'
                                                                    : 'text-gray-300'
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                {review.comment && (
                                                    <p className="text-sm text-gray-700 leading-relaxed">
                                                        {review.comment}
                                                    </p>
                                                )}
                                                {review.appointment_id && (
                                                    <p className="text-xs text-gray-400 mt-2">
                                                        {t("common.appointment", "Appointment")}: {review.appointment_id.slice(0, 8)}...
                                                    </p>
                                                )}
                                            </Card>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
