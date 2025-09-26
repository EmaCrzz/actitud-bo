import * as React from 'react'
const Instagram = (props: React.SVGAttributes<SVGElement>) => (
  <svg fill='none' height={24} viewBox='0 0 24 24' width={24} {...props}>
    <path d='M12 8.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z' fill='currentColor' />
    <path
      clipRule='evenodd'
      d='M6.77 3.082a47.5 47.5 0 0 1 10.46 0c1.899.212 3.43 1.707 3.653 3.613a45.704 45.704 0 0 1 0 10.61c-.223 1.906-1.754 3.401-3.652 3.614a47.493 47.493 0 0 1-10.461 0c-1.899-.213-3.43-1.708-3.653-3.613a45.7 45.7 0 0 1 0-10.611C3.34 4.789 4.871 3.294 6.77 3.082ZM17 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-9.75 6a4.75 4.75 0 1 1 9.5 0 4.75 4.75 0 0 1-9.5 0Z'
      fill='currentColor'
      fillRule='evenodd'
    />
  </svg>
)

export default Instagram
