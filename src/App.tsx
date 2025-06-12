
import React, { JSX } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Import Pages and Components
import LoginPage from './components/LoginPage';
import MainLayout from './components/MainLayout';
import DashboardPage from './pages/DashboardPage';
import MyClientsPage from './pages/MyClientsPage';
import ManageCustomItemsPage from './pages/ManageCustomItemsPage';
import KitCreatorPage from './pages/KitCreatorPage';
import ExistingQuotesPage from './pages/ExistingQuotesPage';
import QuoteBuilder from './components/QuoteBuilder';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import UserRateTemplatesPage from './pages/UserRateTemplatesPage';

// A wrapper to protect routes that require authentication
const RequireAuth: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { currentUser, loadingAuthState } = useAuth();

  if (loadingAuthState) {
    return <div>Loading session...</div>; // Or a splash screen
  }

  if (!currentUser) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to. This allows us to send them back there after they log in.
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes Layout */}
          <Route 
            path="/" 
            element={
              <RequireAuth>
                <MainLayout />
              </RequireAuth>
            }
          >
            {/* Nested routes will render inside MainLayout's <Outlet /> */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="quotes" element={<ExistingQuotesPage />} />
            <Route path="quotes/new" element={<QuoteBuilder />} />
            <Route path="quotes/edit/:quoteId" element={<QuoteBuilder />} />
            <Route path="clients" element={<MyClientsPage />} />
            <Route path="library/custom" element={<ManageCustomItemsPage />} />
            <Route path="library/kits" element={<KitCreatorPage />} />
            <Route path="library/rates" element={<UserRateTemplatesPage />} />
            <Route path="settings/profile" element={<ProfileSettingsPage />} />
            
            {/* Add a catch-all for any other nested routes, or a 404 component */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
