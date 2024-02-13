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
      this.analyser.fftSize = 128
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
    const gradient = this.canvasCtx.createLinearGradient(this.canvas.width / 4, this.canvas.height / 4, 0, 0)
    gradient.addColorStop(1, '#28C76F')
    gradient.addColorStop(0.7, '#92FFC0')
    gradient.addColorStop(0.3, '#FFF886')
    gradient.addColorStop(0, '#E80505')

    this.canvasCtx.fillStyle = gradient
    this.canvasCtx.lineCap = 'round'
    this.canvasCtx.lineWidth = 4

    const radius = this.canvas.width / 2

    for (let i = 0; i < bufferLength; i++) {
      this.canvasCtx.save()
      this.canvasCtx.translate(radius, radius)
      this.canvasCtx.rotate(Math.PI / 180 * 360 / bufferLength * i * 1.35)
      this.canvasCtx.moveTo(0, 0)
      this.canvasCtx.fillRect(60, 0, dataArray[i] / 3, 4)
      this.canvasCtx.restore()
    }

    this.tid = window.requestAnimationFrame(this.draw.bind(this))
  }

  stop() {
    window.cancelAnimationFrame(this.tid!)
  }
}
