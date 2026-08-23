export interface CameraFit {
  distance: number
  near: number
  far: number
}

/** Compute a stable perspective-camera distance for a centered bounding sphere. */
export function calculateCameraFit(
  radius: number,
  verticalFovDegrees: number,
  aspect: number,
  margin = 1.35,
): CameraFit {
  const safeRadius = Number.isFinite(radius) && radius > 0 ? radius : 1
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
  const verticalHalfFov =
    (Math.max(1, Math.min(179, verticalFovDegrees)) * Math.PI) / 360
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * safeAspect)
  const limitingHalfFov = Math.min(verticalHalfFov, horizontalHalfFov)
  const distance =
    (safeRadius / Math.sin(limitingHalfFov)) * Math.max(1, margin)

  return {
    distance,
    near: Math.max(safeRadius / 1_000, distance - safeRadius * 2.5),
    far: distance + safeRadius * 6,
  }
}
