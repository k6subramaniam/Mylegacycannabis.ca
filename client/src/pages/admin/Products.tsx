import { trpc } from "@/lib/trpc";
import { useState, useRef, useCallback } from "react";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Star,
  X,
  Save,
  Upload,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "flower",
  "pre-rolls",
  "edibles",
  "vapes",
  "concentrates",
  "accessories",
  "ounce-deals",
  "shake-n-bake",
] as const;
const STRAIN_TYPES = ["Sativa", "Indica", "Hybrid", "CBD", "N/A"] as const;

// ─── Drag & Drop Image Upload Component ────────────────────────────────────────
// Supports file upload (drag/drop + click), auto-converts to optimised WebP,
// and still allows manual URL entry as a fallback.
function ProductImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.admin.upload.useMutation();

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are supported");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image must be under 10 MB");
        return;
      }
      setUploading(true);
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]); // strip data:... prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const result = await uploadMutation.mutateAsync({
          fileName: file.name,
          base64,
          contentType: file.type,
        });
        // Use the optimised WebP URL if available, otherwise the raw upload URL
        const imageUrl = (result as any).optimized?.url || result.url;
        onChange(imageUrl);
        const origKB = (file.size / 1024).toFixed(0);
        toast.success(`Image optimised & uploaded (${origKB} KB → WebP)`);
      } catch (err: any) {
        toast.error(err.message || "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onChange, uploadMutation]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [handleFile]
  );

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        Product Image
      </label>
      {value ? (
        /* ── Preview with replace/remove ── */
        <div className="relative group rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
          <img
            src={value}
            alt="Product"
            className="w-full h-48 object-contain"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-white text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-100 flex items-center gap-1"
            >
              <Upload size={12} /> Replace
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-600 flex items-center gap-1"
            >
              <X size={12} /> Remove
            </button>
          </div>
          {value.endsWith(".webp") && (
            <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              WebP
            </span>
          )}
        </div>
      ) : (
        /* ── Drop zone ── */
        <div
          onDragOver={e => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
            ${dragOver ? "border-[#4B2D8E] bg-[#4B2D8E]/5" : "border-gray-200 hover:border-gray-300 bg-gray-50/50"}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={24} className="text-[#4B2D8E] animate-spin" />
              <p className="text-sm text-gray-500">Optimising image...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImageIcon size={28} className="text-gray-400" />
              <p className="text-sm text-gray-600">
                <span className="font-medium text-[#4B2D8E]">
                  Click to upload
                </span>{" "}
                or drag & drop
              </p>
              <p className="text-xs text-gray-400">
                PNG, JPG, WebP, HEIC &mdash; max 10 MB
              </p>
              <p className="text-xs text-gray-400">
                Auto-converted to optimised WebP (thumb + card + full)
              </p>
            </div>
          )}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileSelect}
        className="hidden"
      />
      {/* URL fallback toggle */}
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-xs text-gray-400 hover:text-[#4B2D8E] transition-colors"
        >
          {showUrlInput ? "Hide URL input" : "Or paste image URL"}
        </button>
      </div>
      {showUrlInput && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://..."
          className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
        />
      )}
    </div>
  );
}

export default function AdminProducts() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.products.list.useQuery(
    {
      page,
      limit: 20,
      search: search || undefined,
      category: category || undefined,
    },
    { refetchOnWindowFocus: true }
  );
  const createMutation = trpc.admin.products.create.useMutation({
    onSuccess: () => {
      utils.admin.products.list.invalidate();
      toast.success("Product created");
      setShowForm(false);
      resetForm();
    },
  });
  const updateMutation = trpc.admin.products.update.useMutation({
    onSuccess: () => {
      utils.admin.products.list.invalidate();
      toast.success("Product updated");
      setShowForm(false);
      setEditingProduct(null);
    },
  });
  const deleteMutation = trpc.admin.products.delete.useMutation({
    onSuccess: () => {
      utils.admin.products.list.invalidate();
      toast.success("Product deleted");
    },
  });
  const toggleFeaturedMut = trpc.admin.products.toggleFeatured.useMutation({
    onSuccess: data => {
      utils.admin.products.list.invalidate();
      toast.success(
        data.featured
          ? "Added to Homepage Featured (max 4 — oldest auto-removed if full)"
          : "Removed from Featured Products"
      );
    },
  });

  const [form, setForm] = useState({
    name: "",
    slug: "",
    category: "flower" as (typeof CATEGORIES)[number],
    strainType: "Hybrid" as (typeof STRAIN_TYPES)[number],
    price: "",
    weight: "",
    thc: "",
    description: "",
    shortDescription: "",
    image: "",
    stock: 0,
    featured: false,
    isNew: false,
    isActive: true,
    flavor: "",
  });

  const resetForm = () =>
    setForm({
      name: "",
      slug: "",
      category: "flower",
      strainType: "Hybrid",
      price: "",
      weight: "",
      thc: "",
      description: "",
      shortDescription: "",
      image: "",
      stock: 0,
      featured: false,
      isNew: false,
      isActive: true,
      flavor: "",
    });

  const openEdit = (product: any) => {
    setForm({
      name: product.name,
      slug: product.slug,
      category: product.category,
      strainType: product.strainType || "Hybrid",
      price: String(product.price),
      weight: product.weight || "",
      thc: product.thc || "",
      description: product.description || "",
      shortDescription: product.shortDescription || "",
      image: product.image || "",
      stock: product.stock,
      featured: product.featured,
      isNew: product.isNew,
      isActive: product.isActive,
      flavor: product.flavor || "",
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

  const autoSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Products</h1>
          <p className="text-sm text-gray-500">
            {data?.total ?? 0} total products
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingProduct(null);
            setShowForm(true);
          }}
          className="bg-[#4B2D8E] text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-[#3a2270] transition-colors"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20 focus:border-[#4B2D8E]"
          />
        </div>
        <select
          value={category}
          onChange={e => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20 bg-white"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                  Strain
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Price
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">
                  Stock
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                : data?.data.map((product: any) => (
                    <tr
                      key={product.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Package size={16} className="text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-800">
                              {product.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {product.weight}{" "}
                              {product.thc ? `· THC: ${product.thc}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-600">
                        {product.strainType}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        ${Number(product.price).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span
                          className={`font-mono ${product.stock < 10 ? "text-red-500 font-semibold" : "text-gray-600"}`}
                        >
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        <div className="flex items-center justify-center gap-1">
                          {product.isActive ? (
                            <Eye size={14} className="text-green-500" />
                          ) : (
                            <EyeOff size={14} className="text-gray-400" />
                          )}
                          <button
                            onClick={() =>
                              toggleFeaturedMut.mutate({ id: product.id })
                            }
                            title={
                              product.featured
                                ? "Remove from Homepage Featured"
                                : "Add to Homepage Featured"
                            }
                            className="p-0.5 rounded hover:bg-yellow-50 transition-colors"
                          >
                            <Star
                              size={14}
                              className={
                                product.featured
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "text-gray-300 hover:text-yellow-400"
                              }
                            />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(product)}
                            className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${product.name}"?`))
                                deleteMutation.mutate({ id: product.id });
                            }}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                            title="Delete"
                          >
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
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">
                {editingProduct ? "Edit Product" : "Add Product"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingProduct(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => {
                      setForm(f => ({
                        ...f,
                        name: e.target.value,
                        slug: autoSlug(e.target.value),
                      }));
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.slug}
                    onChange={e =>
                      setForm(f => ({ ...f, slug: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={e =>
                      setForm(f => ({ ...f, category: e.target.value as any }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Strain Type
                  </label>
                  <select
                    value={form.strainType}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        strainType: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
                  >
                    {STRAIN_TYPES.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Price *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.price}
                    onChange={e =>
                      setForm(f => ({ ...f, price: e.target.value }))
                    }
                    placeholder="35.00"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Weight
                  </label>
                  <input
                    type="text"
                    value={form.weight}
                    onChange={e =>
                      setForm(f => ({ ...f, weight: e.target.value }))
                    }
                    placeholder="3.5g"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    THC
                  </label>
                  <input
                    type="text"
                    value={form.thc}
                    onChange={e =>
                      setForm(f => ({ ...f, thc: e.target.value }))
                    }
                    placeholder="20-25%"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Stock *
                  </label>
                  <input
                    type="number"
                    required
                    value={form.stock}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        stock: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Flavor
                </label>
                <input
                  type="text"
                  value={form.flavor}
                  onChange={e =>
                    setForm(f => ({ ...f, flavor: e.target.value }))
                  }
                  placeholder="Grape & Earth"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                />
              </div>
              {/* ── Product Image Upload ────────────────────────────────────── */}
              <ProductImageUpload
                value={form.image}
                onChange={url => setForm(f => ({ ...f, image: url }))}
              />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  value={form.shortDescription}
                  onChange={e =>
                    setForm(f => ({ ...f, shortDescription: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Full Description
                </label>
                <textarea
                  value={form.description}
                  onChange={e =>
                    setForm(f => ({ ...f, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={e =>
                      setForm(f => ({ ...f, featured: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-[#4B2D8E]"
                  />
                  <span className="text-sm text-gray-700">Featured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isNew}
                    onChange={e =>
                      setForm(f => ({ ...f, isNew: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-[#4B2D8E]"
                  />
                  <span className="text-sm text-gray-700">New</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e =>
                      setForm(f => ({ ...f, isActive: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-[#4B2D8E]"
                  />
                  <span className="text-sm text-gray-700">
                    Active (visible in store)
                  </span>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingProduct(null);
                  }}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="bg-[#4B2D8E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3a2270] transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={14} /> {editingProduct ? "Update" : "Create"}{" "}
                  Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
