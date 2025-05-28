// src/components/QuoteSummary.tsx
// -------------
// Component to display the calculated summary/total of the quote lines.

import React, { useMemo } from 'react'; // Ensured React is imported
import { QuoteLine } from '../types';

// Define the props the component accepts
interface QuoteSummaryProps {
  lines: QuoteLine[];
}

// Helper function to format currency (Consider moving to a shared utility file)
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '$0.00';
  return `$${amount.toFixed(2)}`;
};

function QuoteSummary({ lines }: QuoteSummaryProps) {
  const totalAmount = useMemo(() => {
    return lines.reduce((total, line) => total + (line.lineTotal || 0), 0); // Added || 0 for safety
  }, [lines]);

  return (
    // Applied global utility classes for layout, spacing, and appearance
    // Using theme variables for background and border
    <div 
      className="mt-lg p-md rounded"
      style={{
        backgroundColor: 'var(--background-color-sections)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-color-main)' // Ensure text is visible on dark background
      }}
    >
      <h4 className="mb-md">Quote Summary</h4> {/* Global h4 styles apply */}
      {/* Using div with utility classes for total amount display */}
      <div className="d-flex justify-content-between align-items-center mt-md" style={{ fontSize: '1.2em'}}> {/* Kept fontSize as no direct h class matches 1.2em and bold is not a utility class */}
        <span className="font-weight-bold">Total Amount: </span> {/* Assuming font-weight-bold utility or rely on h tag */}
        <span className="font-weight-bold">{formatCurrency(totalAmount)}</span>
      </div>
    </div>
  );
}

export default QuoteSummary;
