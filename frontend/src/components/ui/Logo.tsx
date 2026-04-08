import { Link } from 'react-router-dom'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  to?: string
  className?: string
}

export default function Logo({ size = 'md', showText = true, to = '/', className = '' }: LogoProps) {
  const textSize = size === 'sm' ? 'text-[13px]' : size === 'lg' ? 'text-[17px]' : 'text-[15px]'
  const imgHeight = size === 'sm' ? '32px' : size === 'lg' ? '44px' : '40px'

  const inner = (
    <div className={`flex items-center gap-2.5 flex-shrink-0 select-none ${className}`}>
      {/* Logo image */}
      <img
        src="/logo.svg"
        alt="Popcorn Cinema Logo"
        style={{ height: imgHeight, width: 'auto' }}
      />

      {/* Text: Popcorn Cinema */}
      {showText && (
        <div className="hidden sm:flex flex-col leading-none">
          <div className={`font-bold ${textSize} whitespace-nowrap`}>
            <span style={{ color: 'var(--color-text, #F0EEFF)' }}>Popcorn </span>
            <span style={{
              background: 'linear-gradient(135deg, #A855F7, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Cinema</span>
          </div>
        </div>
      )}
    </div>
  )

  if (to) {
    return (
      <Link to={to} style={{ textDecoration: 'none' }}>
        {inner}
      </Link>
    )
  }
  return inner
}