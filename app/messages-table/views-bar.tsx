"use client"

import * as React from "react"
import { Check, MoreHorizontal, Plus, SlidersHorizontal } from "lucide-react"

import {
  clearPendingView,
  keepPendingView,
  readActiveView,
  readPendingView,
  useSavedViews,
  writeActiveView,
} from "@/lib/use-views"
import { cn } from "@/lib/utils"
import {
  DEFAULT_VIEW,
  OPTIONAL_COLUMNS,
  SORT_CHOICES,
  VIEWS_MAX,
  VIEW_NAME_MAX,
  cleanViewName,
  narrowedBy,
  newViewId,
  sameViewSettings,
  type OptionalColumn,
  type SavedView,
  type ViewSettings,
} from "@/lib/views"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Panel = "save" | "options" | "menu" | null

const tab =
  "-mb-px inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-2.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=true]:border-foreground aria-[current=true]:text-foreground"
const popover =
  "absolute z-50 mt-2 rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-md"
const menuItem =
  "block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
const checkRow =
  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"

/**
 * The row above the list's filters: the visitor's saved views as tabs, Save
 * view, and View options (what to show, the sort order and the columns).
 *
 * Anyone can change the options. Keeping the result under a name needs a
 * zap.ms account, so Save view is where a signed-out visitor is asked to sign
 * in; what they had set up is still there when they come back.
 */
export function ViewsBar({
  settings,
  onApply,
  hasUrlFilters,
}: {
  /** What the list is showing now. */
  settings: ViewSettings
  onApply: (settings: ViewSettings) => void
  /** The address already says what to show, so no saved view is opened. */
  hasUrlFilters: boolean
}) {
  const { status, views, save, error, signIn } = useSavedViews()
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [panel, setPanel] = React.useState<Panel>(null)
  const [name, setName] = React.useState("")
  // What the name box is for: a new view, or renaming this one.
  const [renaming, setRenaming] = React.useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = React.useState(false)
  const root = React.useRef<HTMLDivElement>(null)
  const restored = React.useRef(false)

  const active = views.find((view) => view.id === activeId) ?? null
  const base = active?.settings ?? DEFAULT_VIEW
  const changed = !sameViewSettings(settings, base)

  // Once the saved views are known: finish a save that was waiting on sign-in,
  // or open the list in the view they used last.
  React.useEffect(() => {
    if (status !== "ready" || restored.current) return
    restored.current = true
    const pending = readPendingView()
    if (pending) {
      onApply(pending)
      setPanel("save")
      return
    }
    if (hasUrlFilters) return
    const last = views.find((view) => view.id === readActiveView())
    if (last) {
      setActiveId(last.id)
      onApply(last.settings)
    }
  }, [hasUrlFilters, onApply, status, views])

  // The save they came back to finish is over once its box has been open
  // and is closed again, whether they named the view or walked away.
  const saveWasOpen = React.useRef(false)
  React.useEffect(() => {
    if (panel === "save") saveWasOpen.current = true
    else if (saveWasOpen.current) clearPendingView()
  }, [panel])

  React.useEffect(() => {
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setPanel(null)
        return
      }
      const target = event.target as Element | null
      if (!target?.closest("[data-view-panel]")) setPanel(null)
    }
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", close)
    return () => {
      document.removeEventListener("mousedown", close)
      document.removeEventListener("keydown", close)
    }
  }, [])

  const toggle = (next: Exclude<Panel, null>) => {
    setPanel((current) => (current === next ? null : next))
    setRenaming(null)
    setConfirmingDelete(false)
    setName("")
  }

  const open = (view: SavedView | null) => {
    setActiveId(view?.id ?? null)
    writeActiveView(view?.id ?? null)
    onApply(view?.settings ?? DEFAULT_VIEW)
    setPanel(null)
  }

  const submitName = async (event: React.FormEvent) => {
    event.preventDefault()
    const cleaned = cleanViewName(name)
    if (!cleaned) return
    if (renaming) {
      await save(
        views.map((view) =>
          view.id === renaming ? { ...view, name: cleaned } : view
        )
      )
    } else {
      const created = { id: newViewId(), name: cleaned, settings }
      if (await save([...views, created])) {
        setActiveId(created.id)
        writeActiveView(created.id)
      }
    }
    setPanel(null)
    setRenaming(null)
    setName("")
  }

  const updateActive = async () => {
    if (!active) return
    await save(
      views.map((view) =>
        view.id === active.id ? { ...view, settings } : view
      )
    )
    setPanel(null)
  }

  const removeActive = async () => {
    if (!active) return
    if (await save(views.filter((view) => view.id !== active.id))) open(null)
  }

  const set = (patch: Partial<ViewSettings>) =>
    onApply({ ...settings, ...patch })
  const toggleColumn = (id: OptionalColumn) =>
    set({
      columns: settings.columns.includes(id)
        ? settings.columns.filter((column) => column !== id)
        : [...settings.columns, id],
    })
  const sortIndex = SORT_CHOICES.findIndex(
    (choice) =>
      choice.sort.id === settings.sort.id &&
      choice.sort.desc === settings.sort.desc
  )
  const narrowed = narrowedBy(settings)
  const canSave = status === "ready" || status === "signed-out"
  const full = views.length >= VIEWS_MAX

  return (
    <div ref={root} className="border-b">
      <div className="flex items-end gap-2">
        <nav
          aria-label="Views"
          className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto"
        >
          <button
            type="button"
            className={tab}
            aria-current={activeId === null}
            onClick={() => open(null)}
          >
            All posts
          </button>
          {views.map((view) => (
            <button
              key={view.id}
              type="button"
              className={tab}
              aria-current={view.id === activeId}
              onClick={() => open(view)}
            >
              {view.name}
            </button>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 pb-1">
          {active && (
            <div className="relative" data-view-panel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground"
                aria-label={`Rename or delete the view ${active.name}`}
                aria-expanded={panel === "menu"}
                onClick={() => toggle("menu")}
              >
                <MoreHorizontal size={16} />
              </Button>
              {panel === "menu" && (
                <div className={cn(popover, "right-0 w-56 p-1")}>
                  {renaming ? (
                    <NameForm
                      label="Rename view"
                      action="Rename"
                      name={name}
                      onName={setName}
                      onSubmit={submitName}
                    />
                  ) : confirmingDelete ? (
                    <div className="p-2">
                      <p>Delete &ldquo;{active.name}&rdquo;?</p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="h-8"
                          onClick={removeActive}
                        >
                          Delete
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => setConfirmingDelete(false)}
                        >
                          Keep
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={menuItem}
                        onClick={() => {
                          setRenaming(active.id)
                          setName(active.name)
                        }}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className={menuItem}
                        onClick={() => setConfirmingDelete(true)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {active && changed && (
            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={updateActive}
            >
              Save changes
            </Button>
          )}

          {canSave && (
            <div className="relative" data-view-panel>
              <Button
                type="button"
                size="sm"
                // Stands out once there is something worth keeping.
                variant={changed && !active ? "default" : "outline"}
                className="h-8 gap-1.5"
                aria-expanded={panel === "save"}
                onClick={() => toggle("save")}
              >
                <Plus size={15} />
                {active ? "Save as new" : "Save view"}
              </Button>
              {panel === "save" && (
                <div className={cn(popover, "right-0 w-72")}>
                  {status === "signed-out" ? (
                    <>
                      <p className="font-semibold">Save this view</p>
                      <p className="mt-1 text-muted-foreground">
                        Keep your products, sort order and columns under a name
                        and switch between views. Saving needs a free account,
                        so your views follow you to any browser.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                          keepPendingView(settings)
                          signIn()
                        }}
                      >
                        Sign in to save
                      </Button>
                    </>
                  ) : full ? (
                    <p>
                      You have {VIEWS_MAX} views, which is the most you can
                      keep. Delete one to save another.
                    </p>
                  ) : (
                    <NameForm
                      label="Name this view"
                      action="Save"
                      name={name}
                      onName={setName}
                      onSubmit={submitName}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          <div className="relative" data-view-panel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              aria-expanded={panel === "options"}
              onClick={() => toggle("options")}
            >
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">View options</span>
              {narrowed > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-xs tabular-nums text-primary-foreground">
                  {narrowed}
                </span>
              )}
            </Button>
            {panel === "options" && (
              <div className={cn(popover, "right-0 w-64 space-y-3 p-2")}>
                <fieldset>
                  <legend className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Show
                  </legend>
                  <CheckRow
                    checked={settings.majorOnly}
                    onChange={() => set({ majorOnly: !settings.majorOnly })}
                  >
                    Major changes only
                  </CheckRow>
                  <CheckRow
                    checked={settings.hideExpired}
                    onChange={() => set({ hideExpired: !settings.hideExpired })}
                  >
                    Hide expired posts
                  </CheckRow>
                </fieldset>
                <div className="px-2">
                  <label
                    htmlFor="view-sort"
                    className="block pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Sort by
                  </label>
                  <select
                    id="view-sort"
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={sortIndex}
                    onChange={(event) =>
                      set({
                        sort:
                          SORT_CHOICES[Number(event.target.value)]?.sort ??
                          DEFAULT_VIEW.sort,
                      })
                    }
                  >
                    {SORT_CHOICES.map((choice, index) => (
                      <option key={choice.label} value={index}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                </div>
                <fieldset>
                  <legend className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Columns
                  </legend>
                  {OPTIONAL_COLUMNS.map((column) => (
                    <CheckRow
                      key={column.id}
                      checked={settings.columns.includes(column.id)}
                      onChange={() => toggleColumn(column.id)}
                    >
                      {column.label}
                    </CheckRow>
                  ))}
                  <p className="px-2 pt-1 text-xs text-muted-foreground md:hidden">
                    Phones show ID and Title only.
                  </p>
                </fieldset>
                {changed && (
                  <button
                    type="button"
                    className={cn(menuItem, "text-muted-foreground")}
                    onClick={() => onApply(base)}
                  >
                    {active ? `Back to "${active.name}"` : "Reset to All posts"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className="py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function NameForm(props: {
  label: string
  action: string
  name: string
  onName: (name: string) => void
  onSubmit: (event: React.FormEvent) => void
}) {
  return (
    <form onSubmit={props.onSubmit} className="space-y-2 p-1">
      <label htmlFor="view-name" className="block font-semibold">
        {props.label}
      </label>
      <Input
        id="view-name"
        autoFocus
        value={props.name}
        maxLength={VIEW_NAME_MAX}
        placeholder="My products"
        onChange={(event) => props.onName(event.target.value)}
        className="h-9"
      />
      <Button
        type="submit"
        size="sm"
        className="h-8"
        disabled={!cleanViewName(props.name)}
      >
        {props.action}
      </Button>
    </form>
  )
}

function CheckRow(props: {
  checked: boolean
  onChange: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={props.checked}
      className={checkRow}
      onClick={props.onChange}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
          props.checked ? "bg-primary text-primary-foreground" : "bg-background"
        )}
      >
        {props.checked && <Check size={12} />}
      </span>
      {props.children}
    </button>
  )
}
