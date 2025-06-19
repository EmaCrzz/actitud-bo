import * as React from "react"
const PersonsIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg
    
    width={24}
    height={24}
    fill="none"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      fill="currentColor"
      d="M9.001 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM9.001 21.001c3.866 0 7-1.79 7-4s-3.134-4-7-4-7 1.79-7 4 3.134 4 7 4ZM21 17c0 1.657-2.036 3-4.521 3 .732-.8 1.236-1.805 1.236-2.998 0-1.195-.505-2.2-1.24-3.001C18.963 14 21 15.344 21 17ZM18 6a2.999 2.999 0 0 1-4.03 2.82c.489-.86.745-1.832.744-2.82 0-1.025-.27-1.987-.742-2.82A3 3 0 0 1 18 6Z"
    />
  </svg>
)
export default PersonsIcon
