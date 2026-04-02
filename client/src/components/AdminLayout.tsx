import { useLocation, Link, Redirect } from "wouter";
import {
  LayoutDashboard, Package, ShoppingCart, ShieldCheck, Truck,
  Mail, BarChart3, Users, ChevronLeft, ChevronRight, LogOut,
  Menu, X, Settings, ShieldAlert, ImageUp, MessageSquare, DollarSign, MapPin,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const LOGO_URL = "/logo.png";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Package, label: "Products", path: "/admin/products" },
  { icon: ImageUp, label: "Menu Import", path: "/admin/menu-import" },
  { icon: ShoppingCart, label: "Orders", path: "/admin/orders" },
  { icon: ShieldCheck, label: "ID Verification", path: "/admin/verifications" },
  { icon: Truck, label: "Shipping", path: "/admin/shipping" },
  { icon: Mail, label: "Email Templates", path: "/admin/emails" },
  { icon: BarChart3, label: "Reports", path: "/admin/reports" },
  { icon: Users, label: "Customers", path: "/admin/customers" },
  { icon: MessageSquare, label: "Reviews", path: "/admin/reviews" },
  { icon: DollarSign, label: "Payments", path: "/admin/payments" },
  { icon: MapPin, label: "Locations", path: "/admin/locations" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Redirect unauthenticated users to login
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Block non-admin users
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md mx-4">
          <ShieldAlert size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-500 mb-6">You don't have admin privileges to access this area.</p>
          <Link href="/" className="inline-block px-6 py-2.5 bg-[#4B2D8E] text-white rounded-xl font-medium hover:bg-[#3d2574] transition-colors">
            Back to Store
          </Link>
        </div>
      </div>
    );
  }

  const isActive = (path: string) => {
    if (path === "/admin") return location === "/admin";
    return location.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${sidebarOpen ? "w-64" : "w-20"}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          {sidebarOpen && <img src={LOGO_URL} alt="My Legacy" className="h-9" />}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => (
            <Link key={item.path} href={item.path}
              className={`flex items-center gap-3 mx-3 my-1 px-3 py-2.5 rounded-xl transition-all ${
                isActive(item.path)
                  ? "bg-[#4B2D8E] text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }`}>
              <item.icon size={20} className="shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#4B2D8E] flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {(user?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email || 'My Legacy Cannabis'}</p>
              </div>
              <Link href="/" className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#4B2D8E] transition-colors" title="Back to Store">
                <LogOut size={16} />
              </Link>
            </div>
          ) : (
            <Link href="/" className="w-full flex justify-center p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#4B2D8E] transition-colors" title="Back to Store">
              <LogOut size={18} />
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Header + Menu */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg hover:bg-gray-100">
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <img src={LOGO_URL} alt="My Legacy" className="h-8" />
          </div>
          <span className="text-xs font-semibold text-[#4B2D8E] bg-[#4B2D8E]/10 px-3 py-1 rounded-full">ADMIN</span>
        </header>

        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-[57px] bg-white z-50 overflow-y-auto">
            <nav className="p-4">
              {menuItems.map((item) => (
                <Link key={item.path} href={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 ${
                    isActive(item.path) ? "bg-[#4B2D8E] text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}>
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
              <hr className="my-4" />
              <Link href="/" className="flex items-center gap-3 px-4 py-3 text-[#4B2D8E] hover:bg-gray-100 rounded-xl w-full">
                <LogOut size={20} />
                <span className="font-medium">Back to Store</span>
              </Link>
            </nav>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
