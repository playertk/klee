import { Application } from './application'

// 定义 Klee 类
export class Klee {
  private app: Application

  // 构造函数，接受一个 HTMLCanvasElement 和一个可选的 Application 实例
  constructor(canvas: HTMLCanvasElement, app?: Application) {
    // 如果传入了 app 参数，则使用传入的实例，否则创建一个新的实例
    if (app !== undefined) {
      this.app = app
    } else {
      // 调用 Application 类的静态方法创建或获取实例
      this.app = Application.createOrGet(canvas)
    }
  }

  // 显示蓝图的方法，将蓝图文本加载到场景中
  public display(blueprintText: string): void {
    this.app.loadBlueprintIntoScene(blueprintText)
  }

  // 获取 Klee 实例的静态方法，用于创建或获取 Klee 实例
  public static getInstance(canvas: HTMLCanvasElement) {
    // 调用 Application 类的静态方法创建或获取实例
    let app = Application.getInstance(canvas)
    if (app !== undefined) {
      return new Klee(canvas, app)
    }
    return undefined
  }

  // 获取当前蓝图文本的属性
  public get value(): string {
    return this.app.getBlueprint()
  }
}

// 初始化函数，用于在给定的 canvas 元素上创建 Klee 实例
export function init(canvas: HTMLCanvasElement) {
  return new Klee(canvas)
}

// 获取 Klee 实例的函数，用于创建或获取 Klee 实例
export function get(canvas: HTMLCanvasElement) {
  return Klee.getInstance(canvas)
}

// 初始化函数，遍历所有包含类名 'klee' 的 canvas 元素并在其上创建 Klee 实例
function initialize() {
  document.querySelectorAll('canvas.klee').forEach((canvas: HTMLCanvasElement) => {
    new Klee(canvas)
  })
}

// 在页面加载完成后调用 initialize 函数
window.addEventListener('load', initialize)
