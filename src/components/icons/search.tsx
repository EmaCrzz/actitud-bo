import * as React from "react"
const SearchIcon =  (props: React.SVGAttributes<SVGElement>) => (
  <svg
    fill="none"
    height={24}
    viewBox="0 0 24 24"
    width={24}
    {...props}
  >
    <path
      d="M20.313 11.157a9.156 9.156 0 0 1-17.644 3.534 9.157 9.157 0 1 1 17.644-3.534Z"
      fill="currentColor"
    />
    <path
      clipRule="evenodd"
      d="M18.838 18.838a.724.724 0 0 1 1.023 0l1.927 1.928a.723.723 0 0 1-1.022 1.022l-1.928-1.927a.724.724 0 0 1 0-1.023Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
)

export default SearchIcon
