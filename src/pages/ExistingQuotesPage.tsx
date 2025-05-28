// src/pages/ExistingQuotesPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, getDocs, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db, app } from '../config/firebaseConfig';
import { Quote, QuoteExportLevel } from '../types';
import { getFunctions, httpsCallable, HttpsCallableResult } from "firebase/functions";

import { formatCurrency, formatFirestoreTimestamp } from '../utils/utils';
import './ExistingQuotesPage.css'; // Regular CSS import
import ExportQuoteModal from '../components/ExportQuoteModal';

interface PdfFunctionSuccessResult {
    pdfBase64: string;
}
interface GeneratePdfRequestData {
    quoteId: string;
    exportLevel: QuoteExportLevel;
}

const functionsInstance = getFunctions(app, 'australia-southeast1');
const generateQuotePdfCallable = httpsCallable<GeneratePdfRequestData, PdfFunctionSuccessResult>(functionsInstance, 'generateQuotePdf');

export const downloadPdfClientSide = async (
    quoteId: string,
    quoteNumber?: string,
    exportLevel: QuoteExportLevel = 'fullDetail'
): Promise<boolean> => {
    if (!quoteId) {
        console.error("[Client] Error: Quote ID is missing for PDF generation.");
        alert("Error: Quote ID is missing. Cannot generate PDF.");
        return false;
    }
    console.log(`[Client] Requesting PDF for quoteId: ${quoteId} with export level: ${exportLevel}`);
    try {
        const result: HttpsCallableResult<PdfFunctionSuccessResult> = await generateQuotePdfCallable({
            quoteId,
            exportLevel
        });
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
            linkElement.download = `Quote-${quoteNumber || quoteId.substring(0, 6)}-${exportLevel}.pdf`;
            document.body.appendChild(linkElement);
            linkElement.click();
            document.body.removeChild(linkElement);
            URL.revokeObjectURL(linkElement.href);
            return true;
        } else {
            const errorMessage = "PDF data was not returned from the function. Check Cloud Function logs.";
            console.error("[Client] Failed to get PDF base64 string from function response:", result.data);
            alert(`Error generating PDF: ${errorMessage}`);
            return false;
        }
    } catch (error: any) {
        console.error(`[Client] Error calling generateQuotePdf Cloud Function for level ${exportLevel}:`, error);
        let displayMessage = `An error occurred while generating the ${exportLevel} PDF.`;
        if (error.code && error.message) {
            displayMessage = `Error: ${error.message} (Code: ${error.code})`;
        } else {
            displayMessage = `An unexpected error occurred: ${error.message || 'Unknown error'}`;
        }
        alert(displayMessage + "Check the browser console and Cloud Function logs for more details.");
        return false;
    }
};

const getStatusClassName = (status?: Quote['status']): string => {
    // This local .css might have specific status styles
    switch (status?.toLowerCase()) {
        case 'draft': return 'status-style-draft';
        case 'sent': return 'status-style-sent';
        case 'accepted': return 'status-style-accepted';
        case 'rejected': return 'status-style-rejected';
        default: return 'status-style-default';
    }
};

function ExistingQuotesPage() {
    const { currentUser } = useAuth();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
    const [quoteForExport, setQuoteForExport] = useState<Quote | null>(null);
    const [isExporting, setIsExporting] = useState<Record<string, boolean>>({});

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
            const quotesCollectionRef = collection(db, userQuotesPath);
            const q = query(quotesCollectionRef, orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const fetchedQuotes: Quote[] = querySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Quote));
            setQuotes(fetchedQuotes);
        } catch (err: any) {
            setError(err.code === 'permission-denied' ? "Permission denied fetching quotes." : `Failed to load quotes: ${err.message || 'Unknown error'}`);
            setQuotes([]);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchQuotes();
    }, [fetchQuotes]);

    const handleOpenExportModal = (quote: Quote) => {
        setQuoteForExport(quote);
        setIsExportModalOpen(true);
    };

    const handleCloseExportModal = () => {
        setIsExportModalOpen(false);
        setQuoteForExport(null);
    };

    const handleExportQuote = async (exportLevel: QuoteExportLevel) => {
        if (!quoteForExport) {
            console.error("No quote selected for export.");
            return;
        }
        const { id: quoteId, quoteNumber } = quoteForExport;
        const loadingKey = `${quoteId}-${exportLevel}`;
        setIsExporting(prev => ({ ...prev, [loadingKey]: true }));
        await downloadPdfClientSide(quoteId, quoteNumber, exportLevel);
        setIsExporting(prev => ({ ...prev, [loadingKey]: false }));
    };

    const handleStatusChange = async (quoteId: string, newStatus: Quote['status']) => {
        if (!currentUser?.uid) {
            alert("Error: Not logged in.");
            return;
        }
        const userId = currentUser.uid;
        const quoteRef = doc(db, `users/${userId}/quotes`, quoteId);
        try {
            await updateDoc(quoteRef, { status: newStatus, updatedAt: Timestamp.now() });
            setQuotes(prevQuotes => prevQuotes.map(q => q.id === quoteId ? {...q, status: newStatus, updatedAt: Timestamp.now()} : q));
        } catch (err: any) {
            alert(`Failed to update quote status: ${err.message || 'Unknown error'}`);
        }
    };

    if (isLoading) {
        return <div className="existing-quotes-container"><p className="text-muted text-center">Loading quotes...</p></div>;
    }
    if (error) {
        return <div className="existing-quotes-container"><p className="text-danger text-center">Error: {error}</p></div>;
    }

    return (
        <div className="existing-quotes-container">
            <h1 className="existing-quotes-heading">My Quotes</h1>
            {quotes.length === 0 ? (
                <p className="text-center text-muted">You haven't created any quotes yet. <Link to="/quote-builder">Create one now!</Link></p>
            ) : (
                <table className="quotes-table">
                    <thead className="quotes-table-head">
                        <tr>
                            <th className="quotes-th">Quote #</th>
                            <th className="quotes-th">Job Title</th>
                            <th className="quotes-th">Client</th>
                            <th className="quotes-th">Date</th>
                            <th className="quotes-th amount">Total</th>
                            <th className="quotes-th center">Status</th>
                            <th className="quotes-th center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotes.map(quote => (
                            <tr key={quote.id} className="quotes-tr">
                                <td className="quotes-td">{quote.quoteNumber}</td>
                                <td className="quotes-td">{quote.jobTitle || 'N/A'}</td>
                                <td className="quotes-td">{quote.clientName || 'N/A'}</td>
                                <td className="quotes-td">{formatFirestoreTimestamp(quote.createdAt, 'medium')}</td>
                                <td className="quotes-td amount">
                                    {formatCurrency(quote.totalAmount)}
                                </td>
                                <td className="quotes-td center">
                                    {/* Specific status styling from ExistingQuotesPage.css */}
                                    <span className={getStatusClassName(quote.status)}>{quote.status || 'N/A'}</span>
                                </td>
                                <td className="quotes-td actions">
                                    <Link to={`/quote-builder/${quote.id}`} className="btn btn-primary btn-sm mr-xs">Edit</Link>
                                    <button
                                        onClick={() => handleOpenExportModal(quote)}
                                        className="btn btn-secondary btn-sm mr-xs"
                                        title="Export Quote Options"
                                    >
                                        Export
                                    </button>
                                    <select
                                        value={quote.status || 'Draft'}
                                        onChange={(e) => handleStatusChange(quote.id, e.target.value as Quote['status'])}
                                        className="status-select" /* Assuming global select styles cover appearance, this for layout */
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
            <div className="text-center mt-lg">
                <Link to="/dashboard">
                    <button className="btn btn-secondary">Back to Dashboard</button>
                </Link>
            </div>

            {quoteForExport && (
                <ExportQuoteModal
                    isOpen={isExportModalOpen}
                    onClose={handleCloseExportModal}
                    onExport={handleExportQuote}
                    quoteNumber={quoteForExport.quoteNumber}
                    quoteId={quoteForExport.id}
                    isExporting={isExporting}
                />
            )}
        </div>
    );
}

export default ExistingQuotesPage;
