import React from 'react';
import { QuoteLine } from '../types'; //
import { formatCurrency } from '../utils/utils'; //
import QuoteLineItemDisplay from './QuoteLineItemDisplay'; //
import styles from './QuoteBuilder.module.css'; //

interface Step3Props {
    // Data for displaying summary
    jobTitle: string;
    clientName: string;
    clientAddress: string;
    clientEmail: string;
    clientPhone: string;
    validUntilDate: Date | null;

    // Quote Lines display
    quoteLines: QuoteLine[];
    sortedSectionNames: string[];
    groupedQuoteLines: Record<string, QuoteLine[]>;
    
    projectDescription: string;
    setProjectDescription: (value: string) => void;
    additionalDetails: string;
    setAdditionalDetails: (value: string) => void;
    generalNotes: string;
    setGeneralNotes: (value: string) => void;

    terms: string;
    setTerms: (value: string) => void;
    validationIssues: string[];
    isLoadingQuote: boolean;

    // For AI Generation - simple callback for now
    onGenerateWithAI?: (type: 'projectDescription' | 'additionalDetails' | 'generalNotes') => Promise<void>;
    isAIGenerating?: boolean; // To show loading state for AI button
}

const Step3_ReviewFinalize: React.FC<Step3Props> = ({
    // Destructure all props defined in the interface
    jobTitle,
    clientName,
    clientAddress,
    clientEmail,
    clientPhone,
    validUntilDate,
    quoteLines,
    sortedSectionNames,
    groupedQuoteLines,
    projectDescription, setProjectDescription,
    additionalDetails, setAdditionalDetails,
    generalNotes, setGeneralNotes,
    terms, setTerms,
    validationIssues, isLoadingQuote,
    onGenerateWithAI, isAIGenerating
}) => {
    const overallTotal = quoteLines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);

    return (
        <div className={styles.wizardStep}>
            <h3 className="mb-md">Final Details & Review</h3>

            {/* Moved Text Areas Here */}
            <div className={styles.reviewSection}>
                <h4>Project Scope & Notes</h4>
                <div className={`${styles.headerInputGroup} ${styles.headerFullSpan}`}>
                    <label htmlFor="projectDescriptionReview">Project Description / Scope:</label>
                    <textarea
                        id="projectDescriptionReview"
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        rows={4}
                        placeholder="Detailed description of the project or scope of works..."
                    />
                    {onGenerateWithAI && (
                        <button 
                            type="button"
                            onClick={() => onGenerateWithAI('projectDescription')} 
                            className="btn btn-info btn-sm mt-sm"
                            disabled={isAIGenerating}
                        >
                            {isAIGenerating ? 'Generating...' : 'Generate with AI'}
                        </button>
                    )}
                </div>
                <div className={`${styles.headerInputGroup} ${styles.headerFullSpan} mt-md`}>
                    <label htmlFor="additionalDetailsReview">Additional Details / Inclusions:</label>
                    <textarea
                        id="additionalDetailsReview"
                        value={additionalDetails}
                        onChange={(e) => setAdditionalDetails(e.target.value)}
                        rows={3}
                        placeholder="E.g., Specific materials included, site conditions, access notes..."
                    />
                     {onGenerateWithAI && (
                        <button 
                            type="button"
                            onClick={() => onGenerateWithAI('additionalDetails')} 
                            className="btn btn-info btn-sm mt-sm"
                            disabled={isAIGenerating}
                        >
                             {isAIGenerating ? 'Generating...' : 'Generate with AI'}
                        </button>
                    )}
                </div>
                <div className={`${styles.headerInputGroup} ${styles.headerFullSpan} mt-md`}>
                    <label htmlFor="generalNotesReview">General Notes for Client:</label>
                    <textarea
                        id="generalNotesReview"
                        value={generalNotes}
                        onChange={(e) => setGeneralNotes(e.target.value)}
                        rows={3}
                        placeholder="Any other notes for the client relevant to this quote..."
                    />
                     {onGenerateWithAI && (
                        <button 
                            type="button"
                            onClick={() => onGenerateWithAI('generalNotes')} 
                            className="btn btn-info btn-sm mt-sm"
                            disabled={isAIGenerating}
                        >
                             {isAIGenerating ? 'Generating...' : 'Generate with AI'}
                        </button>
                    )}
                </div>
            </div>


            {/* Existing Review Sections from previous implementation */}
            <div className={styles.reviewSection}> {/* Ensure .reviewSection styles are defined in QuoteBuilder.module.css */}
                <h4>Quote & Client Details Summary:</h4>
                <p><strong>Job Title:</strong> {jobTitle}</p>
                <p><strong>Client Name:</strong> {clientName || "N/A"}</p>
                <p><strong>Client Address:</strong> {clientAddress || "N/A"}</p>
                <p><strong>Client Email:</strong> {clientEmail || "N/A"}</p>
                <p><strong>Client Phone:</strong> {clientPhone || "N/A"}</p>
                <p><strong>Valid Until:</strong> {validUntilDate ? validUntilDate.toLocaleDateString() : "N/A"}</p>
            </div>

            <div className={`${styles.reviewSection} quote-builder__line-items`}>
                 <h4 className="mb-md">Final Quote Items Summary:</h4>
                {quoteLines.length === 0 && <p>No items have been added to this quote.</p>}
                {sortedSectionNames.map(sectionName => {
                    const linesInSection = groupedQuoteLines[sectionName];
                    if (!linesInSection || linesInSection.length === 0) return null;
                    const sectionSubtotal = linesInSection.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
                    return (
                        <div key={sectionName + "-review"} className={styles.quoteSection}>
                            <h5 className={styles.sectionToggleHeader}>
                                <span>{sectionName} ({linesInSection.length} items)</span>
                                <span className={styles.sectionSubtotal}>Subtotal: {formatCurrency(sectionSubtotal)}</span>
                            </h5>
                            <ul className={styles.sectionLineItemsList}>
                                {linesInSection.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((line) => (
                                    <QuoteLineItemDisplay
                                        key={line.id + "-review"}
                                        item={line}
                                        onDelete={() => alert("Cannot delete items in review. Go back to Step 2.")}
                                        onEdit={() => alert("Cannot edit items in review. Go back to Step 2.")}
                                        // Consider adding an isReadOnly prop to QuoteLineItemDisplay
                                        // isReadOnly={true} 
                                    />
                                ))}
                            </ul>
                        </div>
                    );
                 })}
            </div>
            
            <div className={styles.reviewSection}>
                <h4>Terms & Conditions:</h4>
                <div className={`${styles.headerInputGroup} ${styles.headerFullSpan}`}>
                    <label htmlFor="termsReview" className="sr-only">Terms:</label>
                    <textarea 
                        id="termsReview" 
                        value={terms} 
                        onChange={(e) => setTerms(e.target.value)} 
                        rows={5} 
                        placeholder="Review and finalize terms for the quote..." 
                    />
                </div>
            </div>

            <div className={styles.reviewSection}>
                <h4>Total Quote Amount: <strong className="text-lg">{formatCurrency(overallTotal)}</strong></h4>
            </div>

            {validationIssues.length > 0 && !isLoadingQuote && (
                 <div className="text-warning mt-md"> {/* Or your preferred error display style */}
                    <strong>Please resolve these issues before saving:</strong>
                    <ul>
                        {validationIssues.map((issue, index) => (
                            <li key={index}>{issue}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default Step3_ReviewFinalize;