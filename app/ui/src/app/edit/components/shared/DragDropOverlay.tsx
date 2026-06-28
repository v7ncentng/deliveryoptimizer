import {
  DRAG_DROP_OVERLAY_CONTENT,
  DRAG_DROP_OVERLAY_ICON,
  DRAG_DROP_OVERLAY_LABEL,
  DRAG_DROP_OVERLAY_ROOT,
} from "@/app/edit/formStyles.v2";

export default function DragDropOverlay() {
  return (
    <div className={DRAG_DROP_OVERLAY_ROOT} aria-hidden="true">
      <div className={DRAG_DROP_OVERLAY_CONTENT}>
        <svg
          className={DRAG_DROP_OVERLAY_ICON}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 80 80"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M37.6663 63.1667H42.6663V46.4167L49.4997 53.2501L52.9997 49.7501L39.9997 37.0834L27.1663 49.9167L30.6663 53.4167L37.6663 46.4167V63.1667ZM18.333 73.3334C16.9997 73.3334 15.833 72.8334 14.833 71.8334C13.833 70.8334 13.333 69.6667 13.333 68.3334V11.6667C13.333 10.3334 13.833 9.16675 14.833 8.16675C15.833 7.16675 16.9997 6.66675 18.333 6.66675H48.4163L66.6663 24.9167V68.3334C66.6663 69.6667 66.1663 70.8334 65.1663 71.8334C64.1663 72.8334 62.9997 73.3334 61.6663 73.3334H18.333ZM45.9163 27.1667V11.6667H18.333V68.3334H61.6663V27.1667H45.9163Z"
            fill="var(--edit-text-primary)"
          />
        </svg>
        <p className={DRAG_DROP_OVERLAY_LABEL}>Drop files here to upload</p>
      </div>
    </div>
  );
}
