import { Canvas2D } from './canvas'
import { Controller } from './controller'
import { BlueprintParser } from './parser/blueprint-parser'
import { Scene } from './scene'

// 定义 Application 类
export class Application {
  private _scene: Scene
  private _canvas: Canvas2D

  private _controller: Controller
  private _parser: BlueprintParser
  private _element: HTMLCanvasElement

  private static firefox: boolean
  private static instances: Array<Application> = []

  private allowPaste: boolean

  // 私有构造函数，接受一个 HTMLCanvasElement 元素作为参数
  private constructor(element: HTMLCanvasElement) {
    this._element = element

    // 判断浏览器是否为 Firefox
    if (navigator.userAgent.indexOf('Firefox') > 0) {
      Application.firefox = true
    }

    // 创建 Canvas2D 和 Scene 实例
    this._canvas = new Canvas2D(element)
    this._scene = new Scene(this._canvas, this)

    // 初始化 HTML 元素的属性
    this.initializeHtmlAttributes()

    // 创建 BlueprintParser 实例并将蓝图加载到场景中
    this._parser = new BlueprintParser()
    this.loadBlueprintIntoScene(element.innerHTML)

    // 创建 Controller 实例并注册复制、粘贴、重新定位相机等操作
    this._controller = new Controller(element, this)
    this._controller.registerAction({
      ctrl: true,
      keycode: 'KeyC',
      callback: this.copyBlueprintSelectionToClipboard.bind(this),
    })
    this._controller.registerAction({
      ctrl: false,
      keycode: 'Home',
      callback: this.recenterCamera.bind(this),
    })

    this._controller.registerAction({
      ctrl: true,
      keycode: 'KeyV',
      callback: this.pasteClipboardContentToCanvas.bind(this),
    })
    this._element.onpaste = (ev) => this.onPaste(ev)

    // 监听窗口大小变化事件，触发刷新操作
    window.addEventListener('resize', this.refresh.bind(this), false)
  }

  // 获取 Scene 实例
  get scene() {
    return this._scene
  }

  // 获取 Canvas2D 实例
  get canvas() {
    return this._canvas
  }

  // 获取是否为 Firefox 浏览器的静态属性
  static get isFirefox() {
    return this.firefox
  }

  // 获取蓝图文本的方法
  public getBlueprint(): string {
    let textLines = []
    this._scene.nodes.forEach((n) => (textLines = [].concat(textLines, n.sourceText)))
    return textLines.join('\n')
  }

  // 初始化 HTML 元素的属性
  private initializeHtmlAttributes() {
    this._element.style.outline = 'none'

    let attrPaste = this._element.getAttributeNode('data-klee-paste')
    this.allowPaste = attrPaste?.value == 'true' || false
  }

  // 刷新场景
  public refresh() {
    this._element.width = this._element.offsetWidth
    this._element.height = this._element.offsetHeight
    this._scene.collectInteractables()
    this._scene.updateLayout()
    this._scene.refresh()
  }

  // 复制蓝图选择到剪贴板的方法
  private copyBlueprintSelectionToClipboard() {
    console.log('Copy selection')

    let textLines = []
    this._scene.nodes.filter((n) => n.selected).forEach((n) => (textLines = [].concat(textLines, n.sourceText)))
    navigator.clipboard.writeText(textLines.join('\n'))

    return true
  }

  // 从剪贴板粘贴内容到画布的方法
  private pasteClipboardContentToCanvas(ev) {
    if (!this.allowPaste) return
    if (Application.isFirefox) {
      return false
    }

    console.log('Paste from clipboard')

    navigator.clipboard.readText().then((text) => {
      if (!text) return
      this.loadBlueprintIntoScene(text)
    })

    return true
  }

  // 粘贴事件处理方法
  private onPaste(ev) {
    if (!this.allowPaste) return
    console.log('Paste from clipboard')
    let text = ev.clipboardData.getData('text/plain')
    this.loadBlueprintIntoScene(text)
  }

  // 将蓝图文本加载到场景中的方法
  public loadBlueprintIntoScene(text) {
    this._scene.unload()
    const nodes = this._parser.parseBlueprint(text)
    this._scene.load(nodes)
    this.refresh()

    this.recenterCamera()
  }

  // 重新定位相机的方法
  recenterCamera() {
    // 将相机移动到所有节点的中心
    this._scene.camera.centerAbsolutePosition(this._scene.calculateCenterPoint())
    this.refresh()
    return true
  }

  // 注册实例的方法，用于跟踪多个实例
  static registerInstance(element: HTMLCanvasElement, app: Application) {
    element.setAttribute('data-klee-instance', Application.instances.length.toString())
    Application.instances.push(app)
  }

  // 获取实例的静态方法，通过 HTMLCanvasElement 元素查找对应的实例
  public static getInstance(element: HTMLCanvasElement): Application {
    let instanceAttr = element.getAttributeNode('data-klee-instance')
    if (instanceAttr) {
      let id = Number.parseInt(instanceAttr.value)
      if (!isNaN(id) && id < Application.instances.length) {
        let instance = Application.instances[id]
        return instance
      }
    }

    return undefined
  }

  // 创建或获取实例的静态方法
  public static createOrGet(element: HTMLCanvasElement): Application {
    let instance = this.getInstance(element)
    if (instance !== undefined) {
      return instance
    }

    let app = new Application(element)
    Application.registerInstance(element, app)

    return app
  }
}
