// src/components/QuoteLineItemDisplay.tsx

import React, { useMemo } from 'react';
import { useQuoteBuilderStore } from '../stores/useQuoteBuilderStore';
import { groupLinesBySection, formatCurrency } from '../utils/utils';
import styles from './QuoteLineItemDisplay.module.css';

interface QuoteLineItemDisplayProps {
  readOnly?: boolean;
  onEdit?: (lineId: string) => void; // Optional edit handler
}

const QuoteLineItemDisplay: React.FC<QuoteLineItemDisplayProps> = ({ readOnly = false, onEdit }) => {
    const { lines, removeLine } = useQuoteBuilderStore();

    const groupedLines = useMemo(() => groupLinesBySection(lines), [lines]);
    const sortedSectionNames = useMemo(() => Object.keys(groupedLines).sort(), [groupedLines]);

    const handleDelete = (lineId: string) => {
        if (window.confirm('Are you sure you want to remove this item?')) {
            removeLine(lineId);
        }
    };

    return (
        <div className={styles.lineItemDisplay}>
            {sortedSectionNames.map(sectionName => (
                <div key={sectionName} className={styles.section}>
                    <h4 className={styles.sectionHeader}>{sectionName}</h4>
                    {groupedLines[sectionName].map(line => (
                        <div key={line.id} className={styles.lineItem}>
                            <div className={styles.lineItemDetails}>
                                <span className={styles.displayName}>{line.displayName}</span>
                                {line.description && <p className={styles.description}>{line.description}</p>}
                                <div className={styles.meta}>
                                    {line.quantity && <span>Qty: {line.quantity}</span>}
                                    {line.unit && <span>Unit: {line.unit}</span>}
                                    {line.price && <span>Price: {formatCurrency(line.price)}</span>}
                                </div>
                            </div>
                            <div className={styles.lineItemRight}>
                                <span className={styles.lineTotal}>{formatCurrency(line.lineTotal)}</span>
                                {!readOnly && (
                                    <div className={styles.actions}>
                                        {onEdit && <button onClick={() => onEdit(line.id)}>Edit</button>}
                                        <button onClick={() => handleDelete(line.id)} className={styles.deleteButton}>X</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default QuoteLineItemDisplay;
