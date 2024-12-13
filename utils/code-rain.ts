export default class CodeRain {
  private el: HTMLDivElement
  private canvas: HTMLCanvasElement
  private context: CanvasRenderingContext2D
  private timer: NodeJS.Timeout
  private randomString = 'console.log("hello world!")'
  private colors: string[] = [
    '#f472b6',
    '#f87171',
    '#fbbf24',
    '#a3e635',
    '#34d399',
    '#22d3ee',
    '#60a5fa',
    '#a78bfa'
  ]

  private fontSize = 20
  private columns: number
  private nextChars: number[] = []
  constructor(el: HTMLDivElement) {
    this.el = el
    this.canvas = this.createCanvas()
    this.context = this.canvas.getContext('2d')!
    this.columns = Math.floor(this.canvas.width / this.fontSize)
    this.nextChars = Array(this.columns).fill(0)
    this.timer = setInterval(() => {
      this.drawLineText()
    }, 50)
  }

  drawLineText() {
    if (!this.context) return
    this.context.font = `${this.fontSize}px Robot Mono`
    this.context.fillStyle = 'rgba(0,0,0,.1)'
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)
    for (let i = 0; i < this.columns; i++) {
      this.context.fillStyle = this.getRandomColor()
      const x = this.fontSize * i + 4
      const y = this.fontSize * (this.nextChars[i] + 1)
      this.context.fillText(this.getRandomText(), x, y)
      if (y > this.canvas.height && Math.random() > 0.99) {
        this.nextChars[i] = 0
      }
      else {
        this.nextChars[i]++
      }
    }
  }

  getRandomText() {
    return this.randomString[Math.floor(Math.random() * this.colors.length)]
  }

  getRandomColor() {
    return this.colors[Math.floor(Math.random() * this.randomString.length)]
  }

  createCanvas() {
    if (this.el.style.position === 'static') {
      this.el.style.position = 'relative'
    }
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:absolute;top:0;right:0;bottom:0;left:0;z-index:-1'
    canvas.width = this.el.clientWidth
    canvas.height = this.el.clientHeight
    this.el.appendChild(canvas)
    return canvas
  }

  destroy() {
    this.timer && clearInterval(this.timer)
  }
}
