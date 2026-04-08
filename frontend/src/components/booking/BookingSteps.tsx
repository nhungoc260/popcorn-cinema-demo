import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Chọn Lịch' },
  { id: 2, label: 'Chọn Ghế' },
  { id: 3, label: 'Thanh Toán' },
  { id: 4, label: 'Hoàn Tất' },
]

interface BookingStepsProps {
  currentStep: number
}

export default function BookingSteps({ currentStep }: BookingStepsProps) {
  return (
    <div className="flex items-center justify-center mb-10">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <motion.div
              animate={{
                scale: currentStep === step.id ? 1.1 : 1,
                boxShadow: currentStep === step.id ? '0 0 20px rgba(168,85,247,0.5)' : 'none',
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
              style={{
                background: step.id < currentStep
                  ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'
                  : step.id === currentStep
                  ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'
                  : 'rgba(255,255,255,0.06)',
                color: step.id <= currentStep ? 'white' : 'var(--color-text-dim)',
                border: step.id === currentStep ? 'none' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {step.id < currentStep ? <Check className="w-5 h-5" /> : step.id}
            </motion.div>
            <span className="text-xs mt-1.5 hidden sm:block"
              style={{ color: step.id === currentStep ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: step.id === currentStep ? 600 : 400 }}>
              {step.label}
            </span>
          </div>

          {i < STEPS.length - 1 && (
            <div className="w-12 sm:w-20 h-0.5 mx-2 mb-5 sm:mb-0 transition-all duration-500"
              style={{ background: step.id < currentStep ? 'linear-gradient(90deg, var(--color-primary), var(--color-primary-dark))' : 'rgba(255,255,255,0.08)' }} />
          )}
        </div>
      ))}
    </div>
  )
}
