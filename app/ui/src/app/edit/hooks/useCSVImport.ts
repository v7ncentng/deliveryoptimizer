// app/edit/hooks/useCSVImport.ts
/**
 * Handles CSV file parsing and controls visibility of the CSVImportModal.
 *
 * Usage:
 *   const { csvData, isImportModalOpen, openImportModal, closeImportModal } = useCSVImport();
 *
 *   // Attach openImportModal to a file <input onChange> handler.
 *   // Render <CSVImportModal> when isImportModalOpen is true.
 */

import { useState, useCallback } from "react";

export function useCSVImport() {
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const openImportModal = useCallback((file: File) => {
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;

        // Minimal RFC-4180 CSV parser:
        // Handles quoted fields (including fields with embedded commas/newlines),
        // CRLF and LF line endings, and empty trailing lines.
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentField = "";
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          const next = text[i + 1];

          if (inQuotes) {
            if (ch === '"' && next === '"') {
              // Escaped quote inside quoted field
              currentField += '"';
              i++;
            } else if (ch === '"') {
              inQuotes = false;
            } else {
              currentField += ch;
            }
          } else {
            if (ch === '"') {
              inQuotes = true;
            } else if (ch === ",") {
              currentRow.push(currentField.trim());
              currentField = "";
            } else if (ch === "\r" && next === "\n") {
              currentRow.push(currentField.trim());
              rows.push(currentRow);
              currentRow = [];
              currentField = "";
              i++; // skip \n
            } else if (ch === "\n" || ch === "\r") {
              currentRow.push(currentField.trim());
              rows.push(currentRow);
              currentRow = [];
              currentField = "";
            } else {
              currentField += ch;
            }
          }
        }

        // Push the last field/row if the file doesn't end with a newline
        if (currentField !== "" || currentRow.length > 0) {
          currentRow.push(currentField.trim());
          rows.push(currentRow);
        }

        // Filter out completely empty rows (e.g. trailing newline)
        const cleaned = rows.filter((row) => row.some((cell) => cell !== ""));

        if (cleaned.length < 2) {
          setParseError("CSV must have a header row and at least one data row.");
          return;
        }

        setCsvData(cleaned);
        setIsImportModalOpen(true);
      } catch {
        setParseError("Failed to parse CSV file. Please check the file format.");
      }
    };

    reader.onerror = () => {
      setParseError("Failed to read file.");
    };

    reader.readAsText(file);
  }, []);

  const closeImportModal = useCallback(() => {
    setIsImportModalOpen(false);
    setCsvData([]);
    setParseError(null);
  }, []);

  return {
    csvData,
    isImportModalOpen,
    parseError,
    openImportModal,
    closeImportModal,
  };
}