// app/upload-save-point/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import ShellNavbar from "@/app/components/ShellNavbar";
import { formatSize } from "@/app/utils/routeUtils";
import { CSVImportModal } from "@/app/edit/components/CSVImportModal";
import { useCSVImport } from "@/app/edit/hooks/useCSVImport";
import { migrateSessionSaveFile } from "@/lib/validation/session.schema";

export default function UploadSavePointPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const dragDepth = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { csvData, isImportModalOpen, parseError, openImportModal, closeImportModal } =
    useCSVImport();

  const handleFile = (f: File) => {
    if (f.name.endsWith(".json") || f.name.endsWith(".csv")) {
      setFile(f);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleContinue = useCallback(async () => {
    if (!file || isProcessing) return;
    setIsProcessing(true);

    try {
      if (file.name.endsWith(".json")) {
        const text = await file.text();
        const parsed = JSON.parse(text);

        // Try to validate as a proper session save.
        // If it passes, store under savePointFile and let edit/page.tsx
        // restore the full session state via loadSessionFromFile.
        try {
          migrateSessionSaveFile(parsed);
          sessionStorage.setItem(
            "savePointFile",
            JSON.stringify({ name: file.name, content: text })
          );
          router.push("/edit");
          return;
        } catch {
          // Not a session save — fall through to the modal flow below
        }
      }

      // CSV or raw JSON array: open the two-step modal (column mapper →
      // row selector). On Confirm, modal writes "addressFiles" to
      // sessionStorage and navigates to /edit automatically.
      openImportModal(file);
    } finally {
      setIsProcessing(false);
    }
  }, [file, isProcessing, openImportModal, router]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');

        .upload-root {
          min-height: 100vh;
          background: #f7f7f5;
          display: flex;
          flex-direction: column;
          font-family: 'DM Sans', sans-serif;
        }

        .upload-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
        }

        .upload-title {
          font-family: 'DM Serif Display', serif;
          font-size: 2rem;
          font-weight: 400;
          color: #111;
          margin-bottom: 8px;
          text-align: center;
          letter-spacing: -0.01em;
        }

        .upload-subtitle {
          font-size: 14px;
          color: #888;
          margin-bottom: 32px;
          text-align: center;
        }

        .upload-dropzone {
          width: 100%;
          max-width: 580px;
          border: 1.5px dashed #ccc;
          border-radius: 12px;
          padding: 52px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          background: #f9f9f8;
          transition: border-color 0.15s, background 0.15s;
          margin-bottom: 16px;
        }

        .upload-dropzone.dragging {
          border-color: #4a8c7a;
          background: #f0f7f5;
        }

        .upload-dropzone-icon { color: #555; margin-bottom: 4px; }

        .upload-dropzone-text {
          font-size: 14px;
          color: #333;
          text-align: center;
        }

        .upload-dropzone-browse {
          font-size: 14px;
          color: #4a8c7a;
          font-weight: 500;
          text-align: center;
        }

        .upload-file-row {
          width: 100%;
          max-width: 580px;
          background: #eef5f3;
          border: 1px solid #d0e5df;
          border-radius: 8px;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
        }

        .upload-file-name {
          font-size: 13px;
          font-weight: 500;
          color: #111;
          flex: 1;
        }

        .upload-file-size { font-size: 12px; color: #666; }

        .upload-file-remove {
          background: none;
          border: none;
          cursor: pointer;
          color: #555;
          padding: 4px;
          display: flex;
          align-items: center;
          font-size: 18px;
          line-height: 1;
        }

        .upload-actions {
          width: 100%;
          max-width: 580px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
        }

        .upload-back-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          color: #555;
        }

        .upload-continue-btn {
          background: #4a8c7a;
          color: #fff;
          border: none;
          border-radius: 999px;
          padding: 10px 28px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }

        .upload-continue-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .upload-parse-error {
          width: 100%;
          max-width: 580px;
          font-size: 13px;
          color: #c0392b;
          margin-bottom: 12px;
          text-align: center;
        }
      `}</style>

      <div className="upload-root">
        <ShellNavbar />

        {/* Modal renders over the upload page — navigation only happens after Confirm */}
        {isImportModalOpen && (
          <CSVImportModal
            csvData={csvData}
            onClose={closeImportModal}
            onConfirmAndNavigate
          />
        )}

        <div className="upload-content">
          <h2 className="upload-title">Upload your save point</h2>
          <p className="upload-subtitle">
            Continue editing from where you left off.
          </p>

          <div
            className={`upload-dropzone${isDragging ? " dragging" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="upload-dropzone-icon">📄</div>
            <p className="upload-dropzone-text">
              Drag and drop .json or .csv files here, or
            </p>
            <p className="upload-dropzone-browse">Browse files</p>
            <input
              ref={inputRef}
              type="file"
              accept=".json,.csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {file && (
            <div className="upload-file-row">
              <span className="upload-file-name">{file.name}</span>
              <span className="upload-file-size">{formatSize(file.size)}</span>
              <button
                className="upload-file-remove"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
              >
                ×
              </button>
            </div>
          )}

          {parseError && (
            <p className="upload-parse-error">{parseError}</p>
          )}

          <div className="upload-actions">
            <button className="upload-back-btn" onClick={() => router.back()}>
              Back
            </button>
            <button
              className="upload-continue-btn"
              onClick={() => void handleContinue()}
              disabled={!file || isProcessing}
            >
              {isProcessing ? "Processing..." : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}