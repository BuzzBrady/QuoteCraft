// src/components/QuoteSummary.tsx
// -------------
// Component to display the calculated summary/total of the quote lines.

import { useMemo } from 'react';
import { QuoteLine } from '../types'; // Adjust path if needed

// Define the props the component accepts
interface QuoteSummaryProps {
  lines: QuoteLine[]; // Array of current quote line items
}

// Helper function to format currency (basic example)
// You might want to move this to a shared utility file later
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '$0.00'; // Or handle as needed
  // Basic formatting, consider using Intl.NumberFormat for better localization
  return `$${amount.toFixed(2)}`;
};

function QuoteSummary({ lines }: QuoteSummaryProps) {

  // Calculate the total amount using useMemo for optimization
  // Recalculates only when the 'lines' array prop changes
  const totalAmount = useMemo(() => {
    // Sum up the 'lineTotal' from each line item
    // Initialize accumulator to 0 for empty arrays
    return lines.reduce((total, line) => total + line.lineTotal, 0);
  }, [lines]); // Dependency array - recalculate when lines change

  return (
    <div
        className="quote-summary" // Add class for styling
        style={{
            marginTop: '20px',
            padding: '15px',
            border: '1px solid #ccc',
            backgroundColor: '#f9f9f9'
        }}
    >
      <h4>Quote Summary</h4>
      {/* You could add more details here later, like subtotal, tax, etc. */}
      <div style={{ marginTop: '10px', fontSize: '1.2em', fontWeight: 'bold' }}>
        <span>Total Amount: </span>
        <span>{formatCurrency(totalAmount)}</span>
      </div>
      {/* Placeholder for future additions like tax calculation */}
      {/* <p>Subtotal: {formatCurrency(subtotal)}</p> */}
      {/* <p>Tax ({taxRate}%): {formatCurrency(taxAmount)}</p> */}
    </div>
  );
}

export default QuoteSummary;