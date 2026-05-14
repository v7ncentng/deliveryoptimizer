// app/edit/components/CSVImportModal.tsx
"use client";

/**
 * Two-step import flow:
 *   Step 1 — Column mapper: match file columns to AddressCard fields, preview 3 rows.
 *   Step 2 — Entry selector: checkbox table, select/deselect rows, confirm imports.
 *
 * Two confirm modes:
 *   - importAddresses (in-page): calls the hook directly, stays on edit page.
 *   - onConfirmAndNavigate (upload flow): stores results in sessionStorage as
 *     "addressFiles" then calls router.push("/edit"), triggering the edit page's
 *     existing hydration useEffect to pick them up on mount.
 *
 * Works with both CSV and raw JSON arrays — useCSVImport normalises both to
 * string[][] before this modal receives them.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AddressCard } from "../types/delivery";

// ─── Types ────────────────────────────────────────────────────────────────────

type MappableField =
  | "recipientAddress"
  | "deliveryTimeStart"
  | "deliveryTimeEnd"
  | "deliveryQuantity"
  | "timeBuffer"
  | "notes"
  | "";

const FIELD_LABELS: Record<Exclude<MappableField, "">, string> = {
  recipientAddress: "Recipient Address",
  deliveryTimeStart: "Delivery Time Start",
  deliveryTimeEnd: "Delivery Time End",
  deliveryQuantity: "Delivery Quantity",
  timeBuffer: "Time Buffer",
  notes: "Notes",
};

interface CSVImportModalProps {
  /** Normalised file data: first row is headers, rest are data rows. */
  csvData: string[][];
  onClose: () => void;
  /**
   * In-page mode: directly populates the edit page address state.
   * Provide either this OR onConfirmAndNavigate, not both.
   */
  importAddresses?: (addresses: AddressCard[]) => void;
  /**
   * Upload-flow mode: serialises selected rows to sessionStorage as
   * "addressFiles" then navigates to /edit.
   * Provide either this OR importAddresses, not both.
   */
  onConfirmAndNavigate?: true;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAddressCards(
  rows: string[][],
  headers: string[],
  mapping: Record<string, MappableField>,
  selectedIndices: Set<number>
): AddressCard[] {
  let idCounter = 1;
  return rows
    .filter((_, i) => selectedIndices.has(i))
    .map((row) => {
      const card: AddressCard = {
        id: idCounter++,
        locked: true,
        editingExisting: false,
        recipientAddress: "",
        timeBuffer: "",
        deliveryTimeStart: "",
        deliveryTimeEnd: "",
        deliveryQuantity: 0,
        notes: "",
      };
      headers.forEach((header, colIdx) => {
        const field = mapping[header];
        if (!field) return;
        const val = row[colIdx] ?? "";
        if (field === "deliveryQuantity") {
          card.deliveryQuantity = parseInt(val, 10) || 0;
        } else {
          (card as Record<string, unknown>)[field] = val;
        }
      });
      return card;
    });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModalBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 100,
        backdropFilter: "blur(2px)",
      }}
    />
  );
}

function ModalShell({ children, width = 580 }: { children: React.ReactNode; width?: number }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 101,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          pointerEvents: "all",
          fontFamily: "'DM Sans', sans-serif",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div style={{ padding: "24px 24px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#111" }}>{title}</h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#777" }}>{subtitle}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            color: "#999",
            display: "flex",
            alignItems: "center",
            borderRadius: "6px",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Step 1: Column Mapper ────────────────────────────────────────────────────

function StepOne({
  headers,
  dataRows,
  mapping,
  onMappingChange,
  onCancel,
  onNext,
}: {
  headers: string[];
  dataRows: string[][];
  mapping: Record<string, MappableField>;
  onMappingChange: (header: string, field: MappableField) => void;
  onCancel: () => void;
  onNext: () => void;
}) {
  const previewRows = dataRows.slice(0, 3);

  return (
    <>
      <ModalHeader
        title="Import from file"
        subtitle="Match your file columns to our fields"
        onClose={onCancel}
      />
      <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px 0" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "0 16px",
            paddingBottom: "10px",
            borderBottom: "1.5px solid #e8e8e8",
          }}
        >
          {["File column", "Delivery Optimizer column", "Preview"].map((h) => (
            <span key={h} style={{ fontSize: "12px", fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {h}
            </span>
          ))}
        </div>

        {headers.map((header) => (
          <div
            key={header}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "0 16px",
              alignItems: "center",
              padding: "14px 0",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <span style={{ fontSize: "14px", color: "#222" }}>
              {header.charAt(0).toUpperCase() + header.slice(1)}
            </span>
            <select
              value={mapping[header] ?? ""}
              onChange={(e) => onMappingChange(header, e.target.value as MappableField)}
              style={{
                fontSize: "13px",
                border: "1.5px solid #e0e0e0",
                borderRadius: "8px",
                padding: "7px 10px",
                color: mapping[header] ? "#111" : "#aaa",
                background: "#fff",
                cursor: "pointer",
                appearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 10px center",
                paddingRight: "28px",
              }}
            >
              <option value="">Select</option>
              {(Object.keys(FIELD_LABELS) as Exclude<MappableField, "">[]).map((f) => (
                <option key={f} value={f}>{FIELD_LABELS[f]}</option>
              ))}
            </select>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
              {previewRows.map((row, i) => {
                const val = row[headers.indexOf(header)] ?? "—";
                // Shrink font proportionally for longer values so they fit the column
                const fontSize = val.length > 40 ? "10px" : val.length > 25 ? "11px" : "12px";
                return (
                  <span
                    key={i}
                    style={{
                      fontSize,
                      color: "#111",
                      lineHeight: 1.4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                    }}
                  >
                    {val}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "16px 24px", display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #f0f0f0" }}>
        <button
          onClick={onCancel}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#555", fontFamily: "inherit", padding: "10px 16px", borderRadius: "8px" }}
        >
          Cancel
        </button>
        <button
          onClick={onNext}
          style={{ background: "#4a9d7f", color: "#fff", border: "none", borderRadius: "999px", padding: "10px 24px", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          Next
        </button>
      </div>
    </>
  );
}

// ─── Step 2: Entry Selector ───────────────────────────────────────────────────

function StepTwo({
  headers,
  dataRows,
  mapping,
  selected,
  onToggleAll,
  onToggleRow,
  onBack,
  onCancel,
  onConfirm,
}: {
  headers: string[];
  dataRows: string[][];
  mapping: Record<string, MappableField>;
  selected: Set<number>;
  onToggleAll: (checked: boolean) => void;
  onToggleRow: (index: number) => void;
  onBack: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const addressColIdx = headers.findIndex((h) => mapping[h] === "recipientAddress");
  const quantityColIdx = headers.findIndex((h) => mapping[h] === "deliveryQuantity");
  const scheduleColIdx = headers.findIndex((h) => mapping[h] === "deliveryTimeStart");

  // For the Name column: prefer any column mapped to a field that isn't
  // address/quantity/schedule, otherwise use the first unmapped column,
  // otherwise fall back to row index. This matches what the design shows
  // (e.g. "Kayla Wong", "Karen Liang") from a recipient/name column.
  const nameColIdx = (() => {
    const nameField = headers.find(
      (h) => mapping[h] && !["recipientAddress", "deliveryQuantity", "deliveryTimeStart", "deliveryTimeEnd", "timeBuffer", "notes"].includes(mapping[h])
    );
    if (nameField !== undefined) return headers.indexOf(nameField);
    const unmapped = headers.find((h) => !mapping[h]);
    if (unmapped !== undefined) return headers.indexOf(unmapped);
    return -1;
  })();

  const allChecked = dataRows.length > 0 && selected.size === dataRows.length;
  const someChecked = selected.size > 0 && !allChecked;

  return (
    <>
      <ModalHeader
        title="Import from file"
        subtitle="Review and select information to import"
        onClose={onCancel}
      />
      <div style={{ overflowY: "auto", flex: 1, padding: "16px 24px 0" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "32px 1fr 1.4fr 80px 90px",
            gap: "0 12px",
            alignItems: "center",
            paddingBottom: "10px",
            borderBottom: "1.5px solid #e8e8e8",
          }}
        >
          <input
            type="checkbox"
            checked={allChecked}
            ref={(el) => { if (el) el.indeterminate = someChecked; }}
            onChange={(e) => onToggleAll(e.target.checked)}
            style={{ cursor: "pointer", accentColor: "#4a9d7f", width: "16px", height: "16px" }}
          />
          {["Name", "Address", "Quantity", "Schedule"].map((h) => (
            <span key={h} style={{ fontSize: "12px", fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {h}
            </span>
          ))}
        </div>
        {dataRows.map((row, i) => {
          const isChecked = selected.has(i);
          const nameVal = nameColIdx >= 0 ? (row[nameColIdx] ?? `Row ${i + 1}`) : `Row ${i + 1}`;
          const addressVal = addressColIdx >= 0 ? (row[addressColIdx] ?? "—") : "—";
          const quantityVal = quantityColIdx >= 0 ? (row[quantityColIdx] ?? "—") : "—";
          const scheduleVal = scheduleColIdx >= 0 ? (row[scheduleColIdx] ?? "—") : "—";
          return (
            <div
              key={i}
              onClick={() => onToggleRow(i)}
              style={{
                display: "grid",
                gridTemplateColumns: "32px 1fr 1.4fr 80px 90px",
                gap: "0 12px",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid #f0f0f0",
                cursor: "pointer",
                borderRadius: "6px",
                background: isChecked ? "rgba(74,157,127,0.04)" : "transparent",
                transition: "background 0.1s",
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggleRow(i)}
                onClick={(e) => e.stopPropagation()}
                style={{ cursor: "pointer", accentColor: "#4a9d7f", width: "16px", height: "16px" }}
              />
              <span style={{ fontSize: "13px", color: "#111", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameVal}</span>
              <span style={{ fontSize: "13px", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{addressVal}</span>
              <span style={{ fontSize: "13px", color: "#555" }}>{quantityVal}</span>
              <span style={{ fontSize: "13px", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scheduleVal}</span>
            </div>
          );
        })}
      </div>
      <div style={{ padding: "14px 24px", borderTop: "1px solid #f0f0f0" }}>
        <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#555" }}>
          {selected.size} {selected.size === 1 ? "entry" : "entries"} will be imported
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#555", fontFamily: "inherit", padding: "10px 0" }}>
            Back
          </button>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#555", fontFamily: "inherit", padding: "10px 16px", borderRadius: "8px" }}>
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={selected.size === 0}
              style={{
                background: selected.size > 0 ? "#4a9d7f" : "#c8d8d3",
                color: "#fff",
                border: "none",
                borderRadius: "999px",
                padding: "10px 24px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: selected.size > 0 ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                transition: "background 0.15s",
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function CSVImportModal({
  csvData,
  onClose,
  importAddresses,
  onConfirmAndNavigate,
}: CSVImportModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  const headers = csvData[0] ?? [];
  const dataRows = csvData.slice(1).filter((row) => row.some((cell) => cell.trim() !== ""));

  const [mapping, setMapping] = useState<Record<string, MappableField>>(() =>
    Object.fromEntries(headers.map((h) => [h, "" as MappableField]))
  );

  const handleMappingChange = useCallback((header: string, field: MappableField) => {
    setMapping((prev) => ({ ...prev, [header]: field }));
  }, []);

  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(dataRows.map((_, i) => i))
  );

  const handleToggleAll = useCallback((checked: boolean) => {
    setSelected(checked ? new Set(dataRows.map((_, i) => i)) : new Set());
  }, [dataRows]);

  const handleToggleRow = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const cards = buildAddressCards(dataRows, headers, mapping, selected);

    if (onConfirmAndNavigate) {
      // Store the fully-built AddressCard[] directly — no re-parsing needed.
      // edit/page.tsx reads "importedCards" on mount and calls importAddresses()
      // directly, bypassing parseAddressUpload entirely.
      sessionStorage.setItem("importedCards", JSON.stringify(cards));
      router.push("/edit");
    } else if (importAddresses) {
      importAddresses(cards);
      onClose();
    }
  }, [dataRows, headers, mapping, selected, importAddresses, onConfirmAndNavigate, onClose, router]);

  return (
    <>
      <ModalBackdrop onClose={onClose} />
      <ModalShell width={step === 1 ? 580 : 680}>
        {step === 1 ? (
          <StepOne
            headers={headers}
            dataRows={dataRows}
            mapping={mapping}
            onMappingChange={handleMappingChange}
            onCancel={onClose}
            onNext={() => setStep(2)}
          />
        ) : (
          <StepTwo
            headers={headers}
            dataRows={dataRows}
            mapping={mapping}
            selected={selected}
            onToggleAll={handleToggleAll}
            onToggleRow={handleToggleRow}
            onBack={() => setStep(1)}
            onCancel={onClose}
            onConfirm={handleConfirm}
          />
        )}
      </ModalShell>
    </>
  );
}