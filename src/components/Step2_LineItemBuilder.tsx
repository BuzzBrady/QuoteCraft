// src/components/Step2_LineItemBuilder.tsx

import React, { useMemo, useEffect } from 'react';
import { useQuoteBuilderStore } from '../stores/useQuoteBuilderStore';
import { useUserCollection } from '../hooks/useUserCollection';
import { KitTemplate, QuoteLine, UserRateTemplate } from '../types';
import { findMatchingRate } from '../utils/utils';
import styles from './QuoteBuilder.module.css';

import TaskSelector from './TaskSelector';
import MaterialSelector from './MaterialSelector';
import KitSelector from './KitSelector';
import QuoteLineItemDisplay from './QuoteLineItemDisplay';
import MaterialOptionSelector from './MaterialOptionSelector';

const Step2_LineItemBuilder = React.forwardRef<HTMLDivElement>((_props, ref) => {
    // FIX: Only destructure the state and actions that are actually used.
    const { 
        activeSection, selectedTask, selectedMaterial, selectedOption, selectedQuantity,
        overrideRate, selectedDescription, setActiveSection, setSelectedTask,
        setSelectedMaterial, setSelectedOption, setSelectedQuantity, setOverrideRate,
        setSelectedDescription, addLine, clearItemSelections,
    } = useQuoteBuilderStore();
    
    // FIX: Removed fetching for tasks and materials. The component only needs user rates.
    const { data: userRates } = useUserCollection<UserRateTemplate>('rateTemplates');

    const currentItemDetails = useMemo(() => {
        const taskId = selectedTask?.id ?? null;
        const materialId = selectedMaterial?.id ?? null;
        const optionId = selectedOption?.id ?? null;
        const rateData = findMatchingRate(userRates, taskId, materialId, optionId);
        const effectiveRate = rateData?.referenceRate ?? selectedMaterial?.defaultRate ?? selectedTask?.taskRate ?? 0;
        const unit = rateData?.unit ?? selectedMaterial?.defaultUnit ?? selectedTask?.defaultUnit ?? 'item';
        const inputType = rateData?.inputType ?? 'quantity';
        return { unit, rate: effectiveRate, inputType };
    }, [selectedTask, selectedMaterial, selectedOption, userRates]);

    useEffect(() => {
        // This effect correctly populates the overrideRate when the calculated rate changes
        if (currentItemDetails.rate) {
            setOverrideRate(currentItemDetails.rate.toString());
        }
    }, [currentItemDetails.rate, setOverrideRate]);

    const handleAddLineItem = () => {
        if (!activeSection.trim()) { alert("Please select a section."); return; }
        if (!selectedTask && !selectedMaterial) { alert("Please select a task or material."); return; }

        const { unit, rate, inputType } = currentItemDetails;
        const overrideRateValue = parseFloat(overrideRate);
        const finalRate = !isNaN(overrideRateValue) ? overrideRateValue : rate;
        
        const displayName = selectedTask?.name || selectedMaterial?.name || 'New Item';
        const lineTotal = inputType === 'price' ? finalRate : selectedQuantity * finalRate;

        const newLine: Omit<QuoteLine, 'id' | 'order' | 'lineTotal'> = {
            section: activeSection.trim(),
            displayName: displayName,
            description: selectedDescription.trim() || null,
            quantity: inputType === 'quantity' ? selectedQuantity : null,
            price: inputType === 'price' ? finalRate : null,
            unit: unit,
            taskId: selectedTask?.id || null,
            materialId: selectedMaterial?.id || null,
            materialOptionId: selectedOption?.id || null, // FIX: Corrected property name
            materialOptionName: selectedOption?.name || null,
            referenceRate: inputType === 'quantity' ? finalRate : null,
            inputType: inputType,
            kitTemplateId: undefined,
        };

        addLine(newLine, lineTotal);
        clearItemSelections();
    };

    const handleKitSelected = (kit: KitTemplate) => {
        // This logic needs to be fully implemented, likely in the store
        // For now, it just logs to the console.
        console.log('Adding kit to quote:', kit.name);
    };

    return (
        <div ref={ref} className={styles.wizardStep}>
            <div className={styles.wizardContent}>
                <h3>Build Line Items</h3>
                <div className={styles.itemEntryForm}>
                    <div className={styles.formGroup}>
                        <label>Active Section</label>
                        <input type="text" value={activeSection} onChange={(e) => setActiveSection(e.target.value)} placeholder="E.g., Kitchen, Bathroom..." />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <TaskSelector onSelect={setSelectedTask} onCreateCustomTask={async (name) => { alert(`Creation for "${name}" should be handled in a modal.`); return null; }} />
                    </div>
                    <div className={styles.formGroup}>
                        <MaterialSelector onSelect={setSelectedMaterial} onCreateCustomMaterial={async (name) => { alert(`Creation for "${name}" should be handled in a modal.`); return null; }} />
                    </div>
                    
                    {selectedMaterial?.optionsAvailable && (
                        <div className={styles.formGroup}>
                            <MaterialOptionSelector 
                                selectedMaterial={selectedMaterial}
                                selectedOption={selectedOption}
                                onSelect={setSelectedOption} 
                            />
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label>Quantity</label>
                        <input type="number" value={selectedQuantity} onChange={e => setSelectedQuantity(parseFloat(e.target.value) || 1)} />
                    </div>
                     <div className={styles.formGroup}>
                        <label>Rate (Override)</label>
                        <input type="text" value={overrideRate} onChange={e => setOverrideRate(e.target.value)} />
                    </div>
                     <div className={styles.formGroup}>
                        <label>Description</label>
                        <textarea value={selectedDescription} onChange={e => setSelectedDescription(e.target.value)} />
                    </div>
                    
                    <button onClick={handleAddLineItem} className="button-primary">Add Line Item</button>
                </div>

                <hr style={{margin: '2rem 0'}} />

                 <div className={styles.formGroup}>
                    <KitSelector onKitSelected={handleKitSelected} />
                </div>

                <hr style={{margin: '2rem 0'}} />
                
                <h4>Current Quote Items</h4>
                <QuoteLineItemDisplay />
            </div>
        </div>
    );
});

export default Step2_LineItemBuilder;