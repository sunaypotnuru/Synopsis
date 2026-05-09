import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authAPI, profileAPI } from "./api";
import { supabase } from "./supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getRequiredApiBaseUrl } from "../app/services/authSession";

interface User {
  id: string;
  email: string;
  name?: string;
  role: "patient" | "doctor" | "admin";
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  aud?: string;
  created_at?: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name?: string;
  phone?: string;
  date_of_birth?: string;
  age?: number;
  gender?: string;
  blood_type?: string;
  address?: string;
  language?: string;
  call_preferences?: {
    voice?: boolean;
    time?: string;
  };
  avatar_url?: string;
  medication_schedule?: Array<{
    id: string;
    medication_name: string;
    dosage: string;
    frequency: string;
    time: string;
    taken: boolean;
  }>;
  emergency_contact?: string;
  medical_history?: string[];
  allergies?: string[];
  medications?: string[];
  insurance_info?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

interface AuthError {
  message: string;
  code?: string;
}

interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    session?: unknown;
  };
  error?: AuthError;
  role?: string;
  needsLogin?: boolean;
}

export interface Notification {
  id: string;
  type: "message" | "appointment" | "lab" | "prescription" | "system";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: Record<string, any>;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  soundEnabled: boolean;
  desktopEnabled: boolean;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  setDesktopEnabled: (enabled: boolean) => void;
}

interface WebSocketState {
  status: "disconnected" | "connecting" | "connected" | "reconnecting";
  lastError: string | null;
  setStatus: (status: WebSocketState["status"]) => void;
  setLastError: (error: string | null) => void;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  activePatientProfile: Profile | null;
  loading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setActivePatientProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signIn: (
    email: string,
    password: string,
  ) => Promise<AuthResponse>;
  signUp: (
    email: string,
    password: string,
    userData: Record<string, unknown>,
  ) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateProfile: (
    updates: Partial<Profile>,
  ) => Promise<{ success: boolean; error?: AuthError; data?: Profile }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: AuthError }>;
}

const getClientIp = async (): Promise<string> => {
  return "unknown";
};

const precheckLoginAttempt = async (email: string): Promise<{ allowed: boolean; retryAfterSeconds: number }> => {
  try {
    const apiBaseUrl = getRequiredApiBaseUrl();
    const ipAddress = await getClientIp();
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/security/precheck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, ip_address: ipAddress }),
    });
    if (!response.ok) {
      return { allowed: true, retryAfterSeconds: 0 };
    }
    const data = await response.json();
    return {
      allowed: Boolean(data?.allowed),
      retryAfterSeconds: Number(data?.retry_after_seconds || 0),
    };
  } catch {
    return { allowed: true, retryAfterSeconds: 0 };
  }
};

const reportLoginAttempt = async (email: string, success: boolean, reason = "invalid_credentials"): Promise<void> => {
  try {
    const apiBaseUrl = getRequiredApiBaseUrl();
    const ipAddress = await getClientIp();
    await fetch(`${apiBaseUrl}/api/v1/auth/security/report-attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, success, ip_address: ipAddress, reason }),
    });
  } catch {
    // Do not block auth flow for telemetry/reporting failures.
  }
};

// Auth Store
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  activePatientProfile: null,
  loading: false,
  error: null,

  setUser: (user: User | null) => set({ user }),
  setProfile: (profile: Profile | null) => set({ profile, activePatientProfile: profile }), // default to self
  setActivePatientProfile: (profile: Profile | null) => set({ activePatientProfile: profile }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),

  signIn: async (rawEmail: string, password: string) => {
    const email = rawEmail.trim();
    set({ loading: true, error: null });

    try {
      if (import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === "true") {
        let role: "patient" | "doctor" | "admin" = "patient";
        if (email.includes("doctor")) role = "doctor";
        if (email.includes("admin")) role = "admin";

        // Exact email mapping requested by user
        if (email.toLowerCase() === "sunaypotnuru@gmail.com") role = "admin";
        if (email.toLowerCase() === "rohitpanduru8@gmail.com") role = "doctor";
        if (email.toLowerCase() === "sunaysujsy@gmail.com") role = "patient";
        localStorage.setItem("bypassRole", role);
        localStorage.setItem("bypassEmail", email);

        const user: User = {
          id: "00000000-0000-0000-0000-000000000000",
          email: email,
          name: `Demo ${role}`,
          role: role,
        };
        set({ user, loading: false });
        return { success: true, data: { user }, role };
      }

      console.log("[Auth] Attempting login with:", email);
      const precheck = await precheckLoginAttempt(email);
      if (!precheck.allowed) {
        const retryMinutes = Math.ceil(precheck.retryAfterSeconds / 60);
        const errorMessage = `Too many failed login attempts. Try again in ${retryMinutes} minute(s).`;
        set({ error: errorMessage, loading: false });
        return { success: false, error: { message: errorMessage, code: "LOCKED_OUT" } };
      }

      const { data, error } = await authAPI.login(email, password);

      if (error) {
        await reportLoginAttempt(email, false, "invalid_credentials");
        console.error("[Auth] Login failed:", error);
        set({ error: error.message, loading: false });
        return { success: false, error };
      }

      // Supabase login succeeded
      console.log("[Auth] Login successful, user:", data.user?.email);

      // Determine role safely
      const role = (data.user.user_metadata?.role as "patient" | "doctor" | "admin") || "patient";

      // Fetch profile with timeout (don't block login on profile fetch)
      let profileData = null;
      try {
        const profilePromise = profileAPI.getProfile(data.user.id, role);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Profile fetch timeout")), 5000),
        );

        const pRes = await Promise.race([profilePromise, timeoutPromise]);
        if (pRes && 'data' in pRes && pRes.data) profileData = pRes.data;
        console.log("[Auth] Profile loaded successfully");
      } catch (e) {
        console.warn("[Auth] Profile fetch failed (non-blocking):", e);
        // Don't return error - profile is optional for login
      }

      const userData: User = { 
        id: data.user.id, 
        email: data.user.email || '', 
        role,
        user_metadata: data.user.user_metadata,
        app_metadata: data.user.app_metadata,
        aud: data.user.aud,
        created_at: data.user.created_at
      };
      set({ user: userData, profile: profileData, loading: false });
      await reportLoginAttempt(email, true, "success");
      console.log("[Auth] Login complete, redirecting as role:", role);
      // Return the resolved role alongside raw data so login pages can
      // redirect without re-parsing user_metadata themselves.
      return { success: true, data: { user: userData, session: data.session }, role };
    } catch (err: unknown) {
      const error = err as Error;
      console.error("[Auth] Unexpected error during login:", error);
      set({ error: error.message, loading: false });
      return { success: false, error: { message: error.message } };
    }
  },

  signInWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      return { success: true };
    } catch (err: unknown) {
      const error = err as Error;
      console.error("[Auth] Google Sign-In failed:", error);
      set({ error: error.message, loading: false });
      return { success: false, error: { message: error.message } };
    }
  },

  signUp: async (email: string, password: string, userData: Record<string, unknown>) => {
    set({ loading: true, error: null });

    try {
      const role = (userData.role as "patient" | "doctor" | "admin") || "patient";
      userData.role = role;

      if (import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === "true") {
        localStorage.setItem("bypassRole", role);
        localStorage.setItem("bypassEmail", email);
        const user: User = {
          id: "00000000-0000-0000-0000-000000000000",
          email: email,
          name: (userData.full_name as string) || `Demo ${role}`,
          role: role,
        };
        set({ user, loading: false });
        return { success: true, data: { user } };
      }

      const { data, error } = await authAPI.register(
        email,
        password,
        userData,
      ) as { data: { user: SupabaseUser; session?: unknown } | null; error: AuthError | null };

      if (error || !data || !data.user) {
        set({ error: error?.message || 'Registration failed', loading: false });
        return { success: false, error: error || { message: 'Registration failed' } };
      }

      // Auto-confirm email via backend admin API (Supabase requires email confirmation for sessions)
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        await fetch(`${apiUrl}/api/v1/auth/confirm-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: data.user.id }),
        });
      } catch (e) {
        console.warn("Email auto-confirm failed (non-critical):", e);
      }

      // Re-sign in to get a valid session (signup alone doesn't create one if email was unconfirmed)
      const { data: loginData, error: loginError } = await authAPI.login(
        email,
        password,
      );

      if (loginError || !loginData || !loginData.user) {
        // Signup succeeded but auto-login failed — still a successful registration
        console.warn("Auto-login after signup failed:", loginError);
        const userWithRole: User = { 
          id: data.user.id, 
          email: data.user.email || '', 
          role,
          user_metadata: data.user.user_metadata,
          app_metadata: data.user.app_metadata,
          aud: data.user.aud,
          created_at: data.user.created_at
        };
        set({
          user: userWithRole,
          profile: null,
          loading: false,
        });
        return { success: true, data: { user: userWithRole }, needsLogin: true };
      }

      // Fetch profile
      let profileData = null;
      try {
        const pRes = await profileAPI.getProfile(
          loginData.user.id,
          role,
        );
        if (pRes.data) profileData = pRes.data;
      } catch (e) {
        console.warn(
          "Silent fallback: New registration profile not yet generated.",
        );
      }

      const userWithRole: User = { 
        id: loginData.user.id, 
        email: loginData.user.email || '', 
        role,
        user_metadata: loginData.user.user_metadata,
        app_metadata: loginData.user.app_metadata,
        aud: loginData.user.aud,
        created_at: loginData.user.created_at
      };
      set({
        user: userWithRole,
        profile: profileData,
        loading: false,
      });
      return { success: true, data: { user: userWithRole } };
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message, loading: false });
      return { success: false, error: { message: error.message } };
    }
  },

  signOut: async () => {
    set({ loading: true });
    await authAPI.logout();
    set({ user: null, profile: null, loading: false });
  },

  loadUser: async () => {
    set({ loading: true });

    if (import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === "true") {
      const email = localStorage.getItem("bypassEmail");
      const roleStr = localStorage.getItem("bypassRole");

      if (email && roleStr) {
        const role = roleStr as "patient" | "doctor" | "admin";
        const user: User = {
          id: "00000000-0000-0000-0000-000000000000",
          email: email,
          name: `Demo ${role}`,
          role: role,
        };
        set({ user, profile: null, loading: false });
        return;
      }
      // No bypass credentials stored — fall through to set null
      set({ user: null, profile: null, loading: false });
      return;
    }

    try {
      // Use getSession() — it's local/cached and does NOT make a network call.
      // Wrap in a timeout to prevent hanging if Supabase client is misconfigured.
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Session fetch timeout")), 3000),
      );

      const { data: { session }, error } = await Promise.race([
        sessionPromise,
        timeoutPromise,
      ]);

      if (error || !session?.user) {
        set({ user: null, profile: null, loading: false });
        return;
      }

      const user = session.user;
      
      // Refresh session if older than 1 hour (3600000ms)
      const sessionAge = Date.now() - new Date(user.created_at || Date.now()).getTime();
      if (sessionAge > 3600000) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData.session) {
            console.log("[Auth] Session refreshed successfully");
            // Use refreshed user
            const refreshedUser = refreshData.session.user;
            const refreshedRole = (refreshedUser.user_metadata?.role as "patient" | "doctor" | "admin") || "patient";
            const refreshedUserWithRole: User = { 
              id: refreshedUser.id, 
              email: refreshedUser.email || '', 
              role: refreshedRole,
              user_metadata: refreshedUser.user_metadata,
              app_metadata: refreshedUser.app_metadata,
              aud: refreshedUser.aud,
              created_at: refreshedUser.created_at
            };
            set({ user: refreshedUserWithRole, profile: null, loading: false });

            // Fetch profile in background
            try {
              const profileTimeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Profile fetch timeout")), 5000),
              );
              const pRes = await Promise.race([
                profileAPI.getProfile(refreshedUser.id, refreshedRole),
                profileTimeout,
              ]);
              if (pRes?.data) {
                set({ profile: pRes.data });
              }
            } catch (e) {
              // Profile fetch failed — non-critical
            }
            return;
          }
        } catch (e) {
          console.warn("[Auth] Session refresh failed (non-critical):", e);
          // Continue with existing session
        }
      }
      
      const role = (user.user_metadata?.role as "patient" | "doctor" | "admin") || "patient";

      // Set user immediately so ProtectedRoute can evaluate auth state
      // Profile fetch is non-blocking — it will update the store when done
      const userWithRole: User = { 
        id: user.id, 
        email: user.email || '', 
        role,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
        aud: user.aud,
        created_at: user.created_at
      };
      set({ user: userWithRole, profile: null, loading: false });

      // Fetch profile in background (non-blocking)
      try {
        const profileTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Profile fetch timeout")), 5000),
        );
        const pRes = await Promise.race([
          profileAPI.getProfile(user.id, role),
          profileTimeout,
        ]);
        if (pRes?.data) {
          set({ profile: pRes.data });
        }
      } catch (e) {
        // Profile fetch failed — non-critical, user is still authenticated
      }
    } catch (e) {
      // Timeout or network failure — no session available
      set({ user: null, profile: null, loading: false });
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { user, profile } = get();
    if (!user) {
      console.error("No user found in store");
      return { success: false, error: { message: "No user found" } };
    }

    const role = (user.role || "patient") as "patient" | "doctor" | "admin";

    try {
      // Use backend API endpoint instead of direct Supabase call
      let response;
      if (role === "patient") {
        // Import patientAPI dynamically to avoid circular dependency
        const { patientAPI } = await import("./api");
        response = await patientAPI.updateProfile(updates);
      } else if (role === "doctor") {
        // For doctors, still use profileAPI but handle array response
        const { data, error } = await profileAPI.updateProfile(
          user.id,
          updates,
          role,
        );
        if (error) {
          console.error("Profile update error:", error);
          return { success: false, error };
        }
        // Supabase returns an array, take first element
        const updatedData = Array.isArray(data) ? data[0] : data;
        response = { data: { success: true, data: updatedData } };
      } else {
        // Admin or other roles
        const { data, error } = await profileAPI.updateProfile(
          user.id,
          updates,
          role,
        );
        if (error) {
          console.error("Profile update error:", error);
          return { success: false, error };
        }
        // Supabase returns an array, take first element
        const updatedData = Array.isArray(data) ? data[0] : data;
        response = { data: { success: true, data: updatedData } };
      }

      // Extract data from backend response format: { success: true, data: {...} }
      const updatedProfile = response.data?.data || { ...profile, ...updates };
      set({ profile: updatedProfile });

      return { success: true, data: updatedProfile };
    } catch (err: unknown) {
      const error = err as Error & { response?: { data?: { detail?: string } } };
      console.error("Exception during profile update:", error);
      const errorMessage = error?.response?.data?.detail || error?.message || "Failed to update profile";
      return { success: false, error: { message: errorMessage } };
    }
  },
}));

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  status: "scheduled" | "completed" | "cancelled" | "no-show";
  type: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface AppointmentState {
  appointments: Appointment[];
  loading: boolean;
  selectedAppointment: Appointment | null;
  setAppointments: (appointments: Appointment[]) => void;
  setLoading: (loading: boolean) => void;
  setSelectedAppointment: (appointment: Appointment | null) => void;
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  removeAppointment: (id: string) => void;
}

// Appointment Store
export const useAppointmentStore = create<AppointmentState>((set) => ({
  appointments: [],
  loading: false,
  selectedAppointment: null,

  setAppointments: (appointments: Appointment[]) => set({ appointments }),
  setLoading: (loading: boolean) => set({ loading }),
  setSelectedAppointment: (appointment: Appointment | null) =>
    set({ selectedAppointment: appointment }),

  addAppointment: (appointment: Appointment) =>
    set((state) => ({
      appointments: [...state.appointments, appointment],
    })),

  updateAppointment: (id: string, updates: Partial<Appointment>) =>
    set((state) => ({
      appointments: state.appointments.map((appt) =>
        appt.id === id ? { ...appt, ...updates } : appt,
      ),
    })),

  removeAppointment: (id: string) =>
    set((state) => ({
      appointments: state.appointments.filter((appt) => appt.id !== id),
    })),
}));

interface VideoState {
  roomName: string | null;
  token: string | null;
  isInCall: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  translationEnabled: boolean;
  targetLanguage: string;
  setRoomInfo: (roomName: string | null, token: string | null) => void;
  setInCall: (isInCall: boolean) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleTranslation: () => void;
  setTargetLanguage: (language: string) => void;
  reset: () => void;
}

// Video Call Store
export const useVideoStore = create<VideoState>((set) => ({
  roomName: null,
  token: null,
  isInCall: false,
  isMuted: false,
  isVideoOff: false,
  translationEnabled: false,
  targetLanguage: "en",

  setRoomInfo: (roomName: string | null, token: string | null) =>
    set({ roomName, token }),
  setInCall: (isInCall: boolean) => set({ isInCall }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleVideo: () => set((state) => ({ isVideoOff: !state.isVideoOff })),
  toggleTranslation: () =>
    set((state) => ({ translationEnabled: !state.translationEnabled })),
  setTargetLanguage: (language: string) => set({ targetLanguage: language }),

  reset: () =>
    set({
      roomName: null,
      token: null,
      isInCall: false,
      isMuted: false,
      isVideoOff: false,
      translationEnabled: false,
      targetLanguage: "en",
    }),
}));

interface AnemiaResult {
  id: string;
  patient_id: string;
  image_url: string;
  confidence: number;
  prediction: "anemic" | "non-anemic";
  hemoglobin_level?: number;
  created_at: string;
  notes?: string;
}

interface AnemiaState {
  results: AnemiaResult[];
  currentResult: AnemiaResult | null;
  loading: boolean;
  setResults: (results: AnemiaResult[]) => void;
  setCurrentResult: (result: AnemiaResult | null) => void;
  setLoading: (loading: boolean) => void;
  addResult: (result: AnemiaResult) => void;
}

// Anemia Detection Store
export const useAnemiaStore = create<AnemiaState>((set) => ({
  results: [],
  currentResult: null,
  loading: false,

  setResults: (results: AnemiaResult[]) => set({ results }),
  setCurrentResult: (result: AnemiaResult | null) => set({ currentResult: result }),
  setLoading: (loading: boolean) => set({ loading }),

  addResult: (result: AnemiaResult) =>
    set((state) => ({
      results: [result, ...state.results],
      currentResult: result,
    })),
}));

export interface PresenceUser {
  id: string;
  name?: string;
  status: "online" | "away" | "busy" | "offline";
  lastSeen: string;
  activity?: string;
}

interface PresenceState {
  onlineUsers: Record<string, PresenceUser>;
  setUsers: (users: Record<string, PresenceUser>) => void;
  updateUser: (id: string, updates: Partial<PresenceUser>) => void;
  removeUser: (id: string) => void;
}

// Presence Store
export const usePresenceStore = create<PresenceState>((set) => ({
  onlineUsers: {},
  setUsers: (onlineUsers) => set({ onlineUsers }),
  updateUser: (id, updates) => 
    set((state) => ({
      onlineUsers: {
        ...state.onlineUsers,
        [id]: { ...state.onlineUsers[id], ...updates }
      }
    })),
  removeUser: (id) =>
    set((state) => {
      const newUsers = { ...state.onlineUsers };
      delete newUsers[id];
      return { onlineUsers: newUsers };
    }),
}));

// Notification Store
export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      soundEnabled: true,
      desktopEnabled: true,

      addNotification: (notification: Notification) =>
        set((state) => {
          const newNotifications = [notification, ...state.notifications];
          return {
            notifications: newNotifications,
            unreadCount: state.unreadCount + 1,
          };
        }),

      markAsRead: (id: string) =>
        set((state) => {
          const newNotifications = state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          );
          const newUnreadCount = Math.max(0, state.unreadCount - 1);
          return {
            notifications: newNotifications,
            unreadCount: newUnreadCount,
          };
        }),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),

      clearNotifications: () =>
        set({
          notifications: [],
          unreadCount: 0,
        }),

      setSoundEnabled: (enabled: boolean) => set({ soundEnabled: enabled }),
      setDesktopEnabled: (enabled: boolean) => set({ desktopEnabled: enabled }),
    }),
    {
      name: "netra-notifications",
    }
  )
);

// WebSocket Store
export const useWebSocketStore = create<WebSocketState>((set) => ({
  status: "disconnected",
  lastError: null,

  setStatus: (status) => set({ status }),
  setLastError: (error) => set({ lastError: error }),
}));
