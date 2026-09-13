import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { buildDuoModel, type DuoModel } from './model'
import {
  createLockScreenState,
  DEFAULT_WALLPAPER,
  drawCoverLockScreen,
  drawInnerLockScreen,
  drawWallpaper,
  WALLPAPERS,
  type WallpaperPreset
} from './wallpaper'
import { DEFAULT_FINISH, FINISHES, HALF_H, HALF_W, OUTER_X, type Finish } from './spec'

export interface DuoViewerOptions {
  canvas: HTMLCanvasElement
  container: HTMLElement
  /** 折叠角变化（0 = 合上，180 = 完全展开） */
  onFold?: (deg: number) => void
  /** 光标是否停留在机身上 */
  onHover?: (hovering: boolean) => void
}

export interface DuoViewer {
  setFold(deg: number, animate?: boolean): void
  getFold(): number
  toggleFold(): void
  setWallpaper(key: string): void
  setFinish(key: string): void
  setDim(on: boolean): void
  setAutoRotate(on: boolean): void
  /** 自动循环开合演示 */
  setDemo(on: boolean): void
  resetView(): void
  dispose(): void
}

/** 壁纸画布：覆盖展开后的整机宽高 */
const WALLPAPER_PX = 2048
const WALLPAPER_H = Math.round(WALLPAPER_PX * (HALF_H / (OUTER_X * 2)))
/** 内屏锁屏画布：整块内屏表面比例，约 13.9 px/mm */
const INNER_LOCK_PX = 2048
const INNER_LOCK_H = Math.round(INNER_LOCK_PX * (HALF_H / (OUTER_X * 2)))
/** 外屏画布：整面（机身正面比例），约 15.5 px/mm */
const COVER_LOCK_PX = 1180
const COVER_LOCK_H = Math.round(COVER_LOCK_PX * (HALF_H / HALF_W))

const CAMERA_HOME = new THREE.Vector3(56, 44, 326)
const CAMERA_INTRO = new THREE.Vector3(150, 108, 540)

export function createDuoViewer(options: DuoViewerOptions): DuoViewer {
  const { canvas, container } = options
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

  // ---------------- 渲染器 / 场景 ----------------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTexture
  // 影棚环境整体压暗：保留金属/玻璃的高光层次，同时避免暗部（黑色基板等）被环境反射冲灰
  scene.environmentIntensity = 0.5
  pmrem.dispose()

  const camera = new THREE.PerspectiveCamera(32, 1, 1, 6000)
  // H5 / 窄屏：容器偏小时整体后移相机，等效把模型缩小，避免模型顶到容器边缘
  const compact = Math.min(1, Math.max(0, (760 - container.clientWidth) / 420))
  const camHome = CAMERA_HOME.clone().multiplyScalar(1 + 0.5 * compact)
  const camIntro = CAMERA_INTRO.clone().multiplyScalar(1 + 0.5 * compact)
  camera.position.copy(CAMERA_INTRO)

  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 2, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.075
  controls.enablePan = false
  controls.minDistance = 190
  controls.maxDistance = 720
  controls.minPolarAngle = 0.4
  controls.maxPolarAngle = 1.62
  controls.autoRotateSpeed = 0.7
  controls.rotateSpeed = 0.85
  controls.zoomSpeed = 0.8

  // ---------------- 灯光 ----------------
  const key = new THREE.DirectionalLight(0xffffff, 1.15)
  key.position.set(150, 214, 236)
  key.castShadow = true
  key.shadow.mapSize.set(3072, 3072)
  key.shadow.camera.near = 60
  key.shadow.camera.far = 800
  key.shadow.camera.left = -92
  key.shadow.camera.right = 92
  key.shadow.camera.top = 98
  key.shadow.camera.bottom = -88
  key.shadow.bias = -0.0002
  key.shadow.normalBias = 0.15
  key.shadow.radius = 1.6
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xbfd2ff, 0.55)
  rim.position.set(-230, 130, -250)
  scene.add(rim)
  const fill = new THREE.DirectionalLight(0xffe3c6, 0.5)
  fill.position.set(-140, -80, 190)
  scene.add(fill)

  // 地面：只显示阴影，衬托机身
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(1800, 1800),
    new THREE.ShadowMaterial({ opacity: 0.34, color: 0x000000 })
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -HALF_H / 2 - 4.5
  floor.receiveShadow = true
  scene.add(floor)

  // ---------------- 纹理 ----------------
  // 壁纸与内屏锁屏各画在自己的离屏画布上，再合成到同一张屏幕贴图：
  // 单层贴图 = 内屏只有一个网格，避免共面图层的深度竞争（竖条纹花屏）
  const wallpaperCanvas = document.createElement('canvas')
  wallpaperCanvas.width = WALLPAPER_PX
  wallpaperCanvas.height = WALLPAPER_H
  const wallpaperCtx = wallpaperCanvas.getContext('2d')!

  const innerLockCanvas = document.createElement('canvas')
  innerLockCanvas.width = INNER_LOCK_PX
  innerLockCanvas.height = INNER_LOCK_H
  const innerLockCtx = innerLockCanvas.getContext('2d')!

  const coverLockCanvas = document.createElement('canvas')
  coverLockCanvas.width = COVER_LOCK_PX
  coverLockCanvas.height = COVER_LOCK_H
  const coverLockCtx = coverLockCanvas.getContext('2d')!

  const maxAniso = renderer.capabilities.getMaxAnisotropy()
  const screenCanvas = document.createElement('canvas')
  screenCanvas.width = WALLPAPER_PX
  screenCanvas.height = WALLPAPER_H
  const screenCtx = screenCanvas.getContext('2d')!
  const screenTex = new THREE.CanvasTexture(screenCanvas)
  screenTex.colorSpace = THREE.SRGBColorSpace
  screenTex.anisotropy = maxAniso
  // 内屏左半的毛玻璃虚化用两级预烘焙副本（着色器里直接混合，避免逐帧多重采样）
  const soft1Canvas = document.createElement('canvas')
  soft1Canvas.width = WALLPAPER_PX
  soft1Canvas.height = WALLPAPER_H
  const soft1Ctx = soft1Canvas.getContext('2d')!
  const soft2Canvas = document.createElement('canvas')
  soft2Canvas.width = WALLPAPER_PX
  soft2Canvas.height = WALLPAPER_H
  const soft2Ctx = soft2Canvas.getContext('2d')!
  const screenSoft1Tex = new THREE.CanvasTexture(soft1Canvas)
  screenSoft1Tex.colorSpace = THREE.SRGBColorSpace
  screenSoft1Tex.anisotropy = maxAniso
  const screenSoft2Tex = new THREE.CanvasTexture(soft2Canvas)
  screenSoft2Tex.colorSpace = THREE.SRGBColorSpace
  screenSoft2Tex.anisotropy = maxAniso
  const coverLockTex = new THREE.CanvasTexture(coverLockCanvas)
  coverLockTex.colorSpace = THREE.SRGBColorSpace
  coverLockTex.anisotropy = maxAniso

  const lockState = createLockScreenState()

  let wallpaperKey = DEFAULT_WALLPAPER
  const wallpaperOf = (key: string): WallpaperPreset =>
    WALLPAPERS.find(w => w.key === key) ?? WALLPAPERS[0]

  /**
   * 画布 → ImageBitmap 快照后再上传。
   * 直接把 2048 宽的画布交给 GPU 时，Chrome 的异步拷贝会在画布被改写时撕裂
   * （屏幕上出现横条脏块、甚至整层 UI 消失）。ImageBitmap 是不可变快照，
   * 上传的永远是完整一帧。
   */
  const uploading: Record<string, boolean> = {}
  const pending: Record<string, boolean> = {}
  function uploadCanvas(canvas: HTMLCanvasElement, tex: THREE.Texture, key: string) {
    // 上传进行中时不能直接丢弃新的请求：初始化会连续合成两次
    // （先壁纸、后壁纸+UI），丢掉第二次就会得到「没有时间和图标」的旧快照
    if (uploading[key]) {
      pending[key] = true
      return
    }
    uploading[key] = true
    createImageBitmap(canvas, { imageOrientation: 'flipY' })
      .then((bmp) => {
        uploading[key] = false
        const prev = tex.image as (ImageBitmap | HTMLCanvasElement | null)
        tex.flipY = false
        tex.image = bmp
        tex.needsUpdate = true
        if (prev && prev !== canvas && typeof (prev as ImageBitmap).close === 'function') (prev as ImageBitmap).close()
        if (pending[key]) {
          pending[key] = false
          uploadCanvas(canvas, tex, key)
        }
      })
      .catch(() => {
        uploading[key] = false
        pending[key] = false
      })
  }

  function compositeScreen() {
    screenCtx.clearRect(0, 0, screenCanvas.width, screenCanvas.height)
    screenCtx.drawImage(wallpaperCanvas, 0, 0)
    screenCtx.drawImage(innerLockCanvas, 0, 0)
    uploadCanvas(screenCanvas, screenTex, 'screen')
    // 两级虚化副本：先轻虚化，再在轻虚化基础上重虚化并加一层乳白雾面（毛玻璃观感）
    const w = soft1Canvas.width
    const h = soft1Canvas.height
    soft1Ctx.clearRect(0, 0, w, h)
    soft1Ctx.filter = `blur(${Math.round(w * 0.006)}px)`
    soft1Ctx.drawImage(screenCanvas, 0, 0)
    soft1Ctx.filter = 'none'
    soft1Ctx.globalAlpha = 0.08
    soft1Ctx.fillStyle = '#ffffff'
    soft1Ctx.fillRect(0, 0, w, h)
    soft1Ctx.globalAlpha = 1
    uploadCanvas(soft1Canvas, screenSoft1Tex, 'soft1')

    soft2Ctx.clearRect(0, 0, w, h)
    soft2Ctx.filter = `blur(${Math.round(w * 0.022)}px) saturate(0.88)`
    soft2Ctx.drawImage(screenCanvas, 0, 0)
    soft2Ctx.filter = 'none'
    soft2Ctx.globalAlpha = 0.2
    soft2Ctx.fillStyle = '#ffffff'
    soft2Ctx.fillRect(0, 0, w, h)
    soft2Ctx.globalAlpha = 1
    uploadCanvas(soft2Canvas, screenSoft2Tex, 'soft2')
  }

  function paintWallpaper(preset: WallpaperPreset) {
    // 内屏表面整宽绘制：中间做折痕虚化，显示区之外压成黑边
    drawWallpaper(wallpaperCtx, wallpaperCanvas.width, wallpaperCanvas.height, preset, {
      crease: true,
      bezel: true
    })
    compositeScreen()
  }

  function paintLockScreen() {
    // 内屏锁屏态：时钟 + 状态栏 + 四个小组件卡片（error-6 时期的观感）
    drawInnerLockScreen(innerLockCtx, innerLockCanvas.width, innerLockCanvas.height, lockState)
    compositeScreen()
    // 外屏：与内屏同一套锁屏观感（壁纸 + 状态栏 + 时钟 + 组件卡片）
    drawWallpaper(coverLockCtx, coverLockCanvas.width, coverLockCanvas.height, wallpaperOf(wallpaperKey))
    drawCoverLockScreen(coverLockCtx, coverLockCanvas.width, coverLockCanvas.height, lockState)
    uploadCanvas(coverLockCanvas, coverLockTex, 'cover')
  }

  paintWallpaper(wallpaperOf(wallpaperKey))
  paintLockScreen()

  const finishOf = (key: string): Finish => FINISHES.find(f => f.key === key) ?? FINISHES[0]
  const model: DuoModel = buildDuoModel(
    { screen: screenTex, screenSoft1: screenSoft1Tex, screenSoft2: screenSoft2Tex, coverLock: coverLockTex },
    finishOf(DEFAULT_FINISH)
  )
  scene.add(model.root)

  const envBase = model.materials.map((m) => {
    const anyMat = m as THREE.Material & { envMapIntensity?: number }
    return anyMat.envMapIntensity ?? 1
  })

  // ---------------- 折叠状态（弹簧跟随） ----------------
  let fold = 0
  let foldTarget = 0
  let foldVel = 0
  let dragging = false
  let pointerId = -1
  let dragStartFold = 0
  let dragStartY = 0
  let lastFoldRaw: number | null = null

  let parallaxX = 0
  let parallaxY = 0
  let parallaxTargetX = 0
  let parallaxTargetY = 0

  let dim = 0
  let dimTarget = 0
  let introT = 0
  let introDone = reduceMotion
  let brightness = 1
  let brightnessTarget = 1
  let demoDir = 0
  let autoRotate = false

  const raycaster = new THREE.Raycaster()
  const pointerNdc = new THREE.Vector2()
  let hovering = false

  function emitFold() {
    if (lastFoldRaw === null || Math.abs(fold - lastFoldRaw) > 0.2) {
      lastFoldRaw = fold
      options.onFold?.(fold)
    }
  }

  function pointerToNdc(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    pointerNdc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    )
    return rect
  }

  function hitDevice(e: PointerEvent) {
    pointerToNdc(e)
    raycaster.setFromCamera(pointerNdc, camera)
    return raycaster.intersectObject(model.root, true).length > 0
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    if (!hitDevice(e)) return
    dragging = true
    pointerId = e.pointerId
    dragStartFold = fold
    dragStartY = e.clientY
    controls.enabled = false
    introDone = true
    canvas.setPointerCapture(e.pointerId)
    canvas.style.cursor = 'grabbing'
  }

  function onPointerMove(e: PointerEvent) {
    const rect = pointerToNdc(e)
    // 壁纸视差：指向哪边，壁纸就往哪边让出一点纵深
    parallaxTargetX = ((e.clientX - rect.left) / rect.width) * 2 - 1
    parallaxTargetY = -(((e.clientY - rect.top) / rect.height) * 2 - 1)

    if (!dragging) {
      const hit = hitDevice(e)
      if (hit !== hovering) {
        hovering = hit
        options.onHover?.(hit)
      }
      canvas.style.cursor = hit ? 'grab' : 'default'
      return
    }

    // 向上拖动 = 展开，向下拖动 = 合上
    const raw = dragStartFold + (dragStartY - e.clientY) * 0.62
    foldTarget = THREE.MathUtils.clamp(raw, 0, 180)
  }

  function endDrag() {
    if (!dragging) return
    dragging = false
    controls.enabled = true
    canvas.style.cursor = hovering ? 'grab' : 'default'
    if (pointerId >= 0 && canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture(pointerId)
    pointerId = -1
    // 松手时如果接近两端且速度不大，吸附到端点
    if (Math.abs(foldVel) < 26) {
      if (fold < 24) foldTarget = 0
      else if (fold > 156) foldTarget = 180
    }
    else {
      // 惯性甩动：按速度预测落点，靠近端点则吸附
      const projected = fold + foldVel * 0.16
      if (projected < 12) foldTarget = 0
      else if (projected > 168) foldTarget = 180
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerId !== pointerId) return
    endDrag()
  }

  function onPointerLeave() {
    hovering = false
    options.onHover?.(false)
    if (!dragging) canvas.style.cursor = 'default'
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
  canvas.addEventListener('pointerleave', onPointerLeave)

  // ---------------- 尺寸 ----------------
  function resize() {
    const w = container.clientWidth || 1
    const h = container.clientHeight || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(container)
  resize()

  // ---------------- 时钟：每分钟重绘锁屏 ----------------
  let lastMinute = -1
  function tickClock() {
    const now = new Date()
    if (now.getMinutes() === lastMinute) return
    lastMinute = now.getMinutes()
    lockState.date = now
    paintLockScreen()
  }

  // ---------------- 主循环 ----------------
  const clock = new THREE.Clock()
  let running = true

  /** 暗场：压暗影棚灯光与环境反射，让屏幕成为唯一光源 */
  function applyDim() {
    const l = (a: number, b: number) => a + (b - a) * dim
    key.intensity = l(1.15, 0.18)
    rim.intensity = l(0.9, 0.3)
    fill.intensity = l(0.4, 0.05)
    renderer.toneMappingExposure = l(1, 1.14)
    ;(floor.material as THREE.ShadowMaterial).opacity = l(0.34, 0.5)
    model.materials.forEach((m, i) => {
      const anyMat = m as THREE.Material & { envMapIntensity?: number }
      if (anyMat.envMapIntensity !== undefined) anyMat.envMapIntensity = envBase[i] * l(1, 0.08)
    })
  }

  function frame() {
    if (!running) return
    const dt = Math.min(clock.getDelta(), 0.05)

    if (!introDone) {
      introT = Math.min(1, introT + dt / 1.5)
      const e = 1 - (1 - introT) ** 3
      if (introT >= 0.35 && foldTarget === 0) foldTarget = 180
      if (introT >= 1) introDone = true
      if (!dragging) {
        camera.position.lerpVectors(camIntro, camHome, e)
      }
    }

    // 折叠弹簧：临界阻尼二阶系统
    const k = dragging ? 300 : 88
    const damp = 2 * Math.sqrt(k) * 0.92
    foldVel += (foldTarget - fold) * k * dt
    foldVel -= foldVel * Math.min(1, damp * dt)
    fold += foldVel * dt
    if (fold < -0.5) {
      fold = -0.5
      foldVel = Math.max(0, foldVel)
    }
    else if (fold > 180.5) {
      fold = 180.5
      foldVel = Math.min(0, foldVel)
    }
    model.setFold(fold)
    emitFold()

    // 视差 / 亮度 / 灯光过渡
    parallaxX += (parallaxTargetX - parallaxX) * Math.min(1, dt * 3.2)
    parallaxY += (parallaxTargetY - parallaxY) * Math.min(1, dt * 3.2)
    model.setParallax(parallaxX, parallaxY)

    brightness += (brightnessTarget - brightness) * Math.min(1, dt * 7)
    model.setBrightness(brightness)

    if (Math.abs(dimTarget - dim) > 0.001) {
      dim += (dimTarget - dim) * Math.min(1, dt * 2.4)
      applyDim()
    }

    // 演示时缓慢开合
    if (demoDir !== 0 && !dragging) {
      foldTarget += demoDir * dt * 34
      if (foldTarget > 180) {
        foldTarget = 180
        demoDir = -1
      }
      else if (foldTarget < 0) {
        foldTarget = 0
        demoDir = 1
      }
    }

    controls.autoRotate = autoRotate && introDone
    controls.update()
    renderer.render(scene, camera)
  }

  renderer.setAnimationLoop(frame)

  // ---------------- 对外接口 ----------------
  function setFold(deg: number, animate = false) {
    const v = THREE.MathUtils.clamp(deg, 0, 180)
    foldTarget = v
    if (!animate) {
      fold = v
      foldVel = 0
    }
    introDone = true
  }

  function setWallpaper(key: string) {
    if (key === wallpaperKey) return
    wallpaperKey = key
    brightnessTarget = 0.06
    window.setTimeout(() => {
      paintWallpaper(wallpaperOf(key))
      brightnessTarget = 1
    }, 130)
  }

  function setFinish(key: string) {
    model.setFinish(finishOf(key))
    // 官网逻辑：选配色同时切换配套壁纸
    setWallpaper(finishOf(key).wallpaper)
  }

  function setDim(on: boolean) {
    dimTarget = on ? 1 : 0
  }

  function setAutoRotate(on: boolean) {
    autoRotate = on
  }

  function setDemo(on: boolean) {
    demoDir = on ? (fold > 90 ? -1 : 1) : 0
    introDone = true
  }

  function resetView() {
    introDone = true
    autoRotate = false
    demoDir = 0
    controls.target.set(0, 2, 0)
    const from = camera.position.clone()
    const t0 = performance.now()
    const dur = reduceMotion ? 0 : 620
    const step = () => {
      const t = dur === 0 ? 1 : Math.min(1, (performance.now() - t0) / dur)
      const e = 1 - (1 - t) ** 3
      camera.position.lerpVectors(from, camHome, e)
      controls.update()
      if (t < 1) requestAnimationFrame(step)
    }
    step()
  }

  function toggleFold() {
    setFold(foldTarget > 90 ? 0 : 180, true)
  }

  const clockTimer = window.setInterval(tickClock, 15000)

  function dispose() {
    running = false
    window.clearInterval(clockTimer)
    renderer.setAnimationLoop(null)
    ro.disconnect()
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointercancel', onPointerUp)
    canvas.removeEventListener('pointerleave', onPointerLeave)
    controls.dispose()
    model.dispose()
    screenTex.dispose()
    screenSoft1Tex.dispose()
    screenSoft2Tex.dispose()
    coverLockTex.dispose()
    envTexture.dispose()
    floor.geometry.dispose()
    ;(floor.material as THREE.Material).dispose()
    renderer.dispose()
  }

  if (import.meta.dev) {
    // 开发期探针：定位「折叠中屏幕无画面」——从相机向指定 NDC 点打射线，按距离列出命中对象
    (window as unknown as { __duo?: unknown }).__duo = {
      scene,
      camera,
      model,
      setFold,
      probe: (x: number, y: number) => {
        const rc = new THREE.Raycaster()
        rc.setFromCamera(new THREE.Vector2(x, y), camera)
        return rc.intersectObjects(scene.children, true).map((h) => {
          const m = h.object as THREE.Mesh
          return {
            name: m.name || m.type,
            dist: +h.distance.toFixed(1),
            vis: m.visible,
            mat: m.material ? (m.material as THREE.Material).visible : null
          }
        }).slice(0, 6)
      }
    }
  }

  return {
    setFold,
    getFold: () => fold,
    toggleFold,
    setWallpaper,
    setFinish,
    setDim,
    setAutoRotate,
    setDemo,
    resetView,
    dispose
  }
}
