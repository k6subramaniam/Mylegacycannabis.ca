import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon, Shield, ShieldOff, Save, Loader2,
  AlertTriangle, CheckCircle, Info, Wrench, WrenchIcon, Clock,
  Eye, EyeOff, Type, MessageSquare, Key, Smartphone,
  Sparkles, Zap, Brain, ImageIcon, Upload, Trash2, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { DayHours, StoreHours } from "@/hooks/useSiteConfig";
import EmailHealthMonitor from "./EmailHealthMonitor";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_LABELS: Record<string, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

const DEFAULT_HOURS: StoreHours = {
  monday:    { open: "10:00", close: "22:00", closed: false },
  tuesday:   { open: "10:00", close: "22:00", closed: false },
  wednesday: { open: "10:00", close: "22:00", closed: false },
  thursday:  { open: "10:00", close: "22:00", closed: false },
  friday:    { open: "10:00", close: "23:00", closed: false },
  saturday:  { open: "10:00", close: "23:00", closed: false },
  sunday:    { open: "11:00", close: "21:00", closed: false },
};

/**
 * Admin Settings page.
 * Sections: ID Verification, Maintenance Mode, Hours of Operation, Auth Providers.
 */
export default function AdminSettings() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.admin.settings.getAll.useQuery(undefined, {
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const updateSetting = trpc.admin.settings.update.useMutation({
    onSuccess: () => {
      utils.admin.settings.getAll.invalidate();
      utils.store.siteConfig.invalidate();
    },
  });

  // ─── ID VERIFICATION STATE ───
  const [idVerificationEnabled, setIdVerificationEnabled] = useState(true);
  const [idVerificationMode, setIdVerificationMode] = useState<"manual" | "ai">("manual");
  const [idHasChanges, setIdHasChanges] = useState(false);

  // ─── MAINTENANCE MODE STATE ───
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceTitle, setMaintenanceTitle] = useState("We'll Be Right Back");
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    "Our store is currently undergoing scheduled maintenance. We appreciate your patience and will be back online shortly. Please check back soon!"
  );
  const [maintenanceHasChanges, setMaintenanceHasChanges] = useState(false);

  // ─── HOURS OF OPERATION STATE ───
  const [hoursEnabled, setHoursEnabled] = useState(true);
  const [storeHours, setStoreHours] = useState<StoreHours>(DEFAULT_HOURS);
  const [hoursNote, setHoursNote] = useState("Orders placed outside business hours will be processed on the next business day.");
  const [hoursHasChanges, setHoursHasChanges] = useState(false);

  // ─── AUTH PROVIDERS STATUS ───
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [smsAvailable, setSmsAvailable] = useState(false);
  const [smtpAvailable, setSmtpAvailable] = useState(false);
  const [emailProvider, setEmailProvider] = useState<string>("none");
  const [smtpAdminEmail, setSmtpAdminEmail] = useState<string | null>(null);
  const [smtpMissing, setSmtpMissing] = useState<string[]>([]);
  const [authStatusLoading, setAuthStatusLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/google-available').then(r => r.json()).then(d => setGoogleAvailable(d.available)).catch(() => {}),
      fetch('/api/auth/sms-available').then(r => r.json()).then(d => setSmsAvailable(d.available)).catch(() => {}),
      fetch('/api/auth/smtp-available').then(r => r.json()).then(d => { setSmtpAvailable(d.available); setEmailProvider(d.provider || "none"); setSmtpAdminEmail(d.adminEmail); setSmtpMissing(d.missing || []); }).catch(() => {}),
    ]).finally(() => setAuthStatusLoading(false));
  }, []);

  // Sync all local state from loaded settings
  useEffect(() => {
    if (settings) {
      // ID Verification
      setIdVerificationEnabled(settings.id_verification_enabled !== "false");
      setIdVerificationMode((settings.id_verification_mode === "ai" ? "ai" : "manual") as "manual" | "ai");
      setIdHasChanges(false);

      // Maintenance Mode
      setMaintenanceEnabled(settings.maintenance_mode_enabled === "true");
      if (settings.maintenance_title) setMaintenanceTitle(settings.maintenance_title);
      if (settings.maintenance_message) setMaintenanceMessage(settings.maintenance_message);
      setMaintenanceHasChanges(false);

      // Hours of Operation
      setHoursEnabled(settings.store_hours_enabled !== "false");
      if (settings.store_hours) {
        try { setStoreHours(JSON.parse(settings.store_hours)); } catch {}
      }
      if (settings.store_hours_note !== undefined) setHoursNote(settings.store_hours_note);
      setHoursHasChanges(false);
    }
  }, [settings]);

  // ─── SAVE HANDLERS ───

  const handleSaveIdVerification = async () => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({
          key: "id_verification_enabled",
          value: idVerificationEnabled ? "true" : "false",
        }),
        updateSetting.mutateAsync({
          key: "id_verification_mode",
          value: idVerificationMode,
        }),
      ]);
      setIdHasChanges(false);
      const modeLabel = idVerificationMode === "ai" ? "AI auto-verification" : "manual admin review";
      toast.success(
        idVerificationEnabled
          ? `ID Verification enabled with ${modeLabel}.`
          : "ID Verification disabled — all customers can place orders without ID checks."
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to save settings");
    }
  };

  const handleSaveMaintenance = async () => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: "maintenance_mode_enabled", value: maintenanceEnabled ? "true" : "false" }),
        updateSetting.mutateAsync({ key: "maintenance_title", value: maintenanceTitle }),
        updateSetting.mutateAsync({ key: "maintenance_message", value: maintenanceMessage }),
      ]);
      setMaintenanceHasChanges(false);
      toast.success(
        maintenanceEnabled
          ? "Maintenance mode activated — the storefront is now showing the maintenance page to visitors."
          : "Maintenance mode deactivated — the storefront is live and accessible to all visitors."
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to save maintenance settings");
    }
  };

  const handleSaveHours = async () => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: "store_hours_enabled", value: hoursEnabled ? "true" : "false" }),
        updateSetting.mutateAsync({ key: "store_hours", value: JSON.stringify(storeHours) }),
        updateSetting.mutateAsync({ key: "store_hours_note", value: hoursNote }),
      ]);
      setHoursHasChanges(false);
      toast.success("Hours of operation saved successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save hours settings");
    }
  };

  // ─── HOURS HELPERS ───
  const updateDayHours = (day: string, field: keyof DayHours, value: string | boolean) => {
    setStoreHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
    setHoursHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon size={24} className="text-[#4B2D8E]" />
          <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        </div>
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-gray-400" />
          <span className="ml-3 text-gray-500">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SettingsIcon size={24} className="text-[#4B2D8E]" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
            <p className="text-sm text-gray-500 mt-0.5">Configure site-wide settings and features.</p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 0: LOGO MANAGEMENT
          ══════════════════════════════════════════════════════════════ */}
      <LogoManagementSection />

      {/* ══════════════════════════════════════════════════════════════
          SECTION 1: MAINTENANCE MODE
          ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <Wrench size={20} className="text-[#F15929]" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Maintenance Mode</h2>
            <p className="text-sm text-gray-500">Take the storefront offline with a customizable maintenance page.</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                maintenanceEnabled ? "bg-red-100" : "bg-gray-100"
              }`}>
                {maintenanceEnabled
                  ? <WrenchIcon size={24} className="text-red-600" />
                  : <Eye size={24} className="text-gray-400" />
                }
              </div>
              <div>
                <p className="font-semibold text-gray-800">
                  {maintenanceEnabled ? "Maintenance Mode is Active" : "Store is Live"}
                </p>
                <p className="text-sm text-gray-500">
                  {maintenanceEnabled
                    ? "Visitors see a maintenance page. Admin panel remains accessible."
                    : "The storefront is live and accessible to all visitors."
                  }
                </p>
              </div>
            </div>

            <button
              onClick={() => { setMaintenanceEnabled(!maintenanceEnabled); setMaintenanceHasChanges(true); }}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                maintenanceEnabled ? "bg-red-500" : "bg-gray-300"
              }`}
              role="switch"
              aria-checked={maintenanceEnabled}
              aria-label="Toggle maintenance mode"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  maintenanceEnabled ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Warning when active */}
          {maintenanceEnabled && (
            <div className="rounded-xl p-4 border bg-red-50 border-red-200">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Store is currently offline for visitors</p>
                  <p className="text-sm text-red-700 mt-1">
                    All storefront pages will display the maintenance message below. The admin panel (/admin/*) remains fully accessible.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Customizable Title */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Type size={14} />
              Maintenance Page Title
            </label>
            <input
              type="text"
              value={maintenanceTitle}
              onChange={(e) => { setMaintenanceTitle(e.target.value); setMaintenanceHasChanges(true); }}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E] focus:border-[#4B2D8E]"
              placeholder="e.g. We'll Be Right Back"
            />
          </div>

          {/* Customizable Message */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MessageSquare size={14} />
              Maintenance Page Message
            </label>
            <textarea
              value={maintenanceMessage}
              onChange={(e) => { setMaintenanceMessage(e.target.value); setMaintenanceHasChanges(true); }}
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#4B2D8E] focus:border-[#4B2D8E]"
              placeholder="Enter the message visitors will see during maintenance..."
            />
            <p className="text-xs text-gray-400 mt-1">This message is displayed on the maintenance page to all visitors.</p>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Preview</p>
            <div className="bg-[#4B2D8E] rounded-xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                <Wrench size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                {maintenanceTitle || "We'll Be Right Back"}
              </h3>
              <p className="text-white/80 text-sm max-w-md mx-auto leading-relaxed whitespace-pre-wrap">
                {maintenanceMessage || "Our store is currently undergoing maintenance."}
              </p>
            </div>
          </div>

          {/* Save */}
          {maintenanceHasChanges && (
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveMaintenance}
                disabled={updateSetting.isPending}
                className="bg-[#4B2D8E] hover:bg-[#3a2270] text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                {updateSetting.isPending ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving...</>
                ) : (
                  <><Save size={16} /> Save Maintenance Settings</>
                )}
              </button>
              <button
                onClick={() => {
                  if (settings) {
                    setMaintenanceEnabled(settings.maintenance_mode_enabled === "true");
                    if (settings.maintenance_title) setMaintenanceTitle(settings.maintenance_title);
                    if (settings.maintenance_message) setMaintenanceMessage(settings.maintenance_message);
                  }
                  setMaintenanceHasChanges(false);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 2: HOURS OF OPERATION
          ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <Clock size={20} className="text-[#4B2D8E]" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Hours of Operation</h2>
            <p className="text-sm text-gray-500">Set your store's business hours displayed on the storefront.</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Show/Hide Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                hoursEnabled ? "bg-[#4B2D8E]/10" : "bg-gray-100"
              }`}>
                {hoursEnabled
                  ? <Clock size={24} className="text-[#4B2D8E]" />
                  : <EyeOff size={24} className="text-gray-400" />
                }
              </div>
              <div>
                <p className="font-semibold text-gray-800">
                  {hoursEnabled ? "Hours are Displayed" : "Hours are Hidden"}
                </p>
                <p className="text-sm text-gray-500">
                  {hoursEnabled
                    ? "Business hours are shown in the storefront footer and contact page."
                    : "Business hours are not displayed to visitors."
                  }
                </p>
              </div>
            </div>

            <button
              onClick={() => { setHoursEnabled(!hoursEnabled); setHoursHasChanges(true); }}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#4B2D8E] focus:ring-offset-2 ${
                hoursEnabled ? "bg-[#4B2D8E]" : "bg-gray-300"
              }`}
              role="switch"
              aria-checked={hoursEnabled}
              aria-label="Toggle hours display"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  hoursEnabled ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Schedule Grid */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Weekly Schedule</p>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[120px_1fr_auto_1fr_auto] md:grid-cols-[140px_1fr_auto_1fr_auto] items-center gap-x-3 gap-y-0 text-sm">
                {/* Table header */}
                <div className="bg-gray-50 px-4 py-2.5 font-medium text-xs text-gray-500 uppercase">Day</div>
                <div className="bg-gray-50 px-2 py-2.5 font-medium text-xs text-gray-500 uppercase">Opens</div>
                <div className="bg-gray-50 py-2.5 text-xs text-gray-400 text-center">to</div>
                <div className="bg-gray-50 px-2 py-2.5 font-medium text-xs text-gray-500 uppercase">Closes</div>
                <div className="bg-gray-50 px-3 py-2.5 font-medium text-xs text-gray-500 uppercase text-center">Closed</div>

                {DAYS.map(day => {
                  const dayData = storeHours[day] || { open: "10:00", close: "22:00", closed: false };
                  return (
                    <div key={day} className="contents">
                      <div className="px-4 py-2.5 font-medium text-gray-800 border-t border-gray-100">
                        {DAY_LABELS[day]}
                      </div>
                      <div className="px-2 py-2 border-t border-gray-100">
                        <input
                          type="time"
                          value={dayData.open}
                          onChange={(e) => updateDayHours(day, "open", e.target.value)}
                          disabled={dayData.closed}
                          className={`w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm ${
                            dayData.closed ? "bg-gray-50 text-gray-400" : "bg-white"
                          }`}
                        />
                      </div>
                      <div className="border-t border-gray-100 text-center text-gray-400 text-xs">to</div>
                      <div className="px-2 py-2 border-t border-gray-100">
                        <input
                          type="time"
                          value={dayData.close}
                          onChange={(e) => updateDayHours(day, "close", e.target.value)}
                          disabled={dayData.closed}
                          className={`w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm ${
                            dayData.closed ? "bg-gray-50 text-gray-400" : "bg-white"
                          }`}
                        />
                      </div>
                      <div className="px-3 py-2 border-t border-gray-100 flex justify-center">
                        <button
                          onClick={() => updateDayHours(day, "closed", !dayData.closed)}
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                            dayData.closed
                              ? "bg-red-500 border-red-500 text-white"
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                          aria-label={`Mark ${DAY_LABELS[day]} as ${dayData.closed ? "open" : "closed"}`}
                        >
                          {dayData.closed && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Custom Note */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Info size={14} />
              Additional Note
            </label>
            <textarea
              value={hoursNote}
              onChange={(e) => { setHoursNote(e.target.value); setHoursHasChanges(true); }}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#4B2D8E] focus:border-[#4B2D8E]"
              placeholder="e.g. Orders placed outside business hours will be processed on the next business day."
            />
            <p className="text-xs text-gray-400 mt-1">Displayed below the hours schedule on the storefront.</p>
          </div>

          {/* Save */}
          {hoursHasChanges && (
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveHours}
                disabled={updateSetting.isPending}
                className="bg-[#4B2D8E] hover:bg-[#3a2270] text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                {updateSetting.isPending ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving...</>
                ) : (
                  <><Save size={16} /> Save Hours</>
                )}
              </button>
              <button
                onClick={() => {
                  if (settings) {
                    setHoursEnabled(settings.store_hours_enabled !== "false");
                    if (settings.store_hours) {
                      try { setStoreHours(JSON.parse(settings.store_hours)); } catch {}
                    }
                    if (settings.store_hours_note !== undefined) setHoursNote(settings.store_hours_note);
                  }
                  setHoursHasChanges(false);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 3: ID VERIFICATION
          ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <Shield size={20} className="text-[#4B2D8E]" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">ID Verification</h2>
            <p className="text-sm text-gray-500">Control whether customers must verify their identity before placing orders.</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                idVerificationEnabled ? "bg-[#4B2D8E]/10" : "bg-gray-100"
              }`}>
                {idVerificationEnabled
                  ? <Shield size={24} className="text-[#4B2D8E]" />
                  : <ShieldOff size={24} className="text-gray-400" />
                }
              </div>
              <div>
                <p className="font-semibold text-gray-800">
                  {idVerificationEnabled ? "ID Verification is Enabled" : "ID Verification is Disabled"}
                </p>
                <p className="text-sm text-gray-500">
                  {idVerificationEnabled
                    ? "Customers must verify their ID (19+ age check) before placing orders."
                    : "All customers can place orders without ID verification."
                  }
                </p>
              </div>
            </div>

            <button
              onClick={() => { setIdVerificationEnabled(!idVerificationEnabled); setIdHasChanges(true); }}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#4B2D8E] focus:ring-offset-2 ${
                idVerificationEnabled ? "bg-[#4B2D8E]" : "bg-gray-300"
              }`}
              role="switch"
              aria-checked={idVerificationEnabled}
              aria-label="Toggle ID verification"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  idVerificationEnabled ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Verification Mode Toggle — only visible when ID verification is enabled */}
          {idVerificationEnabled && (
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-3">Verification Method</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setIdVerificationMode("manual"); setIdHasChanges(true); }}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                    idVerificationMode === "manual"
                      ? "border-[#4B2D8E] bg-[#4B2D8E]/5 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  {idVerificationMode === "manual" && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle size={18} className="text-[#4B2D8E]" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      idVerificationMode === "manual" ? "bg-[#4B2D8E]/10" : "bg-gray-100"
                    }`}>
                      <Shield size={20} className={idVerificationMode === "manual" ? "text-[#4B2D8E]" : "text-gray-400"} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Manual Review</h3>
                      <p className="text-xs text-gray-500">Admin reviews IDs</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    All submitted IDs are queued for admin review. You approve or reject each submission manually.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => { setIdVerificationMode("ai"); setIdHasChanges(true); }}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                    idVerificationMode === "ai"
                      ? "border-violet-400 bg-violet-50/50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  {idVerificationMode === "ai" && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle size={18} className="text-violet-500" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      idVerificationMode === "ai" ? "bg-violet-100" : "bg-gray-100"
                    }`}>
                      <Sparkles size={20} className={idVerificationMode === "ai" ? "text-violet-600" : "text-gray-400"} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">AI Auto-Verify</h3>
                      <p className="text-xs text-gray-500">AI reviews IDs instantly</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    AI automatically verifies IDs using vision. High-confidence approvals are instant; low-confidence submissions are flagged for manual review.
                  </p>
                </button>
              </div>

              {idVerificationMode === "ai" && (
                <div className="mt-3 rounded-lg p-3 bg-violet-50 border border-violet-200">
                  <div className="flex items-start gap-2">
                    <Sparkles size={14} className="text-violet-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-violet-700">
                      AI verification uses the configured AI provider (Settings &rarr; AI Configuration). Ensure an API key is set.
                      The AI checks for valid Canadian government-issued photo ID and verifies the holder is 19+.
                      If confidence is low, the submission is flagged for your manual review.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Impact explanation */}
          <div className={`rounded-xl p-4 border transition-colors ${
            idVerificationEnabled
              ? "bg-blue-50 border-blue-200"
              : "bg-amber-50 border-amber-200"
          }`}>
            <div className="flex items-start gap-3">
              {idVerificationEnabled ? (
                <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-medium ${idVerificationEnabled ? "text-blue-800" : "text-amber-800"}`}>
                  {idVerificationEnabled ? "When Enabled:" : "When Disabled:"}
                </p>
                <ul className={`text-sm mt-1.5 space-y-1 ${idVerificationEnabled ? "text-blue-700" : "text-amber-700"}`}>
                  {idVerificationEnabled ? (
                    <>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={14} className="shrink-0 mt-0.5" />
                        <span>Registered users must verify their ID once before placing orders</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={14} className="shrink-0 mt-0.5" />
                        <span>Guest customers must submit ID at every checkout</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={14} className="shrink-0 mt-0.5" />
                        <span>ID verification email notifications are sent to customers and admins</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={14} className="shrink-0 mt-0.5" />
                        <span>Pending verification alerts appear on the admin dashboard</span>
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-start gap-2">
                        <ShieldOff size={14} className="shrink-0 mt-0.5" />
                        <span>All customers (registered and guests) can place orders without ID checks</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ShieldOff size={14} className="shrink-0 mt-0.5" />
                        <span>ID verification UI is hidden from checkout, cart, and account pages</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ShieldOff size={14} className="shrink-0 mt-0.5" />
                        <span>ID-related email notifications are suppressed</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ShieldOff size={14} className="shrink-0 mt-0.5" />
                        <span>Existing verified users retain their verified status</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Affected email templates */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Affected Email Templates:</p>
            <div className="flex flex-wrap gap-2">
              {[
                "admin-id-pending",
                "id-rejected",
                "id-verified",
                "guest-id-pending-admin",
                "guest-id-rejected",
                "guest-id-verified",
              ].map((slug) => (
                <span
                  key={slug}
                  className={`text-xs px-2.5 py-1 rounded-full font-mono ${
                    idVerificationEnabled
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-500 line-through"
                  }`}
                >
                  {slug}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {idVerificationEnabled
                ? "These templates are active and will be triggered by the verification workflow."
                : "These templates are suppressed and will not be sent while verification is disabled."
              }
            </p>
          </div>

          {/* Save button */}
          {idHasChanges && (
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveIdVerification}
                disabled={updateSetting.isPending}
                className="bg-[#4B2D8E] hover:bg-[#3a2270] text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                {updateSetting.isPending ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving...</>
                ) : (
                  <><Save size={16} /> Save Changes</>
                )}
              </button>
              <button
                onClick={() => {
                  if (settings) {
                    setIdVerificationEnabled(settings.id_verification_enabled !== "false");
                  }
                  setIdHasChanges(false);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 4: AI CONFIGURATION
          ══════════════════════════════════════════════════════════════ */}
      <AiConfigSection />

      {/* ══════════════════════════════════════════════════════════════
          SECTION 5: EMAIL HEALTH MONITOR
          ══════════════════════════════════════════════════════════════ */}
      <EmailHealthMonitor />

      {/* ══════════════════════════════════════════════════════════════
          SECTION 5: AUTHENTICATION PROVIDERS
          ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <Key size={20} className="text-[#4B2D8E]" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Authentication & Email Providers</h2>
            <p className="text-sm text-gray-500">Google social login, Twilio SMS, and SMTP email configuration status.</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {authStatusLoading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Checking provider status...</span>
            </div>
          ) : (
            <>
              {/* Google OAuth */}
              <div className={`rounded-xl border-2 p-4 ${
                googleAvailable ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    googleAvailable ? 'bg-green-100' : 'bg-amber-100'
                  }`}>
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800">Google Social Login</h3>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        googleAvailable ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {googleAvailable ? 'Active' : 'Not Configured'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {googleAvailable
                        ? 'Google OAuth is active. Customers can sign in and register using their Google accounts.'
                        : 'Allows customers to sign in with their Google account. Requires Google Cloud Console credentials.'
                      }
                    </p>
                    {!googleAvailable && (
                      <div className="mt-3 bg-white rounded-lg border border-amber-200 p-3">
                        <p className="text-xs font-semibold text-gray-700 mb-1.5">Setup Instructions:</p>
                        <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                          <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-[#4B2D8E] underline">Google Cloud Console &rarr; Credentials</a></li>
                          <li>Create an OAuth 2.0 Client ID (Web application)</li>
                          <li>Add your domain to Authorized redirect URIs: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[#4B2D8E]">https://yourdomain.com/api/auth/google/callback</code></li>
                          <li>Set these environment variables on your server (e.g. Railway):
                            <div className="mt-1 space-y-0.5">
                              <code className="block bg-gray-100 px-2 py-1 rounded text-[10px]">GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com</code>
                              <code className="block bg-gray-100 px-2 py-1 rounded text-[10px]">GOOGLE_CLIENT_SECRET=your-client-secret</code>
                            </div>
                          </li>
                          <li>Restart the server — the button will activate automatically</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Twilio SMS */}
              <div className={`rounded-xl border-2 p-4 ${
                smsAvailable ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    smsAvailable ? 'bg-green-100' : 'bg-amber-100'
                  }`}>
                    <Smartphone size={24} className={smsAvailable ? 'text-green-600' : 'text-amber-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800">Twilio SMS Verification</h3>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        smsAvailable ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {smsAvailable ? 'Active' : 'Not Configured'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {smsAvailable
                        ? 'Twilio SMS is active. Customers receive verification codes via text message for login and registration.'
                        : 'Sends OTP verification codes via SMS. Requires a Twilio account with a phone number.'
                      }
                    </p>
                    {!smsAvailable && (
                      <div className="mt-3 bg-white rounded-lg border border-amber-200 p-3">
                        <p className="text-xs font-semibold text-gray-700 mb-1.5">Setup Instructions:</p>
                        <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                          <li>Sign up at <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer" className="text-[#4B2D8E] underline">twilio.com</a> (free trial includes $15 credit)</li>
                          <li>Get a Twilio phone number with SMS capability (Canadian number recommended)</li>
                          <li>Find your Account SID and Auth Token on the <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer" className="text-[#4B2D8E] underline">Twilio Console</a></li>
                          <li>Set these environment variables on your server:
                            <div className="mt-1 space-y-0.5">
                              <code className="block bg-gray-100 px-2 py-1 rounded text-[10px]">TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>
                              <code className="block bg-gray-100 px-2 py-1 rounded text-[10px]">TWILIO_AUTH_TOKEN=your-auth-token</code>
                              <code className="block bg-gray-100 px-2 py-1 rounded text-[10px]">TWILIO_PHONE_NUMBER=+1234567890</code>
                            </div>
                          </li>
                          <li>Restart the server — SMS verification will activate automatically</li>
                        </ol>
                        <div className="mt-2 flex items-start gap-1.5">
                          <Info size={12} className="text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-amber-600">While SMS is not configured, phone OTP codes are logged to the server console for testing.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SMTP Email */}
              <div className={`rounded-xl border-2 p-4 ${
                smtpAvailable ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    smtpAvailable ? 'bg-green-100' : 'bg-amber-100'
                  }`}>
                    <MessageSquare size={24} className={smtpAvailable ? 'text-green-600' : 'text-amber-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800">Email Notifications</h3>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        smtpAvailable ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {smtpAvailable ? `Active (${emailProvider === 'resend' ? 'Resend' : 'SMTP'})` : 'Not Configured'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {smtpAvailable
                        ? `Emails are delivered via ${emailProvider === 'resend' ? 'Resend HTTP API' : 'SMTP'}. OTP codes, order confirmations, and admin alerts sent to ${smtpAdminEmail || 'the configured admin'}.`
                        : 'Sends real emails for OTP codes, order notifications, and admin alerts.'
                      }
                    </p>
                    {!smtpAvailable && (
                      <div className="mt-3 bg-white rounded-lg border border-amber-200 p-3">
                        {smtpMissing.length > 0 && (
                          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-xs font-semibold text-red-700">Missing: <span className="font-mono">{smtpMissing.join(' or ')}</span></p>
                          </div>
                        )}
                        {smtpAdminEmail && (
                          <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded">
                            <p className="text-xs text-green-700">ADMIN_EMAIL: <span className="font-semibold">{smtpAdminEmail}</span></p>
                          </div>
                        )}

                        <p className="text-xs font-semibold text-green-700 mb-1.5">Option A — Resend (Recommended for Railway):</p>
                        <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside mb-3">
                          <li>Sign up at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-[#4B2D8E] underline">resend.com</a> (free: 100 emails/day)</li>
                          <li>Create an API key in the Resend dashboard</li>
                          <li>Set these environment variables:
                            <div className="mt-1 space-y-0.5">
                              <code className="block bg-gray-100 px-2 py-1 rounded text-[10px]">RESEND_API_KEY=re_xxxxxxxx</code>
                              <code className="block bg-gray-100 px-2 py-1 rounded text-[10px]">SMTP_FROM=My Legacy Cannabis &lt;onboarding@resend.dev&gt;</code>
                              <code className="block bg-gray-100 px-2 py-1 rounded text-[10px]">ADMIN_EMAIL=your-email@gmail.com</code>
                            </div>
                          </li>
                          <li>Redeploy — emails start sending immediately</li>
                        </ol>

                        <p className="text-xs font-semibold text-gray-500 mb-1.5">Option B — Gmail SMTP (requires Railway Pro plan):</p>
                        <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                          <li>Enable 2-Step Verification on your Google Account</li>
                          <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-[#4B2D8E]/60 underline">Google App Passwords</a> and generate a password</li>
                          <li>Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, ADMIN_EMAIL</li>
                          <li>Note: Railway Hobby plan blocks SMTP ports 465/587. Requires Pro plan or above.</li>
                        </ol>

                        <div className="mt-2 flex items-start gap-1.5">
                          <Info size={12} className="text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-amber-600">While email is not configured, OTP codes are logged to the server console for testing.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-[#4B2D8E]/5 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Info size={16} className="text-[#4B2D8E] shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-600">
                    <p className="font-medium text-gray-700">System Status</p>
                    <ul className="mt-1.5 space-y-1">
                      <li className="flex items-center gap-2">
                        {smtpAvailable ? <CheckCircle size={14} className="text-green-500" /> : <AlertTriangle size={14} className="text-amber-500" />}
                        <span>Email Delivery — {smtpAvailable ? 'active via SMTP (real emails sent)' : 'not configured (OTP codes logged to console)'}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle size={14} className="text-green-500" />
                        <span>Email OTP Login — always available</span>
                      </li>
                      <li className="flex items-center gap-2">
                        {smsAvailable ? <CheckCircle size={14} className="text-green-500" /> : <AlertTriangle size={14} className="text-amber-500" />}
                        <span>Phone SMS OTP — {smsAvailable ? 'active via Twilio' : 'pending Twilio credentials'}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        {googleAvailable ? <CheckCircle size={14} className="text-green-500" /> : <AlertTriangle size={14} className="text-amber-500" />}
                        <span>Google Sign-In — {googleAvailable ? 'active' : 'pending Google OAuth credentials'}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AI CONFIGURATION SECTION
// ═══════════════════════════════════════════════════════════════
function AiConfigSection() {
  const utils = trpc.useUtils();
  const { data: aiConfig, isLoading } = trpc.admin.aiConfig.get.useQuery();
  const updateMutation = trpc.admin.aiConfig.update.useMutation({
    onSuccess: () => {
      utils.admin.aiConfig.get.invalidate();
      toast.success("AI configuration saved");
      setHasChanges(false);
      setApiKeyInput("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save"),
  });
  const testMutation = trpc.admin.aiConfig.test.useMutation();

  const [provider, setProvider] = useState<"openai" | "gemini">("openai");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [model, setModel] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latency?: number; model?: string; reply?: string; error?: string } | null>(null);

  // Sync from server data
  useEffect(() => {
    if (aiConfig) {
      setProvider(aiConfig.provider as "openai" | "gemini");
      setModel(aiConfig.model || "");
      setHasChanges(false);
    }
  }, [aiConfig]);

  const handleSave = () => {
    updateMutation.mutate({
      provider,
      apiKey: apiKeyInput || undefined,
      model: model || undefined,
    });
  };

  const handleTest = () => {
    setTestResult(null);
    testMutation.mutate(undefined, {
      onSuccess: (data) => setTestResult(data),
      onError: (err: any) => setTestResult({ success: false, error: err.message }),
    });
  };

  const OPENAI_MODELS = [
    { value: "", label: "Default (gpt-4o-mini)" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini — fast, affordable" },
    { value: "gpt-4o", label: "GPT-4o — best quality" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini — latest mini" },
    { value: "gpt-4.1", label: "GPT-4.1 — latest flagship" },
  ];

  const GEMINI_MODELS = [
    { value: "", label: "Default (gemini-2.5-flash)" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash — fast, affordable" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro — best quality" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash — stable" },
  ];

  const models = provider === "gemini" ? GEMINI_MODELS : OPENAI_MODELS;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <Brain size={20} className="text-violet-600" />
        <div>
          <h2 className="text-lg font-semibold text-gray-800">AI Configuration</h2>
          <p className="text-sm text-gray-500">Configure the AI provider for email template generation, menu import, and other AI features.</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading AI configuration...</span>
          </div>
        ) : (
          <>
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">AI Provider</label>
              <div className="grid grid-cols-2 gap-4">
                {/* OpenAI Card */}
                <button
                  type="button"
                  onClick={() => { setProvider("openai"); setModel(""); setHasChanges(true); }}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                    provider === "openai"
                      ? "border-emerald-400 bg-emerald-50/50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  {provider === "openai" && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle size={18} className="text-emerald-500" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      provider === "openai" ? "bg-emerald-100" : "bg-gray-100"
                    }`}>
                      <Zap size={20} className={provider === "openai" ? "text-emerald-600" : "text-gray-400"} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">OpenAI</h3>
                      <p className="text-xs text-gray-500">GPT-4o, GPT-4.1</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">Industry-standard AI models. Excellent for email generation and menu parsing.</p>
                </button>

                {/* Gemini Card */}
                <button
                  type="button"
                  onClick={() => { setProvider("gemini"); setModel(""); setHasChanges(true); }}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                    provider === "gemini"
                      ? "border-blue-400 bg-blue-50/50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  {provider === "gemini" && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle size={18} className="text-blue-500" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      provider === "gemini" ? "bg-blue-100" : "bg-gray-100"
                    }`}>
                      <Sparkles size={20} className={provider === "gemini" ? "text-blue-600" : "text-gray-400"} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Google Gemini</h3>
                      <p className="text-xs text-gray-500">Gemini 2.5 Flash / Pro</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">Google's latest AI. Fast and cost-effective with excellent vision support.</p>
                </button>
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Key size={14} />
                API Key
              </label>
              {aiConfig?.apiKeySet && !apiKeyInput && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle size={14} className="text-green-500" />
                  <span className="text-sm text-green-700">Key configured: <code className="bg-green-100 px-1.5 py-0.5 rounded text-xs">{aiConfig.apiKeyPreview}</code></span>
                </div>
              )}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKeyInput}
                    onChange={(e) => { setApiKeyInput(e.target.value); setHasChanges(true); }}
                    placeholder={aiConfig?.apiKeySet ? "Enter new key to replace existing..." : provider === "gemini" ? "AIza..." : "sk-proj-..."}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {provider === "openai" ? (
                  <>Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-violet-600 underline">platform.openai.com/api-keys</a></>
                ) : (
                  <>Get your key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-violet-600 underline">aistudio.google.com/apikey</a></>
                )}
              </p>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
              <select
                value={model}
                onChange={(e) => { setModel(e.target.value); setHasChanges(true); }}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              >
                {models.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">Controls which model is used for AI email templates and menu import.</p>
            </div>

            {/* What AI powers */}
            <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
              <div className="flex items-start gap-2">
                <Sparkles size={16} className="text-violet-600 shrink-0 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-700">AI is used for:</p>
                  <ul className="mt-1.5 space-y-1 text-xs">
                    <li className="flex items-center gap-2"><CheckCircle size={12} className="text-violet-500" /> Email template generation (AI Generate)</li>
                    <li className="flex items-center gap-2"><CheckCircle size={12} className="text-violet-500" /> Email template improvement (AI Improve)</li>
                    <li className="flex items-center gap-2"><CheckCircle size={12} className="text-violet-500" /> Menu image import (AI Vision)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Test + Save buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleTest}
                disabled={testMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-violet-200 text-sm font-medium text-violet-700 bg-white hover:bg-violet-50 disabled:opacity-50 transition-colors"
              >
                {testMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                Test Connection
              </button>

              {hasChanges && (
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="bg-[#4B2D8E] hover:bg-[#3a2270] text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-60"
                >
                  {updateMutation.isPending ? (
                    <><Loader2 size={14} className="animate-spin" /> Saving...</>
                  ) : (
                    <><Save size={14} /> Save Configuration</>
                  )}
                </button>
              )}
            </div>

            {/* Test result */}
            {testResult && (
              <div className={`rounded-xl p-4 border ${
                testResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
              }`}>
                <div className="flex items-start gap-3">
                  {testResult.success ? (
                    <CheckCircle size={18} className="text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${testResult.success ? "text-green-800" : "text-red-800"}`}>
                      {testResult.success ? "Connection successful!" : "Connection failed"}
                    </p>
                    {testResult.success ? (
                      <p className="text-xs text-green-700 mt-1">
                        Model: <code className="bg-green-100 px-1 py-0.5 rounded">{testResult.model}</code> &mdash;
                        Latency: {testResult.latency}ms &mdash;
                        Reply: "{testResult.reply}"
                      </p>
                    ) : (
                      <p className="text-xs text-red-700 mt-1">{testResult.error}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOGO MANAGEMENT SECTION
// ═══════════════════════════════════════════════════════════════
function LogoManagementSection() {
  const utils = trpc.useUtils();
  const { data: logoData, isLoading } = trpc.admin.emailLogo.get.useQuery();
  const uploadMutation = trpc.admin.emailLogo.upload.useMutation({
    onSuccess: (data) => {
      utils.admin.emailLogo.get.invalidate();
      utils.store.siteConfig.invalidate();
      setPreview(data.url);
      toast.success("Logo uploaded and applied globally! All pages, emails, and the admin panel will now use the new logo.");
    },
    onError: (err: any) => toast.error(err.message || "Failed to upload logo"),
  });
  const resetMutation = trpc.admin.emailLogo.update.useMutation({
    onSuccess: () => {
      utils.admin.emailLogo.get.invalidate();
      utils.store.siteConfig.invalidate();
      setPreview("/logo.png");
      toast.success("Logo reset to default.");
    },
    onError: (err: any) => toast.error(err.message || "Failed to reset logo"),
  });

  const [preview, setPreview] = useState<string>("/logo.png");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (logoData?.url) setPreview(logoData.url);
  }, [logoData]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, SVG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo file must be under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setPreview(reader.result as string);
      uploadMutation.mutate({
        fileName: file.name,
        base64,
        contentType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = ""; // reset to allow re-selecting same file
  };

  const handleReset = () => {
    if (window.confirm("Reset the logo to the default /logo.png? This will affect all pages and emails.")) {
      resetMutation.mutate({ url: `${window.location.origin}/logo.png` });
    }
  };

  const currentUrl = logoData?.url || "/logo.png";
  const isDefault = !logoData?.url || logoData.url === "/logo.png" || logoData.url.endsWith("/logo.png");

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <ImageIcon size={20} className="text-[#4B2D8E]" />
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Site Logo</h2>
          <p className="text-sm text-gray-500">Upload a logo that updates globally across the website, admin panel, and all email templates.</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading logo settings...</span>
          </div>
        ) : (
          <>
            {/* Current Logo Preview */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Current Logo</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dark background preview */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-[#1a1a2e] p-6 flex items-center justify-center min-h-[100px]">
                    <img
                      src={preview}
                      alt="Logo on dark background"
                      className="max-h-16 w-auto"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png"; }}
                    />
                  </div>
                  <div className="bg-gray-50 px-3 py-1.5 text-center">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Header / Email / Dark</span>
                  </div>
                </div>
                {/* Light background preview */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-white p-6 flex items-center justify-center min-h-[100px] border-b border-gray-100">
                    <img
                      src={preview}
                      alt="Logo on light background"
                      className="max-h-16 w-auto"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png"; }}
                    />
                  </div>
                  <div className="bg-gray-50 px-3 py-1.5 text-center">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Admin / Login / Light</span>
                  </div>
                </div>
              </div>
              {!isDefault && (
                <p className="text-xs text-gray-400 mt-2 truncate">
                  URL: <code className="bg-gray-50 px-1.5 py-0.5 rounded text-[10px]">{currentUrl}</code>
                </p>
              )}
            </div>

            {/* Upload Drop Zone */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-medium text-gray-700">Upload New Logo</p>
                <div className="relative group/tip">
                  <Info size={14} className="text-gray-400 cursor-help" />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 bg-gray-900 text-white text-xs rounded-lg px-4 py-3 shadow-xl opacity-0 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:pointer-events-auto transition-opacity z-50">
                    <p className="font-semibold mb-1.5">Recommended Logo Specs</p>
                    <ul className="space-y-1 text-gray-300">
                      <li><span className="text-white font-medium">Default file:</span> logo.png &mdash; 1024 x 572 px (RGBA)</li>
                      <li><span className="text-white font-medium">Aspect ratio:</span> ~1.79 : 1 (landscape)</li>
                      <li><span className="text-white font-medium">Display size:</span> h-10 (40 px) mobile, h-14 (56 px) desktop</li>
                      <li><span className="text-white font-medium">Width:</span> auto-scales to maintain ratio</li>
                      <li><span className="text-white font-medium">Best format:</span> transparent PNG or SVG</li>
                    </ul>
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-gray-900" />
                  </div>
                </div>
              </div>
              <label
                className={`relative flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  dragging
                    ? "border-[#4B2D8E] bg-[#4B2D8E]/5"
                    : "border-gray-300 hover:border-[#4B2D8E] hover:bg-gray-50"
                } ${uploadMutation.isPending ? "opacity-50 pointer-events-none" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleInputChange}
                  className="sr-only"
                />
                {uploadMutation.isPending ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 size={28} className="animate-spin text-[#4B2D8E]" />
                    <span className="text-sm text-gray-500">Uploading and applying...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload size={28} className="text-gray-400" />
                    <div className="text-center">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-[#4B2D8E]">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, SVG, or WebP (max 5 MB). Transparent PNG recommended.</p>
                    </div>
                  </div>
                )}
              </label>
            </div>

            {/* Where it's used */}
            <div className="bg-[#4B2D8E]/5 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <Info size={16} className="text-[#4B2D8E] shrink-0 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-700">This logo appears in:</p>
                  <ul className="mt-1.5 space-y-1 text-xs">
                    <li className="flex items-center gap-2"><CheckCircle size={12} className="text-[#4B2D8E]" /> Website header and footer</li>
                    <li className="flex items-center gap-2"><CheckCircle size={12} className="text-[#4B2D8E]" /> Age gate overlay</li>
                    <li className="flex items-center gap-2"><CheckCircle size={12} className="text-[#4B2D8E]" /> Maintenance mode page</li>
                    <li className="flex items-center gap-2"><CheckCircle size={12} className="text-[#4B2D8E]" /> Admin panel sidebar and mobile header</li>
                    <li className="flex items-center gap-2"><CheckCircle size={12} className="text-[#4B2D8E]" /> Login, Register, and Complete Profile pages</li>
                    <li className="flex items-center gap-2"><CheckCircle size={12} className="text-[#4B2D8E]" /> All email template headers and footers</li>
                    <li className="flex items-center gap-2"><CheckCircle size={12} className="text-[#4B2D8E]" /> OTP verification and admin notification emails</li>
                    <li className="flex items-center gap-2"><CheckCircle size={12} className="text-[#4B2D8E]" /> SEO Open Graph and social sharing images</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Reset to default */}
            {!isDefault && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleReset}
                  disabled={resetMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {resetMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Reset to Default Logo
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
