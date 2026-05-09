import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Bell, Mail, Smartphone, Save, Eye, Type, Activity } from "lucide-react";
import { useAccessibilityStore } from "../../lib/accessibility";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { preferencesAPI } from "../../lib/api";
import { useThemeStore } from "../../lib/themeStore";
import { useTranslation } from "../../lib/i18n";

import { NotificationSettings } from "../../components/features/notifications/NotificationSettings";

export default function NotificationSettingsPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    email_enabled: true,
    push_enabled: true,
    sms_enabled: false,
    appointment_reminders: true,
    scan_results: true,
    prescription_updates: true,
    marketing: false,
    newsletter: true,
  });

  const {
    highContrast,
    largeText,
    reducedMotion,
    toggleHighContrast,
    toggleLargeText,
    toggleReducedMotion,
  } = useAccessibilityStore();

  const { isSeniorMode, setSeniorMode } = useThemeStore();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await preferencesAPI.getNotificationPreferences();
      const d = response.data || {};
      // Map backend snake_case variants to frontend state keys
      setPreferences(prev => ({
        email_enabled: d.email_enabled ?? d.email_notifications ?? prev.email_enabled,
        push_enabled: d.push_enabled ?? d.push_notifications ?? prev.push_enabled,
        sms_enabled: d.sms_enabled ?? d.sms_notifications ?? prev.sms_enabled,
        appointment_reminders: d.appointment_reminders ?? d.notification_types?.appointments ?? prev.appointment_reminders,
        scan_results: d.scan_results ?? d.notification_types?.scan_results ?? prev.scan_results,
        prescription_updates: d.prescription_updates ?? d.notification_types?.prescriptions ?? prev.prescription_updates,
        marketing: d.marketing ?? prev.marketing,
        newsletter: d.newsletter ?? prev.newsletter,
      }));
    } catch (error) {
      // 404 / PGRST116 = no row yet — silently use defaults, no toast needed
      const msg = error instanceof Error ? String(error.message) : "";
      const statusCode = error instanceof Error && 'response' in error ? (error as { response?: { status?: number } }).response?.status : undefined;
      const detailMsg = error instanceof Error && 'response' in error ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail : undefined;
      const fullMsg = String(detailMsg || msg || "");
      if (!fullMsg.includes("PGRST116") && statusCode !== 404) {
        console.error("Error loading preferences:", error);
        // Still use defaults, just log — don't toast so UX isn't broken
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await preferencesAPI.saveNotificationPreferences(preferences);
      toast.success(t('patient.settings.save_success', "Preferences saved successfully"));
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error(t('patient.settings.save_failed', "Failed to save preferences"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: string) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#64748B] dark:text-gray-400">{t('patient.settings.loading', "Loading preferences...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-[#0F172A] dark:text-white mb-2">
                {t('patient.settings.title', "Settings & Preferences")}
              </h1>
              <p className="text-[#64748B] dark:text-gray-400">
                {t('patient.settings.desc', "Manage your notifications and accessibility preferences")}
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-[#0D9488] to-[#0F766E] hover:from-[#0F766E] hover:to-[#065F46]"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? t('common.saving', "Saving...") : t('common.save_changes', "Save Changes")}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <NotificationSettings />
            <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-[#0F172A] dark:text-white mb-6">
              {t('patient.settings.channels', "Notification Channels")}
            </h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-6 h-6 text-[#0D9488] dark:text-teal-400" />
                  <div>
                    <Label className="text-base font-semibold dark:text-white">{t('patient.settings.email', "Email Notifications")}</Label>
                    <p className="text-sm text-[#64748B] dark:text-gray-400">
                      {t('patient.settings.email_desc', "Receive notifications via email")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.email_enabled}
                  onCheckedChange={() => handleToggle("email_enabled")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-6 h-6 text-[#0D9488] dark:text-teal-400" />
                  <div>
                    <Label className="text-base font-semibold dark:text-white">{t('patient.settings.push', "Push Notifications")}</Label>
                    <p className="text-sm text-[#64748B] dark:text-gray-400">
                      {t('patient.settings.push_desc', "Receive push notifications in browser")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.push_enabled}
                  onCheckedChange={() => handleToggle("push_enabled")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-6 h-6 text-[#0D9488] dark:text-teal-400" />
                  <div>
                    <Label className="text-base font-semibold dark:text-white">{t('patient.settings.sms', "SMS Notifications")}</Label>
                    <p className="text-sm text-[#64748B] dark:text-gray-400">
                      {t('patient.settings.sms_desc', "Receive notifications via SMS")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.sms_enabled}
                  onCheckedChange={() => handleToggle("sms_enabled")}
                />
              </div>
            </div>
          </Card>

          </div>

          {/* Notification Types */}
          <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-[#0F172A] dark:text-white mb-6">
              {t('patient.settings.types', "Notification Types")}
            </h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold dark:text-white">{t('patient.settings.appointment_reminders', "Appointment Reminders")}</Label>
                  <p className="text-sm text-[#64748B] dark:text-gray-400">
                    {t('patient.settings.appointment_desc', "Get reminded about upcoming appointments")}
                  </p>
                </div>
                <Switch
                  checked={preferences.appointment_reminders}
                  onCheckedChange={() => handleToggle("appointment_reminders")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold dark:text-white">{t('patient.settings.scan_results', "Scan Results")}</Label>
                  <p className="text-sm text-[#64748B] dark:text-gray-400">
                    {t('patient.settings.scan_desc', "Notify when scan results are ready")}
                  </p>
                </div>
                <Switch
                  checked={preferences.scan_results}
                  onCheckedChange={() => handleToggle("scan_results")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold dark:text-white">{t('patient.settings.prescription_updates', "Prescription Updates")}</Label>
                  <p className="text-sm text-[#64748B] dark:text-gray-400">
                    {t('patient.settings.prescription_desc', "Notify about new prescriptions")}
                  </p>
                </div>
                <Switch
                  checked={preferences.prescription_updates}
                  onCheckedChange={() => handleToggle("prescription_updates")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold dark:text-white">{t('patient.settings.newsletter', "Newsletter")}</Label>
                  <p className="text-sm text-[#64748B] dark:text-gray-400">
                    {t('patient.settings.newsletter_desc', "Receive health tips and updates")}
                  </p>
                </div>
                <Switch
                  checked={preferences.newsletter}
                  onCheckedChange={() => handleToggle("newsletter")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold dark:text-white">{t('patient.settings.marketing', "Marketing")}</Label>
                  <p className="text-sm text-[#64748B] dark:text-gray-400">
                    {t('patient.settings.marketing_desc', "Receive promotional offers and updates")}
                  </p>
                </div>
                <Switch
                  checked={preferences.marketing}
                  onCheckedChange={() => handleToggle("marketing")}
                />
              </div>
            </div>
          </Card>

          {/* Accessibility */}
          <Card className="p-6 mt-6 dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-[#0F172A] dark:text-white mb-6">
              {t('patient.settings.accessibility', "Accessibility")}
            </h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="w-6 h-6 text-[#0D9488] dark:text-teal-400" />
                  <div>
                    <Label className="text-base font-semibold dark:text-white">{t('patient.settings.high_contrast', "High Contrast")}</Label>
                    <p className="text-sm text-[#64748B] dark:text-gray-400">
                      {t('patient.settings.high_contrast_desc', "Increase contrast for better readability")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={highContrast}
                  onCheckedChange={toggleHighContrast}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Type className="w-6 h-6 text-[#0D9488] dark:text-teal-400" />
                  <div>
                    <Label className="text-base font-semibold dark:text-white">{t('patient.settings.large_text', "Large Text")}</Label>
                    <p className="text-sm text-[#64748B] dark:text-gray-400">
                      {t('patient.settings.large_text_desc', "Increase font size across the application")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={largeText}
                  onCheckedChange={toggleLargeText}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="w-6 h-6 text-[#0D9488] dark:text-teal-400" />
                  <div>
                    <Label className="text-base font-semibold dark:text-white">{t('patient.settings.reduced_motion', "Reduced Motion")}</Label>
                    <p className="text-sm text-[#64748B] dark:text-gray-400">
                      {t('patient.settings.reduced_motion_desc', "Minimize animations and transitions")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={reducedMotion}
                  onCheckedChange={toggleReducedMotion}
                />
              </div>

              {/* Senior Mode (Elderly Care) */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Type className="w-6 h-6 text-[#0D9488] dark:text-teal-400" />
                  <div>
                    <Label className="text-base font-semibold dark:text-white">{t('patient.settings.senior_mode', "Senior Mode")}</Label>
                    <p className="text-sm text-[#64748B] dark:text-gray-400">
                      {t('patient.settings.senior_mode_desc', "Larger text, bigger touch targets, and higher contrast for easier reading")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isSeniorMode}
                  onCheckedChange={(val) => setSeniorMode(val)}
                />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
