'use client'

import { useState, useRef } from 'react'
import { useMonth } from '@/membership/context/month-context'

export default function MembershipChart({ colors }: { colors: Record<string, string> }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const { loading, membershipData } = useMonth()

  if (loading) {
    return (
      <div className='relative w-72 h-72 mx-auto flex items-center justify-center'>
        <div className='text-white'>Cargando...</div>
      </div>
    )
  }

  if (membershipData.total === 0) {
    return (
      <div className='relative w-72 h-72 mx-auto flex items-center justify-center'>
        <div className='text-center text-white'>
          <div className='text-4xl font-bold'>0</div>
          <div className='text-sm text-gray-300'>Membresías</div>
          <div className='text-sm text-gray-300'>activas</div>
        </div>
      </div>
    )
  }

  const total = membershipData.total
  let currentOffset = 0

  const maxCount = Math.max(...membershipData.memberships.map((m) => m.count))

  const segments = membershipData.memberships.map((membership, index) => {
    const percentage = (membership.count / total) * 100
    const circumference = 2 * Math.PI * 13.5
    const strokeLength = (percentage / 100) * circumference
    const strokeDasharray = `${strokeLength} ${circumference - strokeLength}`
    const strokeDashoffset = -currentOffset * (circumference / 100)
    const isLargest = membership.count === maxCount
    const startAngle = currentOffset * 3.6 // Convert percentage to degrees
    const endAngle = (currentOffset + percentage) * 3.6

    currentOffset += percentage

    return {
      ...membership,
      percentage,
      strokeDasharray,
      strokeDashoffset,
      isLargest,
      startAngle,
      endAngle,
      index,
    }
  })

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return

    const rect = svgRef.current.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const mouseX = e.clientX - rect.left - centerX
    const mouseY = e.clientY - rect.top - centerY

    // Calculate angle from center
    let angle = Math.atan2(mouseY, mouseX) * (180 / Math.PI)

    angle = (angle + 90 + 360) % 360 // Adjust for SVG rotation

    // Calculate distance from center
    const distance = Math.sqrt(mouseX * mouseX + mouseY * mouseY)
    const radius = ((13.5 / 36) * rect.width) / 2 // Convert SVG radius to pixel radius

    // Check if mouse is within the ring area
    if (distance > radius - 30 && distance < radius + 100) {
      // Find which segment the angle belongs to
      const foundSegment = segments.find((segment) => {
        return angle >= segment.startAngle && angle < segment.endAngle
      })

      if (foundSegment) {
        setHoveredIndex(foundSegment.index)
      } else {
        setHoveredIndex(null)
      }
    } else {
      setHoveredIndex(null)
    }
  }

  return (
    <div className='relative w-72 h-72 mx-auto'>
      <svg
        ref={svgRef}
        className='w-full h-full transform -rotate-90'
        style={{ cursor: 'pointer' }}
        viewBox='0 0 36 36'
        onMouseLeave={() => setHoveredIndex(null)}
        onMouseMove={handleMouseMove}
      >
        <circle cx='18' cy='18' fill='transparent' r='13.5' stroke='#1a1a1a' strokeWidth='7' />
        {segments.map((segment, index) => {
          return (
            <circle
              key={index}
              cx='18'
              cy='18'
              fill='transparent'
              r='13.5'
              stroke={colors[segment.color]}
              strokeDasharray={segment.strokeDasharray}
              strokeDashoffset={segment.strokeDashoffset}
              strokeWidth={hoveredIndex === index ? '8' : '7'}
              style={{
                transition: 'stroke-width 0.2s ease-in-out',
              }}
            />
          )
        })}
      </svg>
      <div className='absolute inset-0 flex flex-col items-center justify-center pointer-events-none'>
        <div className='text-4xl font-bold text-white'>{total}</div>
        <div className='text-sm text-gray-300'>Membresías</div>
        <div className='text-sm text-gray-300'>activas</div>
      </div>
    </div>
  )
}
