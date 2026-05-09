import { useState } from "react";
import { useNavigate } from "react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, Bell, Shield, Globe, MessageSquare, Eye, 
  Trash2, Download, LogOut, Smartphone, Mail, Lock,
  Moon, Sun, Accessibility, Monitor, Palette, Info
} from "lucide-react";
import { useAuthStore } from "../../lib/store";
import { useTranslation } from "../../lib/i18n";
import { useThemeStore } from "../../lib/themeStore";
import { useAccessibilityStore } from "../../lib/accessibility";
import { toast } from "sonner";
import { PageTransition } from "@/components/shared/PageTransition";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { language, setLanguage } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const { voiceReader, toggleVoiceReader, highContrast, toggleHighContrast, reducedMotion, toggleReducedMotion } = useAccessibilityStore();
  
  // Profile Settings
  const [profile, setProfile] = useState({
    name: String(user?.user_metadata?.full_name || ""),
    email: String(user?.email || ""),
    phone: String(user?.user_metadata?.phone || ""),
    bloodType: "",
    emergencyContact: "",
  });

  // Notification Settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    appointmentReminders: true,
    medicationReminders: true,
    labResults: true,
    healthTips: false,
    marketing: false,
  });

  // Privacy Settings
  const [privacy, setPrivacy] = useState({
    twoFactorAuth: false,
    shareDataWithDoctors: true,
    shareDataForResearch: false,
    showProfilePublicly: false,
  });

  // Accessibility Settings
  const [accessibility, setAccessibility] = useState({
    fontSize: "medium",
    highContrast: false,
    reduceMotion: false,
    screenReader: false,
  });

  const handleSaveProfile = () => {
    toast.success("Profile updated successfully");
  };

  const handleSaveNotifications = () => {
    toast.success("Notification preferences saved");
  };

  const handleSavePrivacy = () => {
    toast.success("Privacy settings updated");
  };

  const handleExportData = async () => {
    if (!user) {
      toast.error("Please sign in to export your data");
      return;
    }
    toast.info("Preparing your data export...");
    try {
      // Bug 5 Fix: Actually call the export API and trigger a browser download
      const patientId = user.id;
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/patients/${patientId}/export`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format: 'json' }) }
      );
      const data = response.ok ? await response.json() : null;
      const exportData = data || { export_date: new Date().toISOString(), user_id: user.id, email: user.email, note: "Partial export — connect backend for full data." };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `netra_health_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(data ? "Data exported and downloaded!" : "Basic data exported. Connect backend for full export.");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export failed. Please try again.");
    }
  };

  const handleDeleteAccount = () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      toast.error("Account deletion initiated. You will receive a confirmation email.");
      // Implement account deletion logic
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    toast.success("Signed out successfully");
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-8 gap-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
            <TabsTrigger value="language" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Language</span>
            </TabsTrigger>
            <TabsTrigger value="communication" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Communication</span>
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="flex items-center gap-2">
              <Accessibility className="w-4 h-4" />
              <span className="hidden sm:inline">Accessibility</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <User className="w-6 h-6" />
                Profile Information
              </h2>
              
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profile.name || ""}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email || ""}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profile.phone || ""}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bloodType">Blood Type</Label>
                    <Select value={profile.bloodType || ""} onValueChange={(value) => setProfile({ ...profile, bloodType: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="emergency">Emergency Contact</Label>
                  <Input
                    id="emergency"
                    value={profile.emergencyContact}
                    onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                    placeholder="Emergency contact name and phone"
                  />
                </div>

                <Button onClick={handleSaveProfile} className="w-full md:w-auto">
                  Save Profile Changes
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Palette className="w-6 h-6" />
                Appearance
              </h2>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <button
                      onClick={() => {
                        setTheme('light');
                        toast.success('Theme changed to Light');
                      }}
                      className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        theme === 'light'
                          ? 'border-[#0D9488] bg-[#0D9488]/5'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Sun className={`w-8 h-8 ${theme === 'light' ? 'text-[#0D9488]' : 'text-gray-500'}`} />
                      <div className="text-center">
                        <div className={`font-semibold ${theme === 'light' ? 'text-[#0D9488]' : 'text-gray-700 dark:text-gray-300'}`}>
                          Light
                        </div>
                        <div className="text-xs text-gray-500">Bright and clear</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setTheme('dark');
                        toast.success('Theme changed to Dark');
                      }}
                      className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        theme === 'dark'
                          ? 'border-[#0D9488] bg-[#0D9488]/5'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Moon className={`w-8 h-8 ${theme === 'dark' ? 'text-[#0D9488]' : 'text-gray-500'}`} />
                      <div className="text-center">
                        <div className={`font-semibold ${theme === 'dark' ? 'text-[#0D9488]' : 'text-gray-700 dark:text-gray-300'}`}>
                          Dark
                        </div>
                        <div className="text-xs text-gray-500">Easy on the eyes</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setTheme('system');
                        toast.success('Theme set to System preference');
                      }}
                      className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        theme === 'system'
                          ? 'border-[#0D9488] bg-[#0D9488]/5'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Monitor className={`w-8 h-8 ${theme === 'system' ? 'text-[#0D9488]' : 'text-gray-500'}`} />
                      <div className="text-center">
                        <div className={`font-semibold ${theme === 'system' ? 'text-[#0D9488]' : 'text-gray-700 dark:text-gray-300'}`}>
                          System
                        </div>
                        <div className="text-xs text-gray-500">Match device</div>
                      </div>
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    {theme === 'system' 
                      ? 'Theme will automatically match your device settings'
                      : `Current theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`
                    }
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Theme Preview
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    The selected theme will be applied immediately across the entire application.
                    System theme automatically switches between light and dark based on your device settings.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Bell className="w-6 h-6" />
                Notification Preferences
              </h2>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Notification Channels</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="font-medium">Email Notifications</div>
                        <div className="text-sm text-gray-500">Receive updates via email</div>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, emailNotifications: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="font-medium">SMS Notifications</div>
                        <div className="text-sm text-gray-500">Receive text messages</div>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.smsNotifications}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, smsNotifications: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="font-medium">Push Notifications</div>
                        <div className="text-sm text-gray-500">In-app notifications</div>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.pushNotifications}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, pushNotifications: checked })}
                    />
                  </div>
                </div>

                <div className="border-t pt-6 space-y-4">
                  <h3 className="font-semibold text-lg">Notification Types</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Appointment Reminders</div>
                      <div className="text-sm text-gray-500">Get reminded about upcoming appointments</div>
                    </div>
                    <Switch
                      checked={notifications.appointmentReminders}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, appointmentReminders: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Medication Reminders</div>
                      <div className="text-sm text-gray-500">Never miss your medication</div>
                    </div>
                    <Switch
                      checked={notifications.medicationReminders}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, medicationReminders: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Lab Results</div>
                      <div className="text-sm text-gray-500">Get notified when results are ready</div>
                    </div>
                    <Switch
                      checked={notifications.labResults}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, labResults: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Health Tips</div>
                      <div className="text-sm text-gray-500">Receive personalized health tips</div>
                    </div>
                    <Switch
                      checked={notifications.healthTips}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, healthTips: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Marketing Communications</div>
                      <div className="text-sm text-gray-500">News and promotional offers</div>
                    </div>
                    <Switch
                      checked={notifications.marketing}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, marketing: checked })}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={handleSaveNotifications} className="w-full md:w-auto">
                    Save Notification Preferences
                  </Button>
                  <Button variant="outline" onClick={() => navigate("./notifications")} className="w-full md:w-auto">
                    Advanced Notification Settings
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Privacy & Security */}
          <TabsContent value="privacy">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Shield className="w-6 h-6" />
                Privacy & Security
              </h2>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Security</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="font-medium">Two-Factor Authentication</div>
                        <div className="text-sm text-gray-500">Add an extra layer of security</div>
                      </div>
                    </div>
                    <Switch
                      checked={privacy.twoFactorAuth}
                      onCheckedChange={(checked) => setPrivacy({ ...privacy, twoFactorAuth: checked })}
                    />
                  </div>

                  <div>
                    <Button variant="outline" className="w-full md:w-auto">
                      <Lock className="w-4 h-4 mr-2" />
                      Change Password
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-6 space-y-4">
                  <h3 className="font-semibold text-lg">Data Sharing</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Share Data with Doctors</div>
                      <div className="text-sm text-gray-500">Allow doctors to access your health records</div>
                    </div>
                    <Switch
                      checked={privacy.shareDataWithDoctors}
                      onCheckedChange={(checked) => setPrivacy({ ...privacy, shareDataWithDoctors: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Share Data for Research</div>
                      <div className="text-sm text-gray-500">Help improve healthcare (anonymized)</div>
                    </div>
                    <Switch
                      checked={privacy.shareDataForResearch}
                      onCheckedChange={(checked) => setPrivacy({ ...privacy, shareDataForResearch: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Public Profile</div>
                      <div className="text-sm text-gray-500">Make your profile visible to other users</div>
                    </div>
                    <Switch
                      checked={privacy.showProfilePublicly}
                      onCheckedChange={(checked) => setPrivacy({ ...privacy, showProfilePublicly: checked })}
                    />
                  </div>
                </div>

                <Button onClick={handleSavePrivacy} className="w-full md:w-auto">
                  Save Privacy Settings
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Language Settings */}
          <TabsContent value="language">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Globe className="w-6 h-6" />
                Language & Localization
              </h2>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="language">Interface Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                      <SelectItem value="mr">मराठी (Marathi)</SelectItem>
                      <SelectItem value="ta">தமிழ் (Tamil)</SelectItem>
                      <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
                      <SelectItem value="kn">ಕನ್ನಡ (Kannada)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-2">
                    Choose your preferred language for the interface
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Supported Languages</h3>
                  <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                    <li>✓ English - Full support</li>
                    <li>✓ Hindi (हिन्दी) - Full support</li>
                    <li>✓ Marathi (मराठी) - Full support</li>
                    <li>✓ Tamil (தமிழ்) - Full support</li>
                    <li>✓ Telugu (తెలుగు) - Full support</li>
                    <li>✓ Kannada (ಕನ್ನಡ) - Full support</li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Communication Preferences */}
          <TabsContent value="communication">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <MessageSquare className="w-6 h-6" />
                Communication Preferences
              </h2>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label>Preferred Contact Method</Label>
                    <Select defaultValue="email">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="phone">Phone Call</SelectItem>
                        <SelectItem value="app">In-App Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Quiet Hours</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <Label htmlFor="quietStart" className="text-sm">Start Time</Label>
                        <Input id="quietStart" type="time" defaultValue="22:00" />
                      </div>
                      <div>
                        <Label htmlFor="quietEnd" className="text-sm">End Time</Label>
                        <Input id="quietEnd" type="time" defaultValue="08:00" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      No non-urgent notifications during these hours
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Accessibility */}
          <TabsContent value="accessibility">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Accessibility className="w-6 h-6" />
                Accessibility Options
              </h2>

              <div className="space-y-6">
                <div>
                  <Label>Font Size</Label>
                  <Select value={accessibility.fontSize} onValueChange={(value) => setAccessibility({ ...accessibility, fontSize: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium (Default)</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="xlarge">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">High Contrast Mode</div>
                    <div className="text-sm text-gray-500">Increase contrast for better visibility</div>
                  </div>
                  <Switch
                    checked={highContrast}
                    onCheckedChange={() => toggleHighContrast()}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Reduce Motion</div>
                    <div className="text-sm text-gray-500">Minimize animations and transitions</div>
                  </div>
                  <Switch
                    checked={reducedMotion}
                    onCheckedChange={() => toggleReducedMotion()}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Voice Reader (Audio)</div>
                    <div className="text-sm text-gray-500">Read out text when hovering over elements</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-2"
                      onClick={() => {
                        const event = new CustomEvent('voiceReaderToggle', { detail: { enabled: true, triggerAlert: true } });
                        window.dispatchEvent(event);
                      }}
                    >
                      <Download className="w-4 h-4" />
                      Download Voices
                    </Button>
                    <Switch
                      checked={voiceReader}
                      onCheckedChange={(checked) => toggleVoiceReader(checked)}
                    />
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg mt-4">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Note:</strong> Chrome only provides English voices by default. To use the voice reader in other languages, please download the respective voice data from your system settings.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Account Management */}
          <TabsContent value="account">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Trash2 className="w-6 h-6" />
                Account Management
              </h2>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Export Your Data</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Download a copy of all your health data in JSON format
                    </p>
                    <Button variant="outline" onClick={handleExportData}>
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Sign Out</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Sign out from this device
                    </p>
                    <Button variant="outline" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2 text-red-600">Danger Zone</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <Button variant="destructive" onClick={handleDeleteAccount}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  </PageTransition>
);
}
