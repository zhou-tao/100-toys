import * as THREE from 'three'
import {
  BODY_CX,
  BODY_R,
  INNER_CORNER_R,
  COVER_CX,
  COVER_CY,
  COVER_H,
  COVER_R,
  COVER_W,
  FRAME_BEVEL,
  HALF_H,
  HALF_T,
  HALF_W,
  INNER_EDGE,
  OUTER_X,
  type Finish
} from './spec'
import { appleLogo, cylinder, disc, flatPlate, halfRoundedRect, plate, ring, roundedRect } from './geometry'
import { createFoldDisplay, type FoldDisplay } from './display'

/** 屏幕纹理：内屏（壁纸+主屏合成）+ 内屏两级虚化副本 + 外屏主屏 */
export interface DuoTextures {
  screen: THREE.Texture
  screenSoft1: THREE.Texture
  screenSoft2: THREE.Texture
  coverLock: THREE.Texture
}

export interface DuoModel {
  root: THREE.Group
  materials: THREE.Material[]
  setFold(deg: number): void
  setFinish(finish: Finish): void
  setTextures(tex: DuoTextures): void
  /** 壁纸视差：x/y ∈ [-1, 1] */
  setParallax(x: number, y: number): void
  /** 屏幕亮度 0~1 */
  setBrightness(v: number): void
  dispose(): void
}

/** 视差最大位移（mm），通过贴图 offset 实现，避免平面位移露出边界 */
const MAX_PARALLAX = 1.35
/** 铰链护壳在展开态的角度跨度 */

interface PanelParts {
  pivot: THREE.Group
  inner: THREE.Group
}

export function buildDuoModel(textures: DuoTextures, finish: Finish): DuoModel {
  const root = new THREE.Group()
  const materials: THREE.Material[] = []
  const disposables: Array<{ dispose: () => void }> = []

  const track = <T extends THREE.Material>(m: T) => {
    materials.push(m)
    return m
  }

  // ---------------- 材质 ----------------
  const frameMat = track(new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(finish.frame),
    metalness: 1,
    roughness: finish.frameRoughness,
    clearcoat: 0.25,
    clearcoatRoughness: 0.25,
    envMapIntensity: 1
  }))
  // 铰链护壳：钛金属，比中框略哑光
  // 铰链护壳：内屏黑边包覆铰链的真实观感 —— 近黑哑光，与屏幕黑边融为一体
  // 背板玻璃：磨砂质感
  const backMat = track(new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(finish.back),
    metalness: 0,
    roughness: finish.backRoughness,
    clearcoat: 0.12,
    clearcoatRoughness: 0.6,
    envMapIntensity: 0.62
  }))
  const logoMat = track(new THREE.MeshPhysicalMaterial({
    color: 0xb9bec4,
    metalness: 1,
    roughness: 0.14,
    envMapIntensity: 1.05
  }))
  const darkMat = track(new THREE.MeshPhysicalMaterial({
    color: 0x121317,
    metalness: 0.75,
    roughness: 0.45,
    envMapIntensity: 0.7,
    side: THREE.DoubleSide
  }))
  const lensRingMat = track(new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(finish.frame).multiplyScalar(0.92),
    metalness: 1,
    roughness: 0.24,
    envMapIntensity: 1
  }))
  const lensBarrelMat = track(new THREE.MeshPhysicalMaterial({
    color: 0x0b0c10,
    metalness: 0.5,
    roughness: 0.35,
    envMapIntensity: 0.8
  }))
  const lensGlassMat = track(new THREE.MeshPhysicalMaterial({
    color: 0x05070d,
    metalness: 0,
    roughness: 0.13,
    clearcoat: 0.7,
    clearcoatRoughness: 0.08,
    ior: 1.6,
    iridescence: 0.28,
    iridescenceIOR: 1.9,
    iridescenceThicknessRange: [140, 460],
    envMapIntensity: 0.5
  }))
  // 折叠缘抛光轨：哑光钛（高反射在浅色背景下会呈现拉丝条纹）
  const railMat = track(new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(finish.frame),
    metalness: 1,
    roughness: 0.45,
    envMapIntensity: 0.3
  }))
  const flashMat = track(new THREE.MeshPhysicalMaterial({
    color: 0xfff1cf,
    metalness: 0,
    roughness: 0.22,
    clearcoat: 1,
    emissive: new THREE.Color(0x2a2010),
    envMapIntensity: 1.2
  }))
  // 外屏：自发光屏 + 哑光玻璃
  const coverScreenMat = track(new THREE.MeshBasicMaterial({
    map: textures.coverLock,
    toneMapped: false
  }))
  const coverGlassMat = track(new THREE.MeshPhysicalMaterial({
    color: 0x0a0c10,
    metalness: 0,
    roughness: 0.55,
    ior: 1.45,
    clearcoat: 0,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    envMapIntensity: 0.15
  }))

  const newGeo = (g: THREE.BufferGeometry) => {
    disposables.push(g)
    return g
  }

  let panelSide = 'L'
  const part = (geo: THREE.BufferGeometry, mat: THREE.Material, name: string) => {
    const m = new THREE.Mesh(newGeo(geo), mat)
    m.name = `${panelSide}-${name}`
    return m
  }

  /** 平面几何 UV 重映射到 0~1（保持贴图不拉伸）；flipU 用于背面朝外的外屏 */
  const unitUV = (geo: THREE.BufferGeometry, flipU = false) => {
    geo.computeBoundingBox()
    const bb = geo.boundingBox!
    const pos = geo.attributes.position
    const uv = geo.attributes.uv as THREE.BufferAttribute
    const w = Math.max(1e-6, bb.max.x - bb.min.x)
    const h = Math.max(1e-6, bb.max.y - bb.min.y)
    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) - bb.min.x) / w
      uv.setXY(i, flipU ? 1 - u : u, (pos.getY(i) - bb.min.y) / h)
    }
    uv.needsUpdate = true
    return geo
  }

  // ---------------- 内屏（连续可折叠） ----------------
  const display: FoldDisplay = createFoldDisplay(textures.screen, textures.screenSoft1, textures.screenSoft2)
  root.add(display.group)
  const screenMat = (display.group.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial

  // ---------------- 机身（side=-1 左 / +1 右） ----------------
  function buildPanel(side: 1 | -1): PanelParts {
    panelSide = side < 0 ? 'L' : 'R'
    const pivot = new THREE.Group()
    // inner 承担「折叠时机身沿自身平面内移」，pivot 只负责绕轴旋转
    const inner = new THREE.Group()
    pivot.add(inner)

    const bodyX = side * BODY_CX
    const outerEdge = side * OUTER_X
    const innerEdge = side * INNER_EDGE

    // 中框
    const chassis = part(
      plate(
        HALF_W,
        HALF_H,
        BODY_R,
        HALF_T,
        FRAME_BEVEL,
        64,
        // 左半机外缘在 -x 端；右半机外缘在 +x 端（镜像）
        halfRoundedRect(
          HALF_W - FRAME_BEVEL * 2,
          HALF_H - FRAME_BEVEL * 2,
          side < 0 ? BODY_R - FRAME_BEVEL : INNER_CORNER_R,
          side < 0 ? INNER_CORNER_R : BODY_R - FRAME_BEVEL
        )
      ),
      frameMat,
      'chassis'
    )
    chassis.position.set(bodyX, 0, 0)
    chassis.castShadow = true
    chassis.receiveShadow = true
    inner.add(chassis)

    // 背板玻璃（内缩 1.5mm，露出钛金属边框）
    const back = part(plate(HALF_W - 3, HALF_H - 3, BODY_R - 1.5, 0.55, 0.16, 48), backMat, 'back')
    back.position.set(bodyX, 0, -HALF_T + 0.58)
    back.castShadow = true
    back.receiveShadow = true
    inner.add(back)

    // Apple 标志
    const logo = part(appleLogo(12.6), logoMat, 'logo')
    logo.position.set(bodyX, 0, -HALF_T - 0.03)
    inner.add(logo)

    // ---------------- 按键（外侧边） ----------------
    const addSideButton = (y: number, len: number) => {
      const geo = plate(3.15, len, 1.15, 1.2, 0.28, 32)
      geo.rotateY(side > 0 ? -Math.PI / 2 : Math.PI / 2)
      geo.translate(outerEdge - side * 0.45, y, -HALF_T / 2)
      const btn = part(geo, frameMat, `button-${y}`)
      btn.castShadow = true
      inner.add(btn)
    }
    if (side < 0) {
      addSideButton(44.5, 6.2)
      addSideButton(30.5, 9.8)
      addSideButton(17.6, 9.8)
    }
    else {
      addSideButton(29, 13.5)
    }

    // ---------------- 底部：USB-C / 扬声器 ----------------
    const bottomY = -HALF_H / 2 - 0.03
    const addBottomSlot = (w: number, h: number, r: number, x: number) => {
      const geo = new THREE.ShapeGeometry(roundedRect(w, h, r), 24)
      geo.rotateX(Math.PI / 2)
      geo.translate(x, bottomY, -HALF_T / 2)
      inner.add(part(geo, darkMat, 'port'))
    }
    const addBottomHoles = (count: number, x0: number, stepX: number) => {
      for (let i = 0; i < count; i++) {
        const geo = disc(0.6, 20).rotateX(Math.PI)
        geo.translate(x0 + i * stepX, bottomY, -HALF_T / 2)
        inner.add(part(geo, darkMat, 'speaker'))
      }
    }
    if (side > 0) {
      addBottomSlot(8.6, 2.5, 1.15, side * 36.5)
      addBottomHoles(6, side * 52.5, 1.62)
    }
    else {
      addBottomHoles(6, side * 52.5, 1.62)
      addBottomHoles(2, side * 46.5, 1.62)
    }

    // ---------------- 折叠缘亮面金属轨（参照官网铰链特写：两道抛光轨夹住屏幕曲面） ----------------
    const railGeo = (() => {
      // 梯形截面：贴机身侧宽 1.7mm、折痕侧收窄 0.9mm，凸出侧带 0.35mm
      const shape = new THREE.Shape()
      shape.moveTo(0, -0.85)
      shape.lineTo(1.7, -1.15)
      shape.lineTo(1.7, 1.15)
      shape.lineTo(0, 0.85)
      shape.closePath()
      const g = new THREE.ExtrudeGeometry(shape, { depth: HALF_H, bevelEnabled: false })
      g.rotateX(-Math.PI / 2)
      if (side > 0) g.rotateY(Math.PI)
      g.translate(0, -HALF_H / 2, 0)
      g.computeVertexNormals()
      return g
    })()
    const rail = part(railGeo, railMat, 'fold-rail')
    rail.position.set(side * INNER_EDGE, 0, -HALF_T / 2)
    rail.castShadow = true
    inner.add(rail)

    // ---------------- 天线注塑条 ----------------
    const addAntenna = (y: number, x: number) => {
      const geo = new THREE.BoxGeometry(0.34, 0.46, 3.4)
      geo.translate(x, y, -HALF_T / 2)
      inner.add(part(geo, darkMat, 'antenna'))
    }
    if (side < 0) {
      // 顶边扬声器开孔（外屏半机的顶边，从折叠缘向外排布）
      for (let i = 0; i < 9; i++) {
        const geo = disc(0.42, 16).rotateX(Math.PI)
        geo.translate(innerEdge + side * (5 + i * 1.5), HALF_H / 2 - 0.02, -HALF_T / 2)
        inner.add(part(geo, darkMat, 'earpiece'))
      }
    }
    addAntenna(HALF_H / 2 - 0.23, side * (BODY_CX + 24))
    addAntenna(HALF_H / 2 - 0.23, side * (BODY_CX - 20))
    addAntenna(-HALF_H / 2 + 0.23, side * (BODY_CX + 22))
    addAntenna(-HALF_H / 2 + 0.23, side * (BODY_CX - 24))

    // ---------------- 右半机背面：双摄模组 ----------------
    // 参照真机背面照（duo-camera2）：横向药丸凸台位于「外侧角」（远离折叠侧），
    // 两枚大镜头并排在外端，麦克风与闪光灯在内端；凸台与背板同色，仅镜头圈为亮面金属。
    if (side > 0) {
      const pillW = 49
      const pillH = 20.5
      const outerGap = 5
      const px = side * (OUTER_X - outerGap - pillW / 2)
      const py = HALF_H / 2 - 2.6 - pillH / 2
      const plateau = part(plate(pillW, pillH, pillH / 2, 1.6, 0.35, 48), backMat, 'camera-plateau')
      plateau.position.set(px, py, -HALF_T)
      plateau.castShadow = true
      plateau.receiveShadow = true
      inner.add(plateau)

      const back = -HALF_T - 1.6
      /** i = 0 外侧、1 内侧；镜头中心距外缘 15.7 / 32mm（间距 16.3mm） */
      const addLens = (i: number) => {
        const x = side * (OUTER_X - 15.7 - i * 16.3)
        const bezel = part(ring(7.75, 6.7, 1.5), lensRingMat, 'lens-ring')
        bezel.position.set(x, py, -HALF_T - 1.3)
        bezel.castShadow = true
        inner.add(bezel)
        const barrel = part(ring(6.8, 6.15, 1.15), lensBarrelMat, 'lens-barrel')
        barrel.position.set(x, py, -HALF_T - 1.5)
        inner.add(barrel)
        const lens = part(cylinder(6.1, 0.5, 64).rotateX(Math.PI / 2), lensGlassMat, 'lens-glass')
        lens.position.set(x, py, -HALF_T - 2.6)
        inner.add(lens)
      }
      addLens(0)
      addLens(1)

      const mic = part(new THREE.ShapeGeometry(roundedRect(3.8, 1.5, 0.75), 16).rotateX(Math.PI / 2), darkMat, 'mic')
      mic.position.set(side * (OUTER_X - 46), py + 3.6, back - 0.06)
      inner.add(mic)
      const flashRing = part(disc(2.5, 32).rotateX(-Math.PI / 2), darkMat, 'flash-ring')
      flashRing.position.set(side * (OUTER_X - 45.2), py - 4.7, back - 0.05)
      inner.add(flashRing)
      const flash = part(disc(1.7, 32).rotateX(-Math.PI / 2), flashMat, 'flash')
      flash.position.set(side * (OUTER_X - 45.2), py - 4.7, back - 0.09)
      inner.add(flash)
    }

    // ---------------- 左半机背面：外屏（5.4 英寸） ----------------
    if (side < 0) {
      const cx = bodyX + 0
      const cy = 0
      // 注意：旋转必须在几何体自身中心完成。若用 mesh.rotation 旋转（绕网格原点），
      // 偏心的几何体会被甩到机身另一侧 —— 那正是「背面多出一块屏」的原因。
      // 满幅外屏：轮廓与中框正面一致（外缘 BODY_R 圆角、折叠侧近直角），
      // 覆盖到圆角处，四角不再露出背板材质
      const coverGeo = new THREE.ShapeGeometry(halfRoundedRect(HALF_W, HALF_H, INNER_CORNER_R, BODY_R), 48)
      coverGeo.rotateY(Math.PI)
      coverGeo.translate(cx, cy, 0)
      unitUV(coverGeo, true)
      const cover = part(coverGeo, coverScreenMat, 'cover-display')
      cover.position.z = -HALF_T - 0.06
      inner.add(cover)

      const coverGlassGeo = new THREE.ShapeGeometry(halfRoundedRect(HALF_W, HALF_H, INNER_CORNER_R, BODY_R), 48)
      coverGlassGeo.rotateY(Math.PI)
      coverGlassGeo.translate(cx, cy, 0)
      const coverGlass = part(coverGlassGeo, coverGlassMat, 'cover-glass')
      // 必须比外屏更靠外：两层相距过近（甚至反序）会在外屏上出现斜向深度竞争条纹
      coverGlass.position.z = -HALF_T - 0.2
      coverGlass.renderOrder = 10
      inner.add(coverGlass)
    }

    return { pivot, inner }
  }

  const left = buildPanel(-1)
  const right = buildPanel(1)
  root.add(left.pivot, right.pivot)

  // ---------------- 状态 ----------------
  let fold = 180
  let parallaxX = 0
  let parallaxY = 0
  let brightness = 1

  function applyParallax() {
    if (!screenMat.map) return
    screenMat.map.offset.set(
      -(parallaxX * MAX_PARALLAX) / (OUTER_X * 2),
      -(parallaxY * MAX_PARALLAX) / HALF_H
    )
  }

  function applyBrightness() {
    const v = Math.max(0, Math.min(1, brightness))
    display.setBrightness(v)
    // 合上时外屏才点亮（展开时外屏朝下，熄灭更贴近真机）
    coverScreenMat.color.setScalar(v * (1 - Math.min(1, Math.max(0, (fold - 30) / 60))))
  }

  function setFold(deg: number) {
    fold = Math.max(0, Math.min(180, deg))
    const alphaDeg = (180 - fold) / 2
    const alpha = THREE.MathUtils.degToRad(alphaDeg)

    display.update(fold)
    left.pivot.rotation.y = alpha
    right.pivot.rotation.y = -alpha

    // 机身沿自身平面内移，使内屏边缘始终贴在机身外缘；
    // 同时沿自身法向后移 h —— 折叠轴位于屏幕平面内，只有机身让开才能使内屏绕轴卷出折痕
    const shift = display.panelShift()
    const h = display.foldRadius()
    left.inner.position.x = shift
    right.inner.position.x = -shift
    left.inner.position.z = -h
    right.inner.position.z = -h

    // 整体反向旋转半角：抵消右半机的 -alpha，使「右半机在世界坐标中固定不动，
    // 左半机相对它转 2alpha = 180-fold」，即由右往左翻开 / 由左往右合上。
    // 内屏剖面本身保持左右对称（已验证的几何），这里只做坐标补偿，不改形状。
    root.rotation.y = alpha

    applyBrightness()
  }

  function setFinish(f: Finish) {
    frameMat.color.set(f.frame)
    frameMat.roughness = f.frameRoughness
    backMat.color.set(f.back)
    backMat.roughness = f.backRoughness
    lensRingMat.color.set(f.frame).multiplyScalar(0.92)
  }

  function setTextures(tex: DuoTextures) {
    screenMat.map = tex.screen
    screenMat.needsUpdate = true
    coverScreenMat.map = tex.coverLock
    coverScreenMat.needsUpdate = true
    applyParallax()
    applyBrightness()
  }

  function setParallax(x: number, y: number) {
    parallaxX = Math.max(-1, Math.min(1, x))
    parallaxY = Math.max(-1, Math.min(1, y))
    applyParallax()
  }

  function setBrightness(v: number) {
    brightness = v
    applyBrightness()
  }

  function dispose() {
    display.dispose()
    for (const d of disposables) d.dispose()
    for (const m of materials) m.dispose()
  }

  setFold(fold)
  applyBrightness()
  applyParallax()

  return {
    root,
    materials,
    setFold,
    setFinish,
    setTextures,
    setParallax,
    setBrightness,
    dispose
  }
}
