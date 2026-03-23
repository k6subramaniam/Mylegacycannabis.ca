import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Mail, Edit2, Save, X, Eye, Check, Ban, Plus, Code } from "lucide-react";
import { toast } from "sonner";

export default function AdminEmailTemplates() {
  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.admin.emailTemplates.list.useQuery(undefined, { refetchOnWindowFocus: true });
  const updateMutation = trpc.admin.emailTemplates.update.useMutation({
    onSuccess: () => { utils.admin.emailTemplates.list.invalidate(); toast.success("Template updated"); setEditingTemplate(null); },
  });
  const createMutation = trpc.admin.emailTemplates.create.useMutation({
    onSuccess: () => { utils.admin.emailTemplates.list.invalidate(); toast.success("Template created"); setShowNew(false); resetNewForm(); },
  });

  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [editForm, setEditForm] = useState({ subject: "", bodyHtml: "", isActive: true });
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ slug: "", name: "", subject: "", bodyHtml: "", variables: "", isActive: true });

  const resetNewForm = () => setNewForm({ slug: "", name: "", subject: "", bodyHtml: "", variables: "", isActive: true });

  const startEdit = (template: any) => {
    setEditingTemplate(template);
    setEditForm({ subject: template.subject, bodyHtml: template.bodyHtml, isActive: template.isActive });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Email Templates</h1>
          <p className="text-sm text-gray-500">Manage notification email templates for orders and verifications</p>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-[#4B2D8E] text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-[#3a2270]">
          <Plus size={16} /> New Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? [...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-5 animate-pulse"><div className="h-5 bg-gray-200 rounded w-40 mb-3" /><div className="h-4 bg-gray-100 rounded w-full" /></div>
        )) : templates?.map((template: any) => (
          <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#4B2D8E]/10 flex items-center justify-center">
                  <Mail size={18} className="text-[#4B2D8E]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{template.name}</h3>
                  <p className="text-xs text-gray-400 font-mono">{template.slug}</p>
                </div>
              </div>
              {template.isActive ? <Check size={16} className="text-green-500" /> : <Ban size={16} className="text-gray-400" />}
            </div>
            <p className="text-sm text-gray-600 mb-3 truncate"><strong>Subject:</strong> {template.subject}</p>
            {template.variables && (
              <div className="flex flex-wrap gap-1 mb-4">
                {(template.variables as string[]).map((v: string) => (
                  <span key={v} className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-500 font-mono">{`{{${v}}}`}</span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setPreviewTemplate(template)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                <Eye size={14} /> Preview
              </button>
              <button onClick={() => startEdit(template)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#4B2D8E] text-white text-sm hover:bg-[#3a2270]">
                <Edit2 size={14} /> Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Preview: {previewTemplate.name}</h2>
              <button onClick={() => setPreviewTemplate(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-500 mb-3"><strong>Subject:</strong> {previewTemplate.subject}</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div dangerouslySetInnerHTML={{ __html: previewTemplate.bodyHtml }} className="p-4" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl my-8 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Edit: {editingTemplate.name}</h2>
              <button onClick={() => setEditingTemplate(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate({ id: editingTemplate.id, ...editForm }); }} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject Line</label>
                <input type="text" value={editForm.subject} onChange={(e) => setEditForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Code size={12} /> HTML Body</label>
                <textarea value={editForm.bodyHtml} onChange={(e) => setEditForm(f => ({ ...f, bodyHtml: e.target.value }))}
                  rows={12} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-mono resize-y" />
              </div>
              {editingTemplate.variables && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Available Variables</p>
                  <div className="flex flex-wrap gap-1">
                    {(editingTemplate.variables as string[]).map((v: string) => (
                      <span key={v} className="px-2 py-1 rounded-full text-xs bg-[#4B2D8E]/10 text-[#4B2D8E] font-mono cursor-pointer hover:bg-[#4B2D8E]/20"
                        onClick={() => { navigator.clipboard.writeText(`{{${v}}}`); toast.success(`Copied {{${v}}}`); }}>{`{{${v}}}`}</span>
                    ))}
                  </div>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4" />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingTemplate(null)} className="px-5 py-2.5 rounded-xl border text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending}
                  className="bg-[#4B2D8E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3a2270] disabled:opacity-50 flex items-center gap-2">
                  <Save size={14} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Template Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl my-8 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">New Email Template</h2>
              <button onClick={() => setShowNew(false)} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...newForm, variables: newForm.variables ? newForm.variables.split(",").map(v => v.trim()) : [] }); }} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Template Name</label>
                  <input type="text" required value={newForm.name} onChange={(e) => setNewForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
                  <input type="text" required value={newForm.slug} onChange={(e) => setNewForm(f => ({ ...f, slug: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                <input type="text" required value={newForm.subject} onChange={(e) => setNewForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Variables (comma-separated)</label>
                <input type="text" value={newForm.variables} onChange={(e) => setNewForm(f => ({ ...f, variables: e.target.value }))}
                  placeholder="orderNumber, customerName, total" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">HTML Body</label>
                <textarea required value={newForm.bodyHtml} onChange={(e) => setNewForm(f => ({ ...f, bodyHtml: e.target.value }))}
                  rows={10} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-mono resize-y" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNew(false)} className="px-5 py-2.5 rounded-xl border text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={createMutation.isPending}
                  className="bg-[#4B2D8E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3a2270] disabled:opacity-50">Create Template</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
