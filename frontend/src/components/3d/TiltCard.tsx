import { useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

interface TiltCardProps {
  children: React.ReactNode
  className?: string
  intensity?: number
}

export default function TiltCard({ children, className = '', intensity = 15 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [hovering, setHovering] = useState(false)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [intensity, -intensity]), { stiffness: 300, damping: 30 })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-intensity, intensity]), { stiffness: 300, damping: 30 })

  const glowX = useTransform(mouseX, [-0.5, 0.5], [0, 100])
  const glowY = useTransform(mouseY, [-0.5, 0.5], [0, 100])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const handleMouseLeave = () => {
    setHovering(false)
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <motion.div
      ref={ref}
      className={`relative ${className}`}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Glare effect */}
      {hovering && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none z-10"
          style={{
            background: `radial-gradient(circle at ${glowX.get()}% ${glowY.get()}%, rgba(255,255,255,0.12) 0%, transparent 60%)`,
          }}
        />
      )}
      <div style={{ transform: 'translateZ(20px)' }}>
        {children}
      </div>
    </motion.div>
  )
}
