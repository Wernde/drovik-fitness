import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="px-4 py-8 text-center">
          <p className="text-base font-bold text-red-600 mb-2">Something went wrong</p>
          <p className="text-sm text-app-muted font-mono break-all">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-4 text-sm font-bold text-accent-dark underline"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
