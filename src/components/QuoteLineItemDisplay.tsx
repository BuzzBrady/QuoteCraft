// src/components/QuoteLineItemDisplay.tsx
import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { QuoteLine } from '../types';
import { formatCurrency } from '../utils/utils';
import styles from './QuoteLineItemDisplay.module.css'; // Assuming you have or will create this
import { animateListItemIn, animateListItemOut } from '../utils/animations';

interface QuoteLineItemDisplayProps {
    item: QuoteLine;
    onDelete: (id: string) => void;
    onEdit: (id: string) => void;
    // isNewlyAdded?: boolean; // Optional: Could be used for more specific "add" animation triggers
}

const QuoteLineItemDisplay: React.FC<QuoteLineItemDisplayProps> = ({ item, onDelete, onEdit }) => {
    const lineItemRef = useRef<HTMLLIElement>(null);

    // Animate in on mount
    useGSAP(() => {
        if (lineItemRef.current) {
            animateListItemIn(lineItemRef.current);
        }
    }, { scope: lineItemRef }); // Scope to the item itself for cleanup

    const handleDelete = () => {
        if (lineItemRef.current) {
            animateListItemOut(lineItemRef.current, () => onDelete(item.id));
        } else {
            onDelete(item.id); // Fallback
        }
    };

    return (
        <li ref={lineItemRef} className={styles.quoteLineItem} style={{ opacity: 0 }}> {/* Start hidden */}
            <div className={styles.itemDetails}>
                <span className={styles.itemName}>{item.displayName}</span>
                {item.description && <small className={styles.itemDescription}>{item.description}</small>}
            </div>
            <div className={styles.itemPricing}>
                <span>
                    {item.inputType === 'price'
                        ? formatCurrency(item.price)
                        : `${item.quantity || 1} x ${formatCurrency(item.referenceRate)}`}
                    {item.unit && item.inputType === 'quantity' && ` / ${item.unit}`}
                </span>
                <strong className={styles.itemTotal}>{formatCurrency(item.lineTotal)}</strong>
            </div>
            <div className={styles.itemActions}>
                <button onClick={() => onEdit(item.id)} className="btn btn-secondary btn-sm">Edit</button>
                <button onClick={handleDelete} className="btn btn-danger btn-sm">Delete</button>
            </div>
        </li>
    );
};

export default QuoteLineItemDisplay;