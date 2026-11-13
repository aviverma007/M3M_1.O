/* Grid of avatar emojis; "Initials" clears the choice. */
import { cn } from '@/lib/utils'
import UserAvatar from './UserAvatar'

export const AVATAR_EMOJIS = [
  '😀',
  '😎',
  '🤓',
  '🧐',
  '😇',
  '🥳',
  '🤠',
  '😺',
  '🦁',
  '🐯',
  '🐼',
  '🦊',
  '🐻',
  '🐨',
  '🐵',
  '🦉',
  '🦅',
  '🐬',
  '🦄',
  '🐝',
  '🐢',
  '🐘',
  '🦒',
  '🐧',
  '👷',
  '👨‍💼',
  '👩‍💼',
  '🧑‍💻',
  '👨‍🔧',
  '👩‍🔬',
  '🧑‍🎨',
  '🕵️',
  '🏗️',
  '🏢',
  '🏙️',
  '🏠',
  '📐',
  '📊',
  '🛠️',
  '🧱',
  '🚀',
  '⚡',
  '🔥',
  '🌟',
  '🎯',
  '💎',
  '🌿',
  '🌻',
]

export default function EmojiPicker({ value, onChange, name }: { value: string | null; onChange: (v: string | null) => void; name?: string }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-8 gap-1.5">
        {AVATAR_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            className={cn(
              'h-9 w-9 rounded-lg text-xl flex items-center justify-center transition-all hover:bg-blue-50 hover:scale-110',
              value === e ? 'bg-blue-100 ring-2 ring-[#005baa]' : 'bg-gray-50',
            )}
            aria-label={`Avatar ${e}`}
            aria-pressed={value === e}
          >
            {e}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          'inline-flex items-center gap-2 text-xs font-semibold rounded-lg px-2 py-1.5 hover:bg-gray-50',
          !value ? 'text-[#005baa]' : 'text-gray-500',
        )}
      >
        <UserAvatar name={name} size={22} /> No emoji, use initials
      </button>
    </div>
  )
}
