import * as THREE from 'three'
import { BODY_R, FOLD_RADIUS, HALF_H, OUTER_X } from './spec'

/**
 * 连续可折叠内屏。
 *
 * 剖面（x-z 平面，按弧长参数 s ∈ [-W/2, W/2] 展开）由三部分组成：
 *   左平面段  ——  折痕圆弧（半径随折叠角增大，0 → FOLD_RADIUS）  ——  右平面段
 * 折叠轴位于屏幕平面内，圆弧圆心即折叠轴，因此圆弧与两段平面始终相切（不会有硬折角）。
 * 合上时两侧机身沿各自平面内移 δ = h·α，保证内屏边缘始终贴合机身外缘。
 *
 * 纹理 u 直接由弧长参数决定 —— 壁纸随折痕连续弯折、并在折痕处被轻微压缩，
 * 与真机「一块屏折起来」的观感一致。
 */
export interface FoldDisplay {
  group: THREE.Group
  /** 每帧按折叠角更新剖面 */
  update(foldDeg: number): void
  /** 半机需要沿自身平面内移的距离 */
  panelShift(): number
  /** 当前折痕半径（供铰链护壳使用） */
  foldRadius(): number
  setBrightness(v: number): void
  dispose(): void
}

/** 沿宽度方向的采样列数（约 0.2mm 一列，保证折痕圆弧足够圆滑） */
const COLS = 760
/** 屏幕相对机身正面的抬升量，避免与机身表面共面产生深度冲突 */
const SURFACE_LIFT = 0.08

export function createFoldDisplay(screen: THREE.Texture, screenSoft1: THREE.Texture, screenSoft2: THREE.Texture): FoldDisplay {
  const W = OUTER_X * 2
  const group = new THREE.Group()

  const positions = new Float32Array((COLS + 1) * 2 * 3)
  const normals = new Float32Array((COLS + 1) * 2 * 3)
  const uvs = new Float32Array((COLS + 1) * 2 * 2)

  for (let i = 0; i <= COLS; i++) {
    const u = i / COLS
    for (let r = 0; r < 2; r++) {
      const vi = (i * 2 + r) * 2
      uvs[vi] = u
      uvs[vi + 1] = r
    }
  }

  const indices: number[] = []
  for (let i = 0; i < COLS; i++) {
    const a = i * 2
    const b = a + 1
    const c = a + 2
    const d = a + 3
    indices.push(a, c, b, b, c, d)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(indices)

  // 玻璃层遮罩：几何体是整块矩形，不裁圆角会在四角露出直角灰块
  const cornerMask = (() => {
    const h = 224
    const w = Math.round((h * OUTER_X * 2) / HALF_H)
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const ctx = cv.getContext('2d')!
    const r = (BODY_R / HALF_H) * h
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.moveTo(r, 0)
    ctx.arcTo(w, 0, w, h, r)
    ctx.arcTo(w, h, 0, h, r)
    ctx.arcTo(0, h, 0, 0, r)
    ctx.arcTo(0, 0, w, 0, r)
    ctx.closePath()
    ctx.fill()
    return new THREE.CanvasTexture(cv)
  })()

  // 屏幕玻璃：轻微哑光 + 低强度反射，模拟纳米纹理表面的扩散感（虚化）
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0c10,
    metalness: 0,
    roughness: 0.55,
    ior: 1.45,
    clearcoat: 0,
    transparent: true,
    opacity: 0.08,
    alphaMap: cornerMask,
    depthWrite: false,
    envMapIntensity: 0.15
  })
  // 内屏内容（壁纸与锁屏合成在同一张贴图上）：圆角轮廓由 alphaTest 裁出
  // 左半屏虚化：中心采样保持锐利（保证轮廓与 alphaTest 干净），
  // 颜色按「锐利 → 轻虚化 → 重虚化」在左半侧按折角混合，做出毛玻璃观感。
  const uniforms: { uBlur?: { value: number }; uLeftLit?: { value: number } } = {}
  const screenMat = new THREE.MeshBasicMaterial({
    map: screen,
    toneMapped: false,
    transparent: true,
    alphaTest: 0.4,
    side: THREE.DoubleSide
  })
  screenMat.onBeforeCompile = (shader) => {
    shader.uniforms.uBlur = { value: 0 }
    shader.uniforms.uLeftLit = { value: 1 }
    shader.uniforms.uSoft1 = { value: screenSoft1 }
    shader.uniforms.uSoft2 = { value: screenSoft2 }
    uniforms.uBlur = shader.uniforms.uBlur as { value: number }
    uniforms.uLeftLit = shader.uniforms.uLeftLit as { value: number }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uBlur;
        uniform float uLeftLit;
        uniform sampler2D uSoft1;
        uniform sampler2D uSoft2;`)
      .replace('#include <map_fragment>', `
        vec4 sharpColor = texture2D( map, vMapUv );
        // GLSL 的 smoothstep 要求 edge0 < edge1，反向写法结果未定义
        float leftMask = 1.0 - smoothstep( 0.44, 0.56, vMapUv.x );
        float amt = clamp( uBlur, 0.0, 1.0 ) * leftMask;
        vec3 soft1Color = texture2D( uSoft1, vMapUv ).rgb;
        vec3 soft2Color = texture2D( uSoft2, vMapUv ).rgb;
        vec3 softColor = amt < 0.5
          ? mix( sharpColor.rgb, soft1Color, amt * 2.0 )
          : mix( soft1Color, soft2Color, ( amt - 0.5 ) * 2.0 );
        diffuseColor.rgb *= mix( sharpColor.rgb, softColor, leftMask );
        diffuseColor.a *= sharpColor.a;
        diffuseColor.rgb *= mix( 1.0, uLeftLit, leftMask );
      `)
  }
  const screenMesh = new THREE.Mesh(geo, screenMat)
  screenMesh.name = 'display-screen'
  // 玻璃层单独一层：与内容层保持足够间距，共面会因深度精度不足产生竖向条纹
  const glassMesh = new THREE.Mesh(geo, glassMat)
  glassMesh.name = 'display-glass'
  glassMesh.position.z = 0.12
  glassMesh.renderOrder = 10

  group.add(screenMesh, glassMesh)

  const up = new THREE.Vector3(0, 1, 0)
  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
  const nrmAttr = geo.getAttribute('normal') as THREE.BufferAttribute

  let shift = 0
  // 当前折痕半径 = 机身需要沿法线让开的深度；必须随折角更新，
  // 否则机身在折叠过程中会压到内屏表面（屏幕看起来变成后盖的颜色）
  let radius = 0

  /** 按弧长 s 求剖面点与法线（左右对称折角 alpha） */
  function section(s: number, alpha: number, h: number, out: THREE.Vector2, normal: THREE.Vector2) {
    const Lf = (W - 2 * h * alpha) / 2
    if (s <= -W / 2 + Lf) {
      // 左平面段：从切点沿机身平面向外
      const d = Lf - (s + W / 2)
      out.set(-h * Math.sin(alpha) - Math.cos(alpha) * d, -h * Math.cos(alpha) + Math.sin(alpha) * d)
      normal.set(Math.sin(alpha), Math.cos(alpha))
      return
    }
    if (s >= W / 2 - Lf) {
      // 右平面段
      const d = s - (W / 2 - Lf)
      out.set(h * Math.sin(alpha) + Math.cos(alpha) * d, -h * Math.cos(alpha) + Math.sin(alpha) * d)
      normal.set(-Math.sin(alpha), Math.cos(alpha))
      return
    }
    // 折痕圆弧：以 -Z 方向为中心，扫过 2α
    const t = (s - (-W / 2 + Lf)) / Math.max(1e-6, 2 * h * alpha)
    const psi = (Math.PI * 1.5 - alpha) + t * 2 * alpha
    out.set(h * Math.cos(psi), h * Math.sin(psi))
    normal.set(-Math.cos(psi), -Math.sin(psi))
  }

  const p = new THREE.Vector2()
  const n = new THREE.Vector2()

  function update(foldDeg: number) {
    const f = Math.max(0, Math.min(180, foldDeg))
    const alpha = THREE.MathUtils.degToRad((180 - f) / 2)
    const h = FOLD_RADIUS * (1 - f / 180)
    radius = h
    shift = h * alpha
    for (let i = 0; i <= COLS; i++) {
      const s = -W / 2 + (i / COLS) * W
      section(s, alpha, h, p, n)
      for (let r = 0; r < 2; r++) {
        const idx = i * 2 + r
        const y = r === 0 ? -HALF_H / 2 : HALF_H / 2
        posAttr.setXYZ(idx, p.x + n.x * SURFACE_LIFT, y, p.y + n.y * SURFACE_LIFT)
        nrmAttr.setXYZ(idx, n.x, 0, n.y)
      }
    }
    posAttr.needsUpdate = true
    nrmAttr.needsUpdate = true
    geo.computeBoundingSphere()

    // 左半屏毛玻璃虚化：完全展开为 0，折角越大越强；接近合上时该半边熄灭
    const bend = 180 - f
    if (uniforms.uBlur) uniforms.uBlur.value = Math.min(1, bend / 120)
    if (uniforms.uLeftLit) uniforms.uLeftLit.value = 1 - THREE.MathUtils.smoothstep(bend, 148, 178)
  }

  return {
    group,
    update,
    panelShift: () => shift,
    foldRadius: () => radius,
    setBrightness(v: number) {
      const b = Math.max(0, Math.min(1, v))
      screenMat.color.setScalar(b)
      glassMat.color.setScalar(b)
    },
    dispose() {
      geo.dispose()
      screenMat.dispose()
      cornerMask.dispose()
      glassMat.dispose()
    }
  }
}
