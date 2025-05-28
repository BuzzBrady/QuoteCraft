// Header.tsx (root)
import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './src/contexts/AuthContext'; // Ensure this path is correct for your project
import './Header.css'; // Make sure you have this CSS file created

function Header() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        // Close mobile menu on navigation
        setIsMobileMenuOpen(false);
    }, [location]);

    const handleLogout = async () => {
        try {
            if (logout) { // Check if logout function exists
                await logout();
                navigate('/login');
            } else {
                console.error("Logout function not available on auth context.");
            }
        } catch (error) {
            console.error("Failed to log out:", error);
            alert("Failed to log out. Please try again.");
        }
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const renderNavLinks = () => (
        <>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Dashboard</NavLink>
            <NavLink to="/quote-builder" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>New Quote</NavLink>
            <NavLink to="/existing-quotes" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Quotes</NavLink>
            <NavLink to="/my-items" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>My Library</NavLink>
        </>
    );

    return (
        <header className="app-header">
            <div className="header-content">
                <Link to="/dashboard" className="header-brand">
                    QuoteCraft
                </Link>

                <nav className="header-nav header-nav--desktop">
                    {renderNavLinks()}
                </nav>

                <div className="header-user-info">
                    {currentUser && (
                        <>
                            <span className="user-email">{currentUser.email}</span>
                            {logout && <button onClick={handleLogout} className="btn btn-secondary">Logout</button>} {/* Updated class */}
                        </>
                    )}
                </div>

                <button className="hamburger-button" onClick={toggleMobileMenu} aria-label="Toggle menu" aria-expanded={isMobileMenuOpen}>
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>

            <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
                 <button className="mobile-menu__close-button" onClick={toggleMobileMenu} aria-label="Close menu">&times;</button>
                 <nav className="mobile-menu__nav">
                     {renderNavLinks()}
                 </nav>
                 {currentUser && logout && (
                     <button onClick={handleLogout} className="btn btn-secondary mobile-menu__logout-button"> {/* Updated class */} 
                         Logout
                     </button>
                 )}
            </div>
            {isMobileMenuOpen && <div className="mobile-menu__overlay" onClick={toggleMobileMenu}></div>}
        </header>
    );
}

export default Header;
