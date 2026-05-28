type Status = 'default' | 'correct' | 'incorrect' | 'disabled'

type Props = {
  label: 'A' | 'B' | 'C' | 'D'
  text: string
  status: Status
  onClick: () => void
}

const statusStyles: Record<Status, string> = {
  default:   'border-gray-200 bg-white hover:border-blue-500 hover:bg-blue-50 cursor-pointer',
  correct:   'border-green-500 bg-green-50 text-green-700 cursor-default',
  incorrect: 'border-red-500 bg-red-50 text-red-700 cursor-default',
  disabled:  'border-gray-200 bg-white opacity-50 cursor-default',
}

const labelStyles: Record<Status, string> = {
  default:  'text-blue-500',
  correct:  'text-green-600',
  incorrect:'text-red-600',
  disabled: 'text-gray-400',
}

export function OptionButton({ label, text, status, onClick }: Props) {
  const icon = status === 'correct' ? '✅' : status === 'incorrect' ? '❌' : label

  return (
    <button
      disabled={status !== 'default'}
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-4 border-2 rounded-xl text-left text-sm transition-all duration-200 ${statusStyles[status]}`}
    >
      <span className={`font-bold min-w-[20px] ${labelStyles[status]}`}>
        {icon}
      </span>
      <span>{text}</span>
    </button>
  )
}