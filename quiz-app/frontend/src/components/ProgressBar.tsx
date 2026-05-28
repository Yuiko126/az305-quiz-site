type Props = {
  current: number
  total: number
  percent: number
}

export function ProgressBar({ current, total, percent }: Props) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-sm text-gray-500 whitespace-nowrap">
        {current} / {total}
      </span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-400"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}