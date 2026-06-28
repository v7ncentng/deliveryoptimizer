import type { SessionSaveData } from "@/lib/validation/session.schema";

export type DeliveryStatus = "pending" | "completed" | "failed";

export type DeliveryStop = {
  id: string;
  stopNumber: number;
  address: string;
  customerName: string;
  phoneNumber?: string;
  packageCount: number;
  notes: string;
  status: DeliveryStatus;
  lat: number;
  lng: number;
  completedAt?: string;
  failureReason?: string;
};

export type DriverRoute = {
  driverName: string;
  routeLabel: string;
  stops: DeliveryStop[];
};

export type OptimizeRequestLike = SessionSaveData;
