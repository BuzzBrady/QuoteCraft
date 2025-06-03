// src/components/MainLayout.tsx
import React, { useRef, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../../Header'; //
import { useGSAP } from '@gsap/react';
import { fadeIn } from '../utils/animations'; //
import styles from './MainLayout.module.css'; // Import the CSS Module

function MainLayout() {
    const mainContentRef = useRef<HTMLElement>(null);
    const location = useLocation(); // To trigger animation on route change

    useGSAP(() => {
        if (mainContentRef.current) {
            // GSAP's fadeIn utility or your custom one
            // If your fadeIn directly manipulates opacity, ensure the initial opacity
            // is set correctly (e.g., via CSS or GSAP from an opacity of 0)
            fadeIn(mainContentRef.current, 0.5); // Fade in over 0.5 seconds
        }
    }, { scope: mainContentRef, dependencies: [location.pathname] }); // Rerun animation when pathname changes

    // If fadeIn sets opacity to 1, you might not need to clear the inline style manually,
    // but it's good practice if GSAP doesn't auto-clear it or if you want CSS to take over.
    useEffect(() => {
        if (mainContentRef.current && mainContentRef.current.style.opacity === '0') {
             // This ensures that if GSAP runs and sets opacity, a very fast route change
             // doesn't leave opacity at 0 if GSAP is interrupted.
             // Or, handle initial state purely with GSAP's .from() tween.
             // For simplicity with your current fadeIn, the CSS initial opacity is fine.
        }
    }, [location.pathname]);

    return (
        <div className={styles.appContainer}> {/* Use styles from CSS Module */}
            <Header />
            <main
                ref={mainContentRef}
                className={styles.mainContent} // Use styles from CSS Module
                // Inline style for maxWidth is removed as it's in CSS module.
                // Initial opacity is now handled by the CSS module.
            >
                <Outlet />
            </main>
        </div>
    );
}
export default MainLayout; 