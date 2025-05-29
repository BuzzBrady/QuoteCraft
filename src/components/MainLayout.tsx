// src/components/MainLayout.tsx
import React, { useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../../Header'; //
import { useGSAP } from '@gsap/react';
import { fadeIn } from '../utils/animations'; // Assuming it's in src/utils

function MainLayout() {
    const mainContentRef = useRef<HTMLElement>(null);
    const location = useLocation(); // To trigger animation on route change

    useGSAP(() => {
        if (mainContentRef.current) {
            fadeIn(mainContentRef.current, 0.5); // Fade in over 0.5 seconds
        }
    }, [location.pathname]); // Rerun animation when pathname changes

    return (
        <div className="app-container">
            <Header />
            <main
                ref={mainContentRef}
                className="main-content p-lg mx-auto"
                style={{ maxWidth: '1200px', opacity: 0 }} // Start with opacity 0
            >
                <Outlet />
            </main>
        </div>
    );
}
export default MainLayout;