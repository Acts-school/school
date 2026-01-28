"use client";

export function PrintReceiptToolbar() {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleClose = () => {
    if (typeof window !== "undefined") {
      window.close();
    }
  };

  return (
    <div className="no-print p-2 text-center text-xs">
      <button
        type="button"
        onClick={handlePrint}
        className="px-2 py-1 mr-2 border border-gray-400 rounded"
      >
        Print
      </button>
      <button
        type="button"
        onClick={handleClose}
        className="px-2 py-1 border border-gray-400 rounded"
      >
        Close
      </button>
    </div>
  );
}
