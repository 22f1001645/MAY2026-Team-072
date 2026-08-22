import { useState } from 'react'
import { useSearchUsers, useInviteFriend } from '../lib/queries'
import { useToast, Button, Card } from './ui'

interface InviteSearchBlockProps {
  eventId: string
  onInvite?: () => void
}

export default function InviteSearchBlock({ eventId, onInvite }: InviteSearchBlockProps) {
  const [query, setQuery] = useState('')
  const { data: users, isLoading } = useSearchUsers(query)
  const inviteMut = useInviteFriend()
  const { addToast } = useToast()

  const handleInvite = async (userId: string, userName: string) => {
    try {
      await inviteMut.mutateAsync({ eventId, userId })
      addToast(`Invite sent to ${userName}!`)
      setQuery('')
      if (onInvite) onInvite()
    } catch (e: any) {
      addToast(e.message || 'Failed to send invite')
    }
  }

  return (
    <Card className="p-6 border border-teal/20 bg-teal/5">
      <div className="mb-4 text-h3 font-semibold text-offwhite text-center">
        Invite a Friend
      </div>
      <p className="mb-6 text-[13px] text-graytext-mid text-center">
        Search for a friend to send them an in-app invitation. If they register, you both earn points!
      </p>

      <div className="relative">
        <input
          type="text"
          placeholder="Search by name..."
          className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[14px] text-white focus:border-teal/50 focus:outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        
        {query.length > 2 && (
          <div className="absolute top-full left-0 z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#111111] shadow-2xl">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-graytext-mid">Searching...</div>
            ) : users && users.length > 0 ? (
              <div className="flex flex-col">
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleInvite(u.id, u.name)}
                    disabled={inviteMut.isPending}
                    className="flex w-full items-center justify-between border-b border-white/5 px-4 py-3 text-left hover:bg-white/5 disabled:opacity-50"
                  >
                    <div>
                      <div className="font-medium text-white">{u.name}</div>
                      <div className="text-[11px] text-graytext-mid">{u.email}</div>
                    </div>
                    <div className="rounded-full bg-teal/20 px-3 py-1 text-[11px] font-bold text-teal">
                      Invite
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-graytext-mid">No users found.</div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
