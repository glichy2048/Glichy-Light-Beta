import { Component, type ErrorInfo, type ReactNode } from "react"
import { downloadReport, recordCrash } from "./diagnostics"

type State = { error: Error | null }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    recordCrash("render", error, info.componentStack ?? undefined)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="crash-screen" role="alert">
        <h1>Glichylight hit a problem</h1>
        <p>
          Your catalog and edits are saved locally and should be intact. A crash report was recorded on this device;
          it contains no photo names or image data.
        </p>
        <pre>{error.message}</pre>
        <div>
          <button className="primary-btn" onClick={() => window.location.reload()}>
            Reload app
          </button>
          <button className="secondary-btn" onClick={() => void downloadReport()}>
            Download diagnostics
          </button>
        </div>
      </div>
    )
  }
}
