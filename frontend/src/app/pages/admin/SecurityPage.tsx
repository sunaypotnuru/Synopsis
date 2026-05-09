import { useState } from "react";
import { motion } from "motion/react";
import { Shield, AlertTriangle, LogOut, Ban, CheckCircle, XCircle, Globe, Lock, Key } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  ipAddress: string;
  deviceInfo: string;
  loginTime: string;
  lastActivity: string;
}

interface FailedLogin {
  id: string;
  email: string;
  ipAddress: string;
  timestamp: string;
  reason: string;
}

interface SecurityAlert {
  id: string;
  type: "warning" | "critical";
  message: string;
  timestamp: string;
}

export default function SecurityPage() {
  const { t } = useTranslation();
  const [activeSessions] = useState<ActiveSession[]>([
    {
      id: "1",
      userId: "user1",
      userName: "Dr. Smith",
      userRole: "doctor",
      ipAddress: "192.168.1.100",
      deviceInfo: "Chrome on Windows",
      loginTime: new Date(Date.now() - 3600000).toISOString(),
      lastActivity: new Date(Date.now() - 300000).toISOString(),
    },
    {
      id: "2",
      userId: "user2",
      userName: "Admin User",
      userRole: "admin",
      ipAddress: "192.168.1.101",
      deviceInfo: "Firefox on macOS",
      loginTime: new Date(Date.now() - 7200000).toISOString(),
      lastActivity: new Date(Date.now() - 60000).toISOString(),
    },
  ]);

  const [failedLogins] = useState<FailedLogin[]>([
    {
      id: "1",
      email: "test@example.com",
      ipAddress: "203.0.113.45",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      reason: "Invalid password",
    },
    {
      id: "2",
      email: "admin@test.com",
      ipAddress: "203.0.113.46",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      reason: "Account locked",
    },
  ]);

  const [securityAlerts] = useState<SecurityAlert[]>([
    {
      id: "1",
      type: "warning",
      message: "Multiple failed login attempts from IP 203.0.113.45",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: "2",
      type: "critical",
      message: "Unusual access pattern detected for user admin@test.com",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
  ]);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [ipWhitelist, setIpWhitelist] = useState<string[]>(["192.168.1.0/24", "10.0.0.0/8"]);
  const [newIp, setNewIp] = useState("");

  const forceLogout = async (_sessionId: string) => {
    try {
      // In production: await axios.delete(`/api/v1/admin/security/sessions/${sessionId}`);
      // setActiveSessions(activeSessions.filter((s) => s.id !== sessionId));
    } catch (error) {
      console.error("Failed to logout session:", error);
    }
  };

  const addIpToWhitelist = () => {
    if (newIp && !ipWhitelist.includes(newIp)) {
      setIpWhitelist([...ipWhitelist, newIp]);
      setNewIp("");
    }
  };

  const removeIpFromWhitelist = (ip: string) => {
    setIpWhitelist(ipWhitelist.filter((i) => i !== ip));
  };

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            {t('admin.security.title', 'Security Management')}
          </h1>
          <p className="text-slate-600 mt-2">
            {t('admin.security.subtitle', 'Monitor and manage system security settings')}
          </p>
        </div>

        {/* Security Alerts */}
        {securityAlerts.length > 0 && (
          <div className="mb-6 space-y-3">
            {securityAlerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 rounded-xl border-2 flex items-start gap-3 ${
                  alert.type === "critical"
                    ? "bg-red-50 border-red-200"
                    : "bg-yellow-50 border-yellow-200"
                }`}
              >
                <AlertTriangle
                  className={`w-5 h-5 mt-0.5 ${
                    alert.type === "critical" ? "text-red-600" : "text-yellow-600"
                  }`}
                />
                <div className="flex-1">
                  <p className={`font-medium ${alert.type === "critical" ? "text-red-900" : "text-yellow-900"}`}>
                    {alert.message}
                  </p>
                  <p className={`text-sm ${alert.type === "critical" ? "text-red-700" : "text-yellow-700"}`}>
                    {formatTimeAgo(alert.timestamp)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Sessions */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600" />
              {t('admin.security.active_sessions', 'Active Sessions')} ({activeSessions.length})
            </h2>
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div key={session.id} className="p-4 bg-slate-50 rounded-lg flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-slate-900">{session.userName}</p>
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700">
                        {session.userRole}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {session.deviceInfo} • {session.ipAddress}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t('admin.security.logged_in', 'Logged in')}: {formatTimeAgo(session.loginTime)} •{' '}
                      {t('admin.security.last_active', 'Last active')}: {formatTimeAgo(session.lastActivity)}
                    </p>
                  </div>
                  <Button
                    onClick={() => forceLogout(session.id)}
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50 gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('admin.security.force_logout', 'Force Logout')}
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* Failed Login Attempts */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              {t('admin.security.failed_logins', 'Failed Login Attempts')}
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {failedLogins.map((login) => (
                <div key={login.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-medium text-red-900">{login.email}</p>
                  <p className="text-sm text-red-700">
                    {login.ipAddress} • {login.reason}
                  </p>
                  <p className="text-xs text-red-600">{formatTimeAgo(login.timestamp)}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Security Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              {t('admin.security.settings', 'Security Settings')}
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">
                    {t('admin.security.enforce_2fa', 'Enforce 2FA')}
                  </p>
                  <p className="text-sm text-slate-600">
                    {t('admin.security.enforce_2fa_desc', 'Require two-factor authentication for all users')}
                  </p>
                </div>
                <button
                  onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    twoFactorEnabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      twoFactorEnabled ? 'translate-x-7' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          </Card>

          {/* IP Whitelist */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              {t('admin.security.ip_whitelist', 'IP Whitelist')}
            </h2>
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                placeholder={t('admin.security.enter_ip', 'Enter IP address or CIDR (e.g., 192.168.1.0/24)')}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={addIpToWhitelist} className="bg-blue-600 hover:bg-blue-700 text-white">
                {t('admin.security.add', 'Add')}
              </Button>
            </div>
            <div className="space-y-2">
              {ipWhitelist.map((ip) => (
                <div key={ip} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-mono text-sm text-slate-900">{ip}</span>
                  </div>
                  <Button
                    onClick={() => removeIpFromWhitelist(ip)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Ban className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Info Banner */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800">
            <strong>{t('admin.security.note', 'Note')}:</strong>{' '}
            {t('admin.security.note_desc', 'All security events are logged and can be reviewed in the audit logs section.')}
          </p>
        </div>
      </div>
    </div>
  );
}

