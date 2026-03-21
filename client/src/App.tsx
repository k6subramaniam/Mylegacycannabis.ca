import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout";
import { lazy, Suspense } from "react";

// Lazy load storefront pages
const Home = lazy(() => import("./pages/Home"));
const Shop = lazy(() => import("./pages/Shop"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Account = lazy(() => import("./pages/Account"));
const IDVerification = lazy(() => import("./pages/IDVerification"));
const MobileUpload = lazy(() => import("./pages/MobileUpload"));
const Rewards = lazy(() => import("./pages/Rewards"));
const Locations = lazy(() => import("./pages/Locations"));
const About = lazy(() => import("./pages/About"));
const ShippingPolicy = lazy(() => import("./pages/ShippingPolicy"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));

// Lazy load admin pages
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const AdminVerifications = lazy(() => import("./pages/admin/Verifications"));
const AdminShipping = lazy(() => import("./pages/admin/Shipping"));
const AdminEmailTemplates = lazy(() => import("./pages/admin/EmailTemplates"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const AdminCustomers = lazy(() => import("./pages/admin/Customers"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-10 h-10 border-4 border-[#4B2D8E] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Provide wouter route params directly to avoid nested-router path mismatch
function AdminRouter() {
  return (
    <AdminLayout>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/admin/orders/:id">{(params: any) => <AdminOrders routeId={params?.id} />}</Route>
          <Route path="/admin/orders" component={AdminOrders} />
          <Route path="/admin/products" component={AdminProducts} />
          <Route path="/admin/verifications" component={AdminVerifications} />
          <Route path="/admin/shipping" component={AdminShipping} />
          <Route path="/admin/emails" component={AdminEmailTemplates} />
          <Route path="/admin/reports" component={AdminReports} />
          <Route path="/admin/customers" component={AdminCustomers} />
          <Route path="/admin" component={AdminDashboard} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </AdminLayout>
  );
}

function StorefrontRouter() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/shop" component={Shop} />
          <Route path="/shop/:category" component={Shop} />
          <Route path="/product/:slug" component={ProductPage} />
          <Route path="/cart" component={Cart} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/account" component={Account} />
          <Route path="/account/login" component={Account} />
          <Route path="/account/register" component={Account} />
          <Route path="/account/rewards" component={Account} />
          <Route path="/account/orders" component={Account} />
          <Route path="/account/verify-id" component={IDVerification} />
          <Route path="/verify-id" component={IDVerification} />
          <Route path="/verify-mobile" component={MobileUpload} />
          <Route path="/rewards" component={Rewards} />
          <Route path="/locations" component={Locations} />
          <Route path="/about" component={About} />
          <Route path="/shipping" component={ShippingPolicy} />
          <Route path="/contact" component={Contact} />
          <Route path="/faq" component={FAQ} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/terms" component={Terms} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/admin/:rest*" component={AdminRouter} />
      <Route path="/admin" component={AdminRouter} />
      {/* Auth pages — no Layout wrapper (full-screen) */}
      <Route path="/login">{() => <Suspense fallback={<PageLoader />}><Login /></Suspense>}</Route>
      <Route path="/register">{() => <Suspense fallback={<PageLoader />}><Register /></Suspense>}</Route>
      <Route path="/complete-profile">{() => <Suspense fallback={<PageLoader />}><CompleteProfile /></Suspense>}</Route>
      <Route component={StorefrontRouter} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
