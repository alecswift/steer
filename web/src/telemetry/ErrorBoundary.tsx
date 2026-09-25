import { Component, type ErrorInfo, type ReactNode } from 'react'
import { log } from './logs'

type Props = { children: ReactNode }
type State = { failed: boolean }

// Top-level boundary: logs render errors and shows a plain fallback
// instead of a blank page.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    log.error(
      error instanceof Error ? error.message : 'React render error',
      {
        'error.source': 'react',
        'react.component_stack': info.componentStack ?? '',
      },
      error,
    )
  }

  render() {
    if (this.state.failed) {
      return <p role="alert">Something went wrong. Reload the page to try again.</p>
    }
    return this.props.children
  }
}
