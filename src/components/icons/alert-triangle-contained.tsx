import * as React from 'react'
const AlertTriangleContained = (props: React.SVGAttributes<SVGElement>) => (
  <svg fill='none' height={40} viewBox='0 0 40 40' width={40} {...props}>
    <path
      clipRule='evenodd'
      d='M8.853 17.937C13.717 9.312 16.148 5 20 5c3.852 0 6.283 4.312 11.147 12.937l.606 1.073c4.042 7.167 6.064 10.75 4.237 13.37C34.163 35 29.643 35 20.607 35h-1.214c-9.036 0-13.556 0-15.383-2.62s.195-6.203 4.237-13.37l.606-1.073ZM20 12.083a1.25 1.25 0 0 1 1.25 1.25v8.334a1.25 1.25 0 0 1-2.5 0v-8.334a1.25 1.25 0 0 1 1.25-1.25Zm0 16.25A1.667 1.667 0 1 0 20 25a1.667 1.667 0 0 0 0 3.334Z'
      fill='currentColor'
      fillRule='evenodd'
    />
  </svg>
)

export default AlertTriangleContained
