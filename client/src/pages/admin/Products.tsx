import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Package, Plus, Search, Edit2, Trash2, Eye, EyeOff, Star, X, Save, Upload } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["flower", "pre-rolls", "edibles", "vapes", "concentrates", "accessories", "ounce-deals", "shake-n-bake"] as const;
const STRAIN_TYPES = ["Sativa", "Indica", "Hybrid", "CBD", "N/A"] as const;

export default function AdminProducts() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.products.list.useQuery(
    { page, limit: 20, search: search || undefined, category: category || undefined },
    { refetchOnWindowFocus: true },
  );
  const createMutation = trpc.admin.products.create.useMutation({ onSuccess: () => { utils.admin.products.list.invalidate(); toast.success("Product created"); setShowForm(false); resetForm(); } });
  const updateMutation = trpc.admin.products.update.useMutation({ onSuccess: () => { utils.admin.products.list.invalidate(); toast.success("Product updated"); setShowForm(false); setEditingProduct(null); } });
  const deleteMutation = trpc.admin.products.delete.useMutation({ onSuccess: () => { utils.admin.products.list.invalidate(); toast.success("Product deleted"); } });

  const [form, setForm] = useState({
    name: "", slug: "", category: "flower" as typeof CATEGORIES[number], strainType: "Hybrid" as typeof STRAIN_TYPES[number],
    price: "", weight: "", thc: "", description: "", shortDescription: "", image: "", stock: 0,
    featured: false, isNew: false, isActive: true, flavor: "",
  });

  const resetForm = () => setForm({ name: "", slug: "", category: "flower", strainType: "Hybrid", price: "", weight: "", thc: "", description: "", shortDescription: "", image: "", stock: 0, featured: false, isNew: false, isActive: true, flavor: "" });

  const openEdit = (product: any) => {
    setForm({
      name: product.name, slug: product.slug, category: product.category, strainType: product.strainType || "Hybrid",
      price: String(product.price), weight: product.weight || "", thc: product.thc || "", description: product.description || "",
      shortDescription: product.shortDescription || "", image: product.image || "", stock: product.stock,
      featured: product.featured, isNew: product.isNew, isActive: product.isActive, flavor: product.flavor || "",
    });
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Products</h1>
          <p className="text-sm text-gray-500">{data?.total ?? 0} total products</p>
        </div>
        <button onClick={() => { resetForm(); setEditingProduct(null); setShowForm(true); }}
          className="bg-[#4B2D8E] text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-[#3a2270] transition-colors">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search products..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20 focus:border-[#4B2D8E]" />
        </div>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20 bg-white">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Strain</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Stock</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td colSpan={7} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : data?.data.map((product: any) => (
                <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><Package size={16} className="text-gray-400" /></div>
                      )}
                      <div>
                        <p className="font-medium text-gray-800">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.weight} {product.thc ? `· THC: ${product.thc}` : ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{product.category}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{product.strainType}</td>
                  <td className="px-4 py-3 text-right font-semibold">${Number(product.price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span className={`font-mono ${product.stock < 10 ? "text-red-500 font-semibold" : "text-gray-600"}`}>{product.stock}</span>
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <div className="flex items-center justify-center gap-1">
                      {product.isActive ? <Eye size={14} className="text-green-500" /> : <EyeOff size={14} className="text-gray-400" />}
                      {product.featured && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(product)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => { if (confirm(`Delete "${product.name}"?`)) deleteMutation.mutate({ id: product.id }); }}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50 hover:bg-gray-50">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">{editingProduct ? "Edit Product" : "Add Product"}</h2>
              <button onClick={() => { setShowForm(false); setEditingProduct(null); }} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Product Name *</label>
                  <input type="text" required value={form.name} onChange={(e) => { setForm(f => ({ ...f, name: e.target.value, slug: autoSlug(e.target.value) })); }}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Slug *</label>
                  <input type="text" required value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20 font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
                  <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value as any }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Strain Type</label>
                  <select value={form.strainType} onChange={(e) => setForm(f => ({ ...f, strainType: e.target.value as any }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white">
                    {STRAIN_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price *</label>
                  <input type="text" required value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="35.00" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Weight</label>
                  <input type="text" value={form.weight} onChange={(e) => setForm(f => ({ ...f, weight: e.target.value }))}
                    placeholder="3.5g" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">THC</label>
                  <input type="text" value={form.thc} onChange={(e) => setForm(f => ({ ...f, thc: e.target.value }))}
                    placeholder="20-25%" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Stock *</label>
                  <input type="number" required value={form.stock} onChange={(e) => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Flavor</label>
                <input type="text" value={form.flavor} onChange={(e) => setForm(f => ({ ...f, flavor: e.target.value }))}
                  placeholder="Grape & Earth" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Image URL</label>
                <input type="text" value={form.image} onChange={(e) => setForm(f => ({ ...f, image: e.target.value }))}
                  placeholder="https://..." className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Short Description</label>
                <input type="text" value={form.shortDescription} onChange={(e) => setForm(f => ({ ...f, shortDescription: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Description</label>
                <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none" />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.featured} onChange={(e) => setForm(f => ({ ...f, featured: e.target.checked }))}
                    className="w-4 h-4 rounded text-[#4B2D8E]" />
                  <span className="text-sm text-gray-700">Featured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isNew} onChange={(e) => setForm(f => ({ ...f, isNew: e.target.checked }))}
                    className="w-4 h-4 rounded text-[#4B2D8E]" />
                  <span className="text-sm text-gray-700">New</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded text-[#4B2D8E]" />
                  <span className="text-sm text-gray-700">Active (visible in store)</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditingProduct(null); }}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-[#4B2D8E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3a2270] transition-colors flex items-center gap-2 disabled:opacity-50">
                  <Save size={14} /> {editingProduct ? "Update" : "Create"} Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
