interface ParticleConfig {
  zIndex?: number
  opacity?: number
  color?: string // line color
  pointColor?: string // join point color
  count?: number
}

interface Point {
  x: number | null // 点位置
  y: number | null
  xa?: number // 下一帧X轴偏移量
  ya?: number // 下一帧Y轴偏移量
  max: number
}

export default class Particle {
  readonly el: HTMLDivElement
  readonly config: ParticleConfig
  readonly canvas: HTMLCanvasElement
  readonly points: Point[]
  readonly current: Point
  readonly allPoints: Point[]
  private context: CanvasRenderingContext2D
  private tid: number | null
  private onmousemove!: (e: MouseEvent) => void
  private onmouseout!: (e: MouseEvent) => void

  constructor(el: HTMLDivElement, config: ParticleConfig = {}) {
    this.tid = null
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
    this.context = this.canvas.getContext('2d')!
    this.points = this.createRandomPoints()
    this.current = {
      x: -1,
      y: -1,
      max: 20000
    }
    this.allPoints = this.points.concat([this.current])
    this.bindEvents()
    this.requestFrame(this.drawCanvas)
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
      xa: 2 * Math.random() - 1,
      ya: 2 * Math.random() - 1,
      max: 6000 // 沾附距离
    }))
  }

  bindEvents() {
    const resizeObserver = new ResizeObserver(() => {
      this.canvas.width = this.el.clientWidth
      this.canvas.height = this.el.clientHeight
    })
    resizeObserver.observe(this.el)
    this.onmousemove = (e) => {
      const offsetLeft = this.el.getBoundingClientRect().left
      const offsetTop = this.el.getBoundingClientRect().top
      this.current.x = e.clientX - offsetLeft + document.scrollingElement!.scrollLeft // 处理容器+滚动条位置偏移
      this.current.y = e.clientY - offsetTop + document.scrollingElement!.scrollTop
    }
    this.onmouseout = () => {
      this.current.x = null
      this.current.y = null
    }
    this.el.addEventListener('mousemove', this.onmousemove)
    this.el.addEventListener('mouseout', this.onmouseout)
  }

  requestFrame(func: Function) {
    this.tid = window.requestAnimationFrame(() => func.call(this))
  }

  drawCanvas() {
    const context = this.context
    const width = this.canvas.width
    const height = this.canvas.height
    const current = this.current
    const points = this.points
    const all = this.allPoints

    context.clearRect(0, 0, width, height)
    // 随机的线条和当前位置联合数组
    let e, i, d, x_dist, y_dist, dist // 临时节点
    // 遍历处理每一个点
    points.forEach((r, idx) => {
      r.x! += r.xa!
      r.y! += r.ya! // 移动
      r.xa! *= (r.x! > width || r.x! < 0) ? -1 : 1
      r.ya! *= (r.y! > height || r.y! < 0) ? -1 : 1 // 碰到边界，反向反弹
      context.fillStyle = `rgba(${this.config.pointColor})`
      context.fillRect(r.x! - 0.5, r.y! - 0.5, 1, 1) // 绘制一个宽高为1的点
      // 从下一个点开始
      for (i = idx + 1; i < all.length; i++) {
        e = all[i]
        // 当前点存在
        if (e.x !== null && e.y !== null) {
          x_dist = r.x! - e.x // x轴距离 l
          y_dist = r.y! - e.y // y轴距离 n
          dist = x_dist * x_dist + y_dist * y_dist // 总距离, m

          if (dist < e.max) {
            if (e === current && dist >= e.max / 2) {
              // 靠近鼠标加速
              r.x! -= 0.03 * x_dist
              r.y! -= 0.03 * y_dist
            }
            d = (e.max - dist) / e.max
            context.beginPath()
            context.lineWidth = d / 2
            context.strokeStyle = `rgba(${this.config.color},${d + 0.2})`
            context.moveTo(r.x!, r.y!)
            context.lineTo(e.x, e.y)
            context.stroke()
          }
        }
      }
    })
    this.requestFrame(this.drawCanvas)
  }

  destroy() {
    this.el.removeEventListener('mousemove', this.onmousemove)
    this.el.removeEventListener('mouseout', this.onmouseout)
    window.cancelAnimationFrame(this.tid!)
    this.el.removeChild(this.canvas)
  }
}
