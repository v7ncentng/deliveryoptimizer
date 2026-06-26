import { geocodeAddress } from "@/app/components/AddressGeocoder/utils/nominatim";
import {
  secondsToTimeAMPM,
  timeToSeconds,
} from "@/app/components/AddressGeocoder/utils/timeConversion";
import { bufferSecondsToMinutes } from "@/app/edit/utils/csvParserUtils";
import type { DeliveryInput } from "@/lib/types/delivery.types";
import type { OptimizeRequest } from "@/lib/types/optimize.types";
import type { VehicleInput } from "@/lib/types/vehicle.types";
import type { SessionSaveData } from "@/lib/validation/session.schema";

import {
  addressCardToDeliveryInput,
  vehicleRowToVehicleInput,
} from "./optimizeMapper";
import type {
  AddressCard,
  CapacityUnit,
  LockedVehicleRow,
  VehicleRow,
} from "../types/delivery";

function isLockedVehicleRow(vehicle: VehicleRow): vehicle is LockedVehicleRow {
  return vehicle.locked && vehicle.type !== "" && vehicle.capacityUnit !== "";
}

export async function mapEditStateToOptimizeRequest(
  vehicles: VehicleRow[],
  addresses: AddressCard[],
): Promise<OptimizeRequest> {
  const { lockedVehicles, demandType } = validateExportableEditState(
    vehicles,
    addresses,
  );
  const vehicleInputs: VehicleInput[] = [];

  for (const vehicle of lockedVehicles) {
    const location =
      vehicle.cachedLocation ?? (await geocodeAddress(vehicle.startLocation));

    if (!location) {
      throw new Error(
        `Could not geocode vehicle start location "${vehicle.startLocation}".`,
      );
    }

    vehicleInputs.push(vehicleRowToVehicleInput(vehicle, location));
  }

  const deliveryInputs = await mapAddressesToDeliveryInputs(
    addresses,
    demandType,
  );

  return {
    vehicles: vehicleInputs,
    deliveries: deliveryInputs,
  };
}

export async function mapEditStateToSessionSave(
  vehicles: VehicleRow[],
  addresses: AddressCard[],
): Promise<SessionSaveData> {
  const { lockedVehicles, demandType } = validateExportableEditState(
    vehicles,
    addresses,
  );

  return {
    vehicles: lockedVehicles.map(vehicleRowToSessionVehicleInput),
    deliveries: await mapAddressesToDeliveryInputs(addresses, demandType),
  };
}

function validateExportableEditState(
  vehicles: VehicleRow[],
  addresses: AddressCard[],
): { lockedVehicles: LockedVehicleRow[]; demandType: CapacityUnit } {
  const unlockedVehicle = vehicles.find((vehicle) => !vehicle.locked);
  const unlockedAddress = addresses.find((address) => !address.locked);

  if (unlockedVehicle || unlockedAddress) {
    throw new Error(
      "Please confirm all vehicles and addresses before exporting.",
    );
  }

  if (vehicles.length === 0) {
    throw new Error("At least one vehicle is required to export a session.");
  }

  if (addresses.length === 0) {
    throw new Error(
      "At least one delivery address is required to export a session.",
    );
  }

  const lockedVehicles = vehicles.filter(isLockedVehicleRow);
  if (lockedVehicles.length !== vehicles.length) {
    throw new Error("One or more vehicles are missing type or capacity unit.");
  }

  const units = [
    ...new Set(lockedVehicles.map((vehicle) => vehicle.capacityUnit)),
  ];
  if (units.length !== 1) {
    throw new Error(
      "All vehicles must use the same capacity unit to export a session.",
    );
  }

  const demandType = units[0] as CapacityUnit;

  return { lockedVehicles, demandType };
}

async function mapAddressesToDeliveryInputs(
  addresses: AddressCard[],
  demandType: CapacityUnit,
): Promise<DeliveryInput[]> {
  const deliveryInputs: DeliveryInput[] = [];

  for (const address of addresses) {
    const location =
      address.cachedLocation ??
      (await geocodeAddress(address.recipientAddress));

    if (!location) {
      throw new Error(
        `Could not geocode delivery address "${address.recipientAddress}".`,
      );
    }

    deliveryInputs.push(
      addressCardToDeliveryInput(address, location, demandType),
    );
  }

  return deliveryInputs;
}

function vehicleRowToSessionVehicleInput(
  vehicle: LockedVehicleRow,
): SessionSaveData["vehicles"][number] {
  const departureSeconds = vehicle.departureTime
    ? timeToSeconds(vehicle.departureTime)
    : undefined;

  return {
    id: vehicle.id,
    vehicleType: vehicle.type,
    driverName: vehicle.name || undefined,
    ...(vehicle.cachedLocation && { startLocation: vehicle.cachedLocation }),
    capacity: {
      type: vehicle.capacityUnit,
      value: vehicle.capacity,
    },
    ...(departureSeconds !== undefined && {
      departureTime: departureSeconds,
      returnTime: 86400,
    }),
  };
}

export function mapOptimizeRequestToEditState(request: SessionSaveData): {
  vehicles: VehicleRow[];
  addresses: AddressCard[];
} {
  if (request.vehicles.length === 0) {
    throw new Error("Session file does not contain any vehicles.");
  }

  if (request.deliveries.length === 0) {
    throw new Error("Session file does not contain any deliveries.");
  }

  return {
    vehicles: request.vehicles.map(mapVehicleInputToRow),
    addresses: request.deliveries.map(mapDeliveryInputToCard),
  };
}

function mapVehicleInputToRow(
  vehicle: SessionSaveData["vehicles"][number],
): VehicleRow {
  const startLocation = vehicle.startLocation
    ? formatLocation(vehicle.startLocation.lat, vehicle.startLocation.lng)
    : "";

  return {
    id: vehicle.id,
    locked: true,
    editingExisting: false,
    name: vehicle.driverName ?? "",
    startLocation,
    ...(vehicle.startLocation && {
      cachedLocation: {
        lat: vehicle.startLocation.lat,
        lng: vehicle.startLocation.lng,
        state: null,
      },
    }),
    type: vehicle.vehicleType,
    capacityUnit: vehicle.capacity.type,
    capacity: vehicle.capacity.value,
    available: true,
    departureTime:
      vehicle.departureTime != null
        ? secondsToTimeAMPM(vehicle.departureTime)
        : "",
  };
}

function mapDeliveryInputToCard(delivery: DeliveryInput): AddressCard {
  const firstWindow = delivery.timeWindows?.[0];
  const start =
    firstWindow && firstWindow[0] > 0 ? secondsToTimeAMPM(firstWindow[0]) : "";
  const end =
    firstWindow && firstWindow[1] < 86400
      ? secondsToTimeAMPM(firstWindow[1])
      : "";

  return {
    id: delivery.id,
    locked: true,
    editingExisting: false,
    recipientName: delivery.recipientName ?? "",
    phoneNumber: delivery.phoneNumber ?? "",
    recipientAddress:
      delivery.address ??
      formatLocation(delivery.location.lat, delivery.location.lng),
    cachedLocation: {
      lat: delivery.location.lat,
      lng: delivery.location.lng,
      state: null,
    },
    timeBuffer: bufferSecondsToMinutes(String(delivery.bufferTime ?? 0)),
    deliveryTimeStart: start,
    deliveryTimeEnd: end,
    deliveryQuantity: delivery.demand.value,
    notes: delivery.notes ?? "",
  };
}

function formatLocation(lat: number, lng: number) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
