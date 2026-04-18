import posthog from "posthog-js";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { PostHogProvider } from "posthog-js/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { BehaviorProvider } from "./contexts/BehaviorContext";
import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout";
import PushOptIn from "./components/PushOptIn";
import { lazy, Suspense } from "react";
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));

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
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminMenuImport = lazy(() => import("./pages/admin/MenuImport"));
const AdminReviews = lazy(() => import("./pages/admin/Reviews"));
const AdminPayments = lazy(() => import("./pages/admin/Payments"));
const AdminLocations = lazy(() => import("./pages/admin/Locations"));
const AdminInsights = lazy(() => import("./pages/admin/Insights"));
const AdminSystemLogs = lazy(() => import("./pages/admin/SystemLogs"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-10 h-10 border-4 border-[#4B2D8E] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Helper: wrap a lazy page in Suspense
function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function Router() {
  return (
    <Switch>
      {/* ── Admin routes — flat list, most specific first ── */}
      <Route path="/admin/orders/:id">
        {(params: any) => (
          <AdminLayout>
            <S>
              <AdminOrders routeId={params?.id} />
            </S>
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/orders">
        <AdminLayout>
          <S>
            <AdminOrders />
          </S>
        </AdminLayout>
      </Route>
      <Route path="/admin/products">
        <AdminLayout>
          <S>
            <AdminProducts />
          </S>
        </AdminLayout>
      </Route>
      <Route path="/admin/menu-import">
        <AdminLayout>
          <S>
            <AdminMenuImport />
          </S>
        </AdminLayout>
      </Route>
      <Route path="/admin/verifications">
        <AdminLayout>
          <S>
            <AdminVerifications />
          </S>
        </AdminLayout>
      </Route>
      <Route path="/admin/shipping">
        <AdminLayout>
          <S>
            <AdminShipping />
          </S>
        </AdminLayout>
      </Route>
      <Route path="/admin/emails">
        <AdminLayout>
          <S>
            <AdminEmailTemplates />
          </S>
        </AdminLayout>
      </Route>
      <Route path="/admin/reports">
        <AdminLayout>
          <S>
            <AdminReports />
          </S>
        </AdminLayout>
      </Route>
      <Route path="/admin/customers">
        <AdminLayout>
          <S>
            <AdminCustomers />
          </S>
        </AdminLayout>
      </Route>
      <Route path="/admin/reviews">
        <AdminLayout>
          <S>
            <AdminReviews />
          </S>
        </AdminLayout>
      </Route>
      <Route path="/admin/payments">
        <AdminLayout>
          <S>
            <AdminPayments />
          </S>
        </AdminLayout>
      </Route>
      <Route path="/admin/locations">
        <AdminLayout>
          <S>
            <AdminLocations />
          </S>
        </AdminLayout>
      </Route>
      <Route path="/admin/settings">
        <AdminLayout>
          <S>
            <AdminSettings />
          </S>
        </AdminLayout>
      </Route>
      <Route path="/admin/system-logs">
        <AdminLayout>
          <S>
            <AdminSystemLogs />
          </S>
        </AdminLayout>
      </Route>
      <Route path="/admin/a7x">
        <AdminLayout>
          <S>
            <AdminInsights />
          </S>
        </AdminLayout>
      </Route>
      <Route path="/admin">
        <AdminLayout>
          <S>
            <AdminDashboard />
          </S>
        </AdminLayout>
      </Route>

      {/* ── Auth pages — no Layout wrapper ── */}
      <Route path="/login">
        <S>
          <Login />
        </S>
      </Route>
      <Route path="/register">
        <S>
          <Register />
        </S>
      </Route>
      <Route path="/complete-profile">
        <S>
          <CompleteProfile />
        </S>
      </Route>

      {/* ── Storefront routes ── */}
      <Route path="/">
        <Layout>
          <S>
            <Home />
          </S>
        </Layout>
      </Route>
      <Route path="/shop">
        <Layout>
          <S>
            <Shop />
          </S>
        </Layout>
      </Route>
      <Route path="/shop/:category">
        <Layout>
          <S>
            <Shop />
          </S>
        </Layout>
      </Route>
      <Route path="/product/:slug">
        <Layout>
          <S>
            <ProductPage />
          </S>
        </Layout>
      </Route>
      <Route path="/cart">
        <Layout>
          <S>
            <Cart />
          </S>
        </Layout>
      </Route>
      <Route path="/checkout">
        <Layout>
          <S>
            <Checkout />
          </S>
        </Layout>
      </Route>
      <Route path="/account/verify-id">
        <Layout>
          <S>
            <IDVerification />
          </S>
        </Layout>
      </Route>
      <Route path="/account/login">
        <Layout>
          <S>
            <Account />
          </S>
        </Layout>
      </Route>
      <Route path="/account/register">
        <Layout>
          <S>
            <Account />
          </S>
        </Layout>
      </Route>
      <Route path="/account/rewards">
        <Layout>
          <S>
            <Account />
          </S>
        </Layout>
      </Route>
      <Route path="/account/orders">
        <Layout>
          <S>
            <Account />
          </S>
        </Layout>
      </Route>
      <Route path="/account">
        <Layout>
          <S>
            <Account />
          </S>
        </Layout>
      </Route>
      <Route path="/verify-id">
        <Layout>
          <S>
            <IDVerification />
          </S>
        </Layout>
      </Route>
      <Route path="/verify-mobile">
        <Layout>
          <S>
            <MobileUpload />
          </S>
        </Layout>
      </Route>
      <Route path="/rewards">
        <Layout>
          <S>
            <Rewards />
          </S>
        </Layout>
      </Route>
      <Route path="/locations">
        <Layout>
          <S>
            <Locations />
          </S>
        </Layout>
      </Route>
      <Route path="/about">
        <Layout>
          <S>
            <About />
          </S>
        </Layout>
      </Route>
      <Route path="/shipping">
        <Layout>
          <S>
            <ShippingPolicy />
          </S>
        </Layout>
      </Route>
      <Route path="/contact">
        <Layout>
          <S>
            <Contact />
          </S>
        </Layout>
      </Route>
      <Route path="/faq">
        <Layout>
          <S>
            <FAQ />
          </S>
        </Layout>
      </Route>
      <Route path="/privacy-policy">
        <Layout>
          <S>
            <PrivacyPolicy />
          </S>
        </Layout>
      </Route>
      <Route path="/unsubscribe">
        <Layout>
          <S>
            <Unsubscribe />
          </S>
        </Layout>
      </Route>
      <Route path="/terms">
        <Layout>
          <S>
            <Terms />
          </S>
        </Layout>
      </Route>
      <Route path="/404">
        <Layout>
          <S>
            <NotFound />
          </S>
        </Layout>
      </Route>

      {/* Catch-all */}
      <Route>
        <Layout>
          <S>
            <NotFound />
          </S>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  useEffect(() => {
    posthog.capture("$pageview");
  }, [location]);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <AuthProvider>
            <CartProvider>
              <BehaviorProvider>
                <TooltipProvider>
                  <Toaster />
                  <Router />
                  <PushOptIn />
                </TooltipProvider>
              </BehaviorProvider>
            </CartProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
