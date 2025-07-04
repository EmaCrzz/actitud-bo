import * as React from "react"
const CalendarIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg
    fill="none"
    height={24}
    viewBox="0 0 24 24"
    width={24}
    {...props}
  >
    <path
      d="M7.75 2.5a.75.75 0 0 0-1.5 0v1.58c-1.44.115-2.384.397-3.078 1.092-.695.694-.977 1.639-1.093 3.078h19.842c-.116-1.44-.398-2.384-1.093-3.078-.694-.695-1.639-.977-3.078-1.093V2.5a.75.75 0 1 0-1.5 0v1.513C15.585 4 14.839 4 14 4h-4c-.839 0-1.585 0-2.25.013V2.5Z"
      fill="currentColor"
    />
    <path
      clipRule="evenodd"
      d="M22 12v2c0 3.771 0 5.657-1.172 6.828C19.656 21.999 17.771 22 14 22h-4c-3.771 0-5.657 0-6.828-1.172C2.001 19.656 2 17.771 2 14v-2c0-.839 0-1.585.013-2.25h19.974C22 10.415 22 11.161 22 12Zm-5.5 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
)

export default CalendarIcon
