import { Vector2 } from './math/vector2'

// 定义 RoundedCornerValues 接口，表示带有圆角半径的矩形四个角
export interface RoundedCornerValues {
  radiusTopLeft: number
  radiusTopRight: number
  radiusBottomRight: number
  radiusBottomLeft: number
}

// 定义 Canvas2D 类
export class Canvas2D {
  private _element: HTMLCanvasElement
  private _context: CanvasRenderingContext2D
  private readonly _PI_TIMES_TWO: number

  // 构造函数，接受一个 HTMLCanvasElement 元素作为参数
  constructor(element: HTMLCanvasElement) {
    this._element = element
    this._context = this._element.getContext('2d', { alpha: false }) as CanvasRenderingContext2D
    this._PI_TIMES_TWO = Math.PI * 2
  }

  // 获取元素的边界矩形
  getBoundingClientRect(): DOMRect {
    return this._element.getBoundingClientRect()
  }

  // 设置填充样式的方法
  fillStyle(style: string | CanvasGradient | CanvasPattern) {
    this._context.fillStyle = style
    return this
  }

  // 设置描边样式的方法
  strokeStyle(style: string | CanvasGradient | CanvasPattern) {
    this._context.strokeStyle = style
    return this
  }

  // 开始新路径的方法
  beginPath() {
    this._context.beginPath()
    return this
  }

  // 结束路径的方法
  closePath() {
    this._context.closePath()
    return this
  }

  // 绘制图像的方法
  drawImage(image: CanvasImageSource, x: number, y: number, width: number, height: number) {
    this._context.drawImage(image, x, y, width, height)
    return this
  }

  // 绘制具有圆角的矩形的方法
  roundedRectangle(x: number, y: number, width: number, height: number, radius: number | RoundedCornerValues) {
    let radiusTopLeft: number
    let radiusTopRight: number
    let radiusBottomLeft: number
    let radiusBottomRight: number

    if (radius instanceof Object) {
      let cornerValues = radius as RoundedCornerValues
      radiusTopLeft = cornerValues.radiusTopLeft
      radiusTopRight = cornerValues.radiusTopRight
      radiusBottomLeft = cornerValues.radiusBottomLeft
      radiusBottomRight = cornerValues.radiusBottomRight
    } else {
      radiusTopLeft = radius as number
      radiusTopRight = radius as number
      radiusBottomLeft = radius as number
      radiusBottomRight = radius as number
    }

    this._context.beginPath()
    this._context.moveTo(x + radiusTopLeft, y)
    this._context.lineTo(x + width - radiusTopRight, y)
    this._context.quadraticCurveTo(x + width, y, x + width, y + radiusTopRight)
    this._context.lineTo(x + width, y + height - radiusBottomRight)
    this._context.quadraticCurveTo(x + width, y + height, x + width - radiusBottomRight, y + height)
    this._context.lineTo(x + radiusBottomLeft, y + height)
    this._context.quadraticCurveTo(x, y + height, x, y + height - radiusBottomLeft)
    this._context.lineTo(x, y + radiusTopLeft)
    this._context.quadraticCurveTo(x, y, x + radiusTopLeft, y)
    this._context.closePath()

    return this
  }

  // 添加直线到指定坐标的方法
  lineTo(x: number, y: number) {
    this._context.lineTo(x, y)
    return this
  }

  // 添加二次贝塞尔曲线的方法
  quadraticCurveTo(controlX: number, controlY: number, x: number, y: number) {
    this._context.quadraticCurveTo(controlX, controlY, x, y)
    return this
  }

  // 填充路径的方法
  fill(fillRule?: CanvasFillRule): Canvas2D
  fill(path: Path2D, fillRule?: CanvasFillRule): Canvas2D
  fill(value?: Path2D | CanvasFillRule, fillRule?: CanvasFillRule): Canvas2D {
    if (value instanceof Path2D) {
      this._context.fill(value, fillRule)
    } else if (value !== undefined) {
      this._context.fill(value)
    } else {
      this._context.fill()
    }
    return this
  }

  // 描边路径的方法
  stroke(path?: Path2D): Canvas2D {
    if (path != undefined) {
      this._context.stroke(path)
    } else {
      this._context.stroke()
    }
    return this
  }

  // 清空画布的方法
  clear() {
    // 使用恒等矩阵清除画布
    this._context.setTransform(1, 0, 0, 1, 0, 0)
    this._context.clearRect(0, 0, this._element.width, this._element.height)
    return this
  }

  // 平移画布的方法
  translate(x: number, y: number) {
    this._context.translate(x, y)
    return this
  }

  // 填充矩形的方法
  fillRect(x: number, y: number, width: number, height: number) {
    this._context.fillRect(x, y, width, height)
    return this
  }

  // 描边矩形的方法
  strokeRect(x: number, y: number, width: number, height: number) {
    this._context.strokeRect(x, y, width, height)
    return this
  }

  // 设置虚线样式的方法
  setLineDash(segments: Array<number>) {
    this._context.setLineDash(segments)
    return this
  }

  // 填充圆的方法
  fillCircle(x: number, y: number, radius: number) {
    this._context.beginPath()
    this._context.arc(x, y, radius, 0, this._PI_TIMES_TWO)
    this._context.fill()
    return this
  }

  // 描边圆的方法
  strokeCircle(x: number, y: number, radius: number) {
    this._context.beginPath()
    this._context.arc(x, y, radius, 0, this._PI_TIMES_TWO)
    this._context.stroke()
    return this
  }

  // 填充文本的方法
  fillText(text: string, x: number, y: number, maxWidth?: number) {
    this._context.fillText(text, x, y, maxWidth)
    return this
  }

  // 描边文本的方法
  strokeText(text: string, x: number, y: number, maxWidth?: number) {
    this._context.strokeText(text, x, y, maxWidth)
    return this
  }

  shadow(offset: Vector2, blur: number, color: string) {
    this._context.shadowOffsetX = offset.x
    this._context.shadowOffsetY = offset.y
    this._context.shadowBlur = blur
    this._context.shadowColor = color
    return this
  }

  lineWidth(width: number) {
    this._context.lineWidth = width
    return this
  }

  moveTo(x: number, y: number) {
    this._context.moveTo(x, y)
    return this
  }

  bezierCurveTo(
    controlPoint1x: number,
    controlPoint1y: number,
    controlPoint2x: number,
    controlPoint2y: number,
    x: number,
    y: number,
  ) {
    this._context.bezierCurveTo(controlPoint1x, controlPoint1y, controlPoint2x, controlPoint2y, x, y)
    return this
  }

  // 保存当前绘图状态的方法
  save() {
    this._context.save()
    return this
  }

  // 恢复之前保存的绘图状态的方法
  restore() {
    this._context.restore()
    return this
  }

  // 设置字体样式的方法
  font(font: string) {
    this._context.font = font
    return this
  }

  // 设置文本水平对齐方式的方法
  textAlign(textAlign: CanvasTextAlign) {
    this._context.textAlign = textAlign
    return this
  }

  // 获取绘图上下文的方法
  getContext(): CanvasRenderingContext2D {
    return this._context
  }

  // 获取画布宽度的属性
  get width() {
    return this._element.width
  }

  // 获取画布高度的属性
  get height() {
    return this._element.height
  }
}
