import * as React from 'react'
const ArrowDownIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg fill='none' height={24} viewBox='0 0 24 24' width={24} {...props}>
    <path
      clipRule='evenodd'
      d='M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Zm3.53-12.03a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06L12 12.44l2.47-2.47a.75.75 0 0 1 1.06 0Z'
      fill='currentColor'
      fillOpacity={0.3}
      fillRule='evenodd'
    />
  </svg>
)

export default ArrowDownIcon
