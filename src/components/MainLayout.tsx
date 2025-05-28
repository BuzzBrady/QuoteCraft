// src/components/MainLayout.tsx
import React from 'react'; // Ensured React is imported
import { Outlet } from 'react-router-dom';
import Header from '../../Header'; // Adjusted import path, assuming Header.tsx is in the root

function MainLayout() {
    return (
        // Assuming 'app-container' is a global class for overall app structure
        <div className="app-container">
            <Header />
            <main 
                className="main-content p-lg mx-auto" // Applied padding and auto margin utilities
                style={{ maxWidth: '1200px' }}      // Retained maxWidth as an inline style
            >
                {/* Outlet renders the matched child route component */}
                <Outlet />
            </main>
            {/* You could add a Footer component here too */}
        </div>
    );
}

export default MainLayout;
