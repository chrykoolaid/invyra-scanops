import React from "react";
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Home from './pages/Home';
import Scan from './pages/Scan';
import ProductLookup from './pages/ProductLookup';
import StockCount from './pages/StockCount';
import Receiving from './pages/Receiving';
import Replenish from './pages/Replenish';
import PriceCheck from './pages/PriceCheck';
import GapScan from './pages/GapScan';
import Markdowns from './pages/Markdowns';
import Waste from './pages/Waste';
import ExpiryCheck from './pages/ExpiryCheck';
import Tasks from './pages/Tasks';
import SyncHandoff from './pages/SyncHandoff';
import SyncQueue from './pages/SyncQueue';
import ShelfTickets from './pages/ShelfTickets';
import Transfers from './pages/Transfers';
import ProductIdentityReview from './pages/ProductIdentityReview';
import ScanOpsReporting from './pages/ScanOpsReporting';
import DeviceGovernance from './pages/DeviceGovernance';
import SessionCollaboration from './pages/SessionCollaboration';
import DesktopSyncContract from './pages/DesktopSyncContract';
import StoreOpsDashboard from './pages/StoreOpsDashboard';
import PilotReadiness from './pages/PilotReadiness';
import PrinterSettings from './pages/PrinterSettings';
import UserManagement from './pages/UserManagement';
import RoleGate from './components/scanner/RoleGate';
import AppEscapeHeader from './components/scanner/AppEscapeHeader';
import OfflineBanner from './components/scanner/OfflineBanner';


const ScrollToTopOnRouteChange = () => {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const root = document.getElementById('root');
    if (root) root.scrollTop = 0;

    requestAnimationFrame(() => {
      document.querySelectorAll('main, [data-scanops-scroll]').forEach((node) => {
        node.scrollTop = 0;
      });
    });
  }, [pathname]);

  return null;
};


const getAppEscapeMeta = (pathname) => {
  if (!pathname || pathname === "/") return null;

  const exactRoutes = {
    "/scan": { title: "Product Lookup", subtitle: "Scan or search item details" },
    "/stock-count": { title: "Stock Count", subtitle: "Count stock and review variances" },
    "/receiving": { title: "Receiving", subtitle: "Receive stock and confirm delivery evidence" },
    "/replenish": { title: "Replenish", subtitle: "Move stock from backroom to shelf" },
    "/price-check": { title: "Price Check", subtitle: "Check price and promotion labels" },
    "/gap-scan": { title: "Gap Scan", subtitle: "Record shelf gaps and follow-up actions" },
    "/tasks": { title: "Tasks", subtitle: "Review assigned store work" },
    "/markdowns": { title: "Markdowns", subtitle: "Review markdown work safely" },
    "/waste": { title: "Waste", subtitle: "Capture waste and review shrink evidence" },
    "/expiry-check": { title: "Expiry Check", subtitle: "Review freshness and expiry" },
    "/inventory-sync": { title: "Inventory Sync", subtitle: "Review sync state and issues" },
    "/sync-queue": { title: "Sync Queue", subtitle: "Review pending sync work" },
    "/shelf-tickets": { title: "Shelf Tickets", subtitle: "Prepare shelf ticket work" },
    "/transfers": { title: "Transfers", subtitle: "Move stock between locations" },
    "/product-identity-review": { title: "Product Review", subtitle: "Resolve scanned item identity" },
    "/scanops-reporting": { title: "ScanOps Reporting", subtitle: "Review scanner operations" },
    "/device-governance": { title: "Device & Shift Governance", subtitle: "Review device readiness" },
    "/session-collaboration": { title: "Session Collaboration", subtitle: "Review multi-user work" },
    "/sync-handoff": { title: "Sync & Handoff", subtitle: "Queue, setup, and contract review" },
    "/desktop-sync-contract": { title: "Desktop Sync Contract", subtitle: "Review integration contracts" },
    "/store-ops-dashboard": { title: "Store Ops Dashboard", subtitle: "Review store exceptions" },
    "/pilot-readiness": { title: "Pilot Readiness", subtitle: "Review UAT and release evidence" },
  };

  if (exactRoutes[pathname]) return exactRoutes[pathname];
  if (pathname.startsWith("/product/")) return { title: "Product Lookup", subtitle: "Item details" };

  return { title: "ScanOps", subtitle: "ScanOps workflow" };
};

const roleGated = (element, requiredRole, title) => (
  <RoleGate requiredRole={requiredRole} title={title}>
    {element}
  </RoleGate>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();
  const appEscapeMeta = getAppEscapeMeta(location.pathname);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <div className="scanops-root-shell" data-scanops-app-escape-active={appEscapeMeta ? "true" : "false"}>
      <ScrollToTopOnRouteChange />
      <OfflineBanner />
      <div className="scanops-route-host">
        {appEscapeMeta && <AppEscapeHeader {...appEscapeMeta} />}
        <div className="scanops-route-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/product/:id" element={<ProductLookup />} />
            <Route path="/stock-count" element={<StockCount />} />
            <Route path="/receiving" element={<Receiving />} />
            <Route path="/replenish" element={<Replenish />} />
            <Route path="/price-check" element={<PriceCheck />} />
            <Route path="/gap-scan" element={<GapScan />} />
            <Route path="/markdowns" element={<Markdowns />} />
            <Route path="/waste" element={<Waste />} />
            <Route path="/expiry-check" element={<ExpiryCheck />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/sync-handoff" element={<SyncHandoff />} />
            <Route path="/inventory-sync" element={<SyncHandoff />} />
            <Route path="/sync-queue" element={<SyncQueue />} />
            <Route path="/shelf-tickets" element={<ShelfTickets />} />
            <Route path="/transfers" element={<Transfers />} />
            <Route path="/product-identity-review" element={roleGated(<ProductIdentityReview />, "Supervisor", "Product Review")} />
            <Route path="/scanops-reporting" element={roleGated(<ScanOpsReporting />, "Supervisor", "ScanOps Reporting")} />
            <Route path="/device-governance" element={roleGated(<DeviceGovernance />, "Manager", "Device & Shift Governance")} />
            <Route path="/session-collaboration" element={<SessionCollaboration />} />
            <Route path="/desktop-sync-contract" element={roleGated(<DesktopSyncContract />, "Manager", "Desktop Sync Contract")} />
            <Route path="/store-ops-dashboard" element={roleGated(<StoreOpsDashboard />, "Manager", "Store Ops Dashboard")} />
            <Route path="/pilot-readiness" element={<PilotReadiness />} />
            <Route path="/printer-settings" element={roleGated(<PrinterSettings />, "Manager", "Printer Settings")} />
            <Route path="/user-management" element={roleGated(<UserManagement />, "Manager", "User Management")} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App