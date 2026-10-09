import { useEffect, useId, useRef, type ReactNode } from 'react'
import './Dialog.css'

type Props = {
  title: string
  // Escape, or the dialog's own dismiss button. The caller unmounts the
  // dialog to close it.
  onDismiss: () => void
  children: ReactNode
}

/**
 * A modal dialog, open while it's mounted. The browser's `<dialog>` keeps
 * focus inside it, makes the rest of the page inert, and puts focus back
 * where it was on closing. Focus starts on the element marked
 * `data-autofocus`, or the first control.
 */
export function Dialog({ title, onDismiss, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      // Escape asks the caller, which may keep it open (e.g. while saving).
      onCancel={(event) => {
        event.preventDefault()
        onDismiss()
      }}
    >
      <h2 id={titleId} className="dialog-title">
        {title}
      </h2>
      {children}
    </dialog>
  )
}
