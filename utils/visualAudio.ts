export default class VisualAudio {
  readonly audio: HTMLAudioElement
  readonly canvas: HTMLCanvasElement
  private canvasCtx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null
  private tid: number | null

  constructor(audio: HTMLAudioElement, canvas: HTMLCanvasElement) {
    this.audio = audio
    this.canvas = canvas
    this.canvasCtx = canvas.getContext('2d')!
    this.analyser = null
    this.tid = null
  }

  play() {
    if (!this.tid) {
      // @ts-expect-error AudioContext API
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioCtx.createMediaElementSource(this.audio)
      this.analyser = audioCtx.createAnalyser()
      this.analyser.fftSize = 512
      this.analyser.connect(audioCtx.destination)
      source.connect(this.analyser)
    }
    this.draw()
  }

  draw() {
    const bufferLength = this.analyser!.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    this.analyser!.getByteFrequencyData(dataArray)

    // 清空画布
    this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // 创建渐变色填充样式
    const gradient = this.canvasCtx.createLinearGradient(this.canvas.width / 2, 0, this.canvas.width / 2, this.canvas.height)
    gradient.addColorStop(0, '#FF0000') // 渐变色起始颜色（红色）
    gradient.addColorStop(0.5, '#FFFF00') // 渐变色中间颜色（黄色）
    gradient.addColorStop(1, '#00FF00') // 渐变色结束颜色（绿色）

    // 计算每个柱子的宽度和间隔
    // const barWidth = (this.canvas.width / bufferLength) * 2.5
    // const barGap = barWidth + 2

    // 绘制柱状图
    // let x = 0
    // for (let i = 0; i < bufferLength; i++) {
    //   const barHeight = dataArray[i] / 2
    //   this.canvasCtx.fillStyle = gradient
    //   this.canvasCtx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight)
    //   x += barGap
    // }

    this.canvasCtx.strokeStyle = gradient
    this.canvasCtx.lineCap = 'round'
    this.canvasCtx.lineWidth = 2

    const radius = this.canvas.width / 2
    const equalParts = bufferLength + 1

    // 整个圆周分为N等分
    const computedCoord = (per: number) => [radius * Math.cos(2 * Math.PI * per / equalParts) + radius * 2, radius * Math.sin(2 * Math.PI * per / equalParts) + radius * 2]

    for (let i = 0; i < bufferLength; i++) {
      this.canvasCtx.moveTo(radius, radius)
      this.canvasCtx.lineTo(computedCoord(i + 1)[0], computedCoord(i + 1)[1])
    }
    this.canvasCtx.stroke()

    this.tid = window.requestAnimationFrame(this.draw.bind(this))
  }

  stop() {
    window.cancelAnimationFrame(this.tid!)
  }
}
