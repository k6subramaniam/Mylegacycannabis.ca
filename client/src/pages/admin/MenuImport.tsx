import { trpc } from "@/lib/trpc";
import { useState, useRef, useCallback } from "react";
import {
  Upload, ImageIcon, Loader2, CheckCircle2, XCircle, Package,
  Eye, Trash2, AlertTriangle, ArrowRight, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface ParsedItem {
  category: string;
  grade: string;
  strain: string;
  thc: string;
  isNew: boolean;
  prices: {
    "1g"?: string | null;
    "3.5g"?: string | null;
    "7g"?: string | null;
    "14g"?: string | null;
    "28g"?: string | null;
  };
  stock: number;
  include: boolean;
}

type Step = "upload" | "review" | "importing" | "done";

export default function MenuImport() {
  const [step, setStep] = useState<Step>("upload");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [defaultStock, setDefaultStock] = useState(10);
  const [deactivateOld, setDeactivateOld] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; deactivated: number; skipped: number } | null>(null);
  const [parseError, setParseError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseMutation = trpc.admin.menuImport.parse.useMutation();
  const applyMutation = trpc.admin.menuImport.confirm.useMutation();

  // ─── File handling ───

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, etc.)");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image must be under 20MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    // Convert to base64 for API
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    setParseError("");
    toast.loading("Analyzing menu image with AI...", { id: "parse" });

    try {
      const res = await parseMutation.mutateAsync({
        imageBase64: base64,
        mimeType: file.type,
      });

      if (res.success && res.items.length > 0) {
        setItems(
          res.items.map((item: any) => ({
            ...item,
            stock: defaultStock,
            include: true,
          }))
        );
        setStep("review");
        toast.success(`Found ${res.count} products!`, { id: "parse" });
      } else {
        setParseError(res.error || "No products found. Please try a clearer image.");
        toast.error(res.error || "No products found", { id: "parse" });
      }
    } catch (err: any) {
      setParseError(err.message || "Failed to parse image");
      toast.error("Failed to analyze image", { id: "parse" });
    }
  }, [defaultStock, parseMutation]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // ─── Item editing ───

  const toggleItem = (idx: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, include: !item.include } : item));
  };

  const updateStock = (idx: number, stock: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, stock } : item));
  };

  const applyDefaultStock = () => {
    setItems(prev => prev.map(item => ({ ...item, stock: defaultStock })));
    toast.success(`Set all stocks to ${defaultStock}`);
  };

  // ─── Import ───

  const handleImport = async () => {
    const included = items.filter(i => i.include);
    if (included.length === 0) {
      toast.error("No products selected for import");
      return;
    }

    setStep("importing");
    toast.loading(`Importing ${included.length} products...`, { id: "import" });

    try {
      const res = await applyMutation.mutateAsync({
        items: items.map(i => ({
          ...i,
          prices: {
            "1g": i.prices["1g"] ?? null,
            "3.5g": i.prices["3.5g"] ?? null,
            "7g": i.prices["7g"] ?? null,
            "14g": i.prices["14g"] ?? null,
            "28g": i.prices["28g"] ?? null,
          },
        })),
        deactivateOldFlower: deactivateOld,
        defaultStock,
      });

      if (res.success) {
        setResult(res);
        setStep("done");
        toast.success(
          `Import complete! ${res.created} created, ${res.updated} updated${res.deactivated ? `, ${res.deactivated} deactivated` : ""}`,
          { id: "import" }
        );
      } else {
        setStep("review");
        toast.error("Import failed. Please try again.", { id: "import" });
      }
    } catch (err: any) {
      setStep("review");
      toast.error(err.message || "Import failed", { id: "import" });
    }
  };

  // ─── Stats ───
  const includedCount = items.filter(i => i.include).length;
  const categories = Array.from(new Set(items.map(i => i.category)));
  const priceTierCount = items
    .filter(i => i.include)
    .reduce((sum, item) => sum + Object.values(item.prices).filter(p => p).length, 0);

  // ─── Render ───

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Menu Import</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a photo of your cannabis menu to automatically update your product list for Nationwide Shipping
        </p>
      </div>

      {/* ─── Step 1: Upload ─── */}
      {step === "upload" && (
        <div className="space-y-4">
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors
              ${parseMutation.isPending
                ? "border-[#4B2D8E]/40 bg-[#4B2D8E]/5"
                : "border-gray-300 hover:border-[#4B2D8E] hover:bg-[#4B2D8E]/5"
              }`}
          >
            {parseMutation.isPending ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 mx-auto text-[#4B2D8E] animate-spin" />
                <p className="text-lg font-medium text-[#4B2D8E]">Analyzing your menu...</p>
                <p className="text-sm text-gray-500">
                  AI is reading every strain, grade, THC level, and price from your menu photo.
                  This typically takes 10-20 seconds.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {imagePreview ? (
                  <img src={imagePreview} alt="Menu preview" className="max-h-48 mx-auto rounded-lg shadow-sm" />
                ) : (
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#4B2D8E]/10 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-[#4B2D8E]" />
                  </div>
                )}
                <div>
                  <p className="text-lg font-medium text-gray-800">
                    {imagePreview ? "Upload a different menu" : "Drop your menu image here"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    or click to select a file (PNG, JPG, HEIC — up to 20MB)
                  </p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileSelect}
              disabled={parseMutation.isPending}
            />
          </div>

          {parseError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Failed to parse menu</p>
                <p className="text-sm text-red-600 mt-1">{parseError}</p>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">How it works</h3>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Upload a photo of your cannabis menu (like the one from your supplier)</li>
              <li>AI extracts every strain, grade, THC %, and all price tiers (1g to 28g)</li>
              <li>Review the extracted data, set stock quantities for each item</li>
              <li>Click "Import" to update your Nationwide Shipping product list</li>
            </ol>
          </div>
        </div>
      )}

      {/* ─── Step 2: Review ─── */}
      {step === "review" && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="bg-[#4B2D8E]/10 text-[#4B2D8E] px-3 py-1.5 rounded-lg text-sm font-semibold">
              {includedCount} / {items.length} products selected
            </span>
            <span className="bg-green-100 text-green-800 px-3 py-1.5 rounded-lg text-sm font-semibold">
              {priceTierCount} total product variants (weight tiers)
            </span>
            {categories.map(cat => (
              <span key={cat} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                {cat}
              </span>
            ))}
          </div>

          {/* Stock + options bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Default Stock:</label>
              <input
                type="number" min={0} max={9999} value={defaultStock}
                onChange={(e) => setDefaultStock(parseInt(e.target.value) || 0)}
                className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center"
              />
              <button onClick={applyDefaultStock}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                Apply to All
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={deactivateOld} onChange={(e) => setDeactivateOld(e.target.checked)}
                className="rounded border-gray-300 text-[#4B2D8E] focus:ring-[#4B2D8E]" />
              <span className="text-gray-700">Deactivate old flower products not in this import</span>
            </label>
          </div>

          {/* Product table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-3 text-left font-semibold text-gray-600 w-8"></th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600">Category</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600">Grade</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600">Strain</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600">THC</th>
                    <th className="px-3 py-3 text-center font-semibold text-gray-600">1g</th>
                    <th className="px-3 py-3 text-center font-semibold text-gray-600">3.5g</th>
                    <th className="px-3 py-3 text-center font-semibold text-gray-600">7g</th>
                    <th className="px-3 py-3 text-center font-semibold text-gray-600">14g</th>
                    <th className="px-3 py-3 text-center font-semibold text-gray-600">28g</th>
                    <th className="px-3 py-3 text-center font-semibold text-gray-600">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-gray-100 transition-colors ${
                        !item.include ? "opacity-40 bg-gray-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <input type="checkbox" checked={item.include} onChange={() => toggleItem(idx)}
                          className="rounded border-gray-300 text-[#4B2D8E] focus:ring-[#4B2D8E]" />
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          item.category.includes("Indica") ? "bg-purple-100 text-purple-700" :
                          item.category.includes("Sativa") ? "bg-yellow-100 text-yellow-700" :
                          item.category.includes("Hybrid") ? "bg-green-100 text-green-700" :
                          item.category.includes("Ounce") ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {item.category.replace(" Flower", "")}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-bold ${
                          item.grade === "AAAA" ? "text-amber-600" :
                          item.grade.startsWith("AAA") ? "text-green-600" :
                          "text-gray-600"
                        }`}>
                          {item.grade}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-gray-800">
                        {item.strain}
                        {item.isNew && (
                          <span className="ml-2 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                            NEW
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">{item.thc}</td>
                      {(["1g", "3.5g", "7g", "14g", "28g"] as const).map(w => (
                        <td key={w} className="px-3 py-2.5 text-center">
                          {item.prices[w] ? (
                            <span className="font-medium text-gray-800">{item.prices[w]}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="number" min={0} max={9999} value={item.stock}
                          onChange={(e) => updateStock(idx, parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 rounded border border-gray-200 text-sm text-center"
                          disabled={!item.include}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <button onClick={() => { setStep("upload"); setItems([]); setImagePreview(""); }}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2">
              <RefreshCw size={16} /> Start Over
            </button>
            <button
              onClick={handleImport}
              disabled={includedCount === 0}
              className="bg-[#4B2D8E] text-white px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-[#3a2270] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Package size={16} />
              Import {includedCount} Products ({priceTierCount} variants)
              <ArrowRight size={16} />
            </button>
          </div>

          {deactivateOld && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Deactivation Warning</p>
                <p className="text-sm text-amber-700 mt-1">
                  Existing flower products NOT in this import will be deactivated (hidden from the store).
                  They won't be deleted and can be reactivated manually from Admin &rarr; Products.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Step 3: Importing ─── */}
      {step === "importing" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center space-y-4">
          <Loader2 className="w-12 h-12 mx-auto text-[#4B2D8E] animate-spin" />
          <p className="text-lg font-medium text-gray-800">Importing products...</p>
          <p className="text-sm text-gray-500">
            Creating product entries for each weight tier. This may take a moment.
          </p>
        </div>
      )}

      {/* ─── Step 4: Done ─── */}
      {step === "done" && result && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
            <h2 className="text-xl font-bold text-green-800">Import Complete!</h2>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="bg-white rounded-xl px-4 py-2 shadow-sm">
                <span className="text-2xl font-bold text-green-600">{result.created}</span>
                <p className="text-gray-500">Created</p>
              </div>
              <div className="bg-white rounded-xl px-4 py-2 shadow-sm">
                <span className="text-2xl font-bold text-blue-600">{result.updated}</span>
                <p className="text-gray-500">Updated</p>
              </div>
              {result.deactivated > 0 && (
                <div className="bg-white rounded-xl px-4 py-2 shadow-sm">
                  <span className="text-2xl font-bold text-amber-600">{result.deactivated}</span>
                  <p className="text-gray-500">Deactivated</p>
                </div>
              )}
              {result.skipped > 0 && (
                <div className="bg-white rounded-xl px-4 py-2 shadow-sm">
                  <span className="text-2xl font-bold text-gray-400">{result.skipped}</span>
                  <p className="text-gray-500">Skipped</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/admin/products"
              className="bg-[#4B2D8E] text-white px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-[#3a2270] transition-colors justify-center">
              <Eye size={16} /> View Products
            </a>
            <button onClick={() => { setStep("upload"); setItems([]); setImagePreview(""); setResult(null); }}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2 justify-center">
              <Upload size={16} /> Import Another Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
