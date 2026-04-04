import { trpc } from "@/lib/trpc";
import { useState, useCallback } from "react";
import {
  DollarSign, RefreshCw, Check, X, Eye, AlertCircle,
  CheckCircle2, Clock, Ban, Link2, HelpCircle, Mail, Save, Edit3,
  Download, Trash2, AlertTriangle, FileDown, Info, ChevronDown, ChevronUp,
  Plus, ToggleLeft, ToggleRight, Zap, FlaskConical, Settings2
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  auto_matched: "bg-green-100 text-green-800",
  manual_matched: "bg-blue-100 text-blue-800",
  unmatched: "bg-yellow-100 text-yellow-800",
  ignored: "bg-gray-100 text-gray-500",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  exact: "bg-green-100 text-green-700",
  high: "bg-blue-100 text-blue-700",
  low: "bg-yellow-100 text-yellow-700",
  none: "bg-gray-100 text-gray-500",
};

const STATUS_ICONS: Record<string, any> = {
  auto_matched: CheckCircle2,
  manual_matched: Check,
  unmatched: Clock,
  ignored: Ban,
};

/** Escape a value for CSV (handles commas, quotes, newlines) */
function csvEscape(val: string | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function AdminPayments() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [matchOrderId, setMatchOrderId] = useState<Record<number, string>>({});
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reassignOrderId, setReassignOrderId] = useState<Record<number, string>>({});
  const [reassigningId, setReassigningId] = useState<number | null>(null);

  // ─── Keyword Rules State ───
  const [showKeywordRules, setShowKeywordRules] = useState(false);
  const [keywordRules, setKeywordRules] = useState<Array<{
    id: string; name: string; operator: "AND" | "OR"; keywords: string[]; enabled: boolean;
  }>>([]);
  const [rulesLoaded, setRulesLoaded] = useState(false);
  const [newKeywordInput, setNewKeywordInput] = useState<Record<string, string>>({});
  const [testSubject, setTestSubject] = useState("");
  const [testBody, setTestBody] = useState("");
  const [testResult, setTestResult] = useState<any>(null);

  const statusFilter = tab === "all" ? undefined : tab;

  const { data, isLoading, refetch } = trpc.etransfer.list.useQuery(
    { page, limit: 25, status: statusFilter },
    { refetchInterval: 30000 }
  );

  const { data: serviceStatus, refetch: refetchStatus } = trpc.etransfer.status.useQuery(undefined, {
    onSuccess: (d: any) => { if (!emailInput) setEmailInput(d.paymentEmail || ""); },
  });
  const { data: pendingOrders } = trpc.etransfer.pendingOrders.useQuery();

  const updateEmailMutation = trpc.etransfer.updatePaymentEmail.useMutation({
    onSuccess: (res: any) => {
      toast.success(`Payment email updated to ${res.email}`);
      setEditingEmail(false);
      refetchStatus();
      // Also invalidate siteConfig so frontend (Checkout, FAQ, etc.) picks up the change immediately
      utils.store.siteConfig.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pollMutation = trpc.etransfer.poll.useMutation({
    onSuccess: (stats) => {
      toast.success(`Poll complete: ${stats.processed} processed, ${stats.matched} matched`);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const matchMutation = trpc.etransfer.manualMatch.useMutation({
    onSuccess: () => {
      toast.success("Payment matched to order!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const reassignMutation = trpc.etransfer.reassign.useMutation({
    onSuccess: () => {
      toast.success("Payment reassigned to new order!");
      setReassignOrderId({});
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const unmatchMutation = trpc.etransfer.unmatch.useMutation({
    onSuccess: () => {
      toast.success("Payment unlinked from order");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const ignoreMutation = trpc.etransfer.ignore.useMutation({
    onSuccess: () => {
      toast.success("Payment ignored");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.etransfer.deleteRecord.useMutation({
    onSuccess: () => {
      toast.success("Payment record deleted");
      setDeletingId(null);
      setExpandedId(null);
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const clearHistoryMutation = trpc.etransfer.clearHistory.useMutation({
    onSuccess: (res: any) => {
      toast.success(`Cleared ${res.deleted} payment records`);
      setShowClearConfirm(false);
      setClearConfirmText("");
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ─── Keyword Rules Queries ───
  const { data: keywordRulesData } = trpc.etransfer.getKeywordRules.useQuery(undefined, {
    onSuccess: (data: any) => {
      if (!rulesLoaded) {
        setKeywordRules(data || []);
        setRulesLoaded(true);
      }
    },
  });

  const saveRulesMutation = trpc.etransfer.saveKeywordRules.useMutation({
    onSuccess: () => {
      toast.success("Keyword rules saved");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const testRulesMutation = trpc.etransfer.testKeywordRules.useMutation({
    onSuccess: (result: any) => {
      setTestResult(result);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Keyword rule helpers
  const addRule = useCallback(() => {
    setKeywordRules(prev => [...prev, {
      id: `rule_${Date.now()}`,
      name: `Rule ${prev.length + 1}`,
      operator: "OR" as const,
      keywords: [],
      enabled: true,
    }]);
  }, []);

  const removeRule = useCallback((ruleId: string) => {
    setKeywordRules(prev => prev.filter(r => r.id !== ruleId));
  }, []);

  const updateRule = useCallback((ruleId: string, updates: Partial<typeof keywordRules[0]>) => {
    setKeywordRules(prev => prev.map(r => r.id === ruleId ? { ...r, ...updates } : r));
  }, []);

  const addKeywordToRule = useCallback((ruleId: string) => {
    const kw = (newKeywordInput[ruleId] || "").trim();
    if (!kw) return;
    setKeywordRules(prev => prev.map(r =>
      r.id === ruleId && !r.keywords.includes(kw) ? { ...r, keywords: [...r.keywords, kw] } : r
    ));
    setNewKeywordInput(prev => ({ ...prev, [ruleId]: "" }));
  }, [newKeywordInput]);

  const removeKeywordFromRule = useCallback((ruleId: string, keyword: string) => {
    setKeywordRules(prev => prev.map(r =>
      r.id === ruleId ? { ...r, keywords: r.keywords.filter(k => k !== keyword) } : r
    ));
  }, []);

  // ─── Export CSV ───
  const handleExportCSV = async () => {
    try {
      const allRecords: any[] = await utils.etransfer.exportAll.fetch();
      if (!allRecords || allRecords.length === 0) {
        toast.error("No payment records to export");
        return;
      }

      const headers = ["ID", "Date", "Sender Name", "Sender Email", "Amount", "Memo", "Subject", "Matched Order", "Match Method", "Confidence", "Status", "Admin Notes"];
      const rows = allRecords.map((r: any) => [
        r.id,
        r.receivedAt ? new Date(r.receivedAt).toLocaleString("en-CA") : "",
        csvEscape(r.senderName),
        csvEscape(r.senderEmail),
        r.amount ? parseFloat(r.amount).toFixed(2) : "",
        csvEscape(r.memo),
        csvEscape(r.rawSubject),
        r.matchedOrderNumber || "",
        r.matchMethod || "",
        r.matchConfidence || "",
        r.status || "",
        csvEscape(r.adminNotes),
      ]);

      const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mlc-payment-history-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${allRecords.length} records to CSV`);
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    }
  };

  const payments = data?.data || [];
  const total = data?.total || 0;

  const tabs = [
    { key: "all", label: "All Payments" },
    { key: "unmatched", label: "Needs Review" },
    { key: "auto_matched", label: "Auto-Matched" },
    { key: "manual_matched", label: "Manual" },
    { key: "ignored", label: "Ignored" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <DollarSign size={24} className="text-[#4B2D8E]" />
            E-Transfer Payments
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Auto-match Interac e-Transfer deposits to orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Service Status Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            serviceStatus?.configured ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            <div className={`w-2 h-2 rounded-full ${serviceStatus?.configured ? "bg-green-500" : "bg-red-500"}`} />
            {serviceStatus?.configured ? "Gmail Connected" : "Gmail Not Configured"}
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={total === 0}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-all"
            title="Export all payment records as CSV"
          >
            <Download size={14} />
            Export CSV
          </button>

          {/* Clear History */}
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={total === 0}
            className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-40 transition-all"
            title="Wipe all payment history"
          >
            <Trash2 size={14} />
            Clear History
          </button>

          {/* Poll Button */}
          <button
            onClick={() => pollMutation.mutate()}
            disabled={pollMutation.isPending || !serviceStatus?.configured}
            className="flex items-center gap-2 px-4 py-2 bg-[#4B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#3a2270] disabled:opacity-50 transition-all"
          >
            <RefreshCw size={14} className={pollMutation.isPending ? "animate-spin" : ""} />
            {pollMutation.isPending ? "Polling..." : "Check Now"}
          </button>
        </div>
      </div>

      {/* Payment Email Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#4B2D8E]/10 flex items-center justify-center">
              <Mail size={18} className="text-[#4B2D8E]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Customer-Facing Payment Email</h3>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                Shown on Checkout, order confirmation emails, and FAQ
                <span className="relative group">
                  <Info size={12} className="text-gray-300 cursor-help" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    <strong>Global setting.</strong> Changing this email updates it everywhere: Checkout page, order confirmation emails, guest emails, and all templates using <code className="bg-white/20 px-1 rounded">{"{{payment_email}}"}</code>.
                  </span>
                </span>
              </p>
            </div>
          </div>
          {!editingEmail ? (
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-mono text-[#4B2D8E]">
                {serviceStatus?.paymentEmail || "payments@mylegacycannabis.ca"}
              </code>
              <button
                onClick={() => { setEmailInput(serviceStatus?.paymentEmail || ""); setEditingEmail(true); }}
                className="p-2 text-gray-400 hover:text-[#4B2D8E] rounded-lg hover:bg-gray-100 transition-colors"
                title="Edit payment email"
              >
                <Edit3 size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="e.g. payments@mylegacycannabis.ca"
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-mono w-72 focus:border-[#4B2D8E] focus:ring-2 focus:ring-[#4B2D8E]/20 outline-none"
                onKeyDown={e => { if (e.key === "Enter" && emailInput.includes("@")) updateEmailMutation.mutate({ email: emailInput.trim() }); }}
              />
              <button
                onClick={() => { if (emailInput.includes("@")) updateEmailMutation.mutate({ email: emailInput.trim() }); }}
                disabled={updateEmailMutation.isPending || !emailInput.includes("@")}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-all"
              >
                <Save size={12} /> Save
              </button>
              <button
                onClick={() => setEditingEmail(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ E-Transfer Keyword Rules Configuration ═══ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <button
          onClick={() => setShowKeywordRules(!showKeywordRules)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
              <Settings2 size={18} className="text-orange-600" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-800">E-Transfer Detection Keywords</h3>
              <p className="text-xs text-gray-400">
                Configure AND / OR keyword rules to identify Interac e-Transfer emails
                {keywordRules.filter(r => r.enabled).length > 0 && (
                  <span className="ml-1.5 text-orange-600 font-medium">
                    ({keywordRules.filter(r => r.enabled).length} active rule{keywordRules.filter(r => r.enabled).length !== 1 ? "s" : ""})
                  </span>
                )}
              </p>
            </div>
          </div>
          {showKeywordRules ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {showKeywordRules && (
          <div className="px-5 pb-5 border-t border-gray-100">
            {/* Info banner */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-4 mb-4">
              <p className="text-xs text-blue-700">
                <strong>How it works:</strong> Each rule defines keywords that must be found in the email subject + body.
                <strong> AND</strong> = all keywords must match. <strong>OR</strong> = any keyword matches.
                Rules are combined with OR (any rule match triggers detection).
                Built-in defaults (Interac, e-Transfer, etc.) always apply as a safety net.
              </p>
            </div>

            {/* Rules list */}
            <div className="space-y-4">
              {keywordRules.map((rule, idx) => (
                <div
                  key={rule.id}
                  className={`border rounded-xl p-4 transition-all ${
                    rule.enabled ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Enable/Disable toggle */}
                      <button
                        onClick={() => updateRule(rule.id, { enabled: !rule.enabled })}
                        className={`shrink-0 ${rule.enabled ? "text-green-500" : "text-gray-300"}`}
                        title={rule.enabled ? "Enabled — click to disable" : "Disabled — click to enable"}
                      >
                        {rule.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      </button>
                      {/* Rule name (editable) */}
                      <input
                        value={rule.name}
                        onChange={e => updateRule(rule.id, { name: e.target.value })}
                        className="text-sm font-semibold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#4B2D8E] focus:outline-none px-1 py-0.5 min-w-0 flex-1"
                        placeholder="Rule name..."
                      />
                      {/* AND/OR toggle */}
                      <div className="flex items-center bg-gray-100 rounded-lg p-0.5 shrink-0">
                        <button
                          onClick={() => updateRule(rule.id, { operator: "AND" })}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                            rule.operator === "AND"
                              ? "bg-[#4B2D8E] text-white shadow-sm"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          AND
                        </button>
                        <button
                          onClick={() => updateRule(rule.id, { operator: "OR" })}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                            rule.operator === "OR"
                              ? "bg-orange-500 text-white shadow-sm"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          OR
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => removeRule(rule.id)}
                      className="ml-2 p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                      title="Remove rule"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Keywords */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {rule.keywords.map(kw => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg group hover:bg-red-50 hover:text-red-700 transition-colors"
                      >
                        {kw}
                        <button
                          onClick={() => removeKeywordFromRule(rule.id, kw)}
                          className="text-gray-400 group-hover:text-red-500 ml-0.5"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                    {rule.keywords.length === 0 && (
                      <span className="text-xs text-gray-400 italic py-1">No keywords yet — add one below</span>
                    )}
                  </div>

                  {/* Add keyword input */}
                  <div className="flex items-center gap-2">
                    <input
                      value={newKeywordInput[rule.id] || ""}
                      onChange={e => setNewKeywordInput(prev => ({ ...prev, [rule.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeywordToRule(rule.id); } }}
                      placeholder="Type a keyword or phrase and press Enter..."
                      className="flex-1 text-xs px-3 py-1.5 border border-gray-200 rounded-lg focus:border-[#4B2D8E] focus:ring-1 focus:ring-[#4B2D8E]/20 outline-none"
                    />
                    <button
                      onClick={() => addKeywordToRule(rule.id)}
                      disabled={!(newKeywordInput[rule.id] || "").trim()}
                      className="px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 disabled:opacity-40 transition-all"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Rule description */}
                  <p className="text-[10px] text-gray-400 mt-2">
                    {rule.operator === "AND"
                      ? `Email must contain ALL of: ${rule.keywords.length > 0 ? rule.keywords.map(k => `"${k}"`).join(" + ") : "(none)"}`
                      : `Email must contain ANY of: ${rule.keywords.length > 0 ? rule.keywords.map(k => `"${k}"`).join(" | ") : "(none)"}`}
                  </p>
                </div>
              ))}
            </div>

            {/* Add rule + Save */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={addRule}
                className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 text-gray-500 rounded-lg text-xs font-medium hover:border-[#4B2D8E] hover:text-[#4B2D8E] hover:bg-[#4B2D8E]/5 transition-all"
              >
                <Plus size={14} />
                Add Rule
              </button>
              <button
                onClick={() => saveRulesMutation.mutate(keywordRules)}
                disabled={saveRulesMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#4B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#3a2270] disabled:opacity-50 transition-all"
              >
                {saveRulesMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Save Rules
              </button>
            </div>

            {/* Test Panel */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <FlaskConical size={13} />
                Test Rules Against Sample Email
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Subject</label>
                  <input
                    value={testSubject}
                    onChange={e => { setTestSubject(e.target.value); setTestResult(null); }}
                    placeholder='e.g. "INTERAC e-Transfer: John sent you $127.50"'
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg mt-1 focus:border-[#4B2D8E] focus:ring-1 focus:ring-[#4B2D8E]/20 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Body Snippet</label>
                  <input
                    value={testBody}
                    onChange={e => { setTestBody(e.target.value); setTestResult(null); }}
                    placeholder='e.g. "$127.50 has been automatically deposited"'
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg mt-1 focus:border-[#4B2D8E] focus:ring-1 focus:ring-[#4B2D8E]/20 outline-none"
                  />
                </div>
              </div>
              <button
                onClick={() => testRulesMutation.mutate({ subject: testSubject, body: testBody })}
                disabled={testRulesMutation.isPending || (!testSubject && !testBody)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 disabled:opacity-50 transition-all"
              >
                {testRulesMutation.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                Test Detection
              </button>

              {testResult && (
                <div className={`mt-3 p-3 rounded-lg border text-xs ${
                  testResult.overallMatch
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}>
                  <p className="font-bold mb-1">
                    {testResult.overallMatch ? "MATCH — Would be detected as e-Transfer" : "NO MATCH — Would be skipped"}
                  </p>
                  <p className="text-[10px] mb-2">
                    Custom rules: {testResult.customRulesMatch ? "MATCHED" : "no match"} &middot; 
                    Built-in defaults: {testResult.defaultMatch ? "MATCHED" : "no match"}
                  </p>
                  {testResult.ruleResults?.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-current/10">
                      {testResult.ruleResults.map((rr: any) => (
                        <div key={rr.ruleId} className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold ${rr.match ? "bg-green-500" : "bg-gray-300"}`}>
                            {rr.match ? "✓" : "×"}
                          </span>
                          <span className="font-medium">{rr.ruleName}</span>
                          <span className="text-[10px] opacity-60">({rr.operator})</span>
                          <span className="ml-auto text-[10px]">
                            {rr.keywordResults.map((kr: any) => (
                              <span key={kr.keyword} className={`mr-1.5 ${kr.found ? "text-green-700 font-medium" : "text-red-600 line-through"}`}>
                                "{kr.keyword}"
                              </span>
                            ))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Gmail Setup Info (only if not configured) */}
      {!serviceStatus?.configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Gmail API Not Configured</p>
              <p className="text-xs text-amber-600 mt-1">
                Set these environment variables in Railway to enable auto-matching:<br />
                <code className="bg-amber-100 px-1 rounded">GMAIL_CLIENT_ID</code>,{" "}
                <code className="bg-amber-100 px-1 rounded">GMAIL_CLIENT_SECRET</code>,{" "}
                <code className="bg-amber-100 px-1 rounded">GMAIL_REFRESH_TOKEN</code>,{" "}
                <code className="bg-amber-100 px-1 rounded">GMAIL_PAYMENT_EMAIL</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? "bg-white text-[#4B2D8E] shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      {total > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {total} total record{total !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-[#4B2D8E]" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && payments.length === 0 && (
        <div className="text-center py-20">
          <Mail size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No payment records found</p>
          <p className="text-sm text-gray-400 mt-1">
            {serviceStatus?.configured
              ? "e-Transfer notifications will appear here when received"
              : "Configure Gmail API to start auto-matching payments"}
          </p>
        </div>
      )}

      {/* Payment Records Table */}
      {!isLoading && payments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Sender</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Memo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Matched Order</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Confidence</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map((p: any) => {
                const StatusIcon = STATUS_ICONS[p.status] || HelpCircle;

                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {p.receivedAt ? new Date(p.receivedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "\u2014"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-800">{p.senderName || "Unknown"}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[180px]">{p.senderEmail || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-gray-800">
                        {p.amount ? `$${parseFloat(p.amount).toFixed(2)}` : "\u2014"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600 truncate max-w-[200px]" title={p.memo || ""}>
                        {p.memo || <span className="text-gray-400 italic">No memo</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {p.matchedOrderNumber ? (
                        <div className="flex items-center gap-1.5">
                          <Link href={`/admin/orders/${p.matchedOrderId}`} className="text-sm font-mono text-[#4B2D8E] hover:underline">
                            {p.matchedOrderNumber}
                          </Link>
                          <button
                            onClick={() => setReassigningId(reassigningId === p.id ? null : p.id)}
                            className="p-1 text-gray-400 hover:text-orange-500 rounded hover:bg-orange-50 transition-colors"
                            title="Reassign to different order"
                          >
                            <Edit3 size={11} />
                          </button>
                          <button
                            onClick={() => unmatchMutation.mutate({ paymentId: p.id })}
                            disabled={unmatchMutation.isPending}
                            className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                            title="Unlink from this order"
                          >
                            <X size={11} />
                          </button>
                          {reassigningId === p.id && (
                            <div className="flex items-center gap-1">
                              <select
                                value={reassignOrderId[p.id] || ""}
                                onChange={e => setReassignOrderId({ ...reassignOrderId, [p.id]: e.target.value })}
                                className="text-xs border border-orange-200 rounded-lg px-2 py-1 bg-white max-w-[160px]"
                              >
                                <option value="">New order...</option>
                                {(pendingOrders || []).map((o: any) => (
                                  <option key={o.id} value={o.id}>
                                    {o.orderNumber} - ${parseFloat(o.total).toFixed(2)}
                                  </option>
                                ))}
                              </select>
                              {reassignOrderId[p.id] && (
                                <button
                                  onClick={() => reassignMutation.mutate({ paymentId: p.id, newOrderId: parseInt(reassignOrderId[p.id]) })}
                                  disabled={reassignMutation.isPending}
                                  className="p-1 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                                  title="Reassign"
                                >
                                  <Check size={12} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : p.status === "unmatched" ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={matchOrderId[p.id] || ""}
                            onChange={e => setMatchOrderId({ ...matchOrderId, [p.id]: e.target.value })}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white max-w-[180px]"
                          >
                            <option value="">Select order...</option>
                            {(pendingOrders || []).map((o: any) => (
                              <option key={o.id} value={o.id}>
                                {o.orderNumber} - ${parseFloat(o.total).toFixed(2)} ({o.guestName || o.guestEmail})
                              </option>
                            ))}
                          </select>
                          {matchOrderId[p.id] && (
                            <button
                              onClick={() => matchMutation.mutate({ paymentId: p.id, orderId: parseInt(matchOrderId[p.id]) })}
                              disabled={matchMutation.isPending}
                              className="p-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                              title="Match"
                            >
                              <Check size={12} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">{"\u2014"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CONFIDENCE_COLORS[p.matchConfidence] || CONFIDENCE_COLORS.none}`}>
                        {p.matchConfidence || "none"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || STATUS_COLORS.unmatched}`}>
                        <StatusIcon size={12} />
                        {p.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                          className="p-1.5 text-gray-400 hover:text-[#4B2D8E] rounded-lg hover:bg-gray-100 transition-colors"
                          title="View details"
                        >
                          <Eye size={14} />
                        </button>
                        {p.status === "unmatched" && (
                          <button
                            onClick={() => ignoreMutation.mutate({ paymentId: p.id })}
                            disabled={ignoreMutation.isPending}
                            className="p-1.5 text-gray-400 hover:text-amber-500 rounded-lg hover:bg-amber-50 transition-colors"
                            title="Ignore"
                          >
                            <Ban size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingId(p.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete this record"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {total > 25 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * 25 + 1}-{Math.min(page * 25, total)} of {total}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * 25 >= total}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Payment Details Modal ═══ */}
      {expandedId && payments.find((p: any) => p.id === expandedId) && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setExpandedId(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            {(() => {
              const p = payments.find((p: any) => p.id === expandedId)!;
              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 text-lg">Payment Details #{p.id}</h3>
                    <button onClick={() => setExpandedId(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div><span className="text-gray-400 text-xs uppercase tracking-wide">Sender</span><p className="font-medium">{p.senderName || "Unknown"}</p></div>
                      <div><span className="text-gray-400 text-xs uppercase tracking-wide">Amount</span><p className="font-medium">{p.amount ? `$${parseFloat(p.amount).toFixed(2)}` : "\u2014"}</p></div>
                      <div><span className="text-gray-400 text-xs uppercase tracking-wide">Date</span><p className="font-medium">{p.receivedAt ? new Date(p.receivedAt).toLocaleString("en-CA") : "\u2014"}</p></div>
                      <div><span className="text-gray-400 text-xs uppercase tracking-wide">Match Method</span><p className="font-medium">{p.matchMethod || "\u2014"}</p></div>
                    </div>
                    <div><span className="text-gray-400 text-xs uppercase tracking-wide">Subject</span><p className="font-medium break-words">{p.rawSubject || "\u2014"}</p></div>
                    <div><span className="text-gray-400 text-xs uppercase tracking-wide">Memo</span><p className="font-medium break-words">{p.memo || "No memo"}</p></div>
                    <div><span className="text-gray-400 text-xs uppercase tracking-wide">Email Snippet</span><p className="text-xs text-gray-500 break-words bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">{p.rawBodySnippet || "\u2014"}</p></div>
                    {p.matchedOrderNumber && (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Link2 size={14} className="text-[#4B2D8E]" />
                        <span className="text-gray-400">Matched:</span>
                        <Link href={`/admin/orders/${p.matchedOrderId}`} className="font-mono text-[#4B2D8E] hover:underline">{p.matchedOrderNumber}</Link>
                      </div>
                    )}
                    {p.adminNotes && (
                      <div className="pt-2 border-t">
                        <span className="text-gray-400 text-xs uppercase tracking-wide">Admin Notes</span>
                        <p className="font-medium text-gray-600">{p.adminNotes}</p>
                      </div>
                    )}
                  </div>
                  {/* Delete from modal */}
                  <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => { setExpandedId(null); setDeletingId(p.id); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={12} /> Delete Record
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ═══ Delete Single Record Confirmation ═══ */}
      {deletingId !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeletingId(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Delete Payment #{deletingId}</h3>
                <p className="text-xs text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to permanently delete this payment record? This will remove it from the database and it cannot be recovered.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate({ paymentId: deletingId })}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-all"
              >
                {deleteMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Clear All History Confirmation ═══ */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowClearConfirm(false); setClearConfirmText(""); }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={22} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Clear All Payment History</h3>
                <p className="text-xs text-red-500 font-medium">DANGER: This is irreversible</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">
                This will permanently delete <strong>all {total} payment records</strong> from the database. This includes matched, unmatched, and ignored records. This action <strong>cannot be undone</strong>.
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Type <strong className="text-red-600 font-mono">DELETE ALL</strong> to confirm:
            </p>
            <input
              type="text"
              value={clearConfirmText}
              onChange={e => setClearConfirmText(e.target.value)}
              placeholder="Type DELETE ALL"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono mb-4 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowClearConfirm(false); setClearConfirmText(""); }}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => clearHistoryMutation.mutate()}
                disabled={clearConfirmText !== "DELETE ALL" || clearHistoryMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {clearHistoryMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Wipe All Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
