import * as React from "react";
const PlusRoundedIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg
    
    width={20}
    height={20}
    fill="none"
    viewBox="0 0 20 20"
    {...props}
  >
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M10 20c5.523 0 10-4.477 10-10S15.523 0 10 0 0 4.477 0 10s4.477 10 10 10Zm.75-13a.75.75 0 1 0-1.5 0v2.25H7a.75.75 0 0 0 0 1.5h2.25V13a.75.75 0 1 0 1.5 0v-2.25H13a.75.75 0 1 0 0-1.5h-2.25V7Z"
      clipRule="evenodd"
    />
  </svg>
);
export default PlusRoundedIcon;
