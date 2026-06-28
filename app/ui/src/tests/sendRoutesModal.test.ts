import { describe, expect, it } from "vitest";
import { removeSentVehicleIds } from "@/app/results/components/SendRoutesModal";

describe("SendRoutesModal retry selection", () => {
  it("removes successfully sent vehicles before a retry", () => {
    const selectedIds = new Set(["vehicle-1", "vehicle-2", "vehicle-3"]);

    const next = removeSentVehicleIds(selectedIds, ["vehicle-1", "vehicle-3"]);

    expect([...next]).toEqual(["vehicle-2"]);
  });

  it("does not mutate the previous selected vehicle set", () => {
    const selectedIds = new Set(["vehicle-1", "vehicle-2"]);

    removeSentVehicleIds(selectedIds, ["vehicle-1"]);

    expect([...selectedIds]).toEqual(["vehicle-1", "vehicle-2"]);
  });
});
