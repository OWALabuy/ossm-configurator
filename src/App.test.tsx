import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import App from './App'
import type { SlotViewModel } from './components/view-models'

const sourceRevision = {
  repository: 'hardware-source',
  commit: '1234567890abcdef',
}

describe('App states', () => {
  it('presents loading as an explicit application state', () => {
    const html = renderToStaticMarkup(
      <App catalogState={{ status: 'loading', message: 'Checking records' }} />,
    )

    expect(html).toContain('Preparing the configurator')
    expect(html).toContain('Checking records')
    expect(html).toContain('aria-busy="true"')
  })

  it('reports invalid catalog paths and messages instead of hiding records', () => {
    const html = renderToStaticMarkup(
      <App
        catalogState={{
          status: 'invalid',
          issues: [
            { path: '/options/2/slot', message: 'Unknown slot reference' },
          ],
        }}
      />,
    )

    expect(html).toContain('/options/2/slot')
    expect(html).toContain('Unknown slot reference')
    expect(html).toContain('Invalid data is never hidden')
  })

  it('renders a valid but empty catalog and empty BOM distinctly', () => {
    const html = renderToStaticMarkup(
      <App
        catalogState={{ status: 'ready', catalogVersion: '0.1.0' }}
        sourceRevision={sourceRevision}
      />,
    )

    expect(html).toContain('No assembly areas')
    expect(html).toContain('No part selected')
    expect(html).toContain('Nothing in the BOM yet')
  })

  it('keeps an incompatible option visible, disabled, and explained', () => {
    const slots: SlotViewModel[] = [
      {
        id: 'generic-slot',
        label: 'Generic area',
        required: true,
        options: [
          {
            id: 'candidate-option',
            label: 'Visible candidate',
            selectable: false,
            reasons: [
              {
                message: 'A required physical capability is missing.',
                evidence: { state: 'builder_verified' },
              },
            ],
          },
        ],
      },
    ]
    const html = renderToStaticMarkup(
      <App
        catalogState={{ status: 'ready', catalogVersion: '0.1.0' }}
        slots={slots}
        sourceRevision={sourceRevision}
        onSelect={vi.fn()}
      />,
    )

    expect(html).toContain('Visible candidate')
    expect(html).toContain('disabled=""')
    expect(html).toContain('A required physical capability is missing.')
    expect(html).toContain('Builder verified')
  })

  it('distinguishes a missing model from an empty selection', () => {
    const html = renderToStaticMarkup(
      <App
        catalogState={{ status: 'ready', catalogVersion: '0.1.0' }}
        sourceRevision={sourceRevision}
        preview={{
          title: 'Selected part',
          model: {
            status: 'missing',
            reason: 'The generated asset was not found.',
          },
        }}
      />,
    )

    expect(html).toContain('Preview model unavailable')
    expect(html).toContain('The generated asset was not found.')
    expect(html).not.toContain('No part selected')
  })
})
