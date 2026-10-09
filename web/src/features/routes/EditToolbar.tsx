import { useMemo, useState, type ReactNode } from 'react'
import { ClearIcon, LoopIcon, RedoIcon, UndoIcon } from '@/components/icons'
import { track } from '@/telemetry'
import { formatFeet, formatMiles } from '@/utils/format'
import type { Route } from './api'
import { DiscardDialog } from './DiscardDialog'
import {
  canClear,
  canCloseLoop,
  canRedo,
  canUndo,
  isLoopClosed,
  type EditorAction,
  type EditorState,
} from './editor'
import type { RouteLeg } from './legCache'
import { routeStats, type RouteStats } from './routeStats'
import { SaveDialog } from './SaveDialog'
import { metresToFeet, metresToMiles } from './units'
import { useRouteSave } from './useRouteSave'
import './EditToolbar.css'

type Props = {
  editor: EditorState
  // The route's legs, snapped or straight, for its stats.
  legs: RouteLeg[]
  // Whether leaving would lose changes (FR-007).
  unsaved: boolean
  // When the editor opened, on the performance.now() timeline.
  openedAt: number
  onAction: (action: EditorAction) => void
  // Leaves edit mode without saving.
  onLeave: () => void
  // Leaves edit mode with the route just saved.
  onSaved: (route: Route) => void
}

type OpenDialog = 'save' | 'discard' | null

// What to do next, given the route so far.
function status(waypoints: EditorState['present']['waypoints']) {
  if (isLoopClosed(waypoints)) return 'Loop closed. Undo to reopen it.'
  if (waypoints.length === 0) return 'Click the map to place the start.'
  if (waypoints.length === 1) return 'Click the map to add the next point.'
  return `${waypoints.length} points. Click the map to keep going.`
}

// A figure with its unit set small and muted, or a dash while it can't be
// measured yet.
function Measure({ measure }: { measure: { value: string; unit: string } | null }) {
  if (!measure) return <span className="edit-toolbar-value">–</span>
  return (
    <>
      <span className="edit-toolbar-value">{measure.value}</span>{' '}
      <span className="edit-toolbar-unit">{measure.unit}</span>
    </>
  )
}

// Distance, gain and loss so far. They wait for every leg's elevation, so
// they show the numbers the saved route will have rather than a guess.
function Stats({ stats }: { stats: RouteStats | null }) {
  const feet = (metres: number) => formatFeet(metresToFeet(metres))
  return (
    <dl className="edit-toolbar-stats">
      <div>
        <dt>Distance</dt>
        <dd>
          <Measure measure={stats && formatMiles(metresToMiles(stats.distanceM))} />
        </dd>
      </div>
      <div>
        <dt>Gain</dt>
        <dd>
          <Measure measure={stats && feet(stats.gainM)} />
        </dd>
      </div>
      <div>
        <dt>Loss</dt>
        <dd>
          <Measure measure={stats && feet(stats.lossM)} />
        </dd>
      </div>
    </dl>
  )
}

// The name Phoenix gives a route saved without one (Steer.Routes.Name), from
// the live distance and today's date. The saved distance can differ in the
// last place, so the dialog says "like".
function exampleName(stats: RouteStats | null, waypoints: EditorState['present']['waypoints']) {
  if (!stats) return null
  const miles = metresToMiles(stats.distanceM).toFixed(1)
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${miles} mi ${isLoopClosed(waypoints) ? 'loop' : 'route'} · ${date}`
}

type ToolProps = { label: string; icon: ReactNode; enabled: boolean; onClick: () => void }

// An icon over its name, so the four tools read as one row of instruments.
function Tool({ label, icon, enabled, onClick }: ToolProps) {
  return (
    <button type="button" className="edit-toolbar-tool" disabled={!enabled} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  )
}

/**
 * The edit-mode panel: what to do next, the route's stats once it has a leg,
 * the history tools, each enabled only when its action is possible, and the
 * buttons that leave edit mode: Save route, through the save dialog, and
 * Cancel, which asks first when there are unsaved changes.
 */
export function EditToolbar({ editor, legs, unsaved, openedAt, onAction, onLeave, onSaved }: Props) {
  const { waypoints } = editor.present
  const stats = useMemo(() => routeStats(legs), [legs])
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const { status: saveStatus, save, reset } = useRouteSave({ waypoints, legs, openedAt, onSaved })

  function handleCancel() {
    if (!unsaved) {
      onLeave()
      return
    }
    setDialog('discard')
    track('editor.discard_prompted', { trigger: 'cancel' })
  }

  function handleDiscard() {
    track('editor.discarded', { trigger: 'cancel' })
    onLeave()
  }

  // Closing stops waiting for legs, but a request already out finishes.
  function dismissSave() {
    if (saveStatus.name === 'saving') return
    reset()
    setDialog(null)
  }

  return (
    <section className="edit-toolbar" aria-labelledby="edit-toolbar-title">
      <h2 id="edit-toolbar-title" className="edit-toolbar-title">
        New route
      </h2>
      <p className="edit-toolbar-status" aria-live="polite">
        {status(waypoints)}
      </p>
      {legs.length > 0 && <Stats stats={stats} />}
      <div className="edit-toolbar-tools" role="toolbar" aria-label="Route tools">
        <Tool label="Undo" icon={<UndoIcon />} enabled={canUndo(editor)} onClick={() => onAction({ type: 'UNDO' })} />
        <Tool label="Redo" icon={<RedoIcon />} enabled={canRedo(editor)} onClick={() => onAction({ type: 'REDO' })} />
        <Tool label="Clear" icon={<ClearIcon />} enabled={canClear(editor)} onClick={() => onAction({ type: 'CLEAR' })} />
        <Tool
          label="Close loop"
          icon={<LoopIcon />}
          enabled={canCloseLoop(editor)}
          onClick={() => onAction({ type: 'CLOSE_LOOP' })}
        />
      </div>
      <div className="edit-toolbar-actions">
        <button type="button" className="edit-toolbar-button" onClick={handleCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="edit-toolbar-button edit-toolbar-button--primary"
          disabled={waypoints.length < 2}
          onClick={() => setDialog('save')}
        >
          Save route
        </button>
      </div>
      {dialog === 'save' && (
        <SaveDialog status={saveStatus} exampleName={exampleName(stats, waypoints)} onSave={save} onDismiss={dismissSave} />
      )}
      {dialog === 'discard' && <DiscardDialog onDiscard={handleDiscard} onKeepEditing={() => setDialog(null)} />}
    </section>
  )
}
