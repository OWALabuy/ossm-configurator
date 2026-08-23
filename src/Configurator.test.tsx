import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import Configurator from './Configurator'

describe('catalog-to-UI integration', () => {
  it('renders a compatible default configuration with catalog-driven safety and conflict explanations', () => {
    const markup = renderToStaticMarkup(<Configurator />)

    expect(markup).toContain('Body Middle Pivot')
    expect(markup).toContain('checked=""')
    expect(markup).toContain(
      'The captive motor tail and DB9 connector cannot pass through the PitClamp Mini&#x27;s one-piece motor ring.',
    )
    expect(markup).toContain('GPIO36 current-sense hardware')
    expect(markup).toContain('Pricing incomplete for 4 parts')
    expect(markup).toContain('fb6f6d6')
  })
})
