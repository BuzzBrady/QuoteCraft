// src/App.tsx
// -------------
// Main application component with routing setup.
// Uses MainLayout for protected routes to include the Header.
// Added route for MyClientsPage and KitCreatorPage.

import 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    Outlet,
    useParams,
    Link
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext'; // Adjust path if needed

// Page & Component Imports (Ensure paths are correct)
import LoginPage from './components/LoginPage'; // Assuming LoginPage is in components
import DashboardPage from './pages/DashboardPage';
import QuoteBuilder from './components/QuoteBuilder'; // Assuming QuoteBuilder is in components
import ExistingQuotesPage from './pages/ExistingQuotesPage';
import ManageCustomItemsPage from './pages/ManageCustomItemsPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import MainLayout from './components/MainLayout'; // Your layout component
import MyClientsPage from './pages/MyClientsPage'; 
import KitCreatorPage from './pages/KitCreatorPage'; // <-- IMPORT YOUR NEW KIT CREATOR PAGE
import UserRateTemplatesPage from './pages/UserRateTemplatesPage';
import './index.css'; // Global styles

// --- Authentication Route Guards ---

// Protected Route Component: Requires login
function ProtectedRoute() {
    const { currentUser, loadingAuthState } = useAuth(); 
    if (loadingAuthState) {
        return <div style={{ padding: '2rem', textAlign: 'center', fontSize: '1.2em' }}>Authenticating...</div>;
    }
    return currentUser ? <Outlet /> : <Navigate to="/login" replace />;
}

// Public Route Component: For login/signup, redirects if already logged in
function PublicRoute() {
     const { currentUser, loadingAuthState } = useAuth(); 
     if (loadingAuthState) {
        return <div style={{ padding: '2rem', textAlign: 'center', fontSize: '1.2em' }}>Authenticating...</div>;
     }
     return !currentUser ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

// --- Main App Component ---
function App() {
    return (
        <Router>
            <AuthProvider> {/* AuthProvider wraps all routes */}
                <Routes>
                    {/* Public routes */}
                    <Route element={<PublicRoute />}>
                        <Route path="/login" element={<LoginPage />} />
                        {/* Add your SignUpPage route here if you have one */}
                        {/* <Route path="/signup" element={<SignUpPage />} /> */}
                    </Route>

                    {/* Protected routes (rendered within MainLayout) */}
                    <Route element={<ProtectedRoute />}>
                        <Route element={<MainLayout />}>
                            <Route path="/dashboard" element={<DashboardPage />} />
                            <Route path="/existing-quotes" element={<ExistingQuotesPage />} />
                            <Route path="/quote-builder" element={<QuoteBuilder />} />
                            <Route path="/quote-builder/:quoteId" element={<QuoteBuilderWrapper />} />
                            <Route path="/my-items" element={<ManageCustomItemsPage />} />
                            <Route path="/profile" element={<ProfileSettingsPage />} />
                            <Route path="/my-clients" element={<MyClientsPage />} />
                            <Route path="/my-rates" element={<UserRateTemplatesPage />} />

                            
                            {/* --- NEW ROUTE FOR KIT CREATOR --- */}
                            <Route path="/kit-creator" element={<KitCreatorPage />} />
                            {/* --- END NEW ROUTE --- */}

                            {/* Default protected route */}
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        </Route>
                    </Route>

                    {/* Catch-all 404 Not Found route */}
                    <Route path="*" element={<Error404Page />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

// Helper component for 404 page to safely use useAuth
function Error404Page() {
    const { currentUser } = useAuth(); 
    return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>404 - Page Not Found</h2>
            <p>Sorry, the page you requested does not exist.</p>
            <Link to={currentUser ? "/dashboard" : "/login"}>
                {currentUser ? "Go to Dashboard" : "Go to Login"}
            </Link>
        </div>
    );
}

// --- Wrapper Component for QuoteBuilder Edit Route ---
// This allows passing the quoteId param to your QuoteBuilder component
function QuoteBuilderWrapper() {
    const { quoteId } = useParams<{ quoteId: string }>();
    return <QuoteBuilder existingQuoteId={quoteId} />;
}

export default App;
