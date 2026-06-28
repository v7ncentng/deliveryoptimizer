"use client";

import {
  SPINNER_ICON_ARC,
  SPINNER_ICON_RING,
  SPINNER_ICON_WRAPPER,
} from "@/app/edit/formStyles.v2";

export default function SpinnerIcon() {
  return (
    <div className={SPINNER_ICON_WRAPPER} role="status" aria-label="Loading">
      <svg
        width="33"
        height="33"
        viewBox="0 0 33 33"
        fill="none"
        className={SPINNER_ICON_RING}
        aria-hidden="true"
      >
        <circle
          cx="16.25"
          cy="16.25"
          r="12.45"
          strokeWidth="2.5"
          stroke="var(--edit-stone-200)"
          fill="none"
        />
      </svg>
      <svg
        width="33"
        height="33"
        viewBox="0 0 33 33"
        fill="none"
        className={SPINNER_ICON_ARC}
        aria-hidden="true"
      >
        <path
          d="M29.9665 16.25C31.3657 16.25 32.5202 15.109 32.3029 13.7267C32.104 12.4611 31.7556 11.2205 31.263 10.0314C30.4464 8.05985 29.2494 6.26847 27.7405 4.75951C26.2315 3.25056 24.4401 2.0536 22.4686 1.23696C21.2795 0.744412 20.0389 0.396038 18.7733 0.197101C17.391 -0.0201694 16.25 1.13429 16.25 2.53351V2.53351C16.25 3.93273 17.3984 5.0385 18.7619 5.35279C19.3644 5.49166 19.9557 5.68057 20.5295 5.91828C21.8863 6.48028 23.1191 7.30401 24.1576 8.34244C25.196 9.38088 26.0197 10.6137 26.5817 11.9705C26.8194 12.5443 27.0083 13.1356 27.1472 13.7381C27.4615 15.1016 28.5673 16.25 29.9665 16.25V16.25Z"
          fill="var(--edit-btn-primary)"
        />
      </svg>
    </div>
  );
}
