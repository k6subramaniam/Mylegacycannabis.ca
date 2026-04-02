import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Mail, Edit2, Save, X, Eye, Check, Ban, Plus, Code, Users, UserCheck, ShieldCheck, Image, Sparkles, Wand2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// Category groups for organizing templates
const TEMPLATE_CATEGORIES: { label: string; icon: any; slugs: string[]; color: string }[] = [
  {
    label: "Registered Users",
    icon: Users,
    color: "#4B2D8E",
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
          <button onClick={() => setShowNew(true)} className="bg-[#4B2D8E] text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-[#3a2270]">
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
                  className="bg-[#4B2D8E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3a2270] disabled:opacity-50">Create Template</button>
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
                  className="bg-[#4B2D8E] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3a2270] disabled:opacity-50 flex items-center gap-2"
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
// EDIT TEMPLATE MODAL (with AI Improve)
// ═══════════════════════════════════════════════════════════
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl my-8 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Edit: {template.name}</h2>
            <p className="text-xs text-gray-400 font-mono">{template.slug}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAiPanel(!showAiPanel)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                showAiPanel
                  ? "bg-violet-100 border-violet-300 text-violet-700"
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Wand2 size={14} /> AI Improve
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
          </div>
        </div>

        {/* AI Improve Panel */}
        {showAiPanel && (
          <div className="p-5 bg-gradient-to-r from-violet-50 to-fuchsia-50 border-b border-violet-100">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-gray-700">Tell AI how to improve this template</p>
                <textarea
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder='e.g. "Make the tone more friendly and add a coupon section" or "Translate to French" or "Add a section about delivery times" or "Make it shorter and more concise"'
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm resize-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAiImprove}
                    disabled={aiImprove.isPending || !aiInstruction.trim()}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {aiImprove.isPending ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    {aiImprove.isPending ? "Improving..." : "Apply AI Improvements"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="p-5 space-y-4">
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
          {template.variables && template.variables.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Click a variable to copy it</p>
              <div className="flex flex-wrap gap-1">
                {(template.variables as string[]).map((v: string) => (
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
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSaving}
              className="bg-[#4B2D8E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3a2270] disabled:opacity-50 flex items-center gap-2">
              <Save size={14} /> Save Changes
            </button>
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
        <div className="bg-[#1a1a2e] rounded-lg p-4 text-center">
          <img src={currentUrl} alt="Email logo" style={{ maxWidth: 280, height: "auto", margin: "0 auto" }} onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png"; }} />
          <div style={{ height: 4, background: "linear-gradient(90deg, #F5C518 0%, #D4952A 33%, #E8792B 66%, #C42B2B 100%)", marginTop: 12, borderRadius: 2 }} />
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
