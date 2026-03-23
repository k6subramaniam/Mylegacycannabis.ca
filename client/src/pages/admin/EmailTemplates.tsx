import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Mail, Edit2, Save, X, Eye, Check, Ban, Plus, Code, Users, UserCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

// Category groups for organizing templates
const TEMPLATE_CATEGORIES: { label: string; icon: any; slugs: string[]; color: string }[] = [
  {
    label: "Registered Users",
    icon: Users,
    color: "#4B2D8E",
    slugs: ["welcome-email", "id-verified", "id-rejected", "order-confirmation", "payment-received-customer"],
  },
  {
    label: "Guest Orders",
    icon: UserCheck,
    color: "#FF9800",
    slugs: ["guest-order-placed", "guest-id-verified", "guest-id-rejected", "guest-payment-received"],
  },
  {
    label: "Admin Notifications",
    icon: ShieldCheck,
    color: "#F44336",
    slugs: ["admin-id-pending", "payment-received-admin", "guest-id-pending-admin", "guest-payment-admin"],
  },
];

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

  // Group templates by category
  const categorizedSlugs = new Set(TEMPLATE_CATEGORIES.flatMap(c => c.slugs));
  const activeTemplates = templates?.filter((t: any) => t.isActive) || [];
  const inactiveTemplates = templates?.filter((t: any) => !t.isActive) || [];

  const getTemplatesForCategory = (slugs: string[]) =>
    slugs.map(slug => activeTemplates.find((t: any) => t.slug === slug)).filter(Boolean);

  const uncategorized = activeTemplates.filter((t: any) => !categorizedSlugs.has(t.slug));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Email Templates</h1>
          <p className="text-sm text-gray-500">
            {templates ? `${activeTemplates.length} active templates` : "Loading..."}{" "}
            {inactiveTemplates.length > 0 && <span className="text-gray-400">({inactiveTemplates.length} inactive)</span>}
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-[#4B2D8E] text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-[#3a2270]">
          <Plus size={16} /> New Template
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 animate-pulse"><div className="h-5 bg-gray-200 rounded w-40 mb-3" /><div className="h-4 bg-gray-100 rounded w-full" /></div>
          ))}
        </div>
      ) : (
        <>
          {/* Categorized sections */}
          {TEMPLATE_CATEGORIES.map((category) => {
            const catTemplates = getTemplatesForCategory(category.slugs);
            if (catTemplates.length === 0) return null;
            const Icon = category.icon;
            return (
              <div key={category.label} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon size={18} style={{ color: category.color }} />
                  <h2 className="text-lg font-bold text-gray-700">{category.label}</h2>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{catTemplates.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catTemplates.map((template: any) => (
                    <TemplateCard key={template.id} template={template} onPreview={setPreviewTemplate} onEdit={startEdit} accentColor={category.color} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Uncategorized active templates */}
          {uncategorized.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-gray-700">Other Templates</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {uncategorized.map((template: any) => (
                  <TemplateCard key={template.id} template={template} onPreview={setPreviewTemplate} onEdit={startEdit} />
                ))}
              </div>
            </div>
          )}

          {/* Inactive templates (collapsed) */}
          {inactiveTemplates.length > 0 && (
            <details className="group">
              <summary className="flex items-center gap-2 cursor-pointer text-gray-500 hover:text-gray-700 text-sm font-medium">
                <Ban size={14} /> {inactiveTemplates.length} Inactive Template{inactiveTemplates.length > 1 ? "s" : ""}
                <span className="text-xs text-gray-400">(click to expand)</span>
              </summary>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                {inactiveTemplates.map((template: any) => (
                  <TemplateCard key={template.id} template={template} onPreview={setPreviewTemplate} onEdit={startEdit} inactive />
                ))}
              </div>
            </details>
          )}
        </>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{previewTemplate.name}</h2>
                <p className="text-xs text-gray-400 font-mono">{previewTemplate.slug}</p>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-500 mb-3"><strong>Subject:</strong> {previewTemplate.subject}</p>
              {previewTemplate.variables && previewTemplate.variables.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {(previewTemplate.variables as string[]).map((v: string) => (
                    <span key={v} className="px-2 py-0.5 rounded-full text-[10px] bg-[#4B2D8E]/10 text-[#4B2D8E] font-mono">{`{{${v}}}`}</span>
                  ))}
                </div>
              )}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                <iframe
                  srcDoc={previewTemplate.bodyHtml}
                  title="Email Preview"
                  className="w-full border-0"
                  style={{ minHeight: "500px" }}
                  sandbox="allow-same-origin"
                />
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
              <div>
                <h2 className="text-lg font-bold text-gray-800">Edit: {editingTemplate.name}</h2>
                <p className="text-xs text-gray-400 font-mono">{editingTemplate.slug}</p>
              </div>
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
                  rows={14} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-mono resize-y" />
              </div>
              {editingTemplate.variables && editingTemplate.variables.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Click a variable to copy it</p>
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
                  placeholder="customer_name, order_id, order_total" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
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

// ── Template card sub-component ──
function TemplateCard({ template, onPreview, onEdit, accentColor, inactive }: {
  template: any; onPreview: (t: any) => void; onEdit: (t: any) => void; accentColor?: string; inactive?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow ${inactive ? "border-gray-200 opacity-60" : "border-gray-100"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${accentColor || "#4B2D8E"}15` }}>
            <Mail size={18} style={{ color: accentColor || "#4B2D8E" }} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">{template.name}</h3>
            <p className="text-xs text-gray-400 font-mono">{template.slug}</p>
          </div>
        </div>
        {template.isActive ? <Check size={16} className="text-green-500" /> : <Ban size={16} className="text-gray-400" />}
      </div>
      <p className="text-sm text-gray-600 mb-3 truncate"><strong>Subject:</strong> {template.subject}</p>
      {template.variables && template.variables.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {(template.variables as string[]).slice(0, 6).map((v: string) => (
            <span key={v} className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-500 font-mono">{`{{${v}}}`}</span>
          ))}
          {template.variables.length > 6 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-400">+{template.variables.length - 6} more</span>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => onPreview(template)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
          <Eye size={14} /> Preview
        </button>
        <button onClick={() => onEdit(template)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm hover:opacity-90"
          style={{ backgroundColor: accentColor || "#4B2D8E" }}>
          <Edit2 size={14} /> Edit
        </button>
      </div>
    </div>
  );
}
