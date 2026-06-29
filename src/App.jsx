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
import Movements from './pages/MovementsOperator';
import StockCount from './pages/StockCountOperator';
import Receiving from './pages/Receiving';
import Replenish from './pages/Replenish';
import PriceCheck from './pages/PriceCheck';
import GapScan from './pages/GapScan';
import Markdowns from './pages/MarkdownsOperator';
import Waste from './pages/WasteOperator';
import ExpiryCheck from './pages/ExpiryCheckOperator';
import Tasks from './pages/Tasks';
import More from './pages/More';
import SyncHandoff from './pages/SyncHandoff';
import SyncQueue from './pages/SyncQueue';
import ShelfTickets from './pages/ShelfTickets';
import Transfers from './pages/TransfersOperator';
import ProductIdentityReview from './pages/ProductIdentityReview';
import ScanOpsReporting from './pages/ScanOpsReportingOperator';
import DeviceGovernance from './pages/DeviceGovernance';
import SessionCollaboration from './pages/SessionCollaboration';
import DesktopSyncContract from './pages/DesktopSyncContract';
import StoreOpsDashboard from './pages/StoreOpsDashboard';
import PilotReadiness from './pages/PilotReadiness';
import PrinterSettings from './pages/PrinterSettings';
import UserManagement from './pages/UserManagement';
import ScannerSettings from './pages/ScannerSettings';
import RoleGate from './components/scanner/RoleGate';
import AppEscapeHeader from './components/scanner/AppEscapeHeader';
import OfflineBanner from './components/scanner/OfflineBanner';
import BottomNavigation from './components/scanner/BottomNavigation';


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
    "/scan": { title: "Lookup Item", subtitle: "Scan or search item details" },
    "/movements": { title: "Movements", subtitle: "Read-only stock activity timeline" },
    "/stock-count": { title: "Count Stock", subtitle: "Scan item, enter count, save, repeat" },
    "/receiving": { title: "Receive Stock", subtitle: "Scan delivery and PO evidence" },
    "/replenish": { title: "Replenish Stock", subtitle: "Move stock from backroom to shelf" },
    "/price-check": { title: "Price Check", subtitle: "Check price and promotion labels" },
    "/gap-scan": { title: "Report Shelf Issue", subtitle: "Evidence-only shelf observations" },
    "/tasks": { title: "Tasks", subtitle: "Review assigned store work" },
    "/alerts": { title: "Alerts", subtitle: "Review urgent operational issues" },
    "/more": { title: "Tools & Support", subtitle: "Secondary ScanOps tools" },
    "/markdowns": { title: "Markdown", subtitle: "Scan item, choose markdown, request label" },
    "/waste": { title: "Waste", subtitle: "Scan item, classify loss, queue evidence" },
    "/expiry-check": { title: "Expiry Check", subtitle: "Scan item, confirm date, save freshness evidence" },
    "/inventory-sync": { title: "Sync Status", subtitle: "Queue, status, setup, and review" },
    "/sync-queue": { title: "Sync Status", subtitle: "Device queue and errors" },
    "/shelf-tickets": { title: "Shelf Tickets", subtitle: "Prepare shelf ticket work" },
    "/transfers": { title: "Transfers", subtitle: "Set route, scan item, move quantity, save" },
    "/product-identity-review": { title: "Product Review", subtitle: "Resolve scanned item identity" },
    "/scanops-reporting": { title: "Reporting", subtitle: "Read-only ScanOps activity" },
    "/device-governance": { title: "Device & Shift Governance", subtitle: "Review device readiness" },
    "/session-collaboration": { title: "Session Collaboration", subtitle: "Review multi-user work" },
    "/sync-handoff": { title: "Sync & Handoff", subtitle: "Queue, status, setup, and review" },
    "/desktop-sync-contract": { title: "Desktop Sync Contract", subtitle: "Review integration contracts" },
    "/store-ops-dashboard": { title: "Store Ops Dashboard", subtitle: "Review store exceptions" },
    "/pilot-readiness": { title: "Pilot Readiness", subtitle: "Review UAT and release evidence" },
    "/scanner-settings": { title: "Settings", subtitle: "Device configuration and session controls" },
  };

  if (exactRoutes[pathname]) return exactRoutes[pathname];
  if (pathname.startsWith("/scanner-settings/")) return { title: "Settings", subtitle: "Device configuration workspace" };
  if (pathname.startsWith("/product/")) return { title: "Lookup Item", subtitle: "Item details" };

  return { title: "ScanOps", subtitle: "ScanOps workflow" };
};

const roleGated = (element, requiredRole, title) => (
  <RoleGate requiredRole={requiredRole} title={title}>
    {element}
  </RoleGate>
)

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();
  const appEscapeMeta = getAppEscapeMeta(location.pathname);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

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
            <Route path="/movements" element={<Movements />} />
            <Route path="/stock-count" element={<StockCount />} />
            <Route path="/receiving" element={<Receiving />} />
            <Route path="/replenish" element={<Replenish />} />
            <Route path="/price-check" element={<PriceCheck />} />
            <Route path="/gap-scan" element={<GapScan />} />
            <Route path="/markdowns" element={<Markdowns />} />
            <Route path="/waste" element={<Waste />} />
            <Route path="/expiry-check" element={<ExpiryCheck />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/alerts" element={<Tasks />} />
            <Route path="/more" element={<More />} />
            <Route path="/sync-handoff" element={<SyncHandoff />} />
            <Route path="/inventory-sync" element={<SyncHandoff />} />
            <Route path="/sync-queue" element={<SyncQueue />} />
            <Route path="/shelf-tickets" element={<ShelfTickets />} />
            <Route path="/transfers" element={<Transfers />} />
            <Route path="/product-identity-review" element={roleGated(<ProductIdentityReview />, "Supervisor", "Product Review")} />
            <Route path="/scanops-reporting" element={roleGated(<ScanOpsReporting />, "Supervisor", "Reporting")} />
            <Route path="/device-governance" element={roleGated(<DeviceGovernance />, "Manager", "Device & Shift Governance")} />
            <Route path="/session-collaboration" element={<SessionCollaboration />} />
            <Route path="/desktop-sync-contract" element={roleGated(<DesktopSyncContract />, "Manager", "Desktop Sync Contract")} />
            <Route path="/store-ops-dashboard" element={roleGated(<StoreOpsDashboard />, "Manager", "Store Ops Dashboard")} />
            <Route path="/pilot-readiness" element={<PilotReadiness />} />
            <Route path="/printer-settings" element={roleGated(<PrinterSettings />, "Manager", "Printer Settings")} />
            <Route path="/user-management" element={roleGated(<UserManagement />, "Manager", "User Management")} />
            <Route path="/scanner-settings" element={<ScannerSettings />} />
            <Route path="/scanner-settings/:workspace" element={<ScannerSettings />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </div>
      </div>
      <BottomNavigation />
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