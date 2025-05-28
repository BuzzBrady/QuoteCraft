// src/components/QuoteLineItemDisplay.tsx
// -------------
// Component to display a single line item from the quote.

import React from 'react'; // Ensured React is imported
import { QuoteLine } from '../types';

// Define the props the component accepts
interface QuoteLineItemDisplayProps {
  item: QuoteLine;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

// Helper function to format currency (Consider moving to a shared utility file)
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return 'N/A';
  return `$${amount.toFixed(2)}`;
};

function QuoteLineItemDisplay({ item, onDelete, onEdit }: QuoteLineItemDisplayProps) {
  return (
    <li
      key={item.id} // React key
      // Applied global utility classes for layout, spacing, and appearance
      className="d-flex justify-content-between align-items-start p-md mb-md border rounded"
      style={{ listStyle: 'none' }} // Explicitly keep list-style none if not globally reset
    >
      {/* Left side - Item Details */}
      <div className="flex-grow-1 mr-md"> {/* Flex utility for growth and margin */}
        <strong className="d-block mb-xs">{item.displayName}</strong>
        {item.description && (
          <p className="text-muted mb-xs" style={{ fontSize: '0.9em' }}> {/* text-muted and specific font-size if no utility */}
            {item.description}
          </p>
        )}
        <span style={{ fontSize: '0.9em' }} className="text-muted"> {/* text-muted and specific font-size if no utility */}
          {item.inputType === 'quantity' && `Qty: ${item.quantity ?? '-'} | Unit: ${item.unit ?? '-'} | Rate: ${formatCurrency(item.referenceRate)}`}
          {item.inputType === 'price' && `Fixed Price: ${formatCurrency(item.price)}`}
          {item.inputType === 'checkbox' && `Item: ${formatCurrency(item.referenceRate ?? item.price)}`}
          {!item.inputType && `Details unavailable (Input Type missing)`}
        </span>
      </div>

      {/* Right side - Total and Actions */}
      <div className="text-right flex-shrink-0"> {/* Text alignment and flex utility */}
        <strong className="d-block mb-sm">{formatCurrency(item.lineTotal)}</strong>
        <button
          onClick={() => onEdit(item.id)}
          className="btn btn-secondary btn-sm mr-xs" // Global button styles
          aria-label={`Edit ${item.displayName}`}
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="btn btn-danger btn-sm" // Global button styles
          aria-label={`Delete ${item.displayName}`}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export default QuoteLineItemDisplay;
