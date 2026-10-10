import { useState } from 'react'
import { log, track } from '@/telemetry'
import { deleteRoute, type Route } from './api'
import { Dialog } from './Dialog'

type Props = {
  route: Route
  // After Phoenix has deleted it. The caller drops it from the list and the
  // selection, which unmounts the dialog.
  onDeleted: (id: string) => void
  onDismiss: () => void
}

type Status = 'idle' | 'deleting' | 'failed'

/**
 * Confirms deleting a saved route (FR-009), then deletes it. Focus starts on
 * the safe choice. A failure keeps the dialog open to try again.
 */
export function DeleteDialog({ route, onDeleted, onDismiss }: Props) {
  const [status, setStatus] = useState<Status>('idle')

  function handleDelete() {
    setStatus('deleting')
    deleteRoute(route.id).then(
      () => {
        track('route.deleted', { route_id: route.id })
        onDeleted(route.id)
      },
      (error: unknown) => {
        setStatus('failed')
        log.error('Could not delete route', { 'error.source': 'routes.delete' }, error)
      },
    )
  }

  // Kept open while the request is out, so the answer has somewhere to land.
  const dismiss = () => {
    if (status !== 'deleting') onDismiss()
  }

  return (
    <Dialog title="Delete this route?" onDismiss={dismiss}>
      <p className="dialog-body">
        <span className="dialog-emphasis">{route.properties.name}</span> will be removed for good. This can’t be undone.
      </p>
      <p className={`dialog-status${status === 'failed' ? ' dialog-status--error' : ''}`} role="alert">
        {status === 'failed' &&
          'The route wasn’t deleted: the server couldn’t be reached or ran into a problem. Try again in a moment.'}
      </p>
      <div className="dialog-actions">
        <button type="button" className="dialog-button" onClick={dismiss} disabled={status === 'deleting'} data-autofocus>
          Keep route
        </button>
        <button
          type="button"
          className="dialog-button dialog-button--danger"
          onClick={handleDelete}
          disabled={status === 'deleting'}
        >
          {status === 'deleting' ? 'Deleting…' : 'Delete route'}
        </button>
      </div>
    </Dialog>
  )
}
