"use client";

/**
 * Vehicle grid: column headers plus one VehicleRow per vehicle, and an Add control below.
 */

import { useState } from "react";
import VehicleRow from "./VehicleRow";
import VehicleDetailsOverlay from "./VehicleDetailsOverlay";
import type { VehicleRow as VehicleRowType } from "../types/delivery";
import { DESKTOP_VEHICLE_GRID_CLASS } from "../formStyles";
import {
  NAVBAR_V2_BTN_OUTLINE,
  VEHICLE_INFO_CONTAINER,
  VEHICLE_INFO_DIVIDER,
  VEHICLE_INFO_HEADER_CELL,
  VEHICLE_INFO_HEADER_ROW,
  VEHICLE_SECTION_BTN_GHOST,
  VEHICLE_SECTION_HEADER,
  VEHICLE_SECTION_HEADING,
  VEHICLE_SECTION_SUBHEADING,
} from "../formStyles.v2";

const BLANK_VEHICLE: VehicleRowType = {
  id: 0,
  locked: false,
  editingExisting: false,
  name: "",
  startLocation: "",
  type: "",
  capacityUnit: "",
  capacity: 0,
  available: true,
  departureTime: "",
};

type VehicleSectionProps = {
  vehicles: VehicleRowType[];
  addVehicle: () => void;
  addVehicleWithDetails: (details: Pick<VehicleRowType, "name" | "type" | "capacity" | "capacityUnit" | "available" | "departureTime">) => void;
  markAllAvailable: () => void;
  updateVehicle: <K extends keyof VehicleRowType>(id: number, key: K, value: VehicleRowType[K]) => void;
  deleteVehicle: (id: number) => void;
  unlockVehicle: (id: number) => void;
  confirmVehicle: (id: number) => void;
  touchedIds: Set<number>;
  allVehiclesLocked: boolean;
  activeVehicleIsValid: boolean;
  geocodeFailedVehicleIds: number[];
  outOfRegionVehicleIds: number[];
};

export default function VehicleSection({
  vehicles,
  addVehicleWithDetails,
  markAllAvailable,
  updateVehicle,
  deleteVehicle,
  unlockVehicle,
  confirmVehicle,
  touchedIds,
  allVehiclesLocked,
  activeVehicleIsValid,
  geocodeFailedVehicleIds,
  outOfRegionVehicleIds,
}: VehicleSectionProps) {
  const [isAddOverlayOpen, setIsAddOverlayOpen] = useState(false);

  const addEnabled = allVehiclesLocked || activeVehicleIsValid;
  const geocodeFailedSet = new Set(geocodeFailedVehicleIds);
  const outOfRegionSet = new Set(outOfRegionVehicleIds);

  return (
    <section>
      <div className={VEHICLE_SECTION_HEADER}>
        <h2 className={VEHICLE_SECTION_HEADING}>Vehicle details</h2>
        <p className={VEHICLE_SECTION_SUBHEADING}>Manage your delivery fleet</p>
      </div>

      <div className="flex items-center justify-end gap-2 mb-4">
        <button type="button" onClick={markAllAvailable} className={VEHICLE_SECTION_BTN_GHOST}>
          Mark all available
        </button>
        <button
          type="button"
          onClick={() => setIsAddOverlayOpen(true)}
          disabled={!addEnabled}
          className={`${NAVBAR_V2_BTN_OUTLINE} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Add vehicle
        </button>
      </div>

      {/* Desktop: card with header + vehicle rows */}
      <div className={VEHICLE_INFO_CONTAINER}>
        <div className={VEHICLE_INFO_HEADER_ROW}>
          <span className={VEHICLE_INFO_HEADER_CELL}>Name</span>
          <span className={VEHICLE_INFO_HEADER_CELL}>Type</span>
          <span className={VEHICLE_INFO_HEADER_CELL}>Capacity</span>
          <span className={VEHICLE_INFO_HEADER_CELL}>Status</span>
          <span className={VEHICLE_INFO_HEADER_CELL}>Departure time</span>
        </div>
        <hr className={VEHICLE_INFO_DIVIDER} />
        <div className={`grid ${DESKTOP_VEHICLE_GRID_CLASS} gap-x-3 xl:gap-x-4 gap-y-3 items-center`}>
          {vehicles.map((v) => (
            <VehicleRow
              key={`vehicle-${v.id}`}
              layout="desktop"
              vehicle={v}
              vehiclesCount={vehicles.length}
              updateVehicle={updateVehicle}
              deleteVehicle={deleteVehicle}
              unlockVehicle={unlockVehicle}
              confirmVehicle={confirmVehicle}
              vehicleTouched={touchedIds.has(v.id)}
              geocodeFailed={geocodeFailedSet.has(v.id)}
              outOfRegionFailed={outOfRegionSet.has(v.id)}
            />
          ))}
        </div>
      </div>

      {/* Mobile: stacked cards */}
      <div className="lg:hidden space-y-6">
        {vehicles.map((v) => (
          <VehicleRow
            key={`vehicle-mobile-${v.id}`}
            layout="mobile"
            vehicle={v}
            vehiclesCount={vehicles.length}
            updateVehicle={updateVehicle}
            deleteVehicle={deleteVehicle}
            unlockVehicle={unlockVehicle}
            confirmVehicle={confirmVehicle}
            vehicleTouched={touchedIds.has(v.id)}
            geocodeFailed={geocodeFailedSet.has(v.id)}
            outOfRegionFailed={outOfRegionSet.has(v.id)}
          />
        ))}
      </div>

      {isAddOverlayOpen && (
        <VehicleDetailsOverlay
          vehicle={BLANK_VEHICLE}
          onClose={() => setIsAddOverlayOpen(false)}
          onSave={(updated) => {
            addVehicleWithDetails({
              name: updated.name,
              type: updated.type,
              capacity: updated.capacity,
              capacityUnit: updated.capacityUnit,
              available: updated.available,
              departureTime: updated.departureTime,
            });
            setIsAddOverlayOpen(false);
          }}
        />
      )}
    </section>
  );
}
