import { Canvas2D } from './canvas'
import { Vector2 } from './math/vector2'

// 定义 Camera 类
export class Camera {
  private _canvas: Canvas2D
  private _position: Vector2

  // 构造函数，接受一个 Canvas2D 实例作为参数
  constructor(canvas: Canvas2D) {
    this._canvas = canvas
    this._position = new Vector2(0, 0)
  }

  // 获取相机位置的方法
  public get position(): Vector2 {
    return this._position
  }

  // 准备视口的方法，通过平移 Canvas2D 实例的坐标来实现
  prepareViewport() {
    this._canvas.translate(Math.round(this._position.x), Math.round(this._position.y))
  }

  // 相对移动的方法，通过给定的 Vector2 对象进行相对移动
  moveRelative(value: Vector2) {
    this._position = this._position.add(value)
  }

  // 将相机定位到绝对位置的方法，使该位置处于视口中央
  centerAbsolutePosition(value: Vector2) {
    this._position = new Vector2(
      Math.round(value.x + this._canvas.width / 2),
      Math.round(value.y + this._canvas.height / 2),
    )
  }
}
