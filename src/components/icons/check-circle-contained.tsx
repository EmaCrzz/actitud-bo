import * as React from "react"
const CheckCircleContained = (props: React.SVGAttributes<SVGElement>) => (
  <svg
    fill="none"
    height={40}
    viewBox="0 0 40 40"
    width={40}
    {...props}
  >
    <path
      clipRule="evenodd"
      d="M36.666 20c0 9.205-7.461 16.666-16.666 16.666S3.333 29.205 3.333 20 10.795 3.333 20 3.333c9.205 0 16.666 7.462 16.666 16.667Zm-9.95-5.05a1.25 1.25 0 0 1 0 1.766l-8.333 8.334a1.25 1.25 0 0 1-1.767 0l-3.333-3.334a1.25 1.25 0 1 1 1.767-1.766l2.45 2.45 3.725-3.725 3.725-3.725a1.25 1.25 0 0 1 1.766 0Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
)

export default CheckCircleContained
