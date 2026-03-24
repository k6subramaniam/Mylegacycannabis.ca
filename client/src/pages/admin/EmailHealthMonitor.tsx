import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  Activity, CheckCircle, XCircle, AlertTriangle, Loader2,
  Send, RefreshCw, Wifi, WifiOff, Clock, ArrowRight, Info,
  ChevronLeft, ChevronRight, Zap, Mail, Server,
} from "lucide-react";
import { toast } from "sonner";

type Tab = "dashboard" | "events" | "test";

/**
 * Email Health Monitor — embedded in Admin Settings.
 *
 * Three sub-sections:
 *   1. Dashboard  — real-time status, uptime %, delivery stats
 *   2. Event Log  — paginated list of recent email events
 *   3. Provider Test — live connectivity ping + send test email
 */
export default function EmailHealthMonitor() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <Activity size={20} className="text-[#4B2D8E]" />
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-800">Email Health Monitor</h2>
          <p className="text-sm text-gray-500">Track delivery, detect outages, and test providers in real-time.</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-gray-100">
        <div className="flex px-6">
          {([
            { key: "dashboard" as Tab, label: "Dashboard", icon: Activity },
            { key: "events" as Tab, label: "Event Log", icon: Mail },
            { key: "test" as Tab, label: "Provider Test", icon: Zap },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? "border-[#4B2D8E] text-[#4B2D8E]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "events" && <EventsTab />}
        {activeTab === "test" && <TestTab />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 1: DASHBOARD
// ═══════════════════════════════════════════════════════════════

function DashboardTab() {
  const { data, isLoading, refetch } = trpc.admin.emailHealth.dashboard.useQuery(undefined, {
    refetchInterval: 15_000, // auto-refresh every 15s
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-gray-400" />
        <span className="ml-3 text-gray-500">Loading health data...</span>
      </div>
    );
  }

  const statusConfig = {
    healthy: { color: "green", icon: CheckCircle, label: "Healthy", bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
    degraded: { color: "amber", icon: AlertTriangle, label: "Degraded", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
    down: { color: "red", icon: XCircle, label: "Down", bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  };
  const sc = statusConfig[data.status];
  const StatusIcon = sc.icon;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={`rounded-xl p-5 border-2 ${sc.bg} ${sc.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              data.status === "healthy" ? "bg-green-100" :
              data.status === "degraded" ? "bg-amber-100" : "bg-red-100"
            }`}>
              <StatusIcon size={28} className={sc.text} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-xl font-bold ${sc.text}`}>{sc.label}</h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  data.status === "healthy" ? "bg-green-100 text-green-700" :
                  data.status === "degraded" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                }`}>
                  {data.activeProvider !== "none" ? data.activeProvider.toUpperCase() : "NO PROVIDER"}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-0.5">
                {data.status === "healthy" && "All emails are being delivered successfully."}
                {data.status === "degraded" && `${data.recentFailStreak} recent failure(s) detected. Monitor closely.`}
                {data.status === "down" && `${data.recentFailStreak} consecutive failures. Email delivery is failing.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors text-gray-500"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Warnings */}
      {data.warnings && data.warnings.length > 0 && (
        <div className="space-y-2">
          {data.warnings.map((warning: string, i: number) => (
            <div key={i} className="rounded-xl p-4 border-2 border-amber-200 bg-amber-50">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">{warning}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uptime Meters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Last 1 Hour", value: data.uptime.last1h },
          { label: "Last 24 Hours", value: data.uptime.last24h },
          { label: "All Time", value: data.uptime.allTime },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
            <div className="flex items-end gap-2 mt-2">
              <span className={`text-3xl font-bold ${
                value >= 95 ? "text-green-600" :
                value >= 80 ? "text-amber-600" : "text-red-600"
              }`}>
                {value}%
              </span>
              <span className="text-xs text-gray-400 mb-1">success rate</span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  value >= 95 ? "bg-green-500" :
                  value >= 80 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Sent" value={data.totals.sent} icon={CheckCircle} color="green" />
        <StatCard label="Failed" value={data.totals.failed} icon={XCircle} color="red" />
        <StatCard label="Bounced" value={data.totals.bounced} icon={AlertTriangle} color="amber" />
        <StatCard label="Fail Streak" value={data.recentFailStreak} icon={Activity} color={data.recentFailStreak > 0 ? "red" : "green"} />
      </div>

      {/* Timeline */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Timeline</p>
        <div className="space-y-2">
          <TimelineItem
            label="Last Successful Send"
            value={data.lastSuccessAt ? formatRelativeTime(data.lastSuccessAt) : "None yet"}
            success={!!data.lastSuccessAt}
          />
          <TimelineItem
            label="Last Failure"
            value={data.lastFailureAt ? formatRelativeTime(data.lastFailureAt) : "None"}
            success={!data.lastFailureAt}
          />
          {data.lastFailureError && (
            <div className="mt-1 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-mono text-red-700 break-all">{data.lastFailureError}</p>
            </div>
          )}
          <TimelineItem
            label="Monitoring Since"
            value={formatRelativeTime(data.monitoringSince)}
            success={true}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size: number; className?: string }>;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    green: "text-green-600 bg-green-50",
    red: "text-red-600 bg-red-50",
    amber: "text-amber-600 bg-amber-50",
  };
  const [textColor, bgColor] = (colorMap[color] || colorMap.green).split(" ");
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgColor}`}>
          <Icon size={16} className={textColor} />
        </div>
        <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}

function TimelineItem({ label, value, success }: { label: string; value: string; success: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${success ? "bg-green-500" : "bg-red-500"}`} />
      <span className="text-sm text-gray-600 min-w-[160px]">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 2: EVENT LOG
// ═══════════════════════════════════════════════════════════════

function EventsTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading } = trpc.admin.emailHealth.events.useQuery({
    page,
    limit: 15,
    status: statusFilter === "all" ? undefined : statusFilter as any,
  }, {
    refetchInterval: 10_000,
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Filter:</span>
        {["all", "sent", "failed", "bounced"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              statusFilter === s
                ? s === "sent" ? "bg-green-100 text-green-700"
                : s === "failed" ? "bg-red-100 text-red-700"
                : s === "bounced" ? "bg-amber-100 text-amber-700"
                : "bg-[#4B2D8E]/10 text-[#4B2D8E]"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        {data && (
          <span className="text-xs text-gray-400 ml-auto">{data.total} event{data.total !== 1 ? "s" : ""}</span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500 text-sm">Loading events...</span>
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="text-center py-12">
          <Mail size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No email events recorded yet.</p>
          <p className="text-gray-400 text-xs mt-1">Events appear here after OTP emails, notifications, or test sends.</p>
        </div>
      ) : (
        <>
          {/* Event List */}
          <div className="space-y-2">
            {data.data.map((event) => (
              <div
                key={event.id}
                className={`rounded-lg border p-3.5 transition-colors ${
                  event.status === "sent" ? "border-green-200 bg-green-50/30" :
                  event.status === "failed" ? "border-red-200 bg-red-50/30" :
                  "border-amber-200 bg-amber-50/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    event.status === "sent" ? "bg-green-100" :
                    event.status === "failed" ? "bg-red-100" : "bg-amber-100"
                  }`}>
                    {event.status === "sent" ? <CheckCircle size={16} className="text-green-600" /> :
                     event.status === "failed" ? <XCircle size={16} className="text-red-600" /> :
                     <AlertTriangle size={16} className="text-amber-600" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        event.status === "sent" ? "bg-green-100 text-green-700" :
                        event.status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {event.status.toUpperCase()}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                        {event.provider}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">{event.latencyMs}ms</span>
                    </div>

                    <p className="text-sm font-medium text-gray-800 mt-1 truncate" title={event.subject}>
                      {event.subject}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      To: {event.to} &middot; {formatRelativeTime(event.timestamp)}
                    </p>

                    {event.error && (
                      <div className="mt-2 bg-red-50 border border-red-200 rounded px-3 py-2">
                        <p className="text-xs font-mono text-red-700 break-all">{event.error}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {data.page} of {data.pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                disabled={page >= data.pages}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 3: PROVIDER TEST
// ═══════════════════════════════════════════════════════════════

function TestTab() {
  const { data: providers, isLoading: loadingProviders } = trpc.admin.emailHealth.providers.useQuery();

  const pingMutation = trpc.admin.emailHealth.ping.useMutation();
  const sendTestMutation = trpc.admin.emailHealth.sendTest.useMutation();

  const [pingResults, setPingResults] = useState<Record<string, any>>({});
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState<any>(null);

  const handlePing = async (provider: string) => {
    setPingResults(prev => ({ ...prev, [provider]: { loading: true } }));
    try {
      const result = await pingMutation.mutateAsync({ provider });
      setPingResults(prev => ({ ...prev, [provider]: result }));
      toast.success(`${provider} ping complete: ${result.reachable ? "Reachable" : "Unreachable"}`);
    } catch (err: any) {
      setPingResults(prev => ({ ...prev, [provider]: { reachable: false, details: err.message, latencyMs: 0, testedAt: new Date().toISOString() } }));
      toast.error(`Ping failed: ${err.message}`);
    }
  };

  const handlePingAll = async () => {
    if (!providers) return;
    for (const p of providers) {
      await handlePing(p.name);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error("Please enter an email address");
      return;
    }
    setTestResult({ loading: true });
    try {
      const result = await sendTestMutation.mutateAsync({ to: testEmail });
      setTestResult(result);
      if (result.success) {
        toast.success(`Test email sent via ${result.provider} in ${result.latencyMs}ms`);
      } else {
        toast.error(`Test email failed: ${result.error}`);
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message, latencyMs: 0 });
      toast.error(`Test failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Provider List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Provider Connectivity</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Test if each email provider API is reachable from your server.
            </p>
          </div>
          <button
            onClick={handlePingAll}
            disabled={pingMutation.isPending}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#4B2D8E] text-white hover:bg-[#3a2270] transition-colors disabled:opacity-60"
          >
            {pingMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Ping All
          </button>
        </div>

        {loadingProviders ? (
          <div className="flex items-center gap-2 text-gray-400 py-4">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading providers...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {providers?.map((provider) => {
              const ping = pingResults[provider.name];
              return (
                <div
                  key={provider.name}
                  className={`rounded-xl border-2 p-4 transition-colors ${
                    ping?.reachable ? "border-green-200 bg-green-50/30" :
                    ping && !ping.loading ? "border-red-200 bg-red-50/30" :
                    "border-gray-200 bg-gray-50/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        provider.configured
                          ? ping?.reachable ? "bg-green-100" : ping && !ping.loading ? "bg-red-100" : "bg-blue-100"
                          : "bg-gray-100"
                      }`}>
                        {ping?.loading ? (
                          <Loader2 size={18} className="animate-spin text-gray-500" />
                        ) : ping?.reachable ? (
                          <Wifi size={18} className="text-green-600" />
                        ) : ping && !ping.loading ? (
                          <WifiOff size={18} className="text-red-600" />
                        ) : (
                          <Server size={18} className={provider.configured ? "text-blue-600" : "text-gray-400"} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-800 capitalize">{provider.name}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            provider.configured ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                          }`}>
                            {provider.configured ? "Configured" : "Not Set"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {provider.configured
                            ? `Env: ${provider.envKeys.join(", ")}`
                            : `Requires: ${provider.envKeys.join(", ")}`
                          }
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handlePing(provider.name)}
                      disabled={ping?.loading}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
                    >
                      {ping?.loading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                      Ping
                    </button>
                  </div>

                  {/* Provider Warning */}
                  {(provider as any).warning && (
                    <div className="mt-3 rounded-lg p-3 border border-amber-200 bg-amber-50">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800">{(provider as any).warning}</p>
                      </div>
                    </div>
                  )}

                  {/* Ping Result */}
                  {ping && !ping.loading && (
                    <div className={`mt-3 rounded-lg p-3 text-xs ${
                      ping.reachable ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold ${ping.reachable ? "text-green-700" : "text-red-700"}`}>
                          {ping.reachable ? "Reachable" : "Unreachable"}
                        </span>
                        <span className="text-gray-500 font-mono">{ping.latencyMs}ms</span>
                      </div>
                      <p className={`font-mono break-all ${ping.reachable ? "text-green-600" : "text-red-600"}`}>
                        {ping.details}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <hr className="border-gray-200" />

      {/* Send Test Email */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Send Test Email</h3>
        <p className="text-xs text-gray-500 mb-3">
          Send a real email to verify end-to-end delivery through your active provider.
        </p>
        <div className="rounded-lg p-3 border border-blue-200 bg-blue-50 mb-4">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              <strong>Resend free tier:</strong> Can only send to your own email ({providers?.find(p => p.name === 'resend')?.configured ? 'the address tied to your API key' : 'configure RESEND_API_KEY first'}).
              Verify a custom domain at <a href="https://resend.com/domains" target="_blank" rel="noopener" className="underline font-medium">resend.com/domains</a> to send to any recipient.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <input
            type="email"
            placeholder="recipient@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E] focus:border-[#4B2D8E]"
          />
          <button
            onClick={handleSendTest}
            disabled={sendTestMutation.isPending || !testEmail}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4B2D8E] text-white text-sm font-semibold hover:bg-[#3a2270] transition-colors disabled:opacity-60"
          >
            {sendTestMutation.isPending ? (
              <><Loader2 size={16} className="animate-spin" /> Sending...</>
            ) : (
              <><Send size={16} /> Send Test</>
            )}
          </button>
        </div>

        {/* Test Result */}
        {testResult && !testResult.loading && (
          <div className={`mt-4 rounded-xl border-2 p-4 ${
            testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                testResult.success ? "bg-green-100" : "bg-red-100"
              }`}>
                {testResult.success
                  ? <CheckCircle size={20} className="text-green-600" />
                  : <XCircle size={20} className="text-red-600" />
                }
              </div>
              <div>
                <p className={`text-sm font-semibold ${testResult.success ? "text-green-800" : "text-red-800"}`}>
                  {testResult.success ? "Test Email Delivered" : "Test Email Failed"}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                  {testResult.provider && (
                    <span className="flex items-center gap-1">
                      <ArrowRight size={10} /> Provider: <strong>{testResult.provider}</strong>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> Latency: <strong>{testResult.latencyMs}ms</strong>
                  </span>
                </div>
                {testResult.error && (
                  <div className="mt-2 bg-red-100 border border-red-200 rounded-lg p-2">
                    <p className="text-xs font-mono text-red-700 break-all">{testResult.error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Utilities ───

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
