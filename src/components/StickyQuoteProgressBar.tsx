// src/components/StickyQuoteProgressBar.tsx
import React from 'react';
import styles from './StickyQuoteProgressBar.module.css';
import { formatCurrency } from '../utils/utils';
import { useQuoteBuilderStore } from '../stores/useQuoteBuilderStore'; // 1. Import the store

interface StickyQuoteProgressBarProps {
    // 2. The props list is now much smaller
    currentStep: number;
    totalSteps: number;
    onNext: () => void;
    onPrevious: () => void;
    onSave: () => void;
    isSaveDisabled: boolean;
}

const StickyQuoteProgressBar: React.FC<StickyQuoteProgressBarProps> = ({
    currentStep,
    totalSteps,
    onNext,
    onPrevious,
    onSave,
    isSaveDisabled,
}) => {
    // 3. Get all the data it needs to display directly from the store
    const { quote, activeSection, selectedTask, selectedMaterial, status } = useQuoteBuilderStore();
    const isLoading = status === 'saving';
    
    const getStepName = (step: number) => {
        if (step === 1) return "Client & Job";
        if (step === 2) return "Build Items";
        if (step === 3) return "Review & Save";
        return "";
    };

    return (
        <div className={styles.stickyBar}>
            <div className={styles.progressInfo}>
                Step {currentStep}/{totalSteps}: <strong>{getStepName(currentStep)}</strong>
            </div>

            <div className={styles.contextualInfo}>
                {/* This info now comes directly from the store's state */}
                {currentStep === 2 && activeSection && (
                    <span className={styles.activeSection}>Area: <strong>{activeSection}</strong></span>
                )}
                {currentStep === 2 && (selectedTask || selectedMaterial) && (
                     <span className={styles.configuredItem}>
                        Editing: <strong>{selectedTask?.name || selectedMaterial?.name}</strong>
                     </span>
                )}
                {(currentStep === 2 || currentStep === 3) && (
                    <span className={styles.quoteTotal}>
                        Total: <strong>{formatCurrency(quote.totalAmount || 0)}</strong>
                    </span>
                )}
            </div>

            <div className={styles.actions}>
                <button onClick={onPrevious} disabled={isLoading || currentStep <= 1} className="btn btn-secondary">
                    Previous
                </button>
                {currentStep < totalSteps ? (
                    <button onClick={onNext} disabled={isLoading} className="btn btn-primary">
                        Next
                    </button>
                ) : (
                    <button onClick={onSave} disabled={isSaveDisabled || isLoading} className="btn btn-success btn-lg">
                        {isLoading ? 'Saving...' : 'Save Quote'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default StickyQuoteProgressBar;