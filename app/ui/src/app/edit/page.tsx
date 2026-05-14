// app/edit/page.tsx
"use client";

/**
 * Delivery edit screen: wires vehicle and address state into sections and pagination.
 */

import styles from "./edit.module.css";
import Navbar from "./components/Navbar";
import OptimizingModal from "./components/OptimizingModal";
import Sidebar from "./components/Sidebar/Sidebar";
import SidebarEditButton from "./components/Sidebar/SidebarEditButton";
import SidebarResultsButton from "./components/Sidebar/SidebarResultsButton";
import { PAGE_V2_BODY, PAGE_V2_MAIN } from "./formStyles.v2";
import VehicleSection from "./components/VehicleSection";
import AddressSection from "./components/AddressSection";
import AddressPagination from "./components/AddressPagination";
import { CSVImportModal } from "./components/CSVImportModal";
import { useVehicles } from "./hooks/useVehicles";
import { useAddresses } from "./hooks/useAddresses";
import { useOptimize } from "./hooks/useOptimize";
import { useCSVUpload } from "./hooks/useCSVUpload";
import { useCSVImport } from "./hooks/useCSVImport";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AddressCard } from "./types/delivery";
import { loadSessionFromFile } from "@/lib/session/importSession";
import { downloadSessionSave } from "@/lib/session/exportSession";
import {
  mapEditStateToOptimizeRequest,
  mapOptimizeRequestToEditState,
} from "./utils/sessionMapper";
import { useRouter } from "next/navigation";

type StoredUploadFile = { name: string; content: string };

export default function Page() {
  const router = useRouter();
  const vehicleState = useVehicles();
  const addressState = useAddresses();
  const [sessionError, setSessionError] = useState<string | null>(null);

  const {
    optimize,
    isOptimizing,
    optimizeError,
    clearOptimizeError,
    geocodeFailedAddressIds,
    geocodeFailedVehicleIds,
    outOfRegionAddressIds,
    outOfRegionVehicleIds,
  } = useOptimize(
    vehicleState.vehicles,
    addressState.addresses,
    vehicleState.cacheVehicleLocation,
    addressState.cacheAddressLocation
  );

  const { handleCSVUpload, csvError, clearCsvError } = useCSVUpload({
    importAddresses: addressState.importAddresses,
  });

  // In-page modal for CSV/JSON imports triggered from AddressSection
  const {
    csvData,
    isImportModalOpen,
    parseError,
    openImportModal,
    closeImportModal,
  } = useCSVImport();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    const hydrateImportedState = async () => {
      // Session save file (JSON with vehicles + deliveries schema)
      const storedSavePointFile = sessionStorage.getItem("savePointFile");
      if (storedSavePointFile) {
        sessionStorage.removeItem("savePointFile");
        try {
          const savedFile = parseStoredUploadFile(storedSavePointFile, "save point");
          const session = await loadSessionFromFile(
            new File([savedFile.content], savedFile.name, { type: "application/json" })
          );
          const importedState = mapOptimizeRequestToEditState(session);
          if (cancelled) return;
          vehicleState.importVehicles(importedState.vehicles);
          addressState.importAddresses(importedState.addresses);
        } catch (error) {
          if (!cancelled) {
            setSessionError(
              error instanceof Error ? error.message : "Failed to import the saved session."
            );
          }
        }
        return;
      }

      // Fully-built AddressCard[] written by CSVImportModal's onConfirmAndNavigate path.
      // No parsing needed — import directly into address state.
      const storedImportedCards = sessionStorage.getItem("importedCards");
      if (storedImportedCards) {
        sessionStorage.removeItem("importedCards");
        try {
          const cards = JSON.parse(storedImportedCards) as AddressCard[];
          if (!cancelled) addressState.importAddresses(reindexAddresses(cards));
        } catch (error) {
          if (!cancelled) setSessionError("Failed to import the selected entries.");
        }
        return;
      }

    };

    void hydrateImportedState();
    return () => { cancelled = true; };
  }, [addressState.importAddresses, vehicleState.importVehicles]);

  // Routes to /upload-save-point so the user can upload a .json save file
  // or a .csv/.json address list through the column-mapper modal flow.
  const handleImportSession = useCallback(() => {
    router.push("/upload-save-point");
  }, [router]);

  const handleExportSession = useCallback(async () => {
    setSessionError(null);
    try {
      const request = await mapEditStateToOptimizeRequest(
        vehicleState.vehicles,
        addressState.addresses
      );
      const result = downloadSessionSave(request);
      if (!result.ok) throw result.error;
    } catch (error) {
      setSessionError(
        error instanceof Error ? error.message : "Failed to export the session state."
      );
    }
  }, [addressState.addresses, vehicleState.vehicles]);

  const clearSessionError = useCallback(() => setSessionError(null), []);

  return (
    <div className={`min-h-screen flex flex-col bg-white font-sans-manrope ${styles.root}`}>
      {/* Hidden file input for in-page CSV/JSON import via AddressSection */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) openImportModal(file);
          e.target.value = "";
        }}
      />

      {/* In-page import modal — stays on edit page after confirm */}
      {isImportModalOpen && (
        <CSVImportModal
          csvData={csvData}
          onClose={closeImportModal}
          importAddresses={addressState.importAddresses}
        />
      )}

      <OptimizingModal isOpen={isOptimizing} />
      <Navbar
        onImportSession={handleImportSession}
        onExportSession={handleExportSession}
        onOptimize={optimize}
        isOptimizing={isOptimizing}
        error={sessionError ?? optimizeError ?? csvError ?? parseError}
        onClearError={() => { clearSessionError(); clearOptimizeError(); clearCsvError(); }}
      />
      <div className={PAGE_V2_BODY}>
        <Sidebar>
          <SidebarEditButton />
          <SidebarResultsButton />
        </Sidebar>
        <main className={PAGE_V2_MAIN}>
          <VehicleSection
            {...vehicleState}
            geocodeFailedVehicleIds={geocodeFailedVehicleIds}
            outOfRegionVehicleIds={outOfRegionVehicleIds}
          />
          <AddressSection
            {...addressState}
            geocodeFailedIds={geocodeFailedAddressIds}
            outOfRegionIds={outOfRegionAddressIds}
            onCSVUpload={handleCSVUpload}
            onCSVImport={() => fileInputRef.current?.click()}
          />
          <AddressPagination {...addressState} />
        </main>
      </div>
    </div>
  );
}

function parseStoredUploadFile(rawValue: string, label: string): StoredUploadFile {
  let parsed: unknown;
  try { parsed = JSON.parse(rawValue); } catch {
    throw new Error(`Invalid ${label} upload payload.`);
  }
  if (!parsed || typeof parsed !== "object" ||
    typeof (parsed as StoredUploadFile).name !== "string" ||
    typeof (parsed as StoredUploadFile).content !== "string") {
    throw new Error(`Invalid ${label} upload payload.`);
  }
  return parsed as StoredUploadFile;
}

function reindexAddresses(addresses: AddressCard[]): AddressCard[] {
  return addresses.map((address, index) => ({ ...address, id: index + 1 }));
}