"use client";

import { useState } from "react";
import AddressAutocompleteInput from "./AddressAutocompleteInput";
import { TIME_OPTIONS } from "../constants/timeOptions";
import type { AddressCard as AddressCardType } from "../types/delivery";
import {
  ADDRESS_CARD_ROOT_BASE,
  GEOCODE_ERROR_LOCKED,
  ACCORDION_TRIGGER,
  CONFIRM_PILL_MOBILE,
  MOBILE_ADDRESS_INPUT_BASE,
  MOBILE_ADDRESS_LOCKED_ROW,
  MOBILE_ADDRESS_NOTES_AREA,
  MOBILE_ADDRESS_NOTES_TEXTAREA,
  MOBILE_DELETE_TEXT,
  MOBILE_FIELD_LABEL,
  PILL_ROW_HALF_DANGER,
  PILL_ROW_HALF_NEUTRAL,
  fieldBorder,
} from "../formStyles";
import {
  ADDRESS_ROW_EDIT_ROOT,
  ADDRESS_ROW_EDIT_LEFT,
  ADDRESS_ROW_EDIT_COLS,
  ADDRESS_ROW_RECIPIENT_COL,
  ADDRESS_ROW_NAME_ROW,
  ADDRESS_ROW_FIELD_INPUT,
  ADDRESS_ROW_ADDR_WRAP,
  ADDRESS_ROW_ADDR_GRADIENT,
  ADDRESS_ROW_STEPPER_CONTAINER,
  ADDRESS_ROW_EST_GROUP,
  ADDRESS_ROW_TIME_GROUP,
  ADDRESS_ROW_TIME_SELECT_WRAP,
  ADDRESS_ROW_TIME_SELECT,
  ADDRESS_ROW_NOTES_WRAP,
  ADDRESS_ROW_ACTIONS,
  ADDRESS_ROW_LOCKED_RECIPIENT_COL,
  ADDRESS_ROW_LOCKED_PLAIN_TEXT,
} from "../formStyles.v2";
import { EditIconButton, ConfirmIconButton, DeleteIconButton } from "./RowIconButtons";

type AddressCardProps = {
  address: AddressCardType;
  addressesCount: number;
  updateAddress: <K extends keyof AddressCardType>(id: number, key: K, value: AddressCardType[K]) => void;
  deleteAddress: (id: number) => void;
  unlockAddress: (id: number) => void;
  confirmAddress: (id: number) => void;
  addressTouched: boolean;
  geocodeFailed: boolean;
  outOfRegionFailed: boolean;
};

function StepperInput({
  value,
  min = 0,
  ariaLabel,
  onIncrement,
  onDecrement,
  onChange,
}: {
  value: number;
  min?: number;
  ariaLabel: string;
  onIncrement: () => void;
  onDecrement: () => void;
  onChange: (v: number) => void;
}) {
  return (
    <div className={`${ADDRESS_ROW_STEPPER_CONTAINER} w-[72px]`}>
      <input
        type="number"
        min={min}
        value={value || ""}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        aria-label={ariaLabel}
        className="flex-1 min-w-0 bg-transparent outline-none text-[16px] leading-[1.5] text-[var(--edit-text-primary)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <div className="flex flex-col shrink-0">
        <button type="button" onClick={onIncrement} aria-label={`Increase ${ariaLabel}`} className="cursor-pointer focus:outline-none">
          <svg viewBox="0 0 24 12" width="24" height="12">
            <path fill="none" className="stroke-[var(--edit-stone-200)]" d="M6 0.5H18C21.0376 0.5 23.5 2.96243 23.5 6V11.5H0.5V6C0.5 2.96243 2.96243 0.5 6 0.5Z" />
            <path className="fill-[var(--edit-icon-edit)]" d="M12 5.39189L8.93333 8.5L8 7.55405L12 3.5L16 7.55405L15.0667 8.5L12 5.39189Z" />
          </svg>
        </button>
        <button type="button" onClick={onDecrement} aria-label={`Decrease ${ariaLabel}`} className="cursor-pointer focus:outline-none">
          <svg viewBox="0 0 24 12" width="24" height="12">
            <path fill="none" className="stroke-[var(--edit-stone-200)]" d="M18 11.5H6C2.96243 11.5 0.5 9.03757 0.5 6V0.5H23.5V6C23.5 9.03757 21.0376 11.5 18 11.5Z" />
            <path className="fill-[var(--edit-icon-edit)]" d="M12 6.60811L8.93333 3.5L8 4.44595L12 8.5L16 4.44595L15.0667 3.5L12 6.60811Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function AddressCard({
  address: a,
  addressesCount,
  updateAddress,
  deleteAddress,
  unlockAddress,
  confirmAddress,
  addressTouched,
  geocodeFailed,
  outOfRegionFailed,
}: AddressCardProps) {
  const [manualExpanded, setManualExpanded] = useState(false);
  const expanded = !a.locked || manualExpanded;

  const addrInvalid = geocodeFailed || (addressTouched && !a.recipientAddress.trim());
  const qtyInvalid = addressTouched && a.deliveryQuantity <= 0;

  const mobileInputClass = (invalid: boolean) =>
    `${MOBILE_ADDRESS_INPUT_BASE} ${fieldBorder(invalid, "mobile")}`;

  const mobileSelectClass = (invalid: boolean) =>
    `${MOBILE_ADDRESS_INPUT_BASE} ${fieldBorder(invalid, "mobile")} cursor-pointer select-chevron`;

  const displayAddr = a.recipientAddress.trim() || a.recipientName.trim() || "Address";
  const panelId = `addr-panel-${a.id}`;

  return (
    <>
      {/* ── Desktop hi-fi layout ── */}
      <div className="hidden lg:block">
        <div className={ADDRESS_ROW_EDIT_ROOT}>
          {/* Left: all columns */}
          <div className={ADDRESS_ROW_EDIT_LEFT}>
            {/* Data columns */}
            <div className={ADDRESS_ROW_EDIT_COLS}>
              {a.locked ? (
                <>
                  {/* Recipient column — locked */}
                  <div className={ADDRESS_ROW_LOCKED_RECIPIENT_COL}>
                    {(a.recipientName || a.phoneNumber) && (
                      <p className={ADDRESS_ROW_LOCKED_PLAIN_TEXT}>
                        {[a.recipientName, a.phoneNumber].filter(Boolean).join(", ")}
                      </p>
                    )}
                    <p className={`${ADDRESS_ROW_LOCKED_PLAIN_TEXT}${geocodeFailed || outOfRegionFailed ? ` ${GEOCODE_ERROR_LOCKED}` : ""}`}>
                      {a.recipientAddress || "—"}
                    </p>
                  </div>

                  {/* Quantity — locked */}
                  <p className={`${ADDRESS_ROW_LOCKED_PLAIN_TEXT} w-[72px] shrink-0`}>
                    {a.deliveryQuantity}
                  </p>

                  {/* Delivery estimation — locked */}
                  <p className={`${ADDRESS_ROW_LOCKED_PLAIN_TEXT} w-[150px] shrink-0`}>
                    {a.timeBuffer > 0 ? `${a.timeBuffer} minutes` : "—"}
                  </p>

                  {/* Delivery time — locked */}
                  <p className={`${ADDRESS_ROW_LOCKED_PLAIN_TEXT} w-[247px] shrink-0`}>
                    {a.deliveryTimeStart && a.deliveryTimeEnd
                      ? `${a.deliveryTimeStart} – ${a.deliveryTimeEnd}`
                      : a.deliveryTimeStart || a.deliveryTimeEnd || "—"}
                  </p>

                  {/* Notes — locked */}
                  <p className={`${ADDRESS_ROW_LOCKED_PLAIN_TEXT} w-[246px] shrink-0`}>
                    {a.notes || "—"}
                  </p>
                </>
              ) : (
                <>
                  {/* Recipient column — edit */}
                  <div className={ADDRESS_ROW_RECIPIENT_COL}>
                    <div className={ADDRESS_ROW_NAME_ROW}>
                      <input
                        value={a.recipientName}
                        onChange={(e) => updateAddress(a.id, "recipientName", e.target.value)}
                        placeholder="First and last name"
                        aria-label="Recipient name"
                        className={`${ADDRESS_ROW_FIELD_INPUT} flex-1`}
                      />
                      <input
                        value={a.phoneNumber}
                        onChange={(e) =>
                          updateAddress(a.id, "phoneNumber", e.target.value.replace(/[^\d+\s()\-]/g, ""))
                        }
                        placeholder="+1 123 456 7890"
                        aria-label="Phone number"
                        type="tel"
                        inputMode="tel"
                        className={`${ADDRESS_ROW_FIELD_INPUT} flex-1`}
                      />
                    </div>
                    <div className={`${ADDRESS_ROW_ADDR_WRAP}${addrInvalid ? " border-[var(--edit-error-border)]" : ""}`}>
                      <AddressAutocompleteInput
                        value={a.recipientAddress}
                        onChange={(val) => updateAddress(a.id, "recipientAddress", val)}
                        placeholder="Enter address"
                        ariaLabel="Recipient address"
                        className="flex-1 h-full px-2 text-[16px] leading-[1.5] font-normal text-[var(--edit-text-primary)] placeholder:text-[var(--edit-stone-500)] outline-none bg-transparent"
                      />
                      {/* Gradient fade + static chevron */}
                      <div className={ADDRESS_ROW_ADDR_GRADIENT} aria-hidden>
                        <svg viewBox="0 0 24 24" width="24" height="24">
                          <path
                            className="fill-[var(--edit-icon-edit)]"
                            d="M14.6 12L10 7.4L11.4 6L17.4 12L11.4 18L10 16.6L14.6 12Z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Quantity — edit */}
                  <StepperInput
                    value={a.deliveryQuantity}
                    min={1}
                    ariaLabel="Delivery quantity"
                    onChange={(v) => updateAddress(a.id, "deliveryQuantity", v)}
                    onIncrement={() => updateAddress(a.id, "deliveryQuantity", (a.deliveryQuantity || 0) + 1)}
                    onDecrement={() => updateAddress(a.id, "deliveryQuantity", Math.max(1, (a.deliveryQuantity || 1) - 1))}
                  />

                  {/* Delivery estimation — edit */}
                  <div className={ADDRESS_ROW_EST_GROUP}>
                    <StepperInput
                      value={a.timeBuffer}
                      min={0}
                      ariaLabel="Delivery estimation in minutes"
                      onChange={(v) => updateAddress(a.id, "timeBuffer", v)}
                      onIncrement={() => updateAddress(a.id, "timeBuffer", (a.timeBuffer || 0) + 1)}
                      onDecrement={() => updateAddress(a.id, "timeBuffer", Math.max(0, (a.timeBuffer || 0) - 1))}
                    />
                    <span className="font-normal text-[16px] leading-[1.5] text-[var(--edit-text-primary)]">minutes</span>
                  </div>

                  {/* Delivery time — edit */}
                  <div className={ADDRESS_ROW_TIME_GROUP}>
                    <div className={ADDRESS_ROW_TIME_SELECT_WRAP}>
                      <select
                        value={a.deliveryTimeStart}
                        onChange={(e) => updateAddress(a.id, "deliveryTimeStart", e.target.value)}
                        aria-label="Delivery time start"
                        className={ADDRESS_ROW_TIME_SELECT}
                      >
                        <option value="">Start</option>
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <span className="font-normal text-[16px] leading-[1.5] text-[var(--edit-text-primary)] pointer-events-none truncate flex-1">
                        {a.deliveryTimeStart || "Start"}
                      </span>
                      <svg viewBox="0 0 24 24" width="24" height="24" className="rotate-90 shrink-0 pointer-events-none" aria-hidden>
                        <path className="fill-[var(--edit-icon-edit)]" d="M14.6 12L10 7.4L11.4 6L17.4 12L11.4 18L10 16.6L14.6 12Z" />
                      </svg>
                    </div>
                    <span className="font-normal text-[16px] leading-[1.5] text-[var(--edit-text-primary)]" aria-hidden>–</span>
                    <div className={ADDRESS_ROW_TIME_SELECT_WRAP}>
                      <select
                        value={a.deliveryTimeEnd}
                        onChange={(e) => updateAddress(a.id, "deliveryTimeEnd", e.target.value)}
                        aria-label="Delivery time end"
                        className={ADDRESS_ROW_TIME_SELECT}
                      >
                        <option value="">End</option>
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <span className="font-normal text-[16px] leading-[1.5] text-[var(--edit-text-primary)] pointer-events-none truncate flex-1">
                        {a.deliveryTimeEnd || "End"}
                      </span>
                      <svg viewBox="0 0 24 24" width="24" height="24" className="rotate-90 shrink-0 pointer-events-none" aria-hidden>
                        <path className="fill-[var(--edit-icon-edit)]" d="M14.6 12L10 7.4L11.4 6L17.4 12L11.4 18L10 16.6L14.6 12Z" />
                      </svg>
                    </div>
                  </div>

                  {/* Notes — edit */}
                  <div className={ADDRESS_ROW_NOTES_WRAP}>
                    <textarea
                      value={a.notes}
                      onChange={(e) => updateAddress(a.id, "notes", e.target.value)}
                      placeholder="Enter notes"
                      aria-label="Notes"
                      rows={1}
                      className="w-full bg-transparent outline-none text-[16px] leading-[1.5] text-[var(--edit-text-primary)] placeholder:text-[var(--edit-stone-500)] resize-none font-normal"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: action buttons */}
          <div className={ADDRESS_ROW_ACTIONS}>
            {a.locked ? (
              <EditIconButton onClick={() => unlockAddress(a.id)} />
            ) : (
              <ConfirmIconButton onClick={() => confirmAddress(a.id)} />
            )}
            <DeleteIconButton onClick={() => deleteAddress(a.id)} />
          </div>
        </div>
      </div>

      {/* ── Mobile accordion ── */}
      <div className={`${ADDRESS_CARD_ROOT_BASE} lg:hidden`}>
        <button
          type="button"
          onClick={() => {
            if (a.locked) {
              setManualExpanded((e) => !e);
            } else {
              setManualExpanded(false);
            }
          }}
          aria-expanded={expanded}
          aria-controls={panelId}
          className={ACCORDION_TRIGGER}
        >
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-black truncate">{displayAddr}</div>
          </div>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className={`shrink-0 text-black transition-transform mt-0.5 ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          >
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {expanded && (
          <div id={panelId} role="region" className="p-4 space-y-3">
            {a.locked ? (
              <>
                <div>
                  <span className={MOBILE_FIELD_LABEL}>Name</span>
                  <div className={MOBILE_ADDRESS_LOCKED_ROW}>
                    <span className="text-sm text-black truncate">{a.recipientName || "—"}</span>
                  </div>
                </div>
                <div>
                  <span className={MOBILE_FIELD_LABEL}>Phone</span>
                  <div className={MOBILE_ADDRESS_LOCKED_ROW}>
                    <span className="text-sm text-black truncate">{a.phoneNumber || "—"}</span>
                  </div>
                </div>
                <div>
                  <span className={MOBILE_FIELD_LABEL}>Address</span>
                  <div className={`${MOBILE_ADDRESS_LOCKED_ROW}${geocodeFailed || outOfRegionFailed ? ` ${GEOCODE_ERROR_LOCKED}` : ""}`}>
                    <span className="text-sm text-black truncate">{a.recipientAddress}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className={MOBILE_FIELD_LABEL}>Delivery estimation</span>
                    <div className={MOBILE_ADDRESS_LOCKED_ROW}>
                      <span className="text-sm text-black truncate">{a.timeBuffer > 0 ? `${a.timeBuffer} min` : "—"}</span>
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className={MOBILE_FIELD_LABEL}>Delivery time</span>
                    <div className={MOBILE_ADDRESS_LOCKED_ROW}>
                      <span className="text-sm text-black truncate">
                        {a.deliveryTimeStart && a.deliveryTimeEnd
                          ? `${a.deliveryTimeStart} – ${a.deliveryTimeEnd}`
                          : a.deliveryTimeStart || a.deliveryTimeEnd || "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <span className={MOBILE_FIELD_LABEL}>Quantity</span>
                  <div className={MOBILE_ADDRESS_LOCKED_ROW}>
                    <span className="text-sm text-black truncate">{a.deliveryQuantity}</span>
                  </div>
                </div>
                <div>
                  <span className={MOBILE_FIELD_LABEL}>Notes</span>
                  <div className={MOBILE_ADDRESS_NOTES_AREA}>
                    <span className="text-sm text-black leading-6 line-clamp-6">{a.notes}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => unlockAddress(a.id)} className={PILL_ROW_HALF_NEUTRAL}>
                    Edit
                  </button>
                  <button type="button" onClick={() => deleteAddress(a.id)} disabled={addressesCount <= 1} className={PILL_ROW_HALF_DANGER}>
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className={MOBILE_FIELD_LABEL}>Name</span>
                  <input
                    value={a.recipientName}
                    onChange={(e) => updateAddress(a.id, "recipientName", e.target.value)}
                    placeholder="First and last name"
                    aria-label="Recipient name"
                    className={mobileInputClass(false)}
                  />
                </div>
                <div>
                  <span className={MOBILE_FIELD_LABEL}>Phone</span>
                  <input
                    value={a.phoneNumber}
                    onChange={(e) =>
                      updateAddress(a.id, "phoneNumber", e.target.value.replace(/[^\d+\s()\-]/g, ""))
                    }
                    placeholder="+1 123 456 7890"
                    aria-label="Phone number"
                    type="tel"
                    inputMode="tel"
                    className={mobileInputClass(false)}
                  />
                </div>
                <div>
                  <span className={MOBILE_FIELD_LABEL}>Address</span>
                  <AddressAutocompleteInput
                    value={a.recipientAddress}
                    onChange={(val) => updateAddress(a.id, "recipientAddress", val)}
                    placeholder="Address"
                    ariaLabel="Recipient address"
                    className={mobileInputClass(addrInvalid)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className={MOBILE_FIELD_LABEL}>Delivery estimation</span>
                    <input
                      type="number"
                      min={0}
                      value={a.timeBuffer || ""}
                      onChange={(e) => updateAddress(a.id, "timeBuffer", parseInt(e.target.value, 10) || 0)}
                      aria-label="Delivery estimation in minutes"
                      placeholder="0"
                      className={mobileInputClass(false)}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className={MOBILE_FIELD_LABEL}>Delivery time</span>
                    <div className="flex items-center gap-1 w-full min-w-0">
                      <select
                        value={a.deliveryTimeStart}
                        onChange={(e) => updateAddress(a.id, "deliveryTimeStart", e.target.value)}
                        className={`${mobileSelectClass(false)} flex-1 min-w-0`}
                        aria-label="Delivery time start"
                      >
                        <option value="">None</option>
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <span className="shrink-0 text-zinc-400 text-xs" aria-hidden>–</span>
                      <select
                        value={a.deliveryTimeEnd}
                        onChange={(e) => updateAddress(a.id, "deliveryTimeEnd", e.target.value)}
                        className={`${mobileSelectClass(false)} flex-1 min-w-0`}
                        aria-label="Delivery time end"
                      >
                        <option value="">None</option>
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <span className={MOBILE_FIELD_LABEL}>Quantity</span>
                  <input
                    type="number"
                    min={0}
                    value={a.deliveryQuantity || ""}
                    onChange={(e) =>
                      updateAddress(a.id, "deliveryQuantity", e.target.value === "" ? 0 : parseInt(e.target.value, 10) || 0)
                    }
                    aria-label="Delivery quantity"
                    className={mobileInputClass(qtyInvalid)}
                  />
                </div>
                <div>
                  <span className={MOBILE_FIELD_LABEL}>Notes</span>
                  <textarea
                    value={a.notes}
                    onChange={(e) => updateAddress(a.id, "notes", e.target.value)}
                    aria-label="Notes"
                    rows={5}
                    className={MOBILE_ADDRESS_NOTES_TEXTAREA}
                  />
                </div>
                {a.editingExisting && (
                  <button type="button" onClick={() => confirmAddress(a.id)} className={CONFIRM_PILL_MOBILE}>
                    Confirm
                  </button>
                )}
                <hr className="border-zinc-200" />
                <button
                  type="button"
                  onClick={() => deleteAddress(a.id)}
                  disabled={addressesCount <= 1}
                  className={MOBILE_DELETE_TEXT}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
