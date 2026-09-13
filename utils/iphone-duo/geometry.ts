import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'

/**
 * 半机轮廓：x+ 一侧为折叠缘（两角近似直角），x- 一侧为外缘（两角大圆角）。
 * 书本式折叠机的每半边都长这样 —— 内缘必须平直，内屏才能直通折痕。
 */
export function halfRoundedRect(w: number, h: number, rNeg: number, rPos: number) {
  // rNeg：x- 端两角的圆角；rPos：x+ 端两角的圆角
  const shape = new THREE.Shape()
  const x0 = -w / 2
  const x1 = w / 2
  const y0 = -h / 2
  const y1 = h / 2
  const ro = Math.min(rNeg, h / 2 - 0.05)
  const ri = Math.min(Math.max(rPos, 0.02), h / 2 - 0.05)
  shape.moveTo(x0 + ro, y0)
  shape.lineTo(x1 - ri, y0)
  shape.absarc(x1 - ri, y0 + ri, ri, -Math.PI / 2, 0, false)
  shape.lineTo(x1, y1 - ri)
  shape.absarc(x1 - ri, y1 - ri, ri, 0, Math.PI / 2, false)
  shape.lineTo(x0 + ro, y1)
  shape.absarc(x0 + ro, y1 - ro, ro, Math.PI / 2, Math.PI, false)
  shape.lineTo(x0, y0 + ro)
  shape.absarc(x0 + ro, y0 + ro, ro, Math.PI, Math.PI * 1.5, false)
  shape.closePath()
  return shape
}

/** 圆角矩形轮廓（真圆弧，非二次贝塞尔近似），逆时针闭合 */
export function roundedRect(w: number, h: number, r: number, cx = 0, cy = 0) {
  const shape = new THREE.Shape()
  const x0 = cx - w / 2
  const x1 = cx + w / 2
  const y0 = cy - h / 2
  const y1 = cy + h / 2
  const rr = Math.max(0.05, Math.min(r, w / 2, h / 2))
  shape.moveTo(x0 + rr, y0)
  shape.lineTo(x1 - rr, y0)
  shape.absarc(x1 - rr, y0 + rr, rr, -Math.PI / 2, 0, false)
  shape.lineTo(x1, y1 - rr)
  shape.absarc(x1 - rr, y1 - rr, rr, 0, Math.PI / 2, false)
  shape.lineTo(x0 + rr, y1)
  shape.absarc(x0 + rr, y1 - rr, rr, Math.PI / 2, Math.PI, false)
  shape.lineTo(x0, y0 + rr)
  shape.absarc(x0 + rr, y0 + rr, rr, Math.PI, Math.PI * 1.5, false)
  return shape
}

/**
 * 中框 / 玻璃板：外轮廓 w×h、圆角 r、厚度 t，前后各带 bevel 宽倒角。
 * 前面在 z=0、背面在 z=-t；最大轮廓位于中部厚度处（与 iPhone 中框一致）。
 */
export function plate(
  w: number,
  h: number,
  r: number,
  t: number,
  bevel = 0.6,
  curveSegments = 48,
  shapeOverride?: THREE.Shape
) {
  // ExtrudeGeometry 的 bevel 会把轮廓向外扩张 bevelSize，故先内缩，扩张后正好等于标称尺寸
  const shape = shapeOverride ?? roundedRect(w - bevel * 2, h - bevel * 2, Math.max(r - bevel, 0.1))
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: t - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: 0,
    bevelSegments: 4,
    curveSegments
  })
  geo.translate(0, 0, -(t - bevel))
  geo.computeVertexNormals()
  return geo
}

/** 平躺在 XY 平面、法线朝 +Z 的圆角矩形平板（可带圆角矩形开孔） */
export function flatPlate(
  w: number,
  h: number,
  r: number,
  cx = 0,
  cy = 0,
  hole?: { w: number; h: number; r: number; cx: number; cy: number }
) {
  const shape = roundedRect(w, h, r, cx, cy)
  if (hole) shape.holes.push(roundedRect(hole.w, hole.h, hole.r, hole.cx, hole.cy))
  return new THREE.ShapeGeometry(shape, 48)
}

/**
 * 铰链中脊：以 Y 轴为中心的实心扇形柱（含上下扇形端盖）。
 * theta 为 CylinderGeometry 参数（x = r·sinθ、z = r·cosθ，世界方位角 = 90° - theta）。
 * 两个径向面不生成，正好藏进两侧机身内部；材质用 DoubleSide 即可。
 */
export function spineSector(radius: number, height: number, thetaStartDeg: number, thetaLengthDeg: number) {
  return new THREE.CylinderGeometry(
    radius,
    radius,
    height,
    Math.max(8, Math.round(thetaLengthDeg / 1.4)),
    1,
    false,
    THREE.MathUtils.degToRad(thetaStartDeg),
    THREE.MathUtils.degToRad(thetaLengthDeg)
  )
}

/** 圆柱（镜头玻璃等），轴心沿 Y */
export function cylinder(r: number, h: number, seg = 48) {
  return new THREE.CylinderGeometry(r, r, h, seg, 1, false)
}

/** 圆环管（镜头圈），轴心沿 Z，z ∈ [-t, 0] */
export function ring(rOuter: number, rInner: number, t: number, seg = 64) {
  const shape = new THREE.Shape()
  shape.absarc(0, 0, rOuter, 0, Math.PI * 2, false)
  const hole = new THREE.Path()
  hole.absarc(0, 0, rInner, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: seg })
  geo.translate(0, 0, -t)
  return geo
}

/** 圆片，法线朝 +Y（听筒孔 / 麦克风孔等） */
export function disc(r: number, seg = 24) {
  const g = new THREE.CircleGeometry(r, seg)
  g.rotateX(-Math.PI / 2)
  return g
}

const APPLE_LOGO_D
  = 'M11.673 7.222c-.876 0-2.232-.996-3.66-.96c-1.884.024-3.612 1.092-4.584 2.784c-1.956 3.396-.504 8.412 1.404 11.172c.936 1.344 2.04 2.856 3.504 2.808c1.404-.06 1.932-.912 3.636-.912c1.692 0 2.172.912 3.66.876c1.512-.024 2.472-1.368 3.396-2.724c1.068-1.56 1.512-3.072 1.536-3.156c-.036-.012-2.94-1.128-2.976-4.488c-.024-2.808 2.292-4.152 2.4-4.212c-1.32-1.932-3.348-2.148-4.056-2.196c-1.848-.144-3.396 1.008-4.26 1.008Zm3.12-2.832c.78-.936 1.296-2.244 1.152-3.54c-1.116.048-2.46.744-3.264 1.68c-.72.828-1.344 2.16-1.176 3.432c1.236.096 2.508-.636 3.288-1.572Z'

/**
 * Apple 标志（取自 Remix Icon apple-fill 的矢量路径，含叶子与缺口）：
 * 法线朝 +Z、宽度为 width、以原点为中心的平面几何。
 */
export function appleLogo(width: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${APPLE_LOGO_D}"/></svg>`
  const data = new SVGLoader().parse(svg)
  const geos: THREE.BufferGeometry[] = []
  for (const path of data.paths) {
    for (const shape of path.toShapes()) geos.push(new THREE.ShapeGeometry(shape, 32))
  }
  const geo = geos.length > 1 ? mergeGeometries(geos, false)! : geos[0]
  geo.computeBoundingBox()
  const bb = geo.boundingBox!
  const scale = width / (bb.max.x - bb.min.x)
  geo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, 0)
  geo.scale(scale, scale, 1)
  // SVGLoader 保留 y 轴向下的坐标，且标志需要贴在机身背面：
  // 绕 X 轴转 180° 一次解决「上下颠倒」与「朝向背面」两件事（叶子上方、缺口在右侧）
  geo.rotateX(Math.PI)
  return geo
}

/**
 * 按设备展开坐标（mm）重映射平面几何 UV：u 沿整机宽度、v 沿高度。
 * offsetX/offsetY 是网格自身的位置（几何体保持居中），这样后续平移网格做视差时
 * 纹理跟着走，而 UV 仍与展开后的整机坐标一一对应。
 */
export function mapUV(
  geo: THREE.BufferGeometry,
  deviceWidth: number,
  deviceHeight: number,
  offsetX = 0,
  offsetY = 0
) {
  const pos = geo.attributes.position
  const uv = geo.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(
      i,
      (pos.getX(i) + offsetX + deviceWidth / 2) / deviceWidth,
      (pos.getY(i) + offsetY + deviceHeight / 2) / deviceHeight
    )
  }
  uv.needsUpdate = true
  return geo
}
