"use client";

import {
  OPTIMIZING_MODAL_PANEL,
  OPTIMIZING_MODAL_STATUS_ROW,
  OPTIMIZING_MODAL_STATUS_TEXT,
  OVERLAY_BACKDROP,
  OVERLAY_TITLE,
} from "@/app/edit/formStyles.v2";
import { useFocusTrap } from "@/app/edit/hooks/useFocusTrap";
import SpinnerIcon from "@/app/edit/components/shared/SpinnerIcon";

type OptimizingModalProps = {
  isOpen: boolean;
};

export default function OptimizingModal({ isOpen }: OptimizingModalProps) {
  const panelRef = useFocusTrap<HTMLDivElement>(isOpen);

  if (!isOpen) return null;

  return (
    <div className={OVERLAY_BACKDROP}>
      <div
        ref={panelRef}
        className={OPTIMIZING_MODAL_PANEL}
        role="dialog"
        aria-modal="true"
        aria-labelledby="optimizing-title"
        aria-describedby="optimizing-desc"
        tabIndex={0}
      >
        <h2 id="optimizing-title" className={OVERLAY_TITLE}>
          Optimizing your delivery routes
        </h2>
        <div id="optimizing-desc" className={OPTIMIZING_MODAL_STATUS_ROW}>
          <SpinnerIcon />
          <p className={OPTIMIZING_MODAL_STATUS_TEXT}>
            Creating your delivery routes
          </p>
        </div>
      </div>
    </div>
  );
}
