// app/edit/page.tsx
"use client";

/**
 * Delivery edit screen: wires vehicle and address state into sections and pagination.
 */

import styles from "./edit.module.css";
import Navbar from "./components/Navbar";
import MobileNavbar from "./components/MobileNavbar";
import MobileSidebar from "./components/MobileSidebar";
import OptimizingModal from "./components/OptimizingModal";
import Sidebar from "./components/Sidebar/Sidebar";
import SidebarEditButton from "./components/Sidebar/SidebarEditButton";
import SidebarResultsButton from "./components/Sidebar/SidebarResultsButton";
import { PAGE_V2_ROOT, PAGE_V2_BODY, PAGE_V2_MAIN, ADDRESS_SECTION_WITH_PAGINATION } from "./formStyles.v2";
import VehicleSection from "./components/VehicleSection";
import AddressSection from "./components/AddressSection";
import AddressPagination from "./components/AddressPagination";
import { CSVImportModal } from "./components/CSVImportModal";
import AddressPaginationMobile from "./components/AddressPaginationMobile";
import EditPageFooter from "./components/EditPageFooter";
import MobileEditPageFooter from "./components/MobileEditPageFooter";
import MobileBottomBar from "./components/MobileBottomBar";
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
import AddressOverlay, { type LocationAddress } from "./components/AddressOverlay";

type StoredUploadFile = { name: string; content: string };

export default function Page() {
  const router = useRouter();
  const vehicleState = useVehicles();
  const addressState = useAddresses();
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { importVehicles } = vehicleState;
  const { importAddresses } = addressState;

  const {
    optimize,
    isOptimizing,
    optimizeError,
    clearOptimizeError,
    needsDepotAddress,
    dismissDepotAddressPrompt,
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
      const storedSavePointFile = sessionStorage.getItem("savePointFile");
      if (storedSavePointFile) {
        try {
          const savedFile = parseStoredUploadFile(storedSavePointFile, "save point");
          const session = await loadSessionFromFile(
            new File([savedFile.content], savedFile.name, { type: "application/json" })
          );
          const importedState = mapOptimizeRequestToEditState(session);
          if (cancelled) return;
          importVehicles(importedState.vehicles);
          importAddresses(importedState.addresses);
          sessionStorage.removeItem("savePointFile");
        } catch (error) {
          if (!cancelled) {
            setSessionError(
              error instanceof Error ? error.message : "Failed to import the saved session."
            );
          }
        }
        return;
      }

      const storedImportedCards = sessionStorage.getItem("importedCards");
      if (storedImportedCards) {
        sessionStorage.removeItem("importedCards");
        try {
          const cards = JSON.parse(storedImportedCards) as AddressCard[];
          if (!cancelled) importAddresses(reindexAddresses(cards));
        } catch {
          if (!cancelled) setSessionError("Failed to import the selected entries.");
        }
        return;
      }
    };

    void hydrateImportedState();

    return () => {
      cancelled = true;
    };
  }, [importVehicles, importAddresses]);

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

  const handleStartLocationSave = useCallback((addr: LocationAddress) => {
    const parts = [addr.line1];
    if (addr.line2.trim()) parts.push(addr.line2);
    parts.push(addr.city, `${addr.state} ${addr.zipCode}`, addr.country);
    const formattedAddress = parts.join(", ");
    void optimize(formattedAddress);
  }, [optimize]);

  return (
    <div className={`${PAGE_V2_ROOT} ${styles.root}`}>
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
      {needsDepotAddress && (
        <AddressOverlay
          heading="Enter starting location for all driver routes"
          onClose={dismissDepotAddressPrompt}
          onSave={handleStartLocationSave}
        />
      )}
      <MobileSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <MobileBottomBar
        onOptimize={() => void optimize()}
        onSave={handleExportSession}
        onExport={handleExportSession}
        isOptimizing={isOptimizing}
      />
      <MobileNavbar onMenuClick={() => setIsMobileMenuOpen(true)} />
      <Navbar
        onImportSession={handleImportSession}
        onExportSession={handleExportSession}
        onOptimize={() => void optimize()}
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
          <div className={ADDRESS_SECTION_WITH_PAGINATION}>
            <AddressSection
              {...addressState}
              geocodeFailedIds={geocodeFailedAddressIds}
              outOfRegionIds={outOfRegionAddressIds}
              onCSVUpload={handleCSVUpload}
              onCSVImport={() => fileInputRef.current?.click()}
            />
            <AddressPagination {...addressState} />
            <AddressPaginationMobile {...addressState} />
          </div>
          <EditPageFooter />
          <MobileEditPageFooter />
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