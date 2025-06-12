// Header.tsx

import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './src/contexts/AuthContext';
import './Header.css'; 

function Header() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    
    // State for mobile menu
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // FIX: State for a robust library dropdown menu
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const libraryRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };
    
    // Effect to close dropdown if clicking outside of it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (libraryRef.current && !libraryRef.current.contains(event.target as Node)) {
                setIsLibraryOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [libraryRef]);


    const renderNavLinks = (isMobile = false) => {
        const closeMenus = () => {
            if (isMobile) setIsMobileMenuOpen(false);
            setIsLibraryOpen(false);
        };
        
        return (
            <>
                <NavLink to="/dashboard" className="nav-link" onClick={closeMenus}>Dashboard</NavLink>
                <NavLink to="/quotes/new" className="nav-link" onClick={closeMenus}>Create Quote</NavLink>
                <NavLink to="/quotes" className="nav-link" onClick={closeMenus}>View Quotes</NavLink>
                <div className="nav-dropdown" ref={libraryRef}>
                    <button className="nav-link dropdown-toggle" onClick={() => setIsLibraryOpen(!isLibraryOpen)}>
                        Library {isLibraryOpen ? '▲' : '▼'}
                    </button>
                    {isLibraryOpen && (
                        <div className="dropdown-content">
                            <NavLink to="/library/custom" onClick={closeMenus}>Custom Items</NavLink>
                            <NavLink to="/library/kits" onClick={closeMenus}>Kits</NavLink>
                            <NavLink to="/library/rates" onClick={closeMenus}>Rate Templates</NavLink>
                        </div>
                    )}
                </div>
            </>
        );
    };

    return (
        <header className="main-header">
            <div className="header-content">
                <NavLink to="/dashboard" className="header-brand">QuoteCraft</NavLink>
                
                <nav className="main-nav">
                    {renderNavLinks()}
                </nav>

                <div className="user-info">
                    {currentUser ? (
                        <>
                            <NavLink to="/settings/profile" className="nav-link settings-link">⚙️ Settings</NavLink>
                            <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
                        </>
                    ) : (
                        <NavLink to="/login" className="btn btn-primary">Login</NavLink>
                    )}
                </div>

                <button className="hamburger-button" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Toggle menu">
                    <span></span><span></span><span></span>
                </button>
            </div>
            
            {isMobileMenuOpen && (
                 <div className="mobile-menu open">
                     <nav className="mobile-menu__nav">
                         {renderNavLinks(true)}
                         <NavLink to="/settings/profile" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>Settings</NavLink>
                         <button onClick={handleLogout} className="btn btn-secondary mobile-menu__logout-button">Logout</button>
                     </nav>
                 </div>
            )}
        </header>
    );
};

export default Header;