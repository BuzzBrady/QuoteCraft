// src/components/QuoteLineItemDisplay.tsx
// -------------
// Component to display a single line item from the quote.

import 'react';
import { QuoteLine } from '../types'; // Adjust path if needed ('../types' is likely correct)

// Define the props the component accepts
interface QuoteLineItemDisplayProps {
  item: QuoteLine; // The quote line data object
  onDelete: (id: string) => void; // Function to call when delete is clicked
  onEdit: (id: string) => void;   // Function to call when edit is clicked
}

// Helper function to format currency (basic example)
// You might want to move this to a shared utility file later
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return 'N/A'; // Or return $0.00 ?
  // Basic formatting, consider using Intl.NumberFormat for better localization
  return `$${amount.toFixed(2)}`;
};


function QuoteLineItemDisplay({ item, onDelete, onEdit }: QuoteLineItemDisplayProps) {

  return (
    <li
      // Use item.id which might be Firestore ID (if fetched) or temp UUID (if just added)
      // Ensure this ID is stable for React's reconciliation
      key={item.id}
      style={{
        border: '1px solid #eee',
        padding: '10px',
        marginBottom: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        listStyle: 'none' // Ensure no default list bullet
      }}
      className="quote-line-item-display" // Add class for styling
    >
      {/* Left side - Item Details */}
      <div style={{ flexGrow: 1, marginRight: '10px' }}>
        <strong style={{ display: 'block', marginBottom: '5px' }}>{item.displayName}</strong>
        {item.description && <p style={{ fontSize: '0.9em', color: '#555', margin: '0 0 5px 0' }}>{item.description}</p>}
        <span style={{ fontSize: '0.9em', color: '#333' }}>
          {/* Display details based on input type */}
          {item.inputType === 'quantity' && `Qty: ${item.quantity ?? '-'} | Unit: ${item.unit ?? '-'} | Rate: ${formatCurrency(item.referenceRate)}`}
          {item.inputType === 'price' && `Fixed Price: ${formatCurrency(item.price)}`}
          {item.inputType === 'checkbox' && `Item: ${formatCurrency(item.referenceRate ?? item.price)}`}
          {/* Fallback if inputType is null or unexpected */}
          {!item.inputType && `Details unavailable (Input Type missing)`}
        </span>
      </div>

      {/* Right side - Total and Actions */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <strong style={{ display: 'block', marginBottom: '10px' }}>{formatCurrency(item.lineTotal)}</strong>
        <button
          onClick={() => onEdit(item.id)} // Pass the specific item's ID
          style={{ marginRight: '5px', padding: '3px 8px', fontSize: '0.8em' }}
          aria-label={`Edit ${item.displayName}`} // Accessibility
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(item.id)} // Pass the specific item's ID
          style={{ padding: '3px 8px', fontSize: '0.8em', color: 'red', borderColor: 'red' }}
          aria-label={`Delete ${item.displayName}`} // Accessibility
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export default QuoteLineItemDisplay;