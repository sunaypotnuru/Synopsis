import { useState } from "react";
import { AlertTriangle, X, Phone } from "lucide-react";
import { patientAPI } from "@/lib/api";
import { toast } from "sonner";
import { useLocation } from "react-router";
import { useTranslation } from "react-i18next";

/**
 * Floating SOS Emergency Button
 * Renders on every /patient/* page (next to the chatbot FAB).
 * On click → confirms → gets GPS location → fires POST /api/v1/patient/sos
 */
export default function SOSButton() {
  const { t } = useTranslation();
    const [confirming, setConfirming] = useState(false);
    const [firing, setFiring] = useState(false);
    const location = useLocation();

    // Only show on patient pages
    if (!location.pathname.startsWith("/patient")) return null;

    const handleSOS = async () => {
        if (!confirming) {
            setConfirming(true);
            // Auto-dismiss confirm dialog after 8s
            setTimeout(() => setConfirming(false), 8000);
            return;
        }
        setFiring(true);
        setConfirming(false);
        try {
            let pos: GeolocationPosition | null = null;
            try {
                pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject, { 
                        timeout: 5000,
                        enableHighAccuracy: true 
                    })
                );
            } catch (geoErr) {
                console.warn("Location access denied or timed out:", geoErr);
                toast.warning(t('components.s_o_s_button.location_denied_sending_1', "Location denied. Sending SOS without GPS coordinates."));
            }

            await patientAPI.triggerSOS({
                lat: pos?.coords.latitude ?? 0,
                lng: pos?.coords.longitude ?? 0,
            });
            toast.error(t('components.s_o_s_button.sos_alert_sent_2', "🚨 SOS Alert Sent! Help is on the way."), { duration: 6000 });
        } catch (err: unknown) {
            const error = err as { response?: { data?: { detail?: string } } };
            const msg = error?.response?.data?.detail || "SOS could not be sent. Please call emergency services directly.";
            toast.error(msg);
        } finally {
            setFiring(false);
        }
    };

    return (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-2">
            {/* Confirm dialog */}
            {confirming && (
                <div className="bg-card border-2 border-red-500 rounded-2xl shadow-2xl p-4 max-w-[220px] text-right">
                    <p className="text-sm font-bold text-red-500 mb-1">{t('components.s_o_s_button.send_emergency_sos', "Send Emergency SOS?")}</p>
                    <p className="text-xs text-muted-foreground mb-3">{t('components.s_o_s_button.your_location_will_be_1', "Your location will be sent to emergency contacts.")}</p>
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => setConfirming(false)}
                            className="px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 font-medium"
                        >
                            <X className="w-3 h-3 inline mr-1" />{t('components.s_o_s_button.cancel_2', "Cancel")}</button>
                        <button
                            onClick={handleSOS}
                            className="px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 font-bold"
                        >
                            <Phone className="w-3 h-3 inline mr-1" />{t('components.s_o_s_button.send_sos_3', "SEND SOS")}</button>
                    </div>
                </div>
            )}

            {/* FAB Button */}
            <button
                onClick={handleSOS}
                disabled={firing}
                title={t('components.s_o_s_button.emergency_sos_title_4', "Emergency SOS")}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all
          ${firing
                        ? "bg-red-300 animate-pulse cursor-not-allowed"
                        : "bg-red-500 hover:bg-red-600 active:scale-95 hover:shadow-red-300"
                    }
          ${confirming ? "ring-4 ring-red-300 ring-offset-2" : ""}
        `}
                style={{ boxShadow: "0 4px 20px rgba(239,68,68,0.5)" }}
            >
                <AlertTriangle className="w-7 h-7 text-white" />
            </button>
        </div>
    );
}
