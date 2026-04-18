import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Truck, Edit2, Save, X, Plus, Check, Ban } from "lucide-react";
import { toast } from "sonner";

export default function AdminShipping() {
  const utils = trpc.useUtils();
  const { data: zones, isLoading } = trpc.admin.shipping.list.useQuery(undefined, { refetchOnWindowFocus: true });
  const updateMutation = trpc.admin.shipping.update.useMutation({ onSuccess: () => { utils.admin.shipping.list.invalidate(); toast.success("Shipping zone updated"); setEditingId(null); } });
  const createMutation = trpc.admin.shipping.create.useMutation({ onSuccess: () => { utils.admin.shipping.list.invalidate(); toast.success("Shipping zone created"); setShowNew(false); resetNewForm(); } });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ rate: "", deliveryDays: "", isActive: true });
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ zoneName: "", provinces: "", rate: "", deliveryDays: "", isActive: true });

  const resetNewForm = () => setNewForm({ zoneName: "", provinces: "", rate: "", deliveryDays: "", isActive: true });

  const startEdit = (zone: any) => {
    setEditingId(zone.id);
    setEditForm({ rate: String(zone.rate), deliveryDays: zone.deliveryDays, isActive: zone.isActive });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Shipping Zones</h1>
          <p className="text-sm text-gray-500">Manage nationwide shipping rates and delivery times</p>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-[#4B2D8E] text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-[#3a2270]">
          <Plus size={16} /> Add Zone
        </button>
      </div>

      {/* Free Shipping Banner */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
        <Truck size={20} className="text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-700">Free Shipping Threshold: $150</p>
          <p className="text-xs text-green-600">Orders over $150 get free shipping across all zones</p>
        </div>
      </div>

      {/* Zones Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Zone</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Provinces</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">Rate</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Delivery</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Active</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50"><td colSpan={6} className="px-5 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
              )) : zones?.map((zone: any) => (
                <tr key={zone.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-4 font-medium text-gray-800">{zone.zoneName}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(zone.provinces as string[]).map((p: string) => (
                        <span key={p} className="px-2 py-0.5 rounded-full text-xs bg-[#4B2D8E]/10 text-[#4B2D8E] font-medium">{p}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {editingId === zone.id ? (
                      <input type="text" value={editForm.rate} onChange={(e) => setEditForm(f => ({ ...f, rate: e.target.value }))}
                        className="w-20 px-2 py-1 rounded-lg border border-gray-200 text-sm text-right" />
                    ) : (
                      <span className="font-semibold">${Number(zone.rate).toFixed(2)}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    {editingId === zone.id ? (
                      <input type="text" value={editForm.deliveryDays} onChange={(e) => setEditForm(f => ({ ...f, deliveryDays: e.target.value }))}
                        className="w-40 px-2 py-1 rounded-lg border border-gray-200 text-sm" />
                    ) : (
                      <span className="text-gray-600">{zone.deliveryDays}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {editingId === zone.id ? (
                      <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4" />
                    ) : (
                      zone.isActive ? <Check size={16} className="text-green-500 mx-auto" /> : <Ban size={16} className="text-gray-400 mx-auto" />
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {editingId === zone.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => updateMutation.mutate({ id: zone.id, ...editForm })}
                          className="p-2 rounded-lg hover:bg-green-50 text-green-600"><Save size={14} /></button>
                        <button onClick={() => setEditingId(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(zone)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"><Edit2 size={14} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Zone Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Add Shipping Zone</h2>
              <button onClick={() => setShowNew(false)} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...newForm, provinces: newForm.provinces.split(",").map(p => p.trim()) }); }} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Zone Name</label>
                <input type="text" required value={newForm.zoneName} onChange={(e) => setNewForm(f => ({ ...f, zoneName: e.target.value }))}
                  placeholder="e.g., Western Canada" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Provinces (comma-separated)</label>
                <input type="text" required value={newForm.provinces} onChange={(e) => setNewForm(f => ({ ...f, provinces: e.target.value }))}
                  placeholder="BC, AB, SK, MB" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rate ($)</label>
                  <input type="text" required value={newForm.rate} onChange={(e) => setNewForm(f => ({ ...f, rate: e.target.value }))}
                    placeholder="15.00" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Delivery Time</label>
                  <input type="text" required value={newForm.deliveryDays} onChange={(e) => setNewForm(f => ({ ...f, deliveryDays: e.target.value }))}
                    placeholder="3-5 business days" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNew(false)} className="px-5 py-2.5 rounded-xl border text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={createMutation.isPending}
                  className="bg-[#4B2D8E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3a2270] disabled:opacity-50">Create Zone</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
