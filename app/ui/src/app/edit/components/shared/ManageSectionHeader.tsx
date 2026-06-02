"use client";

import styles from "@/app/edit/edit.module.css";
import {
  MANAGE_SECTION_HEADER_ROOT,
  MANAGE_SECTION_HEADING,
  VEHICLE_SECTION_OPTIMIZE_BTN,
} from "@/app/edit/formStyles.v2";

type Props = {
  onOptimize: () => void;
  isOptimizing: boolean;
};

export default function ManageSectionHeader({
  onOptimize,
  isOptimizing,
}: Props) {
  return (
    <div className={MANAGE_SECTION_HEADER_ROOT}>
      <h1 className={MANAGE_SECTION_HEADING}>Manage</h1>
      <button
        type="button"
        className={`${VEHICLE_SECTION_OPTIMIZE_BTN} ${styles.primaryBtnOverlay}`}
        onClick={onOptimize}
        disabled={isOptimizing}
        aria-busy={isOptimizing}
      >
        {isOptimizing ? "Optimizing…" : "Optimize"}
      </button>
    </div>
  );
}
