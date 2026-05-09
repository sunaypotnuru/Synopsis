import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Volume2, Monitor, Info } from 'lucide-react';
import { useNotificationStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { motion } from 'motion/react';

export const NotificationSettings: React.FC = () => {
  const { t } = useTranslation();
  const { 
    soundEnabled, 
    desktopEnabled, 
    setSoundEnabled, 
    setDesktopEnabled 
  } = useNotificationStore();

  const handleDesktopToggle = async (enabled: boolean) => {
    if (enabled && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setDesktopEnabled(false);
        return;
      }
    }
    setDesktopEnabled(enabled);
  };

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50/50 pb-4">
        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Bell className="w-5 h-5 text-sky-500" />
          {t('notifications.settings.title', 'Notification Preferences')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-slate-400" />
              <Label className="text-sm font-semibold text-slate-700">
                {t('notifications.settings.sound_alerts', 'Sound Alerts')}
              </Label>
            </div>
            <p className="text-xs text-slate-500">
              {t('notifications.settings.sound_desc', 'Play a chime when a new notification arrives')}
            </p>
          </div>
          <Switch 
            checked={soundEnabled} 
            onCheckedChange={setSoundEnabled}
            className="data-[state=checked]:bg-sky-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-slate-400" />
              <Label className="text-sm font-semibold text-slate-700">
                {t('notifications.settings.desktop_notifs', 'Desktop Notifications')}
              </Label>
            </div>
            <p className="text-xs text-slate-500">
              {t('notifications.settings.desktop_desc', 'Show system-level alerts even when browser is backgrounded')}
            </p>
          </div>
          <Switch 
            checked={desktopEnabled} 
            onCheckedChange={handleDesktopToggle}
            className="data-[state=checked]:bg-sky-500"
          />
        </div>

        {desktopEnabled && Notification.permission === 'denied' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100"
          >
            <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-700">
              {t('notifications.settings.permission_denied', 'Desktop notifications are blocked by your browser. Please enable them in your browser settings to receive alerts.')}
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
