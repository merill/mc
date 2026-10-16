import { cn } from "@/lib/utils"
import type { ZapLine } from "@/lib/zap"
import { ZapAvatar } from "@/components/zap-avatar"

/** A person's line from a discussion, with their face, name and MVP badge. */
export function QuotedLine({
  line,
  lead,
  className,
}: {
  line: ZapLine
  /** Said before the name, such as "Answered:". */
  lead?: string
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 gap-2", className)}>
      <ZapAvatar
        username={line.username}
        name={line.name}
        src={line.avatar}
        className="mt-0.5 size-5 text-[10px]"
      />
      <p className="line-clamp-2 min-w-0 break-words text-sm leading-6 text-muted-foreground">
        {lead && (
          <span className="mr-1 font-medium text-emerald-700 dark:text-emerald-300">
            {lead}
          </span>
        )}
        <span className="font-medium text-foreground">{line.name}</span>{" "}
        {line.badges.includes("mvp") && (
          <span className="mr-1 rounded-full bg-[#b31b1b] px-1.5 py-px text-[10px] font-semibold text-white">
            MVP
          </span>
        )}
        {line.text}
      </p>
    </div>
  )
}

/** Up to four overlapping faces. */
export function Faces({
  people,
}: {
  people: { username: string; name: string; avatar: string | null }[]
}) {
  return (
    <span className="flex -space-x-1.5" aria-hidden="true">
      {people.slice(0, 4).map((person) => (
        <span
          key={person.username}
          className="rounded-full ring-2 ring-background"
        >
          <ZapAvatar
            username={person.username}
            name={person.name}
            src={person.avatar}
            className="size-5 text-[10px]"
          />
        </span>
      ))}
    </span>
  )
}
