// src/components/StickyQuoteProgressBar.tsx
import React from 'react';
import styles from './StickyQuoteProgressBar.module.css'; // Create this CSS module
import { formatCurrency } from '../utils/utils'; //

interface StickyQuoteProgressBarProps {
    currentStep: number;
    totalSteps: number;
    activeSection?: string; // Optional, most relevant for step 2
    quoteTotal: number;
    onNext: () => void;
    onPrevious: () => void;
    onSave: () => void;
    isSaveDisabled: boolean;
    isLoading: boolean;
    // To show item being configured (relevant for step 2)
    configuredItemPreview?: {
        taskName?: string | null;
        materialName?: string | null;
        optionName?: string | null;
        quantity?: number | null;
        rate?: number | null;
        unit?: string | null;
    } | null;
}

const StickyQuoteProgressBar: React.FC<StickyQuoteProgressBarProps> = ({
    currentStep,
    totalSteps,
    activeSection,
    quoteTotal,
    onNext,
    onPrevious,
    onSave,
    isSaveDisabled,
    isLoading,
    configuredItemPreview
}) => {
    const getStepName = (step: number) => {
        if (step === 1) return "Client & Job";
        if (step === 2) return "Build Items";
        if (step === 3) return "Review & Save";
        return "";
    };

    return (
        <div className={styles.stickyBar}>
            <div className={styles.progressInfo}>
                Step {currentStep}/{totalSteps}: {getStepName(currentStep)}
                {/* You could add a more visual progress indicator here later */}
            </div>

            <div className={styles.contextualInfo}>
                {currentStep === 2 && activeSection && (
                    <span className={styles.activeSection}>
                        Area: {activeSection}
                    </span>
                )}
                {currentStep === 2 && configuredItemPreview && (
                    <span className={styles.configuredItem}>
                        {configuredItemPreview.taskName && `T: ${configuredItemPreview.taskName} `}
                        {configuredItemPreview.materialName && `M: ${configuredItemPreview.materialName} `}
                        {configuredItemPreview.optionName && `Opt: ${configuredItemPreview.optionName} `}
                        {typeof configuredItemPreview.quantity === 'number' && `Qty: ${configuredItemPreview.quantity} `}
                        {typeof configuredItemPreview.rate === 'number' && `Rate: ${formatCurrency(configuredItemPreview.rate)} `}
                    </span>
                )}
                 {(currentStep === 2 || currentStep === 3) && (
                    <span className={styles.quoteTotal}>
                        Total: {formatCurrency(quoteTotal)}
                    </span>
                )}
            </div>

            <div className={styles.actions}>
                {currentStep > 1 && (
                    <button onClick={onPrevious} disabled={isLoading} className="btn btn-secondary">
                        Previous
                    </button>
                )}
                {currentStep < totalSteps && (
                    <button onClick={onNext} disabled={isLoading} className="btn btn-primary">
                        Next
                    </button>
                )}
                {currentStep === totalSteps && (
                    <button onClick={onSave} disabled={isSaveDisabled || isLoading} className="btn btn-success btn-lg">
                        {isLoading ? 'Saving...' : 'Save Quote'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default StickyQuoteProgressBar;