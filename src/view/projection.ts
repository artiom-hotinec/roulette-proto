export type Point = { x: number; y: number }

// Corner order: top-left, top-right, bottom-right, bottom-left.
export type Quad = readonly [Point, Point, Point, Point]

// Row-major 3x3 matrix: [m00, m01, m02, m10, m11, m12, m20, m21, m22].
type Matrix3 = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
]

export type Projection = {
  project: (x: number, y: number) => Point
  unproject: (x: number, y: number) => Point
}

// Matrix that maps the unit square (0,0), (1,0), (1,1), (0,1) onto the quad.
function unitSquareToQuad(q: Quad): Matrix3 {
  const [p0, p1, p2, p3] = q
  const dx1 = p1.x - p2.x
  const dx2 = p3.x - p2.x
  const dx3 = p0.x - p1.x + p2.x - p3.x
  const dy1 = p1.y - p2.y
  const dy2 = p3.y - p2.y
  const dy3 = p0.y - p1.y + p2.y - p3.y

  let g = 0
  let h = 0
  if (dx3 !== 0 || dy3 !== 0) {
    const den = dx1 * dy2 - dx2 * dy1
    if (den === 0) throw new Error('Degenerate quad')
    g = (dx3 * dy2 - dx2 * dy3) / den
    h = (dx1 * dy3 - dx3 * dy1) / den
  }

  return [
    p1.x - p0.x + g * p1.x, p3.x - p0.x + h * p3.x, p0.x,
    p1.y - p0.y + g * p1.y, p3.y - p0.y + h * p3.y, p0.y,
    g, h, 1,
  ]
}

// Adjugate (inverse up to a scale factor, which a homography ignores).
function adjugate(m: Matrix3): Matrix3 {
  const [a, b, c, d, e, f, g, h, i] = m
  return [
    e * i - f * h, c * h - b * i, b * f - c * e,
    f * g - d * i, a * i - c * g, c * d - a * f,
    d * h - e * g, b * g - a * h, a * e - b * d,
  ]
}

function multiply(a: Matrix3, b: Matrix3): Matrix3 {
  const out: number[] = []
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      let sum = 0
      for (let k = 0; k < 3; k++) sum += a[row * 3 + k] * b[k * 3 + col]
      out.push(sum)
    }
  }
  return out as unknown as Matrix3
}

function apply(m: Matrix3, x: number, y: number): Point {
  const w = m[6] * x + m[7] * y + m[8]
  return {
    x: (m[0] * x + m[1] * y + m[2]) / w,
    y: (m[3] * x + m[4] * y + m[5]) / w,
  }
}

// Perspective (homography) map from quad `from` to quad `to`.
export function createProjection(from: Quad, to: Quad): Projection {
  const forward = multiply(unitSquareToQuad(to), adjugate(unitSquareToQuad(from)))
  const inverse = adjugate(forward)
  return {
    project: (x, y) => apply(forward, x, y),
    unproject: (x, y) => apply(inverse, x, y),
  }
}
