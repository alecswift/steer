import { useState } from 'react'
import type { SaveFailure } from './api'
import { Dialog } from './Dialog'
import type { SaveStatus } from './useRouteSave'

type Props = {
  status: SaveStatus
  // The name Phoenix would generate, e.g. `4.2 mi loop · Oct 7`, or null
  // while the distance isn't known yet.
  exampleName: string | null
  onSave: (name: string) => void
  onDismiss: () => void
}

// What happened, and what to do next.
const failures: Record<SaveFailure, string> = {
  network: 'The route wasn’t saved: the server couldn’t be reached. Check that it’s running, then try again.',
  invalid: 'The route wasn’t saved: the server rejected it as drawn. Change the route, then try again.',
  server: 'The route wasn’t saved: the server ran into a problem. Try again in a moment.',
}

function statusText(status: SaveStatus) {
  switch (status.name) {
    case 'waiting':
      return 'Waiting for the last leg to snap…'
    case 'failed':
      return failures[status.reason]
    default:
      return ''
  }
}

/**
 * Names and saves the route. The name is optional: left blank, Phoenix names
 * it by its distance and the date. While legs are still snapping it waits
 * for them, then saves.
 */
export function SaveDialog({ status, exampleName, onSave, onDismiss }: Props) {
  const [name, setName] = useState('')
  const busy = status.name === 'waiting' || status.name === 'saving'

  return (
    <Dialog title="Save route" onDismiss={onDismiss}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSave(name)
        }}
      >
        <label className="dialog-field">
          <span className="dialog-label">
            Name <span className="dialog-optional">(optional)</span>
          </span>
          <input
            className="dialog-input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            readOnly={busy}
            autoComplete="off"
            aria-describedby="save-dialog-hint"
            data-autofocus
          />
          <p id="save-dialog-hint" className="dialog-hint">
            Leave it blank to name it by distance and date
            {exampleName && (
              <>
                , like <span className="dialog-nowrap">“{exampleName}”</span>
              </>
            )}
            .
          </p>
        </label>
        <p
          className={`dialog-status${status.name === 'failed' ? ' dialog-status--error' : ''}`}
          role={status.name === 'failed' ? 'alert' : 'status'}
        >
          {statusText(status)}
        </p>
        <div className="dialog-actions">
          <button type="button" className="dialog-button" onClick={onDismiss} disabled={status.name === 'saving'}>
            Keep editing
          </button>
          <button type="submit" className="dialog-button dialog-button--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save route'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
