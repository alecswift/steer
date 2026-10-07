import { useMemo, type ReactNode } from 'react'
import { ClearIcon, LoopIcon, RedoIcon, UndoIcon } from '@/components/icons'
import { formatFeet, formatMiles } from '@/utils/format'
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
import { metresToFeet, metresToMiles } from './units'
import './EditToolbar.css'

type Props = {
  editor: EditorState
  // The route's legs, snapped or straight, for its stats.
  legs: RouteLeg[]
  onAction: (action: EditorAction) => void
  onCancel: () => void
}

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
 * buttons that leave edit mode.
 */
export function EditToolbar({ editor, legs, onAction, onCancel }: Props) {
  const { waypoints } = editor.present
  const stats = useMemo(() => routeStats(legs), [legs])

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
        <button type="button" className="edit-toolbar-button" onClick={onCancel}>
          Cancel
        </button>
        {/* Saving arrives with the save dialog (8.3). */}
        <button type="button" className="edit-toolbar-button edit-toolbar-button--primary" disabled>
          Save route
        </button>
      </div>
    </section>
  )
}
