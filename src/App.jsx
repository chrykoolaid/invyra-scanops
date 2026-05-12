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
import InventorySync from './pages/InventorySync';
import SyncQueue from './pages/SyncQueue';
import ShelfTickets from './pages/ShelfTickets';
import Transfers from './pages/Transfers';
import ProductIdentityReview from './pages/ProductIdentityReview';
import ScanOpsReporting from './pages/ScanOpsReporting';
import DeviceGovernance from './pages/DeviceGovernance';
import SessionCollaboration from './pages/SessionCollaboration';


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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
    <div className="scanops-root-shell">
      <ScrollToTopOnRouteChange />
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
        <Route path="/inventory-sync" element={<InventorySync />} />
        <Route path="/sync-queue" element={<SyncQueue />} />
        <Route path="/shelf-tickets" element={<ShelfTickets />} />
        <Route path="/transfers" element={<Transfers />} />
        <Route path="/product-identity-review" element={<ProductIdentityReview />} />
        <Route path="/scanops-reporting" element={<ScanOpsReporting />} />
        <Route path="/device-governance" element={<DeviceGovernance />} />
        <Route path="/session-collaboration" element={<SessionCollaboration />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
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