import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { MapPin, Edit2, Save, X, Plus, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
import { toast } from "sonner";

type LocationForm = {
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  hours: string;
  mapUrl: string;
  directionsUrl: string;
  lat: string;
  lng: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm: LocationForm = {
  name: "", address: "", city: "", province: "ON", postalCode: "",
  phone: "", hours: "Open 24/7", mapUrl: "", directionsUrl: "",
  lat: "", lng: "", sortOrder: 0, isActive: true,
};

export default function AdminLocations() {
  const utils = trpc.useUtils();
  const { data: locations, isLoading } = trpc.admin.locations.list.useQuery(undefined, { refetchOnWindowFocus: true });

  const createMutation = trpc.admin.locations.create.useMutation({
    onSuccess: () => { utils.admin.locations.list.invalidate(); toast.success("Location created"); setShowNew(false); setNewForm({ ...emptyForm }); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.admin.locations.update.useMutation({
    onSuccess: () => { utils.admin.locations.list.invalidate(); toast.success("Location updated"); setEditingId(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.admin.locations.delete.useMutation({
    onSuccess: () => { utils.admin.locations.list.invalidate(); toast.success("Location deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<LocationForm>({ ...emptyForm });
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState<LocationForm>({ ...emptyForm });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const startEdit = (loc: any) => {
    setEditingId(loc.id);
    setEditForm({
      name: loc.name, address: loc.address, city: loc.city,
      province: loc.province, postalCode: loc.postalCode, phone: loc.phone,
      hours: loc.hours || "Open 24/7", mapUrl: loc.mapUrl || "",
      directionsUrl: loc.directionsUrl || "", lat: loc.lat || "",
      lng: loc.lng || "", sortOrder: loc.sortOrder || 0, isActive: loc.isActive,
    });
  };

  const handleSaveEdit = () => {
    if (!editForm.name || !editForm.address || !editForm.city || !editForm.phone) {
      toast.error("Name, address, city, and phone are required"); return;
    }
    updateMutation.mutate({ id: editingId!, ...editForm });
  };

  const handleCreate = () => {
    if (!newForm.name || !newForm.address || !newForm.city || !newForm.phone) {
      toast.error("Name, address, city, and phone are required"); return;
    }
    createMutation.mutate(newForm);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
    setDeleteConfirm(null);
  };

  const toggleActive = (loc: any) => {
    updateMutation.mutate({ id: loc.id, isActive: !loc.isActive });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Store Locations</h1>
          <p className="text-sm text-gray-500">Manage your physical store locations shown on the website</p>
        </div>
        <button
          onClick={() => { setShowNew(true); setNewForm({ ...emptyForm, sortOrder: (locations?.length || 0) }); }}
          className="flex items-center gap-2 bg-[#4B2D8E] hover:bg-[#3a2270] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Location
        </button>
      </div>

      {/* Create new location form */}
      {showNew && (
        <div className="bg-white border-2 border-[#4B2D8E] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#4B2D8E] flex items-center gap-2"><Plus size={18} /> New Location</h2>
            <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <LocationFormFields form={newForm} setForm={setNewForm} />
          <div className="flex gap-2 pt-2">
            <button onClick={handleCreate} disabled={createMutation.isPending} className="flex items-center gap-2 bg-[#4B2D8E] hover:bg-[#3a2270] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              <Save size={14} /> {createMutation.isPending ? "Creating..." : "Create Location"}
            </button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}

      {/* Locations list */}
      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : !locations?.length ? (
        <div className="text-center py-16 text-gray-400">
          <MapPin size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No locations yet</p>
          <p className="text-sm">Add your first store location above</p>
        </div>
      ) : (
        <div className="space-y-4">
          {locations.map((loc: any) => (
            <div key={loc.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${!loc.isActive ? 'opacity-60' : ''}`}>
              {editingId === loc.id ? (
                /* Edit mode */
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[#4B2D8E] flex items-center gap-2"><Edit2 size={16} /> Editing: {loc.name}</h3>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                  </div>
                  <LocationFormFields form={editForm} setForm={setEditForm} />
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleSaveEdit} disabled={updateMutation.isPending} className="flex items-center gap-2 bg-[#4B2D8E] hover:bg-[#3a2270] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                      <Save size={14} /> {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-[#4B2D8E]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin size={18} className="text-[#4B2D8E]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-800">{loc.name}</h3>
                          {!loc.isActive && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">HIDDEN</span>}
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">#{loc.sortOrder}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">{loc.address}, {loc.city}, {loc.province} {loc.postalCode}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
                          <span>Phone: {loc.phone}</span>
                          <span>Hours: {loc.hours}</span>
                          {loc.lat && <span>GPS: {loc.lat}, {loc.lng}</span>}
                        </div>
                        {loc.mapUrl && (
                          <p className="text-xs text-blue-500 mt-1 truncate max-w-md" title={loc.mapUrl}>Map: {loc.mapUrl.substring(0, 60)}...</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleActive(loc)}
                        className={`p-2 rounded-lg transition-colors ${loc.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                        title={loc.isActive ? 'Hide location' : 'Show location'}
                      >
                        {loc.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button
                        onClick={() => startEdit(loc)}
                        className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit location"
                      >
                        <Edit2 size={16} />
                      </button>
                      {deleteConfirm === loc.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(loc.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded">Delete</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 px-2 py-1">Cancel</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(loc.id)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Delete location"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-medium mb-1">How locations work</p>
        <ul className="list-disc ml-4 space-y-0.5 text-blue-600">
          <li>Active locations appear on the public Locations page and homepage</li>
          <li>Use <strong>Sort Order</strong> to control display order (lower numbers appear first)</li>
          <li>The <strong>Map Embed URL</strong> should be a Google Maps embed link (iframe src)</li>
          <li>The <strong>Directions URL</strong> is the Google Maps link for "Get Directions"</li>
          <li>Toggle visibility with the eye icon without deleting the location</li>
        </ul>
      </div>
    </div>
  );
}

/* Reusable form fields for both Create and Edit */
function LocationFormFields({ form, setForm }: { form: LocationForm; setForm: (f: LocationForm) => void }) {
  const update = (field: keyof LocationForm, value: any) => setForm({ ...form, [field]: value });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Location Name *</label>
        <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Mississauga" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4B2D8E]/30 focus:border-[#4B2D8E] outline-none" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Phone *</label>
        <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="(437) 215-4722" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4B2D8E]/30 focus:border-[#4B2D8E] outline-none" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">Street Address *</label>
        <input value={form.address} onChange={e => update('address', e.target.value)} placeholder="255 Dundas St W" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4B2D8E]/30 focus:border-[#4B2D8E] outline-none" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">City *</label>
        <input value={form.city} onChange={e => update('city', e.target.value)} placeholder="Mississauga" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4B2D8E]/30 focus:border-[#4B2D8E] outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Province *</label>
          <select value={form.province} onChange={e => update('province', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4B2D8E]/30 focus:border-[#4B2D8E] outline-none">
            {['ON','QC','BC','AB','SK','MB','NS','NB','PE','NL','YT','NT','NU'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Postal Code</label>
          <input value={form.postalCode} onChange={e => update('postalCode', e.target.value)} placeholder="L5B 1H4" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4B2D8E]/30 focus:border-[#4B2D8E] outline-none" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Hours</label>
        <input value={form.hours} onChange={e => update('hours', e.target.value)} placeholder="Open 24/7" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4B2D8E]/30 focus:border-[#4B2D8E] outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sort Order</label>
          <input type="number" value={form.sortOrder} onChange={e => update('sortOrder', parseInt(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4B2D8E]/30 focus:border-[#4B2D8E] outline-none" />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => update('isActive', e.target.checked)} className="w-4 h-4 rounded text-[#4B2D8E]" />
            <span className="text-sm text-gray-700">Active (visible on site)</span>
          </label>
        </div>
      </div>
      <div className="md:col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">Google Maps Embed URL</label>
        <input value={form.mapUrl} onChange={e => update('mapUrl', e.target.value)} placeholder="https://www.google.com/maps/embed?pb=..." className="w-full border rounded-lg px-3 py-2 text-sm text-gray-500 focus:ring-2 focus:ring-[#4B2D8E]/30 focus:border-[#4B2D8E] outline-none" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">Directions URL</label>
        <input value={form.directionsUrl} onChange={e => update('directionsUrl', e.target.value)} placeholder="https://www.google.com/maps/dir/?api=1&destination=..." className="w-full border rounded-lg px-3 py-2 text-sm text-gray-500 focus:ring-2 focus:ring-[#4B2D8E]/30 focus:border-[#4B2D8E] outline-none" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
        <input value={form.lat} onChange={e => update('lat', e.target.value)} placeholder="43.59" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4B2D8E]/30 focus:border-[#4B2D8E] outline-none" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
        <input value={form.lng} onChange={e => update('lng', e.target.value)} placeholder="-79.6" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4B2D8E]/30 focus:border-[#4B2D8E] outline-none" />
      </div>
    </div>
  );
}
