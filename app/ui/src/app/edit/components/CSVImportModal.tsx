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
 *     "importedCards" then calls router.push("/edit"), triggering the edit page's
 *     existing hydration useEffect to pick them up on mount.
 *
 * Works with both CSV and raw JSON arrays — useCSVImport normalises both to
 * string[][] before this modal receives them.
 */

import { useState, useCallback, useMemo } from "react";
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

/**
 * Discriminated union enforces that exactly one confirm mode is provided:
 *   - InPage: importAddresses is called directly, modal closes, page stays.
 *   - Navigate: importedCards written to sessionStorage, router pushes to /edit.
 * Passing neither or both is a compile-time error.
 */
type CSVImportModalProps =
  | {
      csvData: string[][];
      onClose: () => void;
      importAddresses: (addresses: AddressCard[]) => void;
      onConfirmAndNavigate?: never;
    }
  | {
      csvData: string[][];
      onClose: () => void;
      importAddresses?: never;
      onConfirmAndNavigate: true;
    };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAddressCards(
  rows: string[][],
  headers: string[],
  mapping: Record<string, MappableField>,
  selectedIndices: Set<number>,
): AddressCard[] {
  let idCounter = 1;
  return rows
    .filter((_, i) => selectedIndices.has(i))
    .map((row) => {
      const card: AddressCard = {
        id: idCounter++,
        locked: true,
        editingExisting: false,
        recipientName: "",
        phoneNumber: "",
        recipientAddress: "",
        timeBuffer: 0,
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
        } else if (field === "timeBuffer") {
          card.timeBuffer = parseInt(val, 10) || 0;
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

function ModalShell({
  children,
  width = 580,
}: {
  children: React.ReactNode;
  width?: number;
}) {
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

function ModalHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <div style={{ padding: "24px 24px 0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "17px",
              fontWeight: 700,
              color: "#111",
            }}
          >
            {title}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#777" }}>
            {subtitle}
          </p>
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
            <path
              d="M2 2l14 14M16 2L2 16"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
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
            <span
              key={h}
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
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
              onChange={(e) =>
                onMappingChange(header, e.target.value as MappableField)
              }
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
              {(Object.keys(FIELD_LABELS) as Exclude<MappableField, "">[]).map(
                (f) => (
                  <option key={f} value={f}>
                    {FIELD_LABELS[f]}
                  </option>
                ),
              )}
            </select>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                overflow: "hidden",
              }}
            >
              {previewRows.map((row, i) => {
                const val = row[headers.indexOf(header)] ?? "—";
                // Shrink font proportionally for longer values so they fit the column
                const fontSize =
                  val.length > 40 ? "10px" : val.length > 25 ? "11px" : "12px";
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
      <div
        style={{
          padding: "16px 24px",
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
          borderTop: "1px solid #f0f0f0",
        }}
      >
        <button
          onClick={onCancel}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            color: "#555",
            fontFamily: "inherit",
            padding: "10px 16px",
            borderRadius: "8px",
          }}
        >
          Cancel
        </button>
        <button
          onClick={onNext}
          disabled={!Object.values(mapping).includes("recipientAddress")}
          style={{
            background: Object.values(mapping).includes("recipientAddress")
              ? "#4a9d7f"
              : "#c8d8d3",
            color: "#fff",
            border: "none",
            borderRadius: "999px",
            padding: "10px 24px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: Object.values(mapping).includes("recipientAddress")
              ? "pointer"
              : "not-allowed",
            fontFamily: "inherit",
          }}
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
  // Show every column that has been mapped, in the order they appear in the file.
  // Unmapped columns (Select) are excluded since they carry no meaning.
  const mappedHeaders = headers.filter((h) => mapping[h]);

  const allChecked = dataRows.length > 0 && selected.size === dataRows.length;
  const someChecked = selected.size > 0 && !allChecked;

  const COL_MIN = 160; // minimum px width per data column

  return (
    <>
      <ModalHeader
        title="Import from file"
        subtitle="Review and select information to import"
        onClose={onCancel}
      />

      {/* Horizontally scrollable table */}
      <div
        style={{
          overflowX: "auto",
          overflowY: "auto",
          flex: 1,
          padding: "16px 0 0",
        }}
      >
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            minWidth: `${32 + mappedHeaders.length * COL_MIN}px`,
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1.5px solid #e8e8e8" }}>
              {/* Select-all checkbox */}
              <th
                style={{
                  width: "52px",
                  padding: "0 12px 10px 24px",
                  textAlign: "left",
                  position: "sticky",
                  left: 0,
                  background: "#fff",
                  zIndex: 2,
                }}
              >
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = someChecked;
                  }}
                  onChange={(e) => onToggleAll(e.target.checked)}
                  style={{
                    cursor: "pointer",
                    accentColor: "#4a9d7f",
                    width: "16px",
                    height: "16px",
                  }}
                />
              </th>
              {mappedHeaders.map((h) => (
                <th
                  key={h}
                  style={{
                    minWidth: `${COL_MIN}px`,
                    padding: "0 16px 10px 0",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#888",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {FIELD_LABELS[mapping[h] as Exclude<MappableField, "">] ?? h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, i) => {
              const isChecked = selected.has(i);
              return (
                <tr
                  key={i}
                  onClick={() => onToggleRow(i)}
                  style={{
                    borderBottom: "1px solid #f0f0f0",
                    cursor: "pointer",
                    background: isChecked
                      ? "rgba(74,157,127,0.04)"
                      : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  {/* Sticky checkbox column */}
                  <td
                    style={{
                      padding: "12px 12px 12px 24px",
                      position: "sticky",
                      left: 0,
                      background: isChecked ? "#f0faf7" : "#fff",
                      zIndex: 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleRow(i)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        cursor: "pointer",
                        accentColor: "#4a9d7f",
                        width: "16px",
                        height: "16px",
                      }}
                    />
                  </td>
                  {mappedHeaders.map((h) => {
                    const val = row[headers.indexOf(h)] ?? "—";
                    return (
                      <td
                        key={h}
                        style={{
                          padding: "12px 16px 12px 0",
                          fontSize: "13px",
                          color: "#111",
                          whiteSpace: "nowrap",
                          maxWidth: "240px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={val}
                      >
                        {val}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ padding: "14px 24px", borderTop: "1px solid #f0f0f0" }}>
        <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#555" }}>
          {selected.size} {selected.size === 1 ? "entry" : "entries"} will be
          imported
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              color: "#555",
              fontFamily: "inherit",
              padding: "10px 0",
            }}
          >
            Back
          </button>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={onCancel}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                color: "#555",
                fontFamily: "inherit",
                padding: "10px 16px",
                borderRadius: "8px",
              }}
            >
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

  const headers = useMemo(() => csvData[0] ?? [], [csvData]);
  const dataRows = useMemo(
    () =>
      csvData.slice(1).filter((row) => row.some((cell) => cell.trim() !== "")),
    [csvData],
  );

  const [mapping, setMapping] = useState<Record<string, MappableField>>(() =>
    Object.fromEntries(headers.map((h) => [h, "" as MappableField])),
  );

  const handleMappingChange = useCallback(
    (header: string, field: MappableField) => {
      setMapping((prev) => ({ ...prev, [header]: field }));
    },
    [],
  );

  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(dataRows.map((_, i) => i)),
  );

  const handleToggleAll = useCallback(
    (checked: boolean) => {
      setSelected(checked ? new Set(dataRows.map((_, i) => i)) : new Set());
    },
    [dataRows],
  );

  const handleToggleRow = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
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
  }, [
    dataRows,
    headers,
    mapping,
    selected,
    importAddresses,
    onConfirmAndNavigate,
    onClose,
    router,
  ]);

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
