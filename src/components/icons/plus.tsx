import * as React from 'react'
const PlusIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg fill='none' height={16} viewBox='0 0 16 16' width={16} {...props}>
    <path
      d='M8 3.333v9.334M3.333 8h9.334'
      stroke='currentColor'
      strokeLinecap='round'
      strokeWidth={1.5}
    />
  </svg>
)

export default PlusIcon
