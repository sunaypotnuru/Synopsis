import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Copy, Share2, Users, Gift, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "../../lib/api";
import { toast } from "sonner";
import { useTranslation } from "../../lib/i18n";

interface ReferralStats {
  total_referrals: number;
  successful: number;
  pending: number;
  referred_users: Array<{
    name: string;
    joined_at: string;
  }>;
}

export default function ReferralPage() {
  const { t } = useTranslation();
  const [referralCode, setReferralCode] = useState("");
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [codeRes, statsRes] = await Promise.all([
          api.get("/api/v1/referrals/my-code"),
          api.get("/api/v1/referrals/stats")
        ]);

        setReferralCode(codeRes.data.referral_code);
        setStats(statsRes.data);
      } catch (error) {
        console.error("Error loading referral data:", error);
        toast.error(t('patient.referral.load_failed', "Failed to load referral data"));
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [t]);

  const copyToClipboard = () => {
    const referralLink = `${window.location.origin}/register?ref=${referralCode}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(t('patient.referral.copylink_success', "Referral link copied!"));
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = async () => {
    const referralLink = `${window.location.origin}/register?ref=${referralCode}`;
    const text = t('patient.referral.share_text', { defaultValue: "Join NetraAI and get 25 bonus points! Use my referral code: {{code}}", code: referralCode });

    if (navigator.share) {
      try {
        await navigator.share({
          title: t('patient.referral.share_title', "Join NetraAI"),
          text: text,
          url: referralLink
        });
      } catch (error) {
        console.log("Share cancelled");
      }
    } else {
      copyToClipboard();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#64748B]">{t('patient.referral.loading', "Loading referral data...")}</p>
        </div>
      </div>
    );
  }

  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC]">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-[#0F172A] mb-2">{t('patient.referral.title', "Refer & Earn")}</h1>
          <p className="text-[#64748B] mb-8">
            {t('patient.referral.desc', "Invite your friends and earn rewards together!")}
          </p>

          {/* Referral Code Card */}
          <Card className="p-8 mb-8 bg-gradient-to-br from-[#0D9488]/10 to-transparent border-2 border-[#0D9488]">
            <div className="text-center">
              <div className="inline-block p-4 bg-white rounded-full mb-4">
                <Gift className="w-12 h-12 text-[#0D9488]" />
              </div>
              <h2 className="text-2xl font-bold text-[#0F172A] mb-2">
                {t('patient.referral.your_code', "Your Referral Code")}
              </h2>
              <div className="inline-block bg-white px-8 py-4 rounded-lg mb-6">
                <p className="text-4xl font-bold text-[#0D9488] tracking-wider">
                  {referralCode}
                </p>
              </div>
              <p className="text-[#64748B] mb-6">
                {t('patient.referral.code_desc', "Share this code with friends and earn 50 points for each successful referral!")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
                <div className="flex-1">
                  <Input
                    value={referralLink}
                    readOnly
                    className="text-center"
                  />
                </div>
                <Button
                  onClick={copyToClipboard}
                  className="bg-gradient-to-r from-[#0D9488] to-[#0F766E] hover:from-[#0F766E] hover:to-[#065F46]"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      {t('patient.referral.copied', "Copied!")}
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 mr-2" />
                      {t('patient.referral.copy_link', "Copy Link")}
                    </>
                  )}
                </Button>
                <Button
                  onClick={shareReferral}
                  variant="outline"
                  className="border-[#0D9488] text-[#0D9488] hover:bg-[#0D9488]/10"
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  {t('common.share', "Share")}
                </Button>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-[#64748B]">{t('patient.referral.total_referrals', "Total Referrals")}</p>
                  <p className="text-2xl font-bold text-[#0F172A]">
                    {stats?.total_referrals || 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-[#64748B]">{t('patient.referral.successful', "Successful")}</p>
                  <p className="text-2xl font-bold text-[#0F172A]">
                    {stats?.successful || 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-[#64748B]">{t('patient.referral.points_earned', "Points Earned")}</p>
                  <p className="text-2xl font-bold text-[#0F172A]">
                    {(stats?.successful || 0) * 50}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* How it Works */}
          <Card className="p-8 mb-8">
            <h3 className="text-2xl font-bold text-[#0F172A] mb-6">{t('patient.referral.how_it_works', "How It Works")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#0D9488] to-[#0F766E] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <h4 className="font-semibold text-[#0F172A] mb-2">{t('patient.referral.step1_title', "Share Your Code")}</h4>
                <p className="text-sm text-[#64748B]">
                  {t('patient.referral.step1_desc', "Share your unique referral code with friends and family")}
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#0D9488] to-[#0F766E] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <h4 className="font-semibold text-[#0F172A] mb-2">{t('patient.referral.step2_title', "They Sign Up")}</h4>
                <p className="text-sm text-[#64748B]">
                  {t('patient.referral.step2_desc', "Your friends register using your referral code")}
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#0D9488] to-[#0F766E] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <h4 className="font-semibold text-[#0F172A] mb-2">{t('patient.referral.step3_title', "Earn Rewards")}</h4>
                <p className="text-sm text-[#64748B]">
                  {t('patient.referral.step3_desc', "You get 50 points, they get 25 points!")}
                </p>
              </div>
            </div>
          </Card>

          {/* Referred Users */}
          {stats && stats.referred_users.length > 0 && (
            <Card className="p-8">
              <h3 className="text-2xl font-bold text-[#0F172A] mb-6">
                {t('patient.referral.your_referrals', { defaultValue: "Your Referrals ({{count}})", count: stats.referred_users.length })}
              </h3>
              <div className="space-y-4">
                {stats.referred_users.map((user, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold text-[#0F172A]">{user.name}</p>
                      <p className="text-sm text-[#64748B]">
                        {t('patient.referral.joined', { defaultValue: "Joined {{date}}", date: new Date(user.joined_at).toLocaleDateString() })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[#0D9488] font-semibold">{t('patient.referral.plus_points', "+50 points")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
