import { Dialog } from './Dialog'

type Props = {
  onDiscard: () => void
  onKeepEditing: () => void
}

/** Confirms leaving edit mode with unsaved changes (FR-007). Focus starts on the safe choice. */
export function DiscardDialog({ onDiscard, onKeepEditing }: Props) {
  return (
    <Dialog title="Discard your changes?" onDismiss={onKeepEditing}>
      <p className="dialog-body">This route hasn’t been saved. Leaving now discards the points you’ve placed.</p>
      <div className="dialog-actions">
        <button type="button" className="dialog-button" onClick={onKeepEditing} data-autofocus>
          Keep editing
        </button>
        <button type="button" className="dialog-button dialog-button--danger" onClick={onDiscard}>
          Discard changes
        </button>
      </div>
    </Dialog>
  )
}
