import * as React from "react";
const AlertContainedIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg
    fill="none"
    height={24}
    viewBox="0 0 24 24"
    width={24}
    {...props}
  >
    <path
      clipRule="evenodd"
      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12s4.477 10 10 10 10-4.477 10-10ZM12 6.25a.75.75 0 0 1 .75.75v6a.75.75 0 1 1-1.5 0V7a.75.75 0 0 1 .75-.75ZM12 17a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

export default AlertContainedIcon;
