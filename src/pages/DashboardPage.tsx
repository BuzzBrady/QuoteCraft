// src/pages/DashboardPage.tsx

import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUserCollection } from '../hooks/useUserCollection';
import { useUserProfile } from '../hooks/useUserProfile';
import { Quote, Client } from '../types';
import { formatCurrency, formatFirestoreTimestamp } from '../utils/utils';
import styles from './DashboardPage.module.css';

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const { profile, loading: profileLoading } = useUserProfile();
    const { data: recentQuotes, isLoading: quotesLoading } = useUserCollection<Quote>('quotes', 'updatedAt', 'desc', 5);
    const { data: clients, isLoading: clientsLoading } = useUserCollection<Client>('clients');

    const isLoading = quotesLoading || clientsLoading || profileLoading;

    const QuickStat = ({ title, value, loading }: { title: string; value: string | number; loading: boolean }) => (
        <div className={styles.statCard}>
            <h3 className={styles.statTitle}>{title}</h3>
            {loading ? <div className={styles.statValue}>...</div> : <div className={styles.statValue}>{value}</div>}
        </div>
    );

    return (
        <div className={styles.dashboardContainer}>
            <header className={styles.header}>
                <h1>Welcome, {profile?.businessName || profile?.displayName || 'User'}!</h1>
                <p>Here's a quick overview of your business.</p>
            </header>

            <div className={styles.statsGrid}>
                <QuickStat title="Total Clients" value={clients.length} loading={clientsLoading} />
                <QuickStat title="Quotes to Follow Up" value={recentQuotes.filter(q => q.status === 'Sent').length} loading={quotesLoading} />
                <QuickStat title="Active Projects" value={recentQuotes.filter(q => q.status === 'Accepted').length} loading={quotesLoading} />
            </div>
            
            {/* FIX: Add the Quick Actions grid */}
            <div className={styles.actionsGrid}>
                <Link to="/quotes/new" className={styles.actionCard}>
                    <div className={styles.actionIcon}>➕</div>
                    <div className={styles.actionText}>Create a Quote</div>
                </Link>
                <Link to="/quotes" className={styles.actionCard}>
                    <div className={styles.actionIcon}>📄</div>
                    <div className={styles.actionText}>View Quotes</div>
                </Link>
                <Link to="/library/kits" className={styles.actionCard}>
                    <div className={styles.actionIcon}>📦</div>
                    <div className={styles.actionText}>Create & Edit Kits</div>
                </Link>
                <Link to="/clients" className={styles.actionCard}>
                    <div className={styles.actionIcon}>👥</div>
                    <div className={styles.actionText}>My Clients</div>
                </Link>
                 <Link to="/library/rates" className={styles.actionCard}>
                    <div className={styles.actionIcon}>💲</div>
                    <div className={styles.actionText}>My Rates</div>
                </Link>
                 <Link to="/settings/profile" className={styles.actionCard}>
                    <div className={styles.actionIcon}>⚙️</div>
                    <div className={styles.actionText}>Profile & Settings</div>
                </Link>
            </div>

            <div className={styles.recentActivity}>
                <h2>Recent Quotes</h2>
                <div className={styles.quoteList}>
                    {isLoading && <p>Loading recent quotes...</p>}
                    {!isLoading && recentQuotes.length === 0 && (
                        <p>No recent quotes found. <Link to="/quotes/new">Create one now!</Link></p>
                    )}
                    
                    {recentQuotes.map(quote => (
                        <div key={quote.id} className={styles.quoteItem} onClick={() => navigate(`/quotes/edit/${quote.id}`)}>
                            <div className={styles.quoteInfo}>
                                <span className={styles.quoteJobTitle}>{quote.jobTitle}</span>
                                <span className={styles.quoteClientName}>{quote.clientName || 'N/A'}</span>
                            </div>
                            <div className={styles.quoteDetails}>
                                <span className={styles.quoteDate}>{formatFirestoreTimestamp(quote.updatedAt, 'medium')}</span>
                                <span className={`status-badge status-${quote.status?.toLowerCase()}`}>{quote.status}</span>
                                <span className={styles.quoteTotal}>{formatCurrency(quote.totalAmount)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
