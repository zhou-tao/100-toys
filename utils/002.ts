interface ParticleConfig {
  zIndex?: number
  opacity?: number
  color?: string // line color
  pointColor?: string // join point color
  count?: number
}

interface Point {
  x: number
  y: number
  xa?: number
  ya?: number
  max: number
}

class Particle {
  readonly el: HTMLDivElement
  readonly config: ParticleConfig
  readonly canvas: HTMLCanvasElement
  readonly points: Point[]
  readonly current: Point
  readonly allPoints: Point[]
  onmousemove!: (e: MouseEvent) => void
  onmouseout!: (e: MouseEvent) => void

  constructor(el: HTMLDivElement, config: ParticleConfig) {
    this.el = el
    this.config = {
      zIndex: -1,
      opacity: 0.5,
      color: '0,0,0',
      pointColor: '0,0,0',
      count: 99,
      ...config
    }
    this.canvas = this.createCanvas()
    this.points = this.createRandomPoints()
    this.current = {
      x: -1,
      y: -1,
      max: 20000
    }
    this.allPoints = this.points.concat([this.current])
  }

  createCanvas() {
    if (this.el.style.position === 'static') {
      this.el.style.position = 'relative'
    }
    const canvas = document.createElement('canvas')
    const { opacity, zIndex } = this.config
    canvas.style.cssText = `position:absolute;top:0;right:0;bottom:0;left:0;opacity:${opacity};z-index:${zIndex}`
    canvas.width = this.el.clientWidth
    canvas.height = this.el.clientHeight
    this.el.appendChild(canvas)
    return canvas
  }

  createRandomPoints() {
    return Array(this.config.count).fill(0).map(() => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      xa: 2 * Math.random() - 1, // TODO: ?
      ya: 2 * Math.random() - 1,
      max: 6000 // 沾附距离
    }))
  }

  bindEvent() {
    const resizeObserver = new ResizeObserver(() => {
      this.canvas.width = this.el.clientWidth
      this.canvas.height = this.el.clientHeight
    })
    resizeObserver.observe(this.el)
    this.onmousemove = (e) => {
      this.current.x = e.clientX - this.el.offsetLeft + document.scrollingElement!.scrollLeft // 当存在横向滚动条时，x坐标再往右移动滚动条拉动的距离
      this.current.y = e.clientY - this.el.offsetTop + document.scrollingElement!.scrollTop // 当存在纵向滚动条时，y坐标再往下移动滚动条拉动的距离
    }
    this.onmouseout = () => {
      this.current.x = -1
      this.current.y = -1
    }
    window.addEventListener('mousemove', this.onmousemove)
    window.addEventListener('mouseout', this.onmouseout)
  }

  destroy() {
    this.el.removeChild(this.canvas)
  }
}
