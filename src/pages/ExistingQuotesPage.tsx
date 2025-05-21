// src/pages/ExistingQuotesPage.tsx
// -------------
// Page to display a list of existing quotes for the logged-in user.
// Updated to use shared utility functions and fix potential hydration warnings.

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // Assuming you use react-router-dom
import { collection, query, getDocs, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext'; // Adjust path as per your project
import { db, app } from '../config/firebaseConfig'; // Ensure 'app' (FirebaseApp) is exported
import { Quote } from '../types'; // Adjust path as per your project
import { getFunctions, httpsCallable, HttpsCallableResult } from "firebase/functions";

// --- IMPORT SHARED UTILITY FUNCTIONS ---
import { formatCurrency, formatFirestoreTimestamp } from '../utils/utils'; // Adjust path if your utils.ts is elsewhere

// Define the expected result structure from your Cloud Function on SUCCESS
interface PdfFunctionSuccessResult {
    pdfBase64: string; 
}

// Initialize Cloud Functions client once
const functionsInstance = getFunctions(app, 'australia-southeast1'); 
const generateQuotePdfCallable = httpsCallable< { quoteId: string }, PdfFunctionSuccessResult >(functionsInstance, 'generateQuotePdf');

// Client-side function to trigger PDF generation and download
export const downloadPdfClientSide = async (quoteId: string, quoteNumber?: string): Promise<boolean> => {
    if (!quoteId) {
        console.error("[Client] Error: Quote ID is missing for PDF generation.");
        alert("Error: Quote ID is missing. Cannot generate PDF.");
        return false;
    }

    console.log(`[Client] Requesting PDF for quoteId: ${quoteId}`);
    try {
        const result: HttpsCallableResult<PdfFunctionSuccessResult> = await generateQuotePdfCallable({ quoteId });
        console.log("[Client] Cloud Function result received."); 

        const pdfBase64 = result.data.pdfBase64;

        if (pdfBase64) {
            const byteCharacters = atob(pdfBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });

            const linkElement = document.createElement('a');
            linkElement.href = URL.createObjectURL(blob);
            linkElement.download = `Quote-${quoteNumber || quoteId.substring(0, 6)}.pdf`;
            document.body.appendChild(linkElement); 
            linkElement.click();
            document.body.removeChild(linkElement);
            URL.revokeObjectURL(linkElement.href); 

            console.log("[Client] PDF download initiated for:", linkElement.download);
            return true; 
        } else {
            const errorMessage = "PDF data was not returned from the function. Check Cloud Function logs.";
            console.error("[Client] Failed to get PDF base64 string from function response:", result.data);
            alert(`Error generating PDF: ${errorMessage}`);
            return false; 
        }
    } catch (error: any) {
        console.error("[Client] Error calling generateQuotePdf Cloud Function:", error);
        let displayMessage = `An error occurred while generating the PDF.`;
        
        if (error.code && error.message) {
            displayMessage = `Error: ${error.message} (Code: ${error.code})`;
            console.error("[Client] Error Code:", error.code);
            console.error("[Client] Error Message:", error.message);
            if(error.details) {
                console.error("[Client] Error Details:", error.details);
            }
        } else {
            displayMessage = `An unexpected error occurred: ${error.message || 'Unknown error'}`;
        }
        alert(displayMessage + "\nCheck the browser console and Cloud Function logs for more details.");
        return false; 
    }
};

// Helper to get status styles
const getStatusStyle = (status?: Quote['status']): React.CSSProperties => {
    switch (status?.toLowerCase()) {
        case 'draft': return { backgroundColor: '#e0e0e0', color: '#333', padding: '3px 8px', borderRadius: '4px', fontSize: '0.85em', display: 'inline-block' };
        case 'sent': return { backgroundColor: '#bbdefb', color: '#0d47a1', padding: '3px 8px', borderRadius: '4px', fontSize: '0.85em', display: 'inline-block' };
        case 'accepted': return { backgroundColor: '#c8e6c9', color: '#1b5e20', padding: '3px 8px', borderRadius: '4px', fontSize: '0.85em', display: 'inline-block' };
        case 'rejected': return { backgroundColor: '#ffcdd2', color: '#b71c1c', padding: '3px 8px', borderRadius: '4px', fontSize: '0.85em', display: 'inline-block' };
        default: return {display: 'inline-block'};
    }
};

function ExistingQuotesPage() {
    const { currentUser } = useAuth();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true); 
    const [error, setError] = useState<string | null>(null); 
    const [pdfLoadingStates, setPdfLoadingStates] = useState<Record<string, boolean>>({});

    const fetchQuotes = useCallback(async () => {
        if (!currentUser?.uid) {
            setQuotes([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        const userId = currentUser.uid;

        try {
            const userQuotesPath = `users/${userId}/quotes`;
            console.log("ExistingQuotesPage: Querying Firestore path:", userQuotesPath);
            const quotesCollectionRef = collection(db, userQuotesPath);
            const q = query(quotesCollectionRef, orderBy('createdAt', 'desc'));
            
            const querySnapshot = await getDocs(q);
            const fetchedQuotes: Quote[] = [];
            querySnapshot.forEach((docSnap) => {
                fetchedQuotes.push({ id: docSnap.id, ...docSnap.data() } as Quote);
            });

            setQuotes(fetchedQuotes);
            console.log(`ExistingQuotesPage: Fetched ${fetchedQuotes.length} quotes.`);
        } catch (err: any) {
            console.error("ExistingQuotesPage: Error fetching quotes:", err);
            console.error("Full error code:", err.code, "message:", err.message); 
            setError(err.code === 'permission-denied' ? "Permission denied fetching quotes. Check Firestore rules and path." : `Failed to load quotes: ${err.message || 'Unknown error'}`);
            setQuotes([]);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchQuotes();
    }, [fetchQuotes]);

    const handleDownloadPdfClick = async (quoteId: string, quoteNumber?: string) => {
        setPdfLoadingStates(prev => ({ ...prev, [quoteId]: true }));
        await downloadPdfClientSide(quoteId, quoteNumber); 
        setPdfLoadingStates(prev => ({ ...prev, [quoteId]: false }));
    };

    const handleStatusChange = async (quoteId: string, newStatus: Quote['status']) => {
        if (!currentUser?.uid) {
            alert("Error: Not logged in."); 
            return;
        }
        const userId = currentUser.uid;
        const quoteRef = doc(db, `users/${userId}/quotes`, quoteId);
        try {
            await updateDoc(quoteRef, { 
                status: newStatus, 
                updatedAt: Timestamp.now() 
            });
            setQuotes(prevQuotes => prevQuotes.map(q => 
                q.id === quoteId ? {...q, status: newStatus, updatedAt: Timestamp.now()} : q
            ));
        } catch (err: any) {
            console.error("Error updating status:", err);
            alert(`Failed to update quote status: ${err.message || 'Unknown error'}`);
        }
    };

    if (isLoading) {
        return <div style={pageStyles.container}><p>Loading quotes...</p></div>;
    }
    if (error) {
        return <div style={pageStyles.container}><p style={{ color: 'red' }}>Error: {error}</p></div>;
    }

    return (
        <div style={pageStyles.container}>
            <h1 style={pageStyles.heading}>My Quotes</h1>
            {quotes.length === 0 ? (
                <p>You haven't created any quotes yet. <Link to="/quote-builder">Create one now!</Link></p>
            ) : (
                <table style={pageStyles.table}>
                    <thead style={pageStyles.thead}>
                        <tr>
                            <th style={pageStyles.th}>Quote #</th>
                            <th style={pageStyles.th}>Job Title</th>
                            <th style={pageStyles.th}>Client</th>
                            <th style={pageStyles.th}>Date</th>
                            <th style={{...pageStyles.th, ...pageStyles.thAmount}}>Total</th>
                            <th style={{...pageStyles.th, ...pageStyles.thCenter}}>Status</th>
                            <th style={{...pageStyles.th, ...pageStyles.thCenter}}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Ensure no whitespace text nodes are direct children of tbody or tr */}
                        {quotes.map(quote => (
                            <tr key={quote.id} style={pageStyles.tr}>
                                <td style={pageStyles.td}>{quote.quoteNumber}</td>
                                <td style={pageStyles.td}>{quote.jobTitle || 'N/A'}</td>
                                <td style={pageStyles.td}>{quote.clientName || 'N/A'}</td>
                                <td style={pageStyles.td}>{formatFirestoreTimestamp(quote.createdAt, 'medium')}</td>
                                <td style={{...pageStyles.td, ...pageStyles.tdAmount}}>
                                    {formatCurrency(quote.totalAmount)}
                                </td>
                                <td style={{...pageStyles.td, ...pageStyles.tdCenter}}>
                                    <span style={getStatusStyle(quote.status)}>{quote.status || 'N/A'}</span>
                                </td>
                                <td style={{...pageStyles.td, ...pageStyles.tdActions}}>
                                    <Link to={`/quote-builder/${quote.id}`} style={pageStyles.actionLink}>Edit</Link>
                                    <button 
                                        onClick={() => handleDownloadPdfClick(quote.id, quote.quoteNumber)}
                                        disabled={pdfLoadingStates[quote.id]}
                                        style={pageStyles.actionButton} 
                                        title="Download PDF"
                                    >
                                        {pdfLoadingStates[quote.id] ? '...' : 'PDF'}
                                    </button>
                                    <select 
                                        value={quote.status || 'Draft'} 
                                        onChange={(e) => handleStatusChange(quote.id, e.target.value as Quote['status'])}
                                        style={pageStyles.statusSelect}
                                        title="Change Status"
                                    >
                                        <option value="Draft">Draft</option>
                                        <option value="Sent">Sent</option>
                                        <option value="Accepted">Accepted</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <Link to="/dashboard" style={{ marginTop: '30px', display: 'inline-block' }}>
                <button style={{padding: '8px 15px'}}>Back to Dashboard</button>
            </Link>
        </div>
    );
}

const pageStyles: { [key: string]: React.CSSProperties } = {
    container: { padding: '2rem', maxWidth: '1100px', margin: '0 auto' },
    heading: { marginBottom: '1.5rem', textAlign: 'center', color: '#333' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem' },
    thead: { backgroundColor: '#f8f8f8' },
    th: { padding: '12px 10px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: '600' },
    tr: { borderBottom: '1px solid #eee' },
    td: { padding: '10px', verticalAlign: 'middle' },
    thAmount: { textAlign: 'right' },
    tdAmount: { textAlign: 'right', fontWeight: '500' },
    thCenter: { textAlign: 'center' },
    tdCenter: { textAlign: 'center' },
    tdActions: { textAlign: 'center', whiteSpace: 'nowrap' },
    actionLink: {
        marginRight: '10px', textDecoration: 'none', color: '#007bff',
        padding: '6px 10px', border: '1px solid #007bff', borderRadius: '4px',
        display: 'inline-block', fontSize: '0.9em'
    },
    actionButton: {
        marginRight: '10px', padding: '6px 10px', cursor: 'pointer',
        fontSize: '0.9em', borderRadius: '4px', border: '1px solid #6c757d',
        backgroundColor: '#6c757d', color: 'white'
    },
    statusSelect: {
        padding: '6px 8px', fontSize: '0.9em', borderRadius: '4px',
        border: '1px solid #ccc'
    }
};

export default ExistingQuotesPage;
