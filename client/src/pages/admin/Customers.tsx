import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Users, Search, ShieldCheck, ShieldX, Crown, User } from "lucide-react";

export default function AdminCustomers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading } = trpc.admin.users.list.useQuery({ page, limit: 20 });
  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
        <p className="text-sm text-gray-500">{data?.total ?? 0} registered users</p>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Email</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Joined</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50"><td colSpan={5} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
              )) : data?.data.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400"><Users size={24} className="mx-auto mb-2 opacity-50" />No customers found</td></tr>
              ) : data?.data.map((user: any) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#4B2D8E]/10 flex items-center justify-center shrink-0">
                        <User size={16} className="text-[#4B2D8E]" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{user.name || "—"}</p>
                        <p className="text-xs text-gray-400 sm:hidden">{user.email || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{user.email || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {user.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#4B2D8E]/10 text-[#4B2D8E]">
                        <Crown size={10} /> Admin
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">User</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs hidden md:table-cell">{new Date(user.createdAt).toLocaleDateString("en-CA")}</td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs hidden lg:table-cell">{new Date(user.lastSignedIn).toLocaleDateString("en-CA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50 hover:bg-gray-50">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
