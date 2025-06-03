// src/components/Step2_LineItemBuilder.tsx
import React, { RefObject } from 'react';
import {
    QuoteLine,
    Area,
    CombinedTask,
    CombinedMaterial,
    MaterialOption,
    KitTemplate,
    CollapsedSectionsState,
    CurrentItemDetails
} from '../types'; //
import { formatCurrency } from '../utils/utils'; //
import styles from './QuoteBuilder.module.css'; //

// Import sub-components used in this step
import AreaSelector from './AreaSelector'; //
import TaskSelector from './TaskSelector'; //
import MaterialSelector from './MaterialSelector'; //
import MaterialOptionSelector from './MaterialOptionSelector'; //
import KitSelector from './KitSelector'; //
import QuoteLineItemDisplay from './QuoteLineItemDisplay'; //

interface Step2Props {
    globalAreas: Area[];
    activeSection: string;
    isLoadingAreas: boolean;
    handleSetActiveSection: (name: string) => void;
    itemSelectorRef: RefObject<HTMLDivElement | null>;
    userId: string | undefined;
    allTasks: CombinedTask[];
    allMaterials: CombinedMaterial[];
    selectedTask: CombinedTask | null;
    selectedMaterial: CombinedMaterial | null;
    selectedOption: MaterialOption | null;
    selectedQuantity: number;
    setSelectedQuantity: (qty: number) => void;
    overrideRateInput: string;
    setOverrideRateInput: (rate: string) => void;
    selectedDescription: string;
    setSelectedDescription: (desc: string) => void;
    currentItemDetails: CurrentItemDetails;
    isLoadingGlobals: boolean;
    isLoadingRates: boolean;
    handleTaskSelectForItemForm: (task: CombinedTask | null) => void;
    handleMaterialSelectForItemForm: (material: CombinedMaterial | null) => void;
    handleOptionSelectForItemForm: (option: MaterialOption | null) => void;
    handleOpenNewTaskModal: (initialName?: string) => Promise<CombinedTask | null>;
    handleOpenNewMaterialModal: (initialName?: string) => Promise<CombinedMaterial | null>;
    handleKitSelected: (kit: KitTemplate) => void;
    handleNavigateToKitCreator: () => void;
    handleAddLineItem: () => void;
    isLoadingQuote: boolean;
    quoteLines: QuoteLine[];
    sortedSectionNames: string[];
    groupedQuoteLines: Record<string, QuoteLine[]>;
    collapsedSections: CollapsedSectionsState;
    toggleSectionCollapse: (sectionName: string) => void;
    handleDeleteLineItem: (id: string) => void;
    handleEditLineItem: (id: string) => void;
}

const Step2_LineItemBuilder: React.FC<Step2Props> = ({
    // Ensure ALL props from Step2Props are destructured here
    globalAreas,
    activeSection,
    isLoadingAreas,
    handleSetActiveSection,
    itemSelectorRef,
    userId, // Corrected from 'userld' if that was a typo in the error
    allTasks,
    allMaterials,
    selectedTask,
    selectedMaterial,
    selectedOption,
    selectedQuantity,
    setSelectedQuantity,
    overrideRateInput,
    setOverrideRateInput,
    selectedDescription,
    setSelectedDescription,
    currentItemDetails,
    isLoadingGlobals,
    isLoadingRates,
    handleTaskSelectForItemForm,
    handleMaterialSelectForItemForm,
    handleOptionSelectForItemForm,
    handleOpenNewTaskModal,
    handleOpenNewMaterialModal,
    handleKitSelected,
    handleNavigateToKitCreator,
    handleAddLineItem,
    isLoadingQuote,
    quoteLines,
    sortedSectionNames,
    groupedQuoteLines,
    collapsedSections,
    toggleSectionCollapse,
    handleDeleteLineItem,
    handleEditLineItem
}) => {
    // The conceptual JSX snippet you implemented goes here
    return (
        <div className={styles.wizardStep}>
            <h3 className="mb-md">Add Items to Quote</h3>

            {/* --- Area Selection --- */}
            <div className={styles.areaSelectionSection}>
                <label className={styles.activeSectionLabel}>Working Area/Section:</label>
                <AreaSelector
                    globalAreas={globalAreas}
                    activeSection={activeSection}
                    onChange={handleSetActiveSection}
                    isLoading={isLoadingAreas}
                />
                <span className={styles.activeSectionNote}>(Items added below go here)</span>
            </div>

            <hr className={styles.sectionDivider} />

            {/* --- Option 1: Add from Kit --- */}
            <div className={styles.kitAdditionSection}>
                <h4>Option 1: Add from Kit/Assembly</h4>
                <KitSelector
                    userId={userId} // Make sure userId is destructured
                    onSelect={handleKitSelected} // Make sure handleKitSelected is destructured
                />
                <button
                    type="button"
                    onClick={handleNavigateToKitCreator} // Make sure handleNavigateToKitCreator is destructured
                    className="btn btn-link btn-sm mt-sm"
                    title="Create or Edit Kits"
                >
                    Manage Kits
                </button>
            </div>

            <hr className={styles.sectionDivider} />

            {/* --- Option 2: Add Individual Item --- */}
            {/* Ensure itemSelectorRef is applied to the correct div if needed for scrolling */}
            <div className={styles.manualItemAdditionSection} ref={itemSelectorRef}>
                <h4>Option 2: Add Individual Item to "{activeSection || 'Default Section'}"</h4>
                 <div className={styles.selectorsGrid}>
                    <div className={styles.selectorWrapper}>
                        <TaskSelector
                            userId={userId}
                            onSelect={handleTaskSelectForItemForm}
                            onCreateCustomTask={() => handleOpenNewTaskModal()}
                            isLoading={isLoadingGlobals || isLoadingRates}
                            allTasks={allTasks}
                        />
                        <button type="button" onClick={() => handleOpenNewTaskModal()} className="btn btn-success btn-sm">+ Task</button>
                    </div>
                    <div className={styles.selectorWrapper}>
                        <MaterialSelector
                            userId={userId}
                            onSelect={handleMaterialSelectForItemForm}
                            onCreateCustomMaterial={() => handleOpenNewMaterialModal()}
                            isLoading={isLoadingGlobals || isLoadingRates}
                            allMaterials={allMaterials}
                        />
                        <button type="button" onClick={() => handleOpenNewMaterialModal()} className="btn btn-success btn-sm">+ Material</button>
                    </div>
                    {selectedMaterial && selectedMaterial.optionsAvailable && (
                        <MaterialOptionSelector
                            selectedMaterial={selectedMaterial}
                            onSelect={handleOptionSelectForItemForm}
                            currentOptionId={selectedOption?.id}
                        />
                    )}
                 </div>
                 {/* KitSelector was moved up, so it's not part of manualItemAdditionSection anymore */}
                 {/* <div className={styles.kitSelectorContainer}> ... KitSelector ... </div> */}


                 {(selectedTask || selectedMaterial) && (
                    <div className={styles.selectedItemsDetails}>
                        {selectedTask && <p>Task: {selectedTask.name} {selectedTask.isCustom ? '(Custom)' : ''}</p>}
                        {selectedMaterial && <p>Material: {selectedMaterial.name} {selectedMaterial.isCustom ? '(Custom)' : ''} {selectedMaterial.optionsAvailable ? '(Has Options)' : ''}</p>}
                        {selectedMaterial?.defaultRate !== undefined && <p><small>Material Base Rate: {formatCurrency(selectedMaterial.defaultRate)} / {selectedMaterial.defaultUnit}</small></p>}
                        {selectedOption && <p>Option: {selectedOption.name}</p>}
                        <p className={styles.calculatedRate}>
                            Calculated Rate: {formatCurrency(currentItemDetails.rate)} / {currentItemDetails.unit}
                            (Input Type: {currentItemDetails.inputType})
                        </p>
                    </div>
                 )}

                 <div className={styles.inputsGrid}>
                    {currentItemDetails.inputType === 'quantity' && (
                    <div className={styles.inputColumn}>
                        <label htmlFor="quantityInput">{currentItemDetails.isHourly ? 'Hours: ' : 'Quantity: '}</label>
                        <input id="quantityInput" type="number" value={selectedQuantity} onChange={e => setSelectedQuantity(Number(e.target.value) || 0)} min="0" step="any" />
                    </div>
                    )}
                    {(currentItemDetails.inputType === 'quantity' || currentItemDetails.inputType === 'price') && (
                    <div className={styles.inputColumn}>
                        <label htmlFor="rateInput">{currentItemDetails.inputType === 'quantity' ? 'Override Rate ($):' : 'Price ($):'}</label>
                        <input id="rateInput" type="number" placeholder={currentItemDetails.inputType === 'quantity' ? `Calc: ${currentItemDetails.rate.toFixed(2)}` : ''} value={overrideRateInput} onChange={e => setOverrideRateInput(e.target.value)} min="0" step="any" />
                        {currentItemDetails.inputType === 'quantity' && <span className={styles.rateUnitSpan}> per {currentItemDetails.unit}</span>}
                    </div>
                    )}
                    <div className={styles.descriptionInputGroup}>
                        <label htmlFor="descriptionInput">Line Item Description/Notes:</label>
                        <textarea id="descriptionInput" value={selectedDescription} onChange={e => setSelectedDescription(e.target.value)} rows={2} />
                    </div>
                 </div>
                 <button
                    type="button"
                    onClick={handleAddLineItem}
                    disabled={(!selectedTask && !selectedMaterial) || isLoadingQuote || !activeSection.trim()}
                    className="btn btn-primary"
                    title={!activeSection.trim() ? "Please select an active section first" : ""}
                  >
                    Add Line Item
                  </button>
            </div>

            <hr className={styles.sectionDivider} />

            {/* --- Current Quote Items --- */}
            <div className="quote-builder__line-items">
                <h3 className="mb-md">Current Quote Items</h3>
                {quoteLines.length === 0 && <p>No items added yet.</p>}
                {sortedSectionNames.map(sectionName => {
                    const linesInSection = groupedQuoteLines[sectionName];
                    if (!linesInSection || linesInSection.length === 0) return null;
                    const isCollapsed = collapsedSections[sectionName] ?? false;
                    const sectionSubtotal = linesInSection.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
                    return (
                        <div key={sectionName} className={styles.quoteSection}>
                            <h4
                                className={`${styles.sectionToggleHeader} ${isCollapsed ? styles.collapsed : ''}`}
                                onClick={() => toggleSectionCollapse(sectionName)}
                            >
                                <span> {isCollapsed ? '▶' : '▼'} {sectionName} ({linesInSection.length} items) </span>
                                <span className={styles.sectionSubtotal}>Subtotal: {formatCurrency(sectionSubtotal)}</span>
                            </h4>
                            {!isCollapsed && (
                                <div className={styles.sectionContent}>
                                    <ul className={styles.sectionLineItemsList}>
                                        {linesInSection.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((line) => (
                                            <QuoteLineItemDisplay
                                                key={line.id}
                                                item={line}
                                                onDelete={handleDeleteLineItem}
                                                onEdit={handleEditLineItem}
                                            />
                                        ))}
                                    </ul>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleSetActiveSection(sectionName);
                                            itemSelectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }}
                                        className="btn btn-secondary btn-sm mt-sm"
                                    >
                                        + Add another item to {sectionName}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                 })}
            </div>
        </div>
    );
};

export default Step2_LineItemBuilder;