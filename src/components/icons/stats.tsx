import * as React from "react";
const StatsIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg
    
    fill="none"
    height={24}
    viewBox="0 0 24 24"
    width={24}
    {...props}
  >
    <path d="M22 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" fill="currentColor" />
    <path
      clipRule="evenodd"
      d="M12 2c1.399 0 2.59 0 3.612.038a4.5 4.5 0 0 0 6.35 6.35C22 9.41 22 10.601 22 12c0 4.714 0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12s0-7.071 1.464-8.536C4.93 2 7.286 2 12 2Zm2.5 8.75a.75.75 0 1 1 0-1.5H17a.75.75 0 0 1 .75.75v2.5a.75.75 0 1 1-1.5 0v-.69l-2.013 2.013a1.75 1.75 0 0 1-2.474 0l-1.586-1.586a.25.25 0 0 0-.354 0L7.53 14.53a.75.75 0 0 1-1.06-1.06l2.293-2.293a1.75 1.75 0 0 1 2.474 0l1.586 1.586a.25.25 0 0 0 .354 0l2.012-2.013H14.5Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

export default StatsIcon;
