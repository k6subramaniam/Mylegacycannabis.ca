import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon, Shield, ShieldOff, Save, Loader2,
  AlertTriangle, CheckCircle, Info, Wrench, WrenchIcon, Clock,
  Eye, EyeOff, Type, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import type { DayHours, StoreHours } from "@/hooks/useSiteConfig";

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
 * Sections: ID Verification, Maintenance Mode, Hours of Operation.
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

  // Sync all local state from loaded settings
  useEffect(() => {
    if (settings) {
      // ID Verification
      setIdVerificationEnabled(settings.id_verification_enabled !== "false");
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
      await updateSetting.mutateAsync({
        key: "id_verification_enabled",
        value: idVerificationEnabled ? "true" : "false",
      });
      setIdHasChanges(false);
      toast.success(
        idVerificationEnabled
          ? "ID Verification enabled — customers must verify their ID to place orders."
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
    </div>
  );
}
