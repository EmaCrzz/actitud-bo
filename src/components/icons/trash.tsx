import * as React from 'react'
const TrashIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg fill='none' height={24} viewBox='0 0 24 24' width={24} {...props}>
    <path
      d='M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m3 0v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7M10 11v6M14 11v6'
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={1.75}
    />
  </svg>
)

export default TrashIcon
