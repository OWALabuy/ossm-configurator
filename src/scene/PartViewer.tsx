import { Component, lazy, Suspense, useCallback, useState } from 'react'

import type { PreviewModelViewModel } from '../components/view-models'

const ModelCanvas = lazy(() => import('./ModelCanvas'))

export interface PartViewerProps {
  title?: string
  model: PreviewModelViewModel | null
}

export function PartViewer({ title, model }: PartViewerProps) {
  const [resetVersion, setResetVersion] = useState(0)
  const [readyKey, setReadyKey] = useState<string>()
  const [retryVersion, setRetryVersion] = useState(0)

  const url = model?.status === 'available' ? model.url : undefined
  const renderKey = `${url ?? 'empty'}:${retryVersion}:${resetVersion}`
  const ready = readyKey === renderKey
  const onReady = useCallback(() => setReadyKey(renderKey), [renderKey])

  if (!model) {
    return (
      <ViewerFrame title={title}>
        <ViewerEmptyState
          symbol="◇"
          title="No part selected"
          message="Choose an option with a preview model to inspect it here."
        />
      </ViewerFrame>
    )
  }

  if (model.status === 'missing') {
    return (
      <ViewerFrame title={title} sourcePath={model.sourcePath}>
        <ViewerEmptyState
          symbol="?"
          title="Preview model unavailable"
          message={model.reason}
        />
      </ViewerFrame>
    )
  }

  return (
    <ViewerFrame
      title={title}
      sourcePath={model.sourcePath}
      actions={
        <button
          className="viewer-button"
          type="button"
          onClick={() => {
            setResetVersion((version) => version + 1)
          }}
        >
          Reset view
        </button>
      }
    >
      <SceneErrorBoundary
        key={`${model.url}:${retryVersion}`}
        fallback={
          <ViewerEmptyState
            symbol="×"
            title="Could not load this model"
            message="The referenced preview asset could not be decoded or fetched."
            action={
              <button
                className="viewer-button"
                type="button"
                onClick={() => setRetryVersion((v) => v + 1)}
              >
                Try again
              </button>
            }
          />
        }
      >
        <Suspense fallback={null}>
          <ModelCanvas
            url={model.url}
            resetVersion={resetVersion}
            onReady={onReady}
          />
        </Suspense>
        {!ready && <ViewerLoadingState overlay />}
      </SceneErrorBoundary>
    </ViewerFrame>
  )
}

function ViewerFrame({
  title,
  sourcePath,
  actions,
  children,
}: {
  title?: string
  sourcePath?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="part-viewer" aria-label="3D part preview">
      <header className="part-viewer__toolbar">
        <div>
          <p className="eyebrow">Single-part preview</p>
          <h2>{title ?? '3D inspection'}</h2>
        </div>
        {actions}
      </header>
      <div className="part-viewer__viewport">{children}</div>
      <footer className="part-viewer__footer">
        <span>Drag to orbit · Scroll to zoom · Right-drag to pan</span>
        {sourcePath && <code title={sourcePath}>{sourcePath}</code>}
      </footer>
    </section>
  )
}

function ViewerLoadingState({ overlay = false }: { overlay?: boolean }) {
  return (
    <div
      className={`viewer-loading${overlay ? ' viewer-loading--overlay' : ''}`}
      role="status"
    >
      <span className="viewer-loading__spinner" aria-hidden="true" />
      <span>Loading model…</span>
    </div>
  )
}

function ViewerEmptyState({
  symbol,
  title,
  message,
  action,
}: {
  symbol: string
  title: string
  message: string
  action?: React.ReactNode
}) {
  return (
    <div className="viewer-empty">
      <span className="viewer-empty__symbol" aria-hidden="true">
        {symbol}
      </span>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  )
}

class SceneErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Unable to render preview model', error)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
