import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  ScrollText, Search, AlertTriangle, Info, AlertCircle,
  Mail, Shield, CreditCard, Bell, Brain, Settings, ChevronLeft, ChevronRight,
  Filter,
} from "lucide-react";

function fmtDateTime(d: string | Date | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-CA", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

const LEVEL_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  info: { bg: "bg-blue-50", text: "text-blue-700", icon: <Info size={12} /> },
  warn: { bg: "bg-amber-50", text: "text-amber-700", icon: <AlertTriangle size={12} /> },
  error: { bg: "bg-red-50", text: "text-red-700", icon: <AlertCircle size={12} /> },
};

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  email: <Mail size={14} className="text-purple-500" />,
  auth: <Shield size={14} className="text-blue-500" />,
  payment: <CreditCard size={14} className="text-green-500" />,
  push: <Bell size={14} className="text-orange-500" />,
  ai: <Brain size={14} className="text-pink-500" />,
  admin: <Settings size={14} className="text-gray-500" />,
  system: <ScrollText size={14} className="text-gray-400" />,
};

export default function AdminSystemLogs() {
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = trpc.admin.systemLogs.list.useQuery(
    { page, limit: 50, level: level || undefined, source: source || undefined, search: search || undefined },
    { refetchInterval: 15000, refetchOnWindowFocus: true },
  );

  const totalPages = Math.ceil((data?.total ?? 0) / 50);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ScrollText size={24} className="text-[#4B2D8E]" /> System Logs
        </h1>
        <p className="text-sm text-gray-500">
          Real-time log of emails, API calls, auth events, integrations, and errors.
          {data?.total ? ` ${data.total} entries total.` : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Filter size={14} /> Filters:
        </div>

        <select value={level} onChange={e => { setLevel(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
          <option value="">All Levels</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>

        <select value={source} onChange={e => { setSource(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
          <option value="">All Sources</option>
          <option value="email">Email</option>
          <option value="auth">Auth</option>
          <option value="payment">Payment</option>
          <option value="push">Push</option>
          <option value="ai">AI</option>
          <option value="admin">Admin</option>
          <option value="system">System</option>
        </select>

        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1); }} className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Search logs..."
              className="pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm w-48" />
          </div>
          <button type="submit" className="px-3 py-2 bg-[#4B2D8E] text-white rounded-lg text-sm hover:bg-[#3a2270]">Go</button>
          {search && (
            <button type="button" onClick={() => { setSearch(""); setSearchInput(""); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50">Clear</button>
          )}
        </form>
      </div>

      {/* Log entries */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading logs...</div>
        ) : !data?.data.length ? (
          <div className="p-12 text-center text-gray-400">
            <ScrollText size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No log entries found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.data.map((log: any) => {
              const lvl = LEVEL_STYLES[log.level] || LEVEL_STYLES.info;
              const srcIcon = SOURCE_ICONS[log.source] || SOURCE_ICONS.system;
              return (
                <div key={log.id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Level badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${lvl.bg} ${lvl.text} shrink-0 mt-0.5`}>
                      {lvl.icon} {log.level.toUpperCase()}
                    </span>

                    {/* Source icon */}
                    <span className="shrink-0 mt-0.5">{srcIcon}</span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{log.source}</span>
                        <span className="text-xs font-medium text-gray-600">{log.action}</span>
                      </div>
                      <p className="text-sm text-gray-800 mt-0.5 break-words">{log.message}</p>
                      {log.details && (
                        <details className="mt-1">
                          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Details</summary>
                          <pre className="mt-1 text-xs text-gray-500 bg-gray-50 rounded p-2 overflow-x-auto max-h-32 whitespace-pre-wrap">{log.details}</pre>
                        </details>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400">{fmtDateTime(log.createdAt)}</p>
                      {log.userId && <p className="text-xs text-gray-300 mt-0.5">User #{log.userId}</p>}
                      {log.ipAddress && <p className="text-xs text-gray-300 font-mono">{log.ipAddress}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">Page {page} of {totalPages} ({data?.total} entries)</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-white">
                <ChevronLeft size={14} /> Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-white">
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
