import { describe, expect, it } from 'vitest'

import { calculateCameraFit } from './camera-fit'

describe('calculateCameraFit', () => {
  it('places the camera beyond the model radius with valid clip planes', () => {
    const fit = calculateCameraFit(50, 40, 16 / 9)

    expect(fit.distance).toBeGreaterThan(50)
    expect(fit.near).toBeGreaterThan(0)
    expect(fit.near).toBeLessThan(fit.distance)
    expect(fit.far).toBeGreaterThan(fit.distance)
  })

  it('moves farther away for narrow portrait viewports', () => {
    const landscape = calculateCameraFit(20, 40, 16 / 9)
    const portrait = calculateCameraFit(20, 40, 9 / 16)

    expect(portrait.distance).toBeGreaterThan(landscape.distance)
  })

  it('handles empty or malformed bounds defensively', () => {
    const fit = calculateCameraFit(Number.NaN, 0, 0)

    expect(Number.isFinite(fit.distance)).toBe(true)
    expect(fit.near).toBeGreaterThan(0)
  })
})
