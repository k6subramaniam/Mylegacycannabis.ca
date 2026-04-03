import { trpc } from "@/lib/trpc";
import { useState, useRef, useCallback } from "react";
import { Mail, Edit2, Save, X, Eye, Check, Ban, Plus, Code, Users, UserCheck, ShieldCheck, Image, Sparkles, Wand2, Loader2, RefreshCw, Copy, Type, Palette, MousePointer, AlertTriangle, Info, CheckCircle2, MessageSquare, LayoutTemplate, SplitSquareHorizontal } from "lucide-react";
import { toast } from "sonner";

// Category groups for organizing templates
const TEMPLATE_CATEGORIES: { label: string; icon: any; slugs: string[]; color: string }[] = [
  {
    label: "Registered Users",
    icon: Users,
    color: "#4B2DBE",
    slugs: ["welcome-email", "id-verified", "id-rejected", "order-confirmation", "payment-received-customer", "order-shipped", "order-status-update"],
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

// All known template variables for the variable picker
const ALL_VARIABLES = [
  { key: "customer_name", label: "Customer Name", group: "Customer" },
  { key: "order_id", label: "Order Number", group: "Order" },
  { key: "order_total", label: "Order Total", group: "Order" },
  { key: "order_items", label: "Order Items", group: "Order" },
  { key: "delivery_address", label: "Delivery Address", group: "Order" },
  { key: "order_status", label: "Order Status", group: "Order" },
  { key: "update_date", label: "Update Date", group: "Order" },
  { key: "status_message", label: "Status Message", group: "Order" },
  { key: "payment_email", label: "Payment Email", group: "Payment" },
  { key: "payment_amount", label: "Payment Amount", group: "Payment" },
  { key: "payment_reference", label: "Payment Reference", group: "Payment" },
  { key: "tracking_number", label: "Tracking Number", group: "Shipping" },
  { key: "tracking_url", label: "Tracking URL", group: "Shipping" },
  { key: "rejection_reason", label: "Rejection Reason", group: "Verification" },
  { key: "shop_url", label: "Shop Link", group: "Links" },
  { key: "account_url", label: "Account Link", group: "Links" },
  { key: "action_url", label: "CTA Link", group: "Links" },
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
  const [showAiGenerate, setShowAiGenerate] = useState(false);

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
        <div className="flex gap-2">
          <button onClick={() => setShowAiGenerate(true)} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 shadow-md">
            <Sparkles size={16} /> AI Generate
          </button>
          <button onClick={() => setShowNew(true)} className="bg-[#4B2DBE] text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-[#3A2270]">
            <Plus size={16} /> New Template
          </button>
        </div>
      </div>

      {/* Email Logo Card */}
      <EmailLogoCard />

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
                    <span key={v} className="px-2 py-0.5 rounded-full text-[10px] bg-[#4B2DBE]/10 text-[#4B2DBE] font-mono">{`{{${v}}}`}</span>
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
        <EditTemplateModal
          template={editingTemplate}
          editForm={editForm}
          setEditForm={setEditForm}
          onClose={() => setEditingTemplate(null)}
          onSave={() => updateMutation.mutate({ id: editingTemplate.id, ...editForm })}
          isSaving={updateMutation.isPending}
        />
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
                  className="bg-[#4B2DBE] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3A2270] disabled:opacity-50">Create Template</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Generate Modal */}
      {showAiGenerate && (
        <AiGenerateModal
          onClose={() => setShowAiGenerate(false)}
          onCreated={() => {
            utils.admin.emailTemplates.list.invalidate();
            setShowAiGenerate(false);
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// AI GENERATE MODAL
// ═══════════════════════════════════════════════════════════
function AiGenerateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const aiMutation = trpc.admin.emailTemplates.aiGenerate.useMutation({
    onError: (err: any) => toast.error(err.message || "AI generation failed"),
  });
  const createMutation = trpc.admin.emailTemplates.create.useMutation({
    onSuccess: () => { toast.success("Template saved!"); onCreated(); },
    onError: (err: any) => toast.error(err.message),
  });

  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState<"professional" | "friendly" | "urgent" | "celebratory" | "minimal">("professional");
  const [audience, setAudience] = useState<"customer" | "admin">("customer");
  const [selectedVars, setSelectedVars] = useState<string[]>(["customer_name"]);
  const [generated, setGenerated] = useState<{ slug: string; name: string; subject: string; bodyHtml: string; variables: string[] } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const toggleVar = (key: string) => {
    setSelectedVars(prev => prev.includes(key) ? prev.filter(v => v !== key) : [...prev, key]);
  };

  const handleGenerate = () => {
    if (!prompt.trim()) { toast.error("Describe the email you want"); return; }
    setGenerated(null);
    aiMutation.mutate({ prompt, tone, audience, variables: selectedVars }, {
      onSuccess: (data) => {
        setGenerated(data);
        setShowPreview(true);
      },
    });
  };

  const handleSave = () => {
    if (!generated) return;
    createMutation.mutate({
      slug: generated.slug,
      name: generated.name,
      subject: generated.subject,
      bodyHtml: generated.bodyHtml,
      variables: generated.variables,
      isActive: true,
    });
  };

  const toneOptions = [
    { value: "professional", label: "Professional", emoji: "briefcase" },
    { value: "friendly", label: "Friendly", emoji: "wave" },
    { value: "urgent", label: "Urgent", emoji: "alert" },
    { value: "celebratory", label: "Celebratory", emoji: "party" },
    { value: "minimal", label: "Minimal", emoji: "clean" },
  ];

  const varGroups = ALL_VARIABLES.reduce((acc, v) => {
    (acc[v.group] = acc[v.group] || []).push(v);
    return acc;
  }, {} as Record<string, typeof ALL_VARIABLES>);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl my-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">AI Email Template Generator</h2>
              <p className="text-xs text-gray-400">Describe the email you want and AI will create a branded template</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">What email do you need?</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={'e.g. "A promotional email for 20% off all edibles this weekend" or "An email to notify customers their order has been delayed"'}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          {/* Tone + Audience row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Tone</label>
              <div className="flex flex-wrap gap-2">
                {toneOptions.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => setTone(t.value as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      tone === t.value
                        ? "bg-violet-100 border-violet-300 text-violet-700"
                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Audience</label>
              <div className="flex gap-2">
                {(["customer", "admin"] as const).map(a => (
                  <button key={a} type="button"
                    onClick={() => setAudience(a)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      audience === a
                        ? "bg-violet-100 border-violet-300 text-violet-700"
                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {a === "customer" ? "Customer" : "Admin"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Variable picker */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Include these variables <span className="text-gray-400">(optional — AI will pick relevant ones either way)</span></label>
            <div className="space-y-2">
              {Object.entries(varGroups).map(([group, vars]) => (
                <div key={group} className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 font-medium w-20 shrink-0">{group}</span>
                  {vars.map(v => (
                    <button key={v.key} type="button"
                      onClick={() => toggleVar(v.key)}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-mono border transition-colors ${
                        selectedVars.includes(v.key)
                          ? "bg-violet-100 border-violet-300 text-violet-700"
                          : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
                      }`}
                    >
                      {v.key}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <div className="flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={aiMutation.isPending || !prompt.trim()}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shadow-lg"
            >
              {aiMutation.isPending ? (
                <><Loader2 size={16} className="animate-spin" /> Generating...</>
              ) : (
                <><Wand2 size={16} /> Generate Template</>
              )}
            </button>
          </div>

          {/* Generated result */}
          {generated && (
            <div className="border border-violet-200 rounded-xl bg-violet-50/50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">{generated.name}</h3>
                  <p className="text-xs text-gray-400 font-mono">{generated.slug}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-white"
                  >
                    <Eye size={14} /> {showPreview ? "Hide" : "Preview"}
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={aiMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-200 text-sm text-violet-600 hover:bg-violet-100"
                  >
                    <RefreshCw size={14} /> Regenerate
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600"><strong>Subject:</strong> {generated.subject}</p>

              {generated.variables.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {generated.variables.map(v => (
                    <span key={v} className="px-2 py-0.5 rounded-full text-[10px] bg-violet-100 text-violet-600 font-mono">{`{{${v}}}`}</span>
                  ))}
                </div>
              )}

              {showPreview && (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                  <iframe
                    srcDoc={generated.bodyHtml}
                    title="AI Email Preview"
                    className="w-full border-0"
                    style={{ minHeight: "500px" }}
                    sandbox="allow-same-origin"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={createMutation.isPending}
                  className="bg-[#4B2DBE] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3A2270] disabled:opacity-50 flex items-center gap-2"
                >
                  {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Template
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VISUAL EMAIL EDITOR — Block-based editing
// Parses the email HTML into editable text sections so admins
// can edit content without touching raw HTML.
// ═══════════════════════════════════════════════════════════

interface EditableBlock {
  id: string;
  /** The full original HTML of this block (for reconstruction) */
  originalHtml: string;
  /** The visible/editable text inside the block */
  text: string;
  /** Type determines the UI treatment */
  type: "heading" | "paragraph" | "info-box" | "warning-box" | "success-box" | "danger-box" | "button" | "table-row" | "raw";
  /** Label shown above the block */
  label: string;
}

/** Map inline style patterns to block types */
function classifyBlock(html: string): EditableBlock["type"] {
  const lower = html.toLowerCase();
  if (/background\s*:\s*linear-gradient/i.test(lower) && /<h1/i.test(lower)) return "heading";
  if (/border-radius:\s*50px|border-radius:\s*50/i.test(lower) && /<a\s/i.test(lower)) return "button";
  if (/background-color\s*:\s*#e3f2fd|background-color\s*:\s*#ede7f6|border-left\s*:\s*4px\s+solid\s+#(4a90e2|4b2dbe|2196f3)/i.test(lower)) return "info-box";
  if (/background-color\s*:\s*#fff59d|background-color\s*:\s*#fff3e0|border-left\s*:\s*4px\s+solid\s+#(ffd700|f19929|ff9800)/i.test(lower)) return "warning-box";
  if (/background-color\s*:\s*#e8f5e9|border-left\s*:\s*4px\s+solid\s+#4caf50/i.test(lower)) return "success-box";
  if (/background-color\s*:\s*#ffebee|border-left\s*:\s*4px\s+solid\s+#f44336/i.test(lower)) return "danger-box";
  return "paragraph";
}

function blockLabel(type: EditableBlock["type"]): string {
  switch (type) {
    case "heading": return "Header Banner";
    case "button": return "CTA Button";
    case "info-box": return "Info Box";
    case "warning-box": return "Warning / Payment Box";
    case "success-box": return "Success Box";
    case "danger-box": return "Alert Box";
    case "table-row": return "Table Row";
    case "paragraph": return "Text Block";
    default: return "Block";
  }
}

function blockColor(type: EditableBlock["type"]): string {
  switch (type) {
    case "heading": return "#4B2DBE";
    case "button": return "#F19929";
    case "info-box": return "#2196F3";
    case "warning-box": return "#FF9800";
    case "success-box": return "#4CAF50";
    case "danger-box": return "#F44336";
    default: return "#6B7280";
  }
}

/** Extract inner text from HTML string (strip tags) */
function htmlToText(html: string): string {
  // Replace <br>, <br/> with newlines, strip remaining tags
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/div>\s*<div[^>]*>/gi, "\n")
    .replace(/<\/?(strong|b|em|i|span|a|u|code)[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Parse the bodyHtml into editable blocks.
 * We split on top-level <tr>...</tr> blocks which is how MLC email templates
 * are structured (each <tr> is a visual section).
 */
function parseBlocks(html: string): EditableBlock[] {
  // Split by top-level <tr> tags — each is a section
  const trRegex = /<tr\b[^>]*>[\s\S]*?<\/tr>/gi;
  const matches = html.match(trRegex);
  if (!matches || matches.length === 0) {
    // Fallback: treat entire HTML as one block
    return [{ id: "0", originalHtml: html, text: htmlToText(html), type: "raw", label: "Email Body" }];
  }

  return matches.map((trHtml, idx) => {
    const type = classifyBlock(trHtml);
    const text = htmlToText(trHtml);
    return {
      id: String(idx),
      originalHtml: trHtml,
      text,
      type,
      label: blockLabel(type),
    };
  });
}

/**
 * Given the original full HTML and a set of edited blocks,
 * reconstruct the HTML by replacing text content in each block.
 */
function reconstructHtml(originalHtml: string, blocks: EditableBlock[]): string {
  let result = originalHtml;
  for (const block of blocks) {
    // We find and keep the original block HTML — no reconstruction needed
    // since we only allow editing via the visual preview iframe
    // The visual editor uses AI Improve for structural changes
  }
  return result;
}

function VisualEmailEditor({ html, onChange }: { html: string; onChange: (html: string) => void }) {
  const blocks = parseBlocks(html);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const handleBlockClick = (block: EditableBlock) => {
    if (block.type === "raw") return;
    setEditingBlockId(block.id);
    setEditingText(block.text);
  };

  const handleBlockSave = (block: EditableBlock) => {
    if (!editingText.trim()) {
      setEditingBlockId(null);
      return;
    }
    // Replace the text content inside the original HTML block
    // Strategy: find all text nodes and replace them
    let updatedBlockHtml = block.originalHtml;
    const oldText = block.text;
    const newText = editingText;

    // For simple text changes, do a targeted text replacement within the HTML
    // Split both old and new into lines and match line-by-line
    const oldLines = oldText.split("\n").map(l => l.trim()).filter(Boolean);
    const newLines = newText.split("\n").map(l => l.trim()).filter(Boolean);

    for (let i = 0; i < oldLines.length && i < newLines.length; i++) {
      if (oldLines[i] !== newLines[i]) {
        // Escape special regex chars in old text
        const escaped = oldLines[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "g");
        updatedBlockHtml = updatedBlockHtml.replace(regex, newLines[i]);
      }
    }

    // Replace the block in the full HTML
    const newHtml = html.replace(block.originalHtml, updatedBlockHtml);
    onChange(newHtml);
    setEditingBlockId(null);
  };

  // Variable highlight: show {{vars}} as purple pills in text
  const highlightVars = (text: string) => {
    const parts = text.split(/(\{\{[a-z_]+\}\})/g);
    return parts.map((part, i) =>
      /^\{\{[a-z_]+\}\}$/.test(part)
        ? <span key={i} className="inline-block bg-[#4B2DBE]/15 text-[#4B2DBE] text-[11px] font-mono px-1.5 py-0.5 rounded-full mx-0.5">{part}</span>
        : <span key={i}>{part}</span>
    );
  };

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
      <div className="flex items-center gap-2 mb-1">
        <LayoutTemplate size={13} className="text-[#4B2DBE]" />
        <span className="text-xs font-medium text-gray-500">Click any section to edit its content</span>
      </div>

      {blocks.map((block) => {
        const isEditing = editingBlockId === block.id;
        const color = blockColor(block.type);

        // Skip blocks with no meaningful text
        if (!block.text.trim() && block.type !== "heading") return null;

        return (
          <div key={block.id} className="group relative">
            {/* Block label */}
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{block.label}</span>
            </div>

            {isEditing ? (
              /* Edit mode */
              <div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: color }}>
                <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  rows={Math.max(3, editingText.split("\n").length + 1)}
                  className="w-full px-4 py-3 text-sm resize-y focus:outline-none leading-relaxed"
                  autoFocus
                />
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400">Use {"{{variable_name}}"} for dynamic content</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditingBlockId(null)}
                      className="px-3 py-1 rounded-lg text-xs text-gray-500 hover:bg-gray-200 transition-colors">
                      Cancel
                    </button>
                    <button type="button" onClick={() => handleBlockSave(block)}
                      className="px-3 py-1 rounded-lg text-xs text-white font-medium transition-colors"
                      style={{ backgroundColor: color }}>
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* View mode — clickable card */
              <button
                type="button"
                onClick={() => handleBlockClick(block)}
                className="w-full text-left rounded-xl border border-gray-200 px-4 py-3 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group-hover:border-gray-300"
              >
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {highlightVars(block.text)}
                </p>
                <span className="text-[10px] text-gray-300 group-hover:text-gray-400 mt-1 block transition-colors">Click to edit</span>
              </button>
            )}
          </div>
        );
      })}

      {/* Tip */}
      <div className="flex items-start gap-2 mt-3 px-3 py-2.5 rounded-lg bg-violet-50 border border-violet-100">
        <Sparkles size={13} className="text-violet-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-violet-600 leading-relaxed">
          <strong>Tip:</strong> For structural changes (add sections, rearrange layout, change colors), use the <strong>AI Improve</strong> button above with a natural language instruction like "Add a delivery ETA section" or "Change the header color to green".
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EDIT TEMPLATE MODAL — Visual Editor with Live Preview
// ═══════════════════════════════════════════════════════════

// Snippet library for quick insertion
const SNIPPETS = [
  { label: "Orange CTA Button", icon: MousePointer, snippet: `<div style="text-align:center; margin:28px 0;">\n  <a href="{{action_url}}" style="display:inline-block; background-color:#F19929; color:#FFFFFF; text-decoration:none; padding:14px 40px; border-radius:50px; font-size:15px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; font-family:Roboto,Arial,sans-serif;">BUTTON TEXT</a>\n</div>` },
  { label: "Purple CTA Button", icon: MousePointer, snippet: `<div style="text-align:center; margin:28px 0;">\n  <a href="{{action_url}}" style="display:inline-block; background-color:#4B2DBE; color:#FFFFFF; text-decoration:none; padding:14px 40px; border-radius:50px; font-size:15px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; font-family:Roboto,Arial,sans-serif;">BUTTON TEXT</a>\n</div>` },
  { label: "Info Box (Purple)", icon: Info, snippet: `<div style="background-color:#EDE7F6; border-left:4px solid #4B2DBE; padding:20px; margin:20px 0; border-radius:8px;">\n  <p style="color:#323233; font-size:14px; margin:0;"><strong>Note:</strong> Your info here</p>\n</div>` },
  { label: "Warning Box (Orange)", icon: AlertTriangle, snippet: `<div style="background-color:#FFF3E0; border-left:4px solid #F19929; padding:20px; margin:20px 0; border-radius:8px;">\n  <p style="color:#323233; font-size:14px; margin:0;"><strong>Important:</strong> Your warning here</p>\n</div>` },
  { label: "Success Box (Green)", icon: CheckCircle2, snippet: `<div style="background-color:#E8F5E9; border-left:4px solid #4CAF50; padding:20px; margin:20px 0; border-radius:8px;">\n  <p style="color:#323233; font-size:14px; margin:0;"><strong>Done!</strong> Your success message</p>\n</div>` },
  { label: "Contact Line", icon: MessageSquare, snippet: `<p style="color:#858481; font-size:13px; text-align:center; margin-top:24px;">Questions? Contact us at <a href="mailto:support@mylegacycannabis.ca" style="color:#4B2DBE; text-decoration:none; font-weight:500;">support@mylegacycannabis.ca</a></p>` },
];

function EditTemplateModal({ template, editForm, setEditForm, onClose, onSave, isSaving }: {
  template: any;
  editForm: { subject: string; bodyHtml: string; isActive: boolean };
  setEditForm: React.Dispatch<React.SetStateAction<{ subject: string; bodyHtml: string; isActive: boolean }>>;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const [aiInstruction, setAiInstruction] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [editorTab, setEditorTab] = useState<"visual" | "code">("visual");
  const [showSnippets, setShowSnippets] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const aiImprove = trpc.admin.emailTemplates.aiImprove.useMutation({
    onSuccess: (data) => {
      setEditForm({ subject: data.subject, bodyHtml: data.bodyHtml, isActive: editForm.isActive });
      toast.success("AI applied improvements");
      setShowAiPanel(false);
      setAiInstruction("");
    },
    onError: (err: any) => toast.error(err.message || "AI improvement failed"),
  });

  const handleAiImprove = () => {
    if (!aiInstruction.trim()) { toast.error("Tell AI what to improve"); return; }
    aiImprove.mutate({
      currentSubject: editForm.subject,
      currentBodyHtml: editForm.bodyHtml,
      currentVariables: template.variables || [],
      instruction: aiInstruction,
    });
  };

  const insertAtCursor = useCallback((text: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setEditForm(f => ({ ...f, bodyHtml: f.bodyHtml + "\n" + text }));
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = editForm.bodyHtml.substring(0, start);
    const after = editForm.bodyHtml.substring(end);
    const newVal = before + text + after;
    setEditForm(f => ({ ...f, bodyHtml: newVal }));
    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + text.length; ta.focus(); });
  }, [editForm.bodyHtml, setEditForm]);

  // Build preview HTML with sample data for variables
  const previewHtml = editForm.bodyHtml
    .replace(/\{\{customer_name\}\}/g, "Jane Doe")
    .replace(/\{\{order_id\}\}/g, "MLC-2026-0042")
    .replace(/\{\{order_total\}\}/g, "$127.50")
    .replace(/\{\{order_items\}\}/g, "Blue Dream 3.5g x2, Gummy Bears 10pk x1")
    .replace(/\{\{delivery_address\}\}/g, "123 Queen St W, Toronto ON M5H 2N2")
    .replace(/\{\{payment_email\}\}/g, "payments@mylegacycannabis.ca")
    .replace(/\{\{payment_amount\}\}/g, "$127.50")
    .replace(/\{\{payment_reference\}\}/g, "MLC-2026-0042")
    .replace(/\{\{tracking_number\}\}/g, "CP123456789CA")
    .replace(/\{\{tracking_url\}\}/g, "#")
    .replace(/\{\{shop_url\}\}/g, "#")
    .replace(/\{\{account_url\}\}/g, "#")
    .replace(/\{\{action_url\}\}/g, "#")
    .replace(/\{\{rejection_reason\}\}/g, "The submitted ID was blurry. Please resubmit a clear photo.")
    .replace(/\{\{logo_url\}\}/g, "/logo.png")
    .replace(/\{\{[a-z_]+\}\}/g, "---");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-2 md:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-[95vw] xl:max-w-7xl my-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#4B2DBE]/10 flex items-center justify-center">
              <LayoutTemplate size={18} className="text-[#4B2DBE]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Edit: {template.name}</h2>
              <p className="text-xs text-gray-400 font-mono">{template.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAiPanel(!showAiPanel)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${showAiPanel ? "bg-violet-100 border-violet-300 text-violet-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
              <Wand2 size={14} /> AI Improve
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
          </div>
        </div>

        {/* AI Improve Panel */}
        {showAiPanel && (
          <div className="p-4 bg-gradient-to-r from-violet-50 to-fuchsia-50 border-b border-violet-100">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-gray-700">Tell AI how to improve this template</p>
                <textarea value={aiInstruction} onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder='e.g. "Make the tone more friendly" or "Add a delivery times section" or "Make it more concise"'
                  rows={2} className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm resize-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
                <div className="flex justify-end">
                  <button onClick={handleAiImprove} disabled={aiImprove.isPending || !aiInstruction.trim()}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-2 rounded-full text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5">
                    {aiImprove.isPending ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    {aiImprove.isPending ? "Improving..." : "APPLY AI IMPROVEMENTS"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content: Side-by-side Editor + Preview */}
        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="flex flex-col">
          {/* Subject Line */}
          <div className="px-4 pt-4 pb-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject Line</label>
            <input type="text" value={editForm.subject} onChange={(e) => setEditForm(f => ({ ...f, subject: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-[#4B2DBE] focus:border-transparent" />
          </div>

          {/* Editor + Preview Split */}
          <div className="flex flex-col lg:flex-row gap-0 lg:gap-4 px-4 pb-2">
            {/* LEFT: Editor Panel */}
            <div className="flex-1 min-w-0">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setEditorTab("visual")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${editorTab === "visual" ? "bg-[#4B2DBE] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    <SplitSquareHorizontal size={12} className="inline mr-1" /> Visual
                  </button>
                  <button type="button" onClick={() => setEditorTab("code")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${editorTab === "code" ? "bg-[#4B2DBE] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    <Code size={12} className="inline mr-1" /> HTML Code
                  </button>
                </div>
                <button type="button" onClick={() => setShowSnippets(!showSnippets)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showSnippets ? "bg-[#F19929]/10 border-[#F19929]/30 text-[#F19929]" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                  <Palette size={12} /> Insert Snippet
                </button>
              </div>

              {/* Snippet Panel */}
              {showSnippets && (
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 mb-2 space-y-1.5">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Click to insert at cursor</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SNIPPETS.map((s) => {
                      const Icon = s.icon;
                      return (
                        <button key={s.label} type="button" onClick={() => { insertAtCursor(s.snippet); setShowSnippets(false); }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-700 hover:bg-[#4B2DBE]/5 hover:border-[#4B2DBE]/20 transition-colors text-left">
                          <Icon size={13} className="shrink-0 text-[#4B2DBE]" /> {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Variables bar */}
              {template.variables && template.variables.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">Variables (click to insert)</p>
                  <div className="flex flex-wrap gap-1">
                    {(template.variables as string[]).map((v: string) => (
                      <button key={v} type="button" onClick={() => insertAtCursor(`{{${v}}}`)}
                        className="px-2 py-0.5 rounded-full text-[11px] bg-[#4B2DBE]/10 text-[#4B2DBE] font-mono cursor-pointer hover:bg-[#4B2DBE]/20 transition-colors border border-transparent hover:border-[#4B2DBE]/30">
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Editor textarea */}
              {editorTab === "code" ? (
                <textarea ref={textareaRef} value={editForm.bodyHtml} onChange={(e) => setEditForm(f => ({ ...f, bodyHtml: e.target.value }))}
                  rows={18} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-mono resize-y bg-gray-50 focus:ring-2 focus:ring-[#4B2DBE] focus:border-transparent leading-relaxed" />
              ) : (
                <VisualEmailEditor html={editForm.bodyHtml} onChange={(html) => setEditForm(f => ({ ...f, bodyHtml: html }))} />
              )}
            </div>

            {/* RIGHT: Live Preview */}
            <div className="flex-1 min-w-0 mt-4 lg:mt-0">
              <div className="flex items-center gap-2 mb-2">
                <Eye size={13} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-500">Live Preview</span>
                <span className="text-[10px] text-gray-400">(sample data)</span>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-[#F5F5F5]" style={{ height: "calc(100% - 28px)", minHeight: 400 }}>
                <iframe
                  srcDoc={previewHtml}
                  title="Email Preview"
                  className="w-full h-full border-0"
                  style={{ minHeight: 400 }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between p-4 border-t border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700">Active</span>
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full border text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={isSaving}
                className="bg-[#4B2DBE] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#3A2270] disabled:opacity-50 flex items-center gap-2 uppercase tracking-wider">
                <Save size={14} /> Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EMAIL LOGO CARD
// ═══════════════════════════════════════════════════════════
function EmailLogoCard() {
  const { data: logoData, isLoading } = trpc.admin.emailLogo.get.useQuery();
  const currentUrl = logoData?.url || "/logo.png";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1a1a2e] flex items-center justify-center">
            <Image size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Email Header Logo</h3>
            <p className="text-xs text-gray-400">Injected into every email via <code className="bg-gray-100 px-1 rounded">{"{{logo_url}}"}</code> — managed globally in Settings.</p>
          </div>
        </div>
        <a href="/admin/settings" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
          <Edit2 size={14} /> Change in Settings
        </a>
      </div>

      {/* Current logo preview */}
      {!isLoading && (
        <div className="bg-[#3A2270] rounded-lg p-5 text-center">
          <img src={currentUrl} alt="Email logo" style={{ maxWidth: 240, height: "auto", margin: "0 auto" }} onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png"; }} />
          <div style={{ height: 5, background: "linear-gradient(90deg, #F5C518 0%, #F19929 35%, #E8792B 65%, #C42B2B 100%)", marginTop: 14, borderRadius: 3 }} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TEMPLATE CARD
// ═══════════════════════════════════════════════════════════
function TemplateCard({ template, onPreview, onEdit, accentColor, inactive }: {
  template: any; onPreview: (t: any) => void; onEdit: (t: any) => void; accentColor?: string; inactive?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow ${inactive ? "border-gray-200 opacity-60" : "border-gray-100"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${accentColor || "#4B2DBE"}15` }}>
            <Mail size={18} style={{ color: accentColor || "#4B2DBE" }} />
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
          style={{ backgroundColor: accentColor || "#4B2DBE" }}>
          <Edit2 size={14} /> Edit
        </button>
      </div>
    </div>
  );
}
