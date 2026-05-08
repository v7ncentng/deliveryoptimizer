import {
  ADDRESS_ROW_HEADER_ROOT,
  ADDRESS_ROW_HEADER_CHECKBOX,
  ADDRESS_ROW_HEADER_COLS,
  ADDRESS_ROW_HEADER_CELL_RECIPIENT,
  ADDRESS_ROW_HEADER_CELL_QUANTITY,
  ADDRESS_ROW_HEADER_CELL_DELIVERY_EST,
  ADDRESS_ROW_HEADER_CELL_DELIVERY_TIME,
  ADDRESS_ROW_HEADER_CELL_NOTES,
} from "../formStyles.v2";

export default function AddressRowHeader() {
  return (
    <div className={ADDRESS_ROW_HEADER_ROOT}>
      <div className={ADDRESS_ROW_HEADER_CHECKBOX} aria-hidden>
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path
            className="fill-[var(--edit-icon-edit)]"
            d="M5 21C4.45 21 3.97917 20.8042 3.5875 20.4125C3.19583 20.0208 3 19.55 3 19V5C3 4.45 3.19583 3.97917 3.5875 3.5875C3.97917 3.19583 4.45 3 5 3H19C19.55 3 20.0208 3.19583 20.4125 3.5875C20.8042 3.97917 21 4.45 21 5V19C21 19.55 20.8042 20.0208 20.4125 20.4125C20.0208 20.8042 19.55 21 19 21H5ZM5 19H19V5H5V19Z"
          />
        </svg>
      </div>
      <div className={ADDRESS_ROW_HEADER_COLS}>
        <span className={ADDRESS_ROW_HEADER_CELL_RECIPIENT}>Recipient</span>
        <span className={ADDRESS_ROW_HEADER_CELL_QUANTITY}>Quantity</span>
        <span className={ADDRESS_ROW_HEADER_CELL_DELIVERY_EST}>Delivery estimation</span>
        <span className={ADDRESS_ROW_HEADER_CELL_DELIVERY_TIME}>Delivery time</span>
        <span className={ADDRESS_ROW_HEADER_CELL_NOTES}>Notes</span>
      </div>
    </div>
  );
}
