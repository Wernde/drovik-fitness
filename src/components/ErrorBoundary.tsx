import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null; info: string | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    this.setState({ info: info.componentStack?.slice(0, 400) ?? null })
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.error) {
      const stack = this.state.error.stack?.slice(0, 600) ?? ''
      return (
        <div className="px-4 py-6 overflow-auto">
          <p className="text-base font-bold text-red-600 mb-2">Crash — copy this and send it</p>
          <pre className="text-[10px] text-red-800 bg-red-50 rounded-xl p-3 break-all whitespace-pre-wrap mb-3">
            {this.state.error.message}{'\n\n'}{stack}
            {this.state.info ? '\n\nComponent:' + this.state.info : ''}
          </pre>
          <button
            onClick={() => this.setState({ error: null, info: null })}
            className="text-sm font-bold text-accent-dark underline"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
