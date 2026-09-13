import { COVER_W, HALF_H, HALF_W, INNER_H, INNER_R, INNER_W, OUTER_X, PANEL_INSET, PANEL_R } from './spec'

/**
 * 壁纸与锁屏 UI 的程序化生成。
 *
 * 壁纸：低分辨率域扭曲 fbm 流场 → 放大 + 模糊 → 光斑 → 颗粒 → 暗角，
 * 逼近 iOS 抽象流动壁纸的质感；锁屏 UI 为独立的透明图层（时钟每分钟重绘一次），
 * 两层叠在一起时壁纸可做视差位移，而时钟 / 状态栏保持不动 —— 与真机一致。
 */

export interface WallpaperPreset {
  key: string
  name: string
  /** 'flow' 抽象流动壁纸；'dune' 真机主屏的沙丘实景（程序化近似） */
  mode?: 'flow' | 'dune'
  /** 颜色坡道（位置 0~1） */
  stops: [number, string][]
  /** 噪声频率 */
  scale: number
  /** 域扭曲强度 */
  warp: number
  /** 整体明暗偏移 */
  bias: number
  /** 垂直明暗倾斜 */
  vbias: number
  /** 光斑数量 */
  blobs: number
  /** 暗角强度 */
  vignette: number
  /** 颗粒强度 */
  grain: number
  seed: number
}

export const WALLPAPERS: WallpaperPreset[] = [
  {
    key: 'flow',
    name: '流光',
    stops: [[0, '#04102e'], [0.32, '#2a1f6b'], [0.56, '#7c3a8c'], [0.78, '#d95f4e'], [1, '#ffb27a']],
    scale: 2.1,
    warp: 1.35,
    bias: -0.02,
    vbias: 0.05,
    blobs: 4,
    vignette: 0.24,
    grain: 0.032,
    seed: 20260301
  },
  {
    key: 'aurora',
    name: '极光',
    stops: [[0, '#020a12'], [0.34, '#075050'], [0.58, '#1f8f6a'], [0.8, '#79cf9b'], [1, '#e6f6cf']],
    scale: 2.6,
    warp: 1.6,
    bias: -0.03,
    vbias: 0.04,
    blobs: 5,
    vignette: 0.28,
    grain: 0.034,
    seed: 771003
  },
  {
    key: 'sunset',
    name: '落日',
    stops: [[0, '#160a2b'], [0.32, '#5c1e5e'], [0.58, '#b8405f'], [0.8, '#f0763c'], [1, '#ffd07d']],
    scale: 2.3,
    warp: 1.25,
    bias: -0.01,
    vbias: 0.04,
    blobs: 6,
    vignette: 0.26,
    grain: 0.03,
    seed: 51219
  },
  {
    key: 'abyss',
    name: '深海',
    stops: [[0, '#01050c'], [0.4, '#06203a'], [0.68, '#0b4a63'], [0.88, '#1c7f96'], [1, '#54c4cf']],
    scale: 2.4,
    warp: 1.5,
    bias: -0.04,
    vbias: 0.05,
    blobs: 5,
    vignette: 0.3,
    grain: 0.03,
    seed: 990211
  },
  {
    key: 'sakura',
    name: '樱',
    stops: [[0, '#2c0d29'], [0.36, '#83386a'], [0.62, '#c2618f'], [0.82, '#f094b4'], [1, '#ffe7e8']],
    scale: 2.5,
    warp: 1.4,
    bias: 0.02,
    vbias: 0.03,
    blobs: 6,
    vignette: 0.2,
    grain: 0.028,
    seed: 314159
  },
  {
    key: 'midnight',
    name: '午夜',
    stops: [[0, '#030309'], [0.45, '#0d0d22'], [0.75, '#221d47'], [1, '#4d3f86']],
    scale: 2.2,
    warp: 1.1,
    bias: -0.06,
    vbias: 0.06,
    blobs: 4,
    vignette: 0.34,
    grain: 0.026,
    seed: 424242
  },
  {
    key: 'dune',
    name: '沙丘',
    mode: 'dune',
    stops: [[0, '#9fb2c2'], [0.32, '#7e7c63'], [0.5, '#c9b491'], [0.75, '#e2d3b0'], [1, '#efe6cf']],
    scale: 2.2,
    warp: 1.2,
    bias: 0,
    vbias: 0,
    blobs: 0,
    vignette: 0.16,
    grain: 0.022,
    seed: 20260401
  }
]

export const DEFAULT_WALLPAPER = 'dune'

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 值噪声（256 格周期，双线性 + smoothstep 插值） */
function makeNoise(rand: () => number) {
  const perm = new Uint8Array(512)
  const vals = new Float32Array(256)
  for (let i = 0; i < 256; i++) {
    perm[i] = i
    vals[i] = rand() * 2 - 1
  }
  for (let i = 255; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0
    const t = perm[i]
    perm[i] = perm[j]
    perm[j] = t
  }
  for (let i = 0; i < 256; i++) perm[256 + i] = perm[i]
  return (x: number, y: number) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = x - xi
    const yf = y - yi
    const u = xf * xf * (3 - 2 * xf)
    const v = yf * yf * (3 - 2 * yf)
    const at = (i: number, j: number) => vals[perm[(perm[i & 255] + (j & 255)) & 255]]
    const a = at(xi, yi)
    const b = at(xi + 1, yi)
    const c = at(xi, yi + 1)
    const d = at(xi + 1, yi + 1)
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
  }
}

function makeFbm(noise: (x: number, y: number) => number) {
  return (x: number, y: number, octaves = 4) => {
    let sum = 0
    let amp = 0.5
    let freq = 1
    let norm = 0
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise(x * freq, y * freq)
      norm += amp
      amp *= 0.52
      freq *= 2.03
    }
    return sum / norm
  }
}

function hexToRgb(hex: string) {
  const v = parseInt(hex.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255] as [number, number, number]
}

/** 把颜色坡道烘焙成 256 级 LUT，避免逐像素插值 */
function buildRamp(stops: [number, string][]) {
  const lut = new Uint8ClampedArray(256 * 3)
  const parsed = stops.map(([p, c]) => [p, hexToRgb(c)] as [number, [number, number, number]])
  for (let i = 0; i < 256; i++) {
    const t = i / 255
    let a = parsed[0]
    let b = parsed[parsed.length - 1]
    for (let k = 0; k < parsed.length - 1; k++) {
      if (t >= parsed[k][0] && t <= parsed[k + 1][0]) {
        a = parsed[k]
        b = parsed[k + 1]
        break
      }
    }
    const span = Math.max(1e-6, b[0] - a[0])
    const f = Math.min(1, Math.max(0, (t - a[0]) / span))
    const s = f * f * (3 - 2 * f)
    lut[i * 3] = a[1][0] + (b[1][0] - a[1][0]) * s
    lut[i * 3 + 1] = a[1][1] + (b[1][1] - a[1][1]) * s
    lut[i * 3 + 2] = a[1][2] + (b[1][2] - a[1][2]) * s
  }
  return lut
}

export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.arcTo(x + w, y, x + w, y + rr, rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  ctx.lineTo(x + rr, y + h)
  ctx.arcTo(x, y + h, x, y + h - rr, rr)
  ctx.lineTo(x, y + rr)
  ctx.arcTo(x, y, x + rr, y, rr)
  ctx.closePath()
}

/**
 * 绘制一整幅壁纸（覆盖展开后的整机宽度与高度）。
 * 低分辨率流场逐像素渲染 → 高分辨率放大 + 模糊 → 光斑 / 颗粒 / 暗角。
 */
/**
 * 抽象流动壁纸（域扭曲 fbm 流场 → 放大 + 模糊 + 提饱和）。
 */
function drawFlowScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  preset: WallpaperPreset,
  rand: () => number,
  fbm: (x: number, y: number, octaves: number) => number,
  ramp: Uint8ClampedArray
) {
  // ---- 低分辨率流场（域扭曲 fbm） ----
  const lw = 300
  const lh = Math.max(8, Math.round(lw * (h / w)))
  const low = document.createElement('canvas')
  low.width = lw
  low.height = lh
  const lctx = low.getContext('2d')!
  const img = lctx.createImageData(lw, lh)
  const data = img.data
  const aspect = lw / lh
  for (let y = 0; y < lh; y++) {
    const v = y / (lh - 1)
    for (let x = 0; x < lw; x++) {
      const u = x / (lw - 1)
      const px = (u - 0.5) * aspect * 2.4
      const py = (v - 0.5) * 2.4
      // 两层低频噪声做域扭曲，得到丝绸般的流动结构
      const q1 = fbm(px * preset.scale + 3.1, py * preset.scale + 7.7, 4)
      const q2 = fbm(px * preset.scale - 5.2, py * preset.scale + 1.3, 4)
      const s = fbm(
        px * preset.scale + q1 * preset.warp + 11.3,
        py * preset.scale + q2 * preset.warp - 4.1,
        5
      )
      let t = 0.5 + 0.5 * s + preset.bias + (v - 0.5) * preset.vbias
      t = t < 0 ? 0 : t > 1 ? 1 : t
      const ci = (t * 255) | 0
      const o = (y * lw + x) * 4
      data[o] = ramp[ci * 3]
      data[o + 1] = ramp[ci * 3 + 1]
      data[o + 2] = ramp[ci * 3 + 2]
      data[o + 3] = 255
    }
  }
  lctx.putImageData(img, 0, 0)

  // ---- 放大到目标分辨率（轻微模糊 + 提升饱和与对比 → 消除块感、避免发灰） ----
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.filter = `blur(${Math.max(1, Math.round(w * 0.005))}px) saturate(1.16) contrast(1.12)`
  ctx.drawImage(low, 0, 0, w, h)
  ctx.restore()
}

/**
 * 沙丘实景（程序化近似）：冷灰蓝天空 → 暗色山脊 → 沙丘主体 + 细密风纹。
 * 对应真机主屏的沙漠壁纸；为程序化近似，非照片级复刻。
 */
function drawDuneScene(ctx: CanvasRenderingContext2D, w: number, h: number, preset: WallpaperPreset) {
  const k = w / (OUTER_X * 2)

  // 天空
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.5)
  sky.addColorStop(0, '#93a8ba')
  sky.addColorStop(0.6, '#bfc4c2')
  sky.addColorStop(1, '#ded9c8')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h * 0.55)

  // 远山：三层山脊，越近越暗
  const ridge = (baseY: number, amp: number, color: string, phase: number) => {
    ctx.beginPath()
    ctx.moveTo(0, baseY)
    const steps = 16
    for (let i = 0; i <= steps; i++) {
      const u = i / steps
      const n
        = Math.sin(u * 5.1 + phase) * 0.5
        + Math.sin(u * 11.3 + phase * 1.7) * 0.28
        + Math.sin(u * 23.7 + phase * 2.3) * 0.14
      ctx.lineTo(u * w, baseY - n * amp)
    }
    ctx.lineTo(w, h * 0.66)
    ctx.lineTo(0, h * 0.66)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  }
  ridge(h * 0.32, h * 0.07, '#8f8c77', 1.2)
  ridge(h * 0.37, h * 0.05, '#6f6d56', 3.4)
  ridge(h * 0.43, h * 0.032, '#525140', 5.1)

  // 沙丘主体
  const sand = ctx.createLinearGradient(0, h * 0.44, 0, h)
  sand.addColorStop(0, '#d7c5a0')
  sand.addColorStop(0.45, '#e3d5b4')
  sand.addColorStop(1, '#f0e7d0')
  ctx.fillStyle = sand
  ctx.beginPath()
  ctx.moveTo(0, h * 0.5)
  ctx.bezierCurveTo(w * 0.24, h * 0.45, w * 0.52, h * 0.47, w * 0.74, h * 0.56)
  ctx.bezierCurveTo(w * 0.86, h * 0.61, w * 0.94, h * 0.66, w, h * 0.68)
  ctx.lineTo(w, h)
  ctx.lineTo(0, h)
  ctx.closePath()
  ctx.fill()

  // 背光面（沙丘左上侧的阴影）
  ctx.save()
  ctx.globalAlpha = 0.5
  const shade = ctx.createLinearGradient(0, h * 0.45, w * 0.5, h * 0.72)
  shade.addColorStop(0, '#b39f79')
  shade.addColorStop(1, 'rgba(179,159,121,0)')
  ctx.fillStyle = shade
  ctx.beginPath()
  ctx.moveTo(0, h * 0.5)
  ctx.bezierCurveTo(w * 0.2, h * 0.455, w * 0.42, h * 0.47, w * 0.62, h * 0.53)
  ctx.bezierCurveTo(w * 0.4, h * 0.55, w * 0.16, h * 0.56, 0, h * 0.58)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // 风纹：以远处圆心画同心弧，得到沙面细密波纹
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, h * 0.46, w, h * 0.54)
  ctx.clip()
  const cx = w * 0.22
  const cy = -h * 1.3
  for (let i = 0; i < 64; i++) {
    const r = h * (1.42 + i * 0.019)
    ctx.beginPath()
    ctx.arc(cx, cy, r, Math.PI * 0.12, Math.PI * 0.62)
    ctx.strokeStyle = i % 4 === 0 ? 'rgba(255,255,255,0.10)' : 'rgba(176,155,116,0.15)'
    ctx.lineWidth = Math.max(1, k * (i % 4 === 0 ? 0.55 : 0.35))
    ctx.stroke()
  }
  ctx.restore()

  // 地平线暖雾
  const haze = ctx.createLinearGradient(0, h * 0.36, 0, h * 0.52)
  haze.addColorStop(0, 'rgba(238,229,210,0)')
  haze.addColorStop(1, 'rgba(238,229,210,0.32)')
  ctx.fillStyle = haze
  ctx.fillRect(0, h * 0.36, w, h * 0.16)
}

export function drawWallpaper(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  preset: WallpaperPreset,
  opts: { crease?: boolean; bezel?: boolean } = {}
) {
  const rand = mulberry32(preset.seed)
  const noise = makeNoise(rand)
  const fbm = makeFbm(noise)
  const ramp = buildRamp(preset.stops)

  ctx.clearRect(0, 0, w, h)

  if (preset.mode === 'dune') drawDuneScene(ctx, w, h, preset)
  else drawFlowScene(ctx, w, h, preset, rand, fbm, ramp)

  // ---- 柔光光斑：给画面一些高光焦点（力度克制，否则整幅会发白） ----
  ctx.save()
  for (let i = 0; i < preset.blobs; i++) {
    const cx = rand() * w
    const cy = rand() * h
    const radius = (0.26 + rand() * 0.46) * Math.max(w, h) * 0.5
    const stop = preset.stops[Math.min(preset.stops.length - 1, 1 + Math.floor(rand() * (preset.stops.length - 1)))][1]
    const [r, g, b] = hexToRgb(stop)
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    const alpha = 0.05 + rand() * 0.1
    grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`)
    grad.addColorStop(0.55, `rgba(${r},${g},${b},${alpha * 0.35})`)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }
  ctx.restore()

  // ---- 暗角 ----
  if (preset.vignette > 0) {
    const grad = ctx.createRadialGradient(w / 2, h * 0.46, Math.min(w, h) * 0.22, w / 2, h * 0.5, Math.max(w, h) * 0.78)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, `rgba(0,0,0,${preset.vignette})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }

  // ---- 折痕虚化：中缝窄带叠加一层模糊，模拟折叠屏折痕处的柔化与轻微压暗 ----
  if (opts.crease) {
    const bandW = Math.max(18, Math.round(w * 0.038))
    const band = document.createElement('canvas')
    band.width = bandW
    band.height = h
    const bctx = band.getContext('2d')!
    bctx.filter = `blur(${Math.max(2, Math.round(w * 0.006))}px)`
    bctx.drawImage(ctx.canvas, Math.round((w - bandW) / 2), 0, bandW, h, 0, 0, bandW, h)
    // 用横向渐变做蒙版，让模糊只在折痕附近出现
    bctx.globalCompositeOperation = 'destination-in'
    const mask = bctx.createLinearGradient(0, 0, bandW, 0)
    mask.addColorStop(0, 'rgba(0,0,0,0)')
    mask.addColorStop(0.5, 'rgba(0,0,0,0.75)')
    mask.addColorStop(1, 'rgba(0,0,0,0)')
    bctx.fillStyle = mask
    bctx.fillRect(0, 0, bandW, h)
    ctx.drawImage(band, Math.round((w - bandW) / 2), 0)
    // 不再绘制折痕暗线：展开时中缝会出现一条可见竖线（真机没有）
  }

  // ---- 内屏表面处理：轮廓外透明（露出圆角机身），轮廓与显示区之间是黑色基板 ----
  if (opts.bezel) {
    const k = w / (OUTER_X * 2)
    const rr = (x: number, y: number, ww: number, hh: number, r0: number) => {
      const r = Math.min(r0, ww / 2, hh / 2)
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + ww - r, y)
      ctx.arcTo(x + ww, y, x + ww, y + r, r)
      ctx.lineTo(x + ww, y + hh - r)
      ctx.arcTo(x + ww, y + hh, x + ww - r, y + hh, r)
      ctx.lineTo(x + r, y + hh)
      ctx.arcTo(x, y + hh, x, y + hh - r, r)
      ctx.lineTo(x, y + r)
      ctx.arcTo(x, y, x + r, y, r)
      ctx.closePath()
    }
    const ox = PANEL_INSET * k
    const oy = PANEL_INSET * k
    const ow = w - ox * 2
    const oh = h - oy * 2
    // 1) 轮廓外裁掉，让机身的圆角轮廓露出来
    ctx.save()
    ctx.globalCompositeOperation = 'destination-in'
    ctx.beginPath()
    rr(ox, oy, ow, oh, PANEL_R * k)
    ctx.fillStyle = '#fff' // 必须显式设为不透明色：destination-in 用的是当前 fillStyle 的 alpha
    ctx.fill()
    ctx.restore()
    // 2) 轮廓内、显示区外填黑（黑色基板），内孔需与外轮廓写在同一路径
    const hx = (w - INNER_W * k) / 2
    const hy = (h - INNER_H * k) / 2
    ctx.save()
    ctx.beginPath()
    rr(ox, oy, ow, oh, PANEL_R * k)
    rr(hx, hy, INNER_W * k, INNER_H * k, INNER_R * k)
    ctx.fillStyle = '#050608'
    ctx.fill('evenodd')
    ctx.restore()
  }
}

/* ------------------------------ 锁屏 UI ------------------------------ */

const FONT_TEXT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif'
const FONT_ROUND = 'ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'

export interface LockScreenState {
  date: Date
  /** 电量（0~1） */
  battery: number
  /** 天气温度与描述 */
  temperature: number
  weather: string
}

export function createLockScreenState(now = new Date()): LockScreenState {
  return { date: now, battery: 0.84, temperature: 21, weather: 'Sunny' }
}

function weatherGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  // 太阳
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = 'rgba(255, 214, 120, 0.95)'
  ctx.beginPath()
  ctx.arc(-s * 0.16, -s * 0.1, s * 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 214, 120, 0.8)'
  ctx.lineWidth = s * 0.075
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(-s * 0.16 + Math.cos(a) * s * 0.4, -s * 0.1 + Math.sin(a) * s * 0.4)
    ctx.lineTo(-s * 0.16 + Math.cos(a) * s * 0.52, -s * 0.1 + Math.sin(a) * s * 0.52)
    ctx.stroke()
  }
  // 云
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.beginPath()
  ctx.arc(s * 0.06, s * 0.16, s * 0.26, 0, Math.PI * 2)
  ctx.arc(s * 0.36, s * 0.1, s * 0.2, 0, Math.PI * 2)
  ctx.arc(s * 0.28, s * 0.26, s * 0.22, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function signalBars(ctx: CanvasRenderingContext2D, x: number, baseY: number, mm: (v: number) => number) {
  // x 为最右侧对齐点
  const w = mm(0.4)
  const gap = mm(0.3)
  for (let i = 0; i < 4; i++) {
    const h = mm(0.5 + i * 0.32)
    ctx.fillStyle = `rgba(255,255,255,${i < 3 ? 0.95 : 0.42})`
    roundRectPath(ctx, x - (4 - i) * (w + gap) + gap, baseY - h, w, h, mm(0.1))
    ctx.fill()
  }
}

function wifiGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'
  ctx.lineCap = 'round'
  for (let i = 0; i < 3; i++) {
    const r = s * (0.34 + i * 0.3)
    ctx.lineWidth = s * 0.15
    ctx.beginPath()
    ctx.arc(cx, cy + s * 0.5, r, Math.PI * 1.22, Math.PI * 1.78)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.beginPath()
  ctx.arc(cx, cy + s * 0.42, s * 0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function batteryGlyph(ctx: CanvasRenderingContext2D, right: number, cy: number, mm: (v: number) => number, level: number) {
  const w = mm(4.4)
  const h = mm(2.1)
  const x = right - w
  const y = cy - h / 2
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'
  ctx.lineWidth = mm(0.13)
  roundRectPath(ctx, x, y, w, h, mm(0.64))
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  roundRectPath(ctx, x + mm(0.26), y + mm(0.26), (w - mm(0.52)) * level, h - mm(0.52), mm(0.42))
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  roundRectPath(ctx, right + mm(0.14), cy - mm(0.34), mm(0.28), mm(0.68), mm(0.12))
  ctx.fill()
  ctx.restore()
}

function homeIndicator(ctx: CanvasRenderingContext2D, mm: (v: number) => number, w: number, h: number) {
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  const bw = Math.min(mm(31), w * 0.4)
  roundRectPath(ctx, (w - bw) / 2, h - mm(3.2), bw, mm(1.35), mm(0.68))
  ctx.fill()
  ctx.restore()
}

function lockButton(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, kind: 'flash' | 'camera') {
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.13)'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'
  ctx.lineWidth = r * 0.045
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  const s = r * 0.52
  if (kind === 'flash') {
    ctx.beginPath()
    ctx.moveTo(cx - s * 0.55, cy - s * 0.95)
    ctx.lineTo(cx + s * 0.55, cy - s * 0.95)
    ctx.lineTo(cx + s * 0.85, cy + s * 0.95)
    ctx.lineTo(cx - s * 0.85, cy + s * 0.95)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(20,22,28,0.9)'
    roundRectPath(ctx, cx - s * 0.5, cy - s * 0.72, s * 1.0, s * 0.5, s * 0.18)
    ctx.fill()
  }
  else {
    roundRectPath(ctx, cx - s * 1.0, cy - s * 0.72, s * 2.0, s * 1.5, s * 0.42)
    ctx.fill()
    ctx.fillStyle = 'rgba(20,22,28,0.92)'
    ctx.beginPath()
    ctx.arc(cx, cy + s * 0.03, s * 0.42, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath()
    ctx.arc(cx - s * 0.62, cy - s * 0.5, s * 0.13, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * 绘制锁屏 UI 图层（透明背景，仅画灵动岛 / 状态栏 / 时钟 / 小组件 / 底部按钮）。
 * 画布尺寸按单屏的物理比例（SCREEN_W × SCREEN_H）换算，内部统一用 mm 作为单位。
 */
export function drawCoverLockScreen(ctx: CanvasRenderingContext2D, w: number, h: number, state: LockScreenState) {
  const k = w / COVER_W
  const mm = (v: number) => v * k
  const { date, battery, temperature, weather } = state
  ctx.textBaseline = 'middle'

  // ---- 顶部 / 底部可读性压暗 ----
  const topGrad = ctx.createLinearGradient(0, 0, 0, h * 0.22)
  topGrad.addColorStop(0, 'rgba(0,0,0,0.3)')
  topGrad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = topGrad
  ctx.fillRect(0, 0, w, h * 0.22)
  const botGrad = ctx.createLinearGradient(0, h * 0.8, 0, h)
  botGrad.addColorStop(0, 'rgba(0,0,0,0)')
  botGrad.addColorStop(1, 'rgba(0,0,0,0.32)')
  ctx.fillStyle = botGrad
  ctx.fillRect(0, h * 0.8, w, h * 0.2)

  // ---- 状态栏 ----
  const barCy = mm(3)
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.32)'
  ctx.shadowBlur = mm(0.9)
  ctx.shadowOffsetY = mm(0.16)
  ctx.fillStyle = 'rgba(255,255,255,0.97)'
  ctx.textAlign = 'left'
  const clock = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?[AP]M$/i, '')
  ctx.font = `600 ${mm(2.7)}px ${FONT_TEXT}`
  ctx.fillText(clock, mm(6.6), barCy)
  ctx.textAlign = 'right'
  ctx.font = `600 ${mm(2.5)}px ${FONT_TEXT}`
  const batteryLeft = w - mm(7.2)
  ctx.fillText('5G', batteryLeft - mm(13.6), barCy)
  signalBars(ctx, batteryLeft - mm(17.6), barCy + mm(1), mm)
  wifiGlyph(ctx, batteryLeft - mm(9.4), barCy - mm(0.35), mm(2.1))
  ctx.restore()
  batteryGlyph(ctx, batteryLeft, barCy, mm, battery)

  // ---- 打孔摄像头 ----
  const holeR = mm(1.35)
  ctx.save()
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.arc(w - mm(5.2), mm(3.4), holeR, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(90,120,170,0.28)'
  ctx.lineWidth = mm(0.09)
  ctx.stroke()
  ctx.restore()

  // ---- 日期 + 大时钟 ----
  ctx.save()
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = mm(1.8)
  ctx.shadowOffsetY = mm(0.25)
  ctx.fillStyle = 'rgba(255,255,255,0.97)'
  ctx.font = `600 ${mm(5.4)}px ${FONT_TEXT}`
  ctx.fillText(
    date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    w / 2,
    mm(19.6)
  )
  const maxClockW = w * 0.82
  let clockSize = mm(31.5)
  ctx.font = `700 ${clockSize}px ${FONT_TEXT}`
  while (ctx.measureText(clock).width > maxClockW && clockSize > mm(10)) {
    clockSize *= 0.96
    ctx.font = `700 ${clockSize}px ${FONT_TEXT}`
  }
  ctx.fillStyle = 'rgba(255,255,255,0.99)'
  ctx.fillText(clock, w / 2, mm(31.4))
  ctx.restore()

  // ---- 小组件行 ----
  const cols = 4
  const gap = mm(6.2)
  const margin = mm(7)
  const cardW = (w - margin * 2 - gap * (cols - 1)) / cols
  const cardH = cardW
  const cardY = mm(44.5)
  const widgetLabels = [weather, 'TUE', '84%', 'Podcasts']
  for (let i = 0; i < cols; i++) {
    const x = margin + i * (cardW + gap)
    ctx.save()
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    roundRectPath(ctx, x, cardY, cardW, cardH, mm(3.6))
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.13)'
    ctx.lineWidth = mm(0.12)
    ctx.stroke()
    ctx.restore()
    const cx = x + cardW / 2
    if (i === 0) {
      weatherGlyph(ctx, x + cardW * 0.34, cardY + cardH * 0.34, cardW * 0.4)
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,0.98)'
      ctx.font = `600 ${cardW * 0.24}px ${FONT_TEXT}`
      ctx.fillText(`${temperature}°`, cx + cardW * 0.06, cardY + cardH * 0.66)
      ctx.fillStyle = 'rgba(255,255,255,0.72)'
      ctx.font = `500 ${cardW * 0.15}px ${FONT_TEXT}`
      ctx.fillText(widgetLabels[0], cx + cardW * 0.06, cardY + cardH * 0.86)
    }
    else if (i === 1) {
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,132,120,0.98)'
      ctx.font = `600 ${cardW * 0.16}px ${FONT_TEXT}`
      ctx.fillText(date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(), cx, cardY + cardH * 0.24)
      ctx.fillStyle = 'rgba(255,255,255,0.98)'
      ctx.font = `600 ${cardW * 0.4}px ${FONT_TEXT}`
      ctx.fillText(String(date.getDate()), cx, cardY + cardH * 0.62)
    }
    else if (i === 2) {
      ctx.save()
      ctx.translate(cx, cardY + cardH * 0.44)
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = cardW * 0.1
      ctx.beginPath()
      ctx.arc(0, 0, cardW * 0.25, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(120,240,150,0.95)'
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(0, 0, cardW * 0.25, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * battery)
      ctx.stroke()
      ctx.restore()
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,0.98)'
      ctx.font = `600 ${cardW * 0.19}px ${FONT_TEXT}`
      ctx.fillText(widgetLabels[2], cx, cardY + cardH * 0.85)
    }
    else {
      ctx.save()
      ctx.translate(cx, cardY + cardH * 0.4)
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.beginPath()
      ctx.moveTo(-cardW * 0.09, -cardW * 0.13)
      ctx.lineTo(cardW * 0.13, 0)
      ctx.lineTo(-cardW * 0.09, cardW * 0.14)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,0.72)'
      ctx.font = `500 ${cardW * 0.15}px ${FONT_TEXT}`
      ctx.fillText(widgetLabels[3], cx, cardY + cardH * 0.82)
    }
  }

  // ---- 右下：手电 / 相机 ----
  lockButton(ctx, w - mm(7.6), h - mm(11), mm(5.2), 'flash')
  lockButton(ctx, mm(7.6), h - mm(11), mm(5.2), 'camera')

  // ---- Home 指示条 ----
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  const bw = Math.min(mm(30), w * 0.4)
  roundRectPath(ctx, (w - bw) / 2, h - mm(3.4), bw, mm(1.3), mm(0.65))
  ctx.fill()
  ctx.restore()
}

export function drawInnerLockScreen(ctx: CanvasRenderingContext2D, w: number, h: number, state: LockScreenState) {
  const k = w / (OUTER_X * 2)
  const mm = (v: number) => v * k
  const { date, battery, temperature, weather } = state
  ctx.clearRect(0, 0, w, h)
  ctx.textBaseline = 'middle'

  // 显示区左上角在画布中的位置
  const ox = (w - INNER_W * k) / 2
  const oy = (h - INNER_H * k) / 2

  // ---- 顶部 / 底部可读性压暗 ----
  const topGrad = ctx.createLinearGradient(0, oy, 0, oy + mm(34))
  topGrad.addColorStop(0, 'rgba(0,0,0,0.3)')
  topGrad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = topGrad
  ctx.fillRect(ox, oy, INNER_W * k, mm(34))
  const botGrad = ctx.createLinearGradient(0, oy + INNER_H * k - mm(30), 0, oy + INNER_H * k)
  botGrad.addColorStop(0, 'rgba(0,0,0,0)')
  botGrad.addColorStop(1, 'rgba(0,0,0,0.32)')
  ctx.fillStyle = botGrad
  ctx.fillRect(ox, oy + INNER_H * k - mm(30), INNER_W * k, mm(30))

  // ---- 状态栏 ----
  const barCy = oy + mm(3.2)
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.32)'
  ctx.shadowBlur = mm(1)
  ctx.shadowOffsetY = mm(0.18)
  ctx.fillStyle = 'rgba(255,255,255,0.97)'
  ctx.textAlign = 'left'
  const clock = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?[AP]M$/i, '')
  ctx.font = `600 ${mm(3.1)}px ${FONT_TEXT}`
  ctx.fillText(clock, ox + mm(7.4), barCy)
  ctx.textAlign = 'right'
  ctx.font = `600 ${mm(2.9)}px ${FONT_TEXT}`
  const right = ox + INNER_W * k - mm(7.4)
  ctx.fillText('5G', right - mm(13.6), barCy)
  signalBars(ctx, right - mm(17.6), barCy + mm(1.15), mm)
  wifiGlyph(ctx, right - mm(9.4), barCy - mm(0.4), mm(2.4))
  ctx.restore()
  batteryGlyph(ctx, right, barCy, mm, battery)

  // ---- 日期 + 大时钟 ----
  ctx.save()
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = mm(1.8)
  ctx.shadowOffsetY = mm(0.25)
  ctx.fillStyle = 'rgba(255,255,255,0.97)'
  ctx.font = `600 ${mm(5.4)}px ${FONT_TEXT}`
  ctx.fillText(
    date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    w / 2,
    oy + mm(31)
  )
  const maxClockW = INNER_W * k * 0.7
  let clockSize = mm(40)
  ctx.font = `700 ${clockSize}px ${FONT_ROUND}`
  while (ctx.measureText(clock).width > maxClockW && clockSize > mm(10)) {
    clockSize *= 0.96
    ctx.font = `700 ${clockSize}px ${FONT_ROUND}`
  }
  ctx.fillStyle = 'rgba(255,255,255,0.99)'
  ctx.fillText(clock, w / 2, oy + mm(52))
  ctx.restore()

  // ---- 小组件行 ----
  const cols = 4
  const gap = mm(6)
  const margin = mm(20)
  const cardW = (INNER_W * k - margin * 2 - gap * (cols - 1)) / cols
  const cardH = cardW
  const cardY = oy + mm(78)
  const widgetLabels = [weather, 'TUE', '84%', 'Podcasts']
  for (let i = 0; i < cols; i++) {
    const x = ox + margin + i * (cardW + gap)
    ctx.save()
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    roundRectPath(ctx, x, cardY, cardW, cardH, mm(3.6))
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.13)'
    ctx.lineWidth = mm(0.12)
    ctx.stroke()
    ctx.restore()
    const cx = x + cardW / 2
    if (i === 0) {
      weatherGlyph(ctx, x + cardW * 0.34, cardY + cardH * 0.34, cardW * 0.4)
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,0.98)'
      ctx.font = `600 ${cardW * 0.24}px ${FONT_TEXT}`
      ctx.fillText(`${temperature}°`, cx + cardW * 0.06, cardY + cardH * 0.66)
      ctx.fillStyle = 'rgba(255,255,255,0.72)'
      ctx.font = `500 ${cardW * 0.15}px ${FONT_TEXT}`
      ctx.fillText(widgetLabels[0], cx + cardW * 0.06, cardY + cardH * 0.86)
    }
    else if (i === 1) {
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,132,120,0.98)'
      ctx.font = `600 ${cardW * 0.16}px ${FONT_TEXT}`
      ctx.fillText(date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(), cx, cardY + cardH * 0.24)
      ctx.fillStyle = 'rgba(255,255,255,0.98)'
      ctx.font = `600 ${cardW * 0.4}px ${FONT_TEXT}`
      ctx.fillText(String(date.getDate()), cx, cardY + cardH * 0.62)
    }
    else if (i === 2) {
      ctx.save()
      ctx.translate(cx, cardY + cardH * 0.44)
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = cardW * 0.1
      ctx.beginPath()
      ctx.arc(0, 0, cardW * 0.25, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(120,240,150,0.95)'
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(0, 0, cardW * 0.25, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * battery)
      ctx.stroke()
      ctx.restore()
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,0.98)'
      ctx.font = `600 ${cardW * 0.19}px ${FONT_TEXT}`
      ctx.fillText(widgetLabels[2], cx, cardY + cardH * 0.85)
    }
    else {
      ctx.save()
      ctx.translate(cx, cardY + cardH * 0.4)
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.beginPath()
      ctx.moveTo(-cardW * 0.09, -cardW * 0.13)
      ctx.lineTo(cardW * 0.13, 0)
      ctx.lineTo(-cardW * 0.09, cardW * 0.13)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,0.72)'
      ctx.font = `500 ${cardW * 0.15}px ${FONT_TEXT}`
      ctx.fillText(widgetLabels[3], cx, cardY + cardH * 0.82)
    }
  }

  // ---- 底部按钮与 Home 指示条 ----
  lockButton(ctx, ox + mm(11), oy + mm(120), mm(6.2), 'flash')
  lockButton(ctx, ox + INNER_W * k - mm(11), oy + mm(120), mm(6.2), 'camera')
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  const bw = Math.min(mm(38), w * 0.3)
  roundRectPath(ctx, (w - bw) / 2, oy + INNER_H * k - mm(3.4), bw, mm(1.5), mm(0.75))
  ctx.fill()
  ctx.restore()

  // ---- 折痕高光：折叠屏中缝处极淡的亮线，配合壁纸层的柔化 ----
  const lineW = Math.max(2, Math.round(w * 0.004))
  const lg = ctx.createLinearGradient((w - lineW) / 2, 0, (w + lineW) / 2, 0)
  lg.addColorStop(0, 'rgba(255,255,255,0)')
  lg.addColorStop(0.5, 'rgba(255,255,255,0.05)')
  lg.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = lg
  ctx.fillRect((w - lineW) / 2, oy, lineW, INNER_H * k)
}

/**
 * 外屏主屏态：整面屏（贴合机身正面，仅极窄黑边），壁纸铺满 + 小组件 + 图标网格 + Dock。
 * 参照官网收起态渲染：外屏平时显示的就是主屏。
 */
const ICON_COLORS = [
  ['#4cd964', '#2f9e44'], ['#5e9eff', '#1c6fd0'], ['#ff9f0a', '#e07800'], ['#bf5af2', '#8e33d1'],
  ['#ff375f', '#d61f4c'], ['#64d2ff', '#2a9bc4'], ['#ffd60a', '#e0a800'], ['#8e8e93', '#5c5c61']
]
const ICON_LABELS = ['FaceTime', '日历', 'App Store', '相机', '邮件', '备忘录', '时钟', '地图', '股市', '文件', 'App', '游戏', '健康', '钱包', 'Siri', '设置']

/**
 * 内屏主屏态：右上打孔摄像头 + 状态栏 + 两个小组件 + 4×4 图标网格 + 搜索胶囊 + 页面圆点。
 * 布局参照真机主屏截图；图标为程序化近似色块（非官方素材）。
 */
export function drawInnerHomeScreen(ctx: CanvasRenderingContext2D, w: number, h: number, state: LockScreenState, preset: WallpaperPreset) {
  const k = w / (OUTER_X * 2)
  const mm = (v: number) => v * k
  const { date, battery, temperature, weather } = state
  ctx.clearRect(0, 0, w, h)
  ctx.textBaseline = 'middle'

  // 显示区左上角在画布中的位置
  const ox = (w - INNER_W * k) / 2
  const oy = (h - INNER_H * k) / 2
  const X = (v: number) => ox + mm(v)
  const Y = (v: number) => oy + mm(v)

  // ---- 打孔摄像头（右上，竖长圆孔）+ 状态栏 ----
  ctx.save()
  ctx.fillStyle = '#05060a'
  ctx.beginPath()
  ctx.ellipse(X(INNER_W - 4.4), Y(5.2), mm(1.5), mm(3.0), 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.96)'
  ctx.textAlign = 'right'
  ctx.font = `600 ${mm(3.1)}px ${FONT_TEXT}`
  ctx.fillText(
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?[AP]M$/i, ''),
    X(INNER_W - 7.6), Y(5.2)
  )
  wifiGlyph(ctx, X(INNER_W - 10.4), Y(9.8), mm(2.4))
  ctx.restore()
  batteryGlyph(ctx, X(INNER_W - 14.4), Y(5.2), mm, battery)

  // ---- 小组件 ----
  const wy = 12
  const wh = 27
  const widget = (x: number, ww: number, fill: [string, string] | null, render: () => void) => {
    ctx.save()
    if (fill) {
      const g = ctx.createLinearGradient(X(x), Y(wy), X(x + ww), Y(wy + wh))
      g.addColorStop(0, fill[0])
      g.addColorStop(1, fill[1])
      ctx.fillStyle = g
    }
    else ctx.fillStyle = 'rgba(28,30,36,0.5)'
    roundRectPath(ctx, X(x), Y(wy), mm(ww), mm(wh), mm(5))
    ctx.fill()
    render()
    ctx.restore()
  }
  widget(6, 52, ['rgba(38,92,196,0.94)', 'rgba(22,54,138,0.94)'], () => {
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(255,255,255,0.96)'
    ctx.font = `600 ${mm(3.2)}px ${FONT_TEXT}`
    ctx.fillText('上海市', X(9.4), Y(wy + 5.4))
    ctx.font = `600 ${mm(7.4)}px ${FONT_TEXT}`
    ctx.fillText(`${temperature}°`, X(9.4), Y(wy + 13.6))
    ctx.font = `500 ${mm(2.5)}px ${FONT_TEXT}`
    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    ctx.fillText(weather, X(9.4), Y(wy + 19.4))
    ctx.fillText('最高 16°  最低 10°', X(9.4), Y(wy + 23.4))
    weatherGlyph(ctx, X(48), Y(wy + 20), mm(7))
  })
  widget(61.5, 44, ['rgba(236,231,221,0.96)', 'rgba(206,196,180,0.96)'], () => {
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(58,48,28,0.85)'
    ctx.font = `500 ${mm(2.6)}px ${FONT_TEXT}`
    ctx.fillText('Find My', X(83.5), Y(wy + wh - 3.6))
    ctx.fillStyle = 'rgba(96,166,96,0.92)'
    roundRectPath(ctx, X(66), Y(wy + 3), mm(34), mm(15), mm(2.6))
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.96)'
    ctx.beginPath()
    ctx.arc(X(83.5), Y(wy + 10.4), mm(3), 0, Math.PI * 2)
    ctx.fill()
  })

  // ---- 图标网格 4×4 ----
  const icon = 16
  const gapX = 15
  const pitchY = 20
  const gridTop = 44
  const margin = (INNER_W - (4 * icon + 3 * gapX)) / 2
  for (let i = 0; i < 16; i++) {
    const gx = margin + (i % 4) * (icon + gapX)
    const gy = gridTop + Math.floor(i / 4) * pitchY
    const x = X(gx)
    const y = Y(gy)
    const s2 = mm(icon)
    const [c1, c2] = ICON_COLORS[i % ICON_COLORS.length]
    ctx.save()
    const g = ctx.createLinearGradient(x, y, x, y + s2)
    g.addColorStop(0, c1)
    g.addColorStop(1, c2)
    ctx.fillStyle = g
    roundRectPath(ctx, x, y, s2, s2, s2 * 0.26)
    ctx.fill()
    // 图标内的简易白色图形：按行区分（方块 / 圆 / 三角 / 圆环）
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    const cx2 = x + s2 / 2
    const cy2 = y + s2 / 2
    const q = i % 4
    if (q === 0) {
      roundRectPath(ctx, cx2 - s2 * 0.26, cy2 - s2 * 0.26, s2 * 0.52, s2 * 0.52, s2 * 0.12)
      ctx.fill()
    }
    else if (q === 1) {
      ctx.beginPath()
      ctx.arc(cx2, cy2, s2 * 0.28, 0, Math.PI * 2)
      ctx.fill()
    }
    else if (q === 2) {
      ctx.beginPath()
      ctx.moveTo(cx2, cy2 - s2 * 0.28)
      ctx.lineTo(cx2 + s2 * 0.28, cy2 + s2 * 0.22)
      ctx.lineTo(cx2 - s2 * 0.28, cy2 + s2 * 0.22)
      ctx.closePath()
      ctx.fill()
    }
    else {
      ctx.beginPath()
      ctx.arc(cx2, cy2, s2 * 0.26, 0, Math.PI * 2)
      ctx.lineWidth = s2 * 0.12
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.stroke()
    }
    ctx.restore()
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.94)'
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = mm(1.4)
    ctx.font = `500 ${mm(2.5)}px ${FONT_TEXT}`
    ctx.fillText(ICON_LABELS[i], x + s2 / 2, y + s2 + mm(3.4))
    ctx.shadowBlur = 0
  }

  // ---- 页面圆点 + 搜索胶囊 ----
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.arc(X(INNER_W / 2 + (i - 1) * 5), Y(INNER_H - 5.4), mm(0.7), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(30,32,38,0.34)'
  ctx.beginPath()
  ctx.arc(X(INNER_W - 11), Y(INNER_H - 5.4), mm(3.6), 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.92)'
  ctx.lineWidth = mm(0.7)
  ctx.beginPath()
  ctx.arc(X(INNER_W - 11.6), Y(INNER_H - 6), mm(1.5), 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(X(INNER_W - 10.5), Y(INNER_H - 4.9))
  ctx.lineTo(X(INNER_W - 9.3), Y(INNER_H - 3.7))
  ctx.stroke()
  ctx.restore()
}

export function drawCoverHomeScreen(ctx: CanvasRenderingContext2D, w: number, h: number, state: LockScreenState, preset: WallpaperPreset) {
  const k = w / HALF_W
  const mm = (v: number) => v * k
  const { date, temperature, weather, battery } = state
  drawWallpaper(ctx, w, h, preset)
  ctx.textBaseline = 'middle'

  // ---- 打孔摄像头 + 状态栏（时间与信号在右上，参照官网） ----
  ctx.save()
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(w - mm(3.2), mm(4.6), mm(1.15), mm(2.3), 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.97)'
  ctx.textAlign = 'right'
  ctx.font = `600 ${mm(2.9)}px ${FONT_TEXT}`
  ctx.fillText(
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?[AP]M$/i, ''),
    w - mm(6.4), mm(4.6)
  )
  wifiGlyph(ctx, w - mm(11), mm(3.2), mm(2.2))
  ctx.restore()
  batteryGlyph(ctx, w - mm(14.6), mm(4.6), mm, battery)

  // ---- 小组件行（天气 + 第二组件） ----
  const widgetH = mm(21)
  const widgetY = mm(9.5)
  const drawWidget = (x: number, ww: number, fill: [string, string] | null, render: () => void) => {
    ctx.save()
    if (fill) {
      const g = ctx.createLinearGradient(x, widgetY, x + ww, widgetY + widgetH)
      g.addColorStop(0, fill[0])
      g.addColorStop(1, fill[1])
      ctx.fillStyle = g
    }
    else ctx.fillStyle = 'rgba(30,32,38,0.55)'
    roundRectPath(ctx, x, widgetY, ww, widgetH, mm(4.4))
    ctx.fill()
    render()
    ctx.restore()
  }
  drawWidget(mm(6.5), mm(28), ['rgba(40,90,190,0.92)', 'rgba(25,55,140,0.92)'], () => {
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.font = `600 ${mm(2.6)}px ${FONT_TEXT}`
    ctx.fillText('San Francisco', mm(8.6), widgetY + mm(4.6))
    ctx.font = `600 ${mm(6)}px ${FONT_TEXT}`
    ctx.fillText(`${temperature}°`, mm(8.6), widgetY + mm(11.4))
    ctx.font = `500 ${mm(2)}px ${FONT_TEXT}`
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillText(weather, mm(8.6), widgetY + mm(15.8))
    weatherGlyph(ctx, mm(28.5), widgetY + mm(13.5), mm(6))
  })
  drawWidget(mm(36.5), mm(28), ['rgba(235,230,220,0.95)', 'rgba(210,200,185,0.95)'], () => {
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(60,50,30,0.85)'
    ctx.font = `500 ${mm(2.1)}px ${FONT_TEXT}`
    ctx.fillText('Find My', mm(50.5), widgetY + widgetH - mm(3.4))
    ctx.fillStyle = 'rgba(90,160,90,0.9)'
    roundRectPath(ctx, mm(40), widgetY + mm(2.6), mm(21), mm(11), mm(2))
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.beginPath()
    ctx.arc(mm(50.5), widgetY + mm(7.6), mm(2.1), 0, Math.PI * 2)
    ctx.fill()
  })

  // ---- 图标网格 4×4 ----
  const gridTop = mm(35)
  const cols = 4
  const gap = mm(6.2)
  const margin = mm(7.4)
  const iconW = (w - margin * 2 - gap * (cols - 1)) / cols
  for (let i = 0; i < 16; i++) {
    const cx = margin + (i % cols) * (iconW + gap)
    const cy = gridTop + Math.floor(i / cols) * (iconW + gap)
    const [c1, c2] = ICON_COLORS[i % ICON_COLORS.length]
    ctx.save()
    const g = ctx.createLinearGradient(cx, cy, cx, cy + iconW)
    g.addColorStop(0, c1)
    g.addColorStop(1, c2)
    ctx.fillStyle = g
    roundRectPath(ctx, cx, cy, iconW, iconW, iconW * 0.24)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.beginPath()
    ctx.arc(cx + iconW / 2, cy + iconW / 2, iconW * 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.font = `500 ${mm(2.1)}px ${FONT_TEXT}`
    ctx.fillText(ICON_LABELS[i], cx + iconW / 2, cy + iconW + mm(2.6))
  }

  // ---- 页面圆点 + Dock ----
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.arc(w / 2 + (i - 1) * mm(4.4), h - mm(19.5), mm(0.55), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(40,40,44,0.42)'
  roundRectPath(ctx, mm(6.5), h - mm(16.5), w - mm(13), mm(12.5), mm(6.2))
  ctx.fill()
  for (let i = 0; i < 4; i++) {
    const [c1, c2] = ICON_COLORS[(i + 1) % ICON_COLORS.length]
    const ix = w / 2 + (i - 1.5) * (mm(9.4) + mm(2.4))
    const g = ctx.createLinearGradient(ix, 0, ix + mm(9.4), 0)
    g.addColorStop(0, c1)
    g.addColorStop(1, c2)
    ctx.fillStyle = g
    roundRectPath(ctx, ix, h - mm(15.2), mm(9.4), mm(9.4), mm(2.2))
    ctx.fill()
  }
  ctx.restore()

  // ---- Home 指示条 ----
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  const bw2 = Math.min(mm(31), w * 0.4)
  roundRectPath(ctx, (w - bw2) / 2, h - mm(3.2), bw2, mm(1.35), mm(0.68))
  ctx.fill()
  ctx.restore()
}
