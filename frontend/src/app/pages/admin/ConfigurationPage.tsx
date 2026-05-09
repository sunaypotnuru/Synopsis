import { useState } from "react";
import { motion } from "motion/react";
import { Settings, Save, Mail, Wrench, AlertTriangle, ToggleRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

interface SystemConfig {
  features: {
    aiNurse: boolean;
    chatbot: boolean;
    emergencyServices: boolean;
    semanticSearch: boolean;
    mentalHealth: boolean;
  };
  system: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    rateLimit: number;
    maintenanceMode: boolean;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    emailProvider: string;
    smsProvider: string;
  };
}

export default function ConfigurationPage() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<SystemConfig>({
    features: {
      aiNurse: true,
      chatbot: true,
      emergencyServices: true,
      semanticSearch: true,
      mentalHealth: true,
    },
    system: {
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      rateLimit: 100,
      maintenanceMode: false,
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      emailProvider: "SMTP",
      smsProvider: "Twilio",
    },
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleFeature = (feature: keyof SystemConfig["features"]) => {
    setConfig({
      ...config,
      features: {
        ...config.features,
        [feature]: !config.features[feature],
      },
    });
  };

  const toggleSystemSetting = (setting: keyof SystemConfig["system"]) => {
    if (typeof config.system[setting] === "boolean") {
      setConfig({
        ...config,
        system: {
          ...config.system,
          [setting]: !config.system[setting],
        },
      });
    }
  };

  const updateSystemValue = (setting: keyof SystemConfig["system"], value: number) => {
    setConfig({
      ...config,
      system: {
        ...config.system,
        [setting]: value,
      },
    });
  };

  const toggleNotification = (setting: keyof SystemConfig["notifications"]) => {
    if (typeof config.notifications[setting] === "boolean") {
      setConfig({
        ...config,
        notifications: {
          ...config.notifications,
          [setting]: !config.notifications[setting],
        },
      });
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      // In production, this would call the backend API
      // await axios.put("/api/v1/admin/config", config);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save configuration:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-slate-50 to-gray-100"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Settings className="w-8 h-8 text-blue-600" />
              {t('admin.configuration.title', 'System Configuration')}
            </h1>
            <p className="text-slate-600 mt-2">
              {t('admin.configuration.subtitle', 'Manage system-wide settings and feature toggles')}
            </p>
          </div>
          <Button
            onClick={saveConfiguration}
            disabled={saving}
            className={`gap-2 ${saved ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
          >
            <Save className="w-4 h-4" />
            {saving ? t('admin.configuration.saving', 'Saving...') : saved ? t('admin.configuration.saved', 'Saved!') : t('admin.configuration.save', 'Save Changes')}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Feature Toggles */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ToggleRight className="w-5 h-5 text-blue-600" />
              {t('admin.configuration.feature_toggles', 'Feature Toggles')}
            </h2>
            <div className="space-y-4">
              {Object.entries(config.features).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">
                      {t(`admin.configuration.features.${key}`, key.replace(/([A-Z])/g, ' $1').trim())}
                    </p>
                    <p className="text-sm text-slate-600">
                      {t(`admin.configuration.features.${key}_desc`, `Enable or disable ${key}`)}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleFeature(key as keyof SystemConfig["features"])}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      value ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                        value ? 'translate-x-7' : ''
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* System Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              {t('admin.configuration.system_settings', 'System Settings')}
            </h2>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <label className="block font-medium text-slate-900 mb-2">
                  {t('admin.configuration.session_timeout', 'Session Timeout (minutes)')}
                </label>
                <input
                  type="number"
                  value={config.system.sessionTimeout}
                  onChange={(e) => updateSystemValue('sessionTimeout', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="5"
                  max="120"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <label className="block font-medium text-slate-900 mb-2">
                  {t('admin.configuration.max_login_attempts', 'Max Login Attempts')}
                </label>
                <input
                  type="number"
                  value={config.system.maxLoginAttempts}
                  onChange={(e) => updateSystemValue('maxLoginAttempts', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="3"
                  max="10"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <label className="block font-medium text-slate-900 mb-2">
                  {t('admin.configuration.rate_limit', 'API Rate Limit (requests/minute)')}
                </label>
                <input
                  type="number"
                  value={config.system.rateLimit}
                  onChange={(e) => updateSystemValue('rateLimit', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="10"
                  max="1000"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">
                      {t('admin.configuration.maintenance_mode', 'Maintenance Mode')}
                    </p>
                    <p className="text-sm text-red-700">
                      {t('admin.configuration.maintenance_desc', 'Disable user access')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleSystemSetting('maintenanceMode')}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    config.system.maintenanceMode ? 'bg-red-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      config.system.maintenanceMode ? 'translate-x-7' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          </Card>

          {/* Notification Settings */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              {t('admin.configuration.notifications', 'Notification Settings')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">
                    {t('admin.configuration.email_notifications', 'Email Notifications')}
                  </p>
                  <p className="text-sm text-slate-600">
                    {t('admin.configuration.email_desc', 'Send notifications via email')}
                  </p>
                </div>
                <button
                  onClick={() => toggleNotification('emailEnabled')}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    config.notifications.emailEnabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      config.notifications.emailEnabled ? 'translate-x-7' : ''
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">
                    {t('admin.configuration.sms_notifications', 'SMS Notifications')}
                  </p>
                  <p className="text-sm text-slate-600">
                    {t('admin.configuration.sms_desc', 'Send notifications via SMS')}
                  </p>
                </div>
                <button
                  onClick={() => toggleNotification('smsEnabled')}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    config.notifications.smsEnabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      config.notifications.smsEnabled ? 'translate-x-7' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Info Banner */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800">
            <strong>{t('admin.configuration.note', 'Note')}:</strong>{' '}
            {t('admin.configuration.note_desc', 'Changes will take effect immediately after saving. Some features may require service restart.')}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

