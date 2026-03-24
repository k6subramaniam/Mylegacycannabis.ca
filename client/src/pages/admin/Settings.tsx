import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon, Shield, ShieldOff, Save, Loader2,
  AlertTriangle, CheckCircle, Info,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Admin Settings page.
 * Exposes site-wide configuration toggles (e.g. ID Verification enable/disable).
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
      // Also invalidate the public siteConfig so storefront picks up the change immediately
      utils.store.siteConfig.invalidate();
    },
  });

  const [idVerificationEnabled, setIdVerificationEnabled] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state when data loads
  useEffect(() => {
    if (settings) {
      const val = settings.id_verification_enabled;
      setIdVerificationEnabled(val !== "false");
      setHasChanges(false);
    }
  }, [settings]);

  const handleToggle = () => {
    const newValue = !idVerificationEnabled;
    setIdVerificationEnabled(newValue);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateSetting.mutateAsync({
        key: "id_verification_enabled",
        value: idVerificationEnabled ? "true" : "false",
      });
      setHasChanges(false);
      toast.success(
        idVerificationEnabled
          ? "ID Verification enabled — customers must verify their ID to place orders."
          : "ID Verification disabled — all customers can place orders without ID checks."
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to save settings");
    }
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

      {/* ID Verification Section */}
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
              onClick={handleToggle}
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
          {hasChanges && (
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
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
                  setHasChanges(false);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Additional settings can go here in the future */}
      <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-8 text-center">
        <SettingsIcon size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400 font-medium">More settings coming soon</p>
        <p className="text-xs text-gray-400 mt-1">Payment, store hours, maintenance mode, etc.</p>
      </div>
    </div>
  );
}
