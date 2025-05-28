// src/pages/DashboardPage.tsx
// Refactored to use CSS Modules for styling.
// Includes links to Kit Creator and My Clients pages.

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Adjust path if needed
import { auth } from '../config/firebaseConfig'; // Adjust path if needed
import { signOut } from 'firebase/auth';

import styles from './DashboardPage.module.css'; // Import CSS Module

interface QuoteCounts {
    draft: number;
    sent: number;
    accepted: number;
    rejected: number;
    total: number;
}

function DashboardPage() {
    console.log("DEBUG: DashboardPage rendering with CSS Modules...");

    const { currentUser } = useAuth();
    const [logoutError, setLogoutError] = useState<string | null>(null);
    const [quoteCounts, setQuoteCounts] = useState<QuoteCounts | null>(null);
    const [isLoadingCounts, setIsLoadingCounts] = useState<boolean>(false);
    const [errorCounts, setErrorCounts] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUser?.uid) {
            setQuoteCounts(null);
            return;
        };
        // Placeholder for fetching quote counts
        const fetchQuoteCounts = async () => {
            setIsLoadingCounts(true);
            setErrorCounts(null);
            console.log("DEBUG: Placeholder - Fetching quote counts...");
            setTimeout(() => {
                setQuoteCounts({ draft: 1, sent: 2, accepted: 3, rejected: 0, total: 6 });
                setIsLoadingCounts(false);
            }, 1000);
        };
        // fetchQuoteCounts(); // Uncomment when ready to implement actual stats fetching
    }, [currentUser?.uid]);

    const handleLogout = async () => {
        setLogoutError(null);
        try {
            await signOut(auth);
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
             console.error("Logout Failed:", error);
             setLogoutError("Failed to log out.");
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.heading}>Welcome{currentUser?.displayName || currentUser?.email ? `, ${currentUser.displayName || currentUser.email}` : ''}!</h1>
            <p className={styles.subheading}>QuoteCraft Dashboard</p>

            {logoutError && <p className={`text-danger ${styles.errorText}`}>{logoutError}</p>} {/* Added text-danger */}

            <div className={styles.statsContainer}>
                <h4>Quick Stats</h4> {/* Consider using utility class for text alignment if needed */}
                {isLoadingCounts && <p>Loading stats...</p>}
                {errorCounts && <p className={`text-danger ${styles.errorTextSmall}`}>{errorCounts}</p>} {/* Added text-danger */}
                {quoteCounts && !isLoadingCounts && !errorCounts && (
                    <div className={styles.statsGrid}>
                        <span>Drafts: {quoteCounts.draft}</span>
                        <span>Sent: {quoteCounts.sent}</span>
                        <span>Accepted: {quoteCounts.accepted}</span>
                        <span>Total: {quoteCounts.total}</span>
                    </div>
                )}
                {!quoteCounts && !isLoadingCounts && !errorCounts && <p><i>(Quote statistics feature coming soon)</i></p>}
            </div>

            {/* --- Core Actions --- */}
            <div className={styles.actionsGrid}>
                <Link to="/quote-builder" className={styles.linkAsWrapper}> {/* Renamed if .link was purely for button styling */}
                    <button className="btn btn-primary w-100"> Create New Quote </button> {/* Added w-100 */}
                </Link>
                <Link to="/existing-quotes" className={styles.linkAsWrapper}>
                    <button className="btn btn-primary w-100"> View Existing Quotes </button> {/* Added w-100 */}
                </Link>
                <Link to="/kit-creator" className={styles.linkAsWrapper}>
                    <button className="btn btn-primary w-100"> Create & Edit Kits </button> {/* Added w-100 */}
                </Link>
            </div>

            {/* --- Management Links --- */}
            <div className={styles.manageSection}>
                <h4 className={styles.manageHeading}>Manage Your Data</h4>
                <div className={styles.actionsGrid}>
                    <Link to="/my-clients" className={styles.linkAsWrapper}>
                        <button className="btn btn-secondary w-100"> My Clients </button> {/* Added w-100 */}
                    </Link>
                    <Link to="/my-rates" className={styles.linkAsWrapper}>
                        <button className="btn btn-secondary w-100"> My Rates </button> {/* Added w-100 */}
                    </Link>
                    <Link to="/my-items" className={styles.linkAsWrapper}>
                        <button className="btn btn-secondary w-100"> My Custom Items </button> {/* Added w-100 */}
                    </Link>
                    <Link to="/profile" className={styles.linkAsWrapper}>
                        <button className="btn btn-secondary w-100"> Profile & Settings </button> {/* Added w-100 */}
                    </Link>
                </div>
            </div>

            <div className={`mt-lg ${styles.logoutContainer}`}> {/* Added mt-lg utility class */}
                <button onClick={handleLogout} className="btn btn-secondary w-100"> {/* Changed to btn-secondary, added w-100 */}
                    Log Out
                </button>
            </div>
        </div>
    );
}

export default DashboardPage;
