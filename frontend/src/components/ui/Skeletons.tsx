export function MovieCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}>
      <div className="aspect-[2/3] skeleton" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-4 rounded w-3/4" />
        <div className="skeleton h-3 rounded w-1/2" />
        <div className="flex justify-between items-center">
          <div className="skeleton h-3 rounded w-1/4" />
          <div className="skeleton h-7 rounded-lg w-16" />
        </div>
      </div>
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-24 pb-12">
      <div className="skeleton h-80 rounded-2xl mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="skeleton h-96 rounded-2xl" />
        <div className="col-span-2 space-y-4">
          <div className="skeleton h-8 rounded w-2/3" />
          <div className="skeleton h-4 rounded w-full" />
          <div className="skeleton h-4 rounded w-5/6" />
          <div className="skeleton h-4 rounded w-4/6" />
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-14 rounded-xl" />
      ))}
    </div>
  )
}

export function SeatSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, row) => (
        <div key={row} className="flex gap-2 justify-center">
          {Array.from({ length: 10 }).map((_, col) => (
            <div key={col} className="skeleton w-8 h-8 rounded" />
          ))}
        </div>
      ))}
    </div>
  )
}
