// src/components/MainLayout.tsx
import  'react';
import { Outlet } from 'react-router-dom';
import Header from '../../Header'; // Import the header

function MainLayout() {
    return (
        <div className="app-container">
            <Header />
            <main className="main-content" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                {/* Outlet renders the matched child route component */}
                <Outlet />
            </main>
            {/* You could add a Footer component here too */}
        </div>
    );
}

export default MainLayout;