import type { ReactNode } from 'react'
import { ClearIcon, LoopIcon, RedoIcon, UndoIcon } from '@/components/icons'
import {
  canClear,
  canCloseLoop,
  canRedo,
  canUndo,
  isLoopClosed,
  type EditorAction,
  type EditorState,
} from './editor'
import './EditToolbar.css'

type Props = {
  editor: EditorState
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
 * The edit-mode panel: what to do next, the history tools, each enabled only
 * when its action is possible, and the buttons that leave edit mode.
 */
export function EditToolbar({ editor, onAction, onCancel }: Props) {
  const { waypoints } = editor.present

  return (
    <section className="edit-toolbar" aria-labelledby="edit-toolbar-title">
      <h2 id="edit-toolbar-title" className="edit-toolbar-title">
        New route
      </h2>
      <p className="edit-toolbar-status" aria-live="polite">
        {status(waypoints)}
      </p>
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
