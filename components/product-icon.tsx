import { serviceIconSrc, serviceMonogram } from "@/lib/product-icons"
import { cn } from "@/lib/utils"

/**
 * A service's product icon, or a two-letter tile when it has none, so a list
 * of services lines up either way. Size comes from `className`.
 */
export function ProductIcon(props: { service: string; className?: string }) {
  const src = serviceIconSrc(props.service)

  if (src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className={cn("size-4 shrink-0 object-contain", props.className)}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-4 shrink-0 select-none items-center justify-center rounded-[4px] border bg-muted text-[7px] font-bold leading-none text-muted-foreground",
        props.className
      )}
    >
      {serviceMonogram(props.service)}
    </span>
  )
}
