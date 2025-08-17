/**
 * Manages inspection mode behavior, event handling, and DOM interaction
 */

export class InspectionManager {
  private isInspecting = false
  private currentHoveredElement: Element | null = null
  private inspectionStyleElement: HTMLStyleElement | null = null
  private onElementSelect?: (element: Element) => void
  private shouldIgnoreElement?: (element: Element) => boolean
  private isElementSelected?: (element: Element) => boolean

  constructor(
    onElementSelect?: (element: Element) => void,
    shouldIgnoreElement?: (element: Element) => boolean,
    isElementSelected?: (element: Element) => boolean
  ) {
    this.onElementSelect = onElementSelect
    this.shouldIgnoreElement = shouldIgnoreElement
    this.isElementSelected = isElementSelected
    
    // Bind event handlers to maintain proper 'this' context
    this.handleMouseOver = this.handleMouseOver.bind(this)
    this.handleMouseOut = this.handleMouseOut.bind(this)
    this.handleElementClick = this.handleElementClick.bind(this)
    this.preventMouseEvents = this.preventMouseEvents.bind(this)
  }

  enterInspectionMode(): void {
    if (this.isInspecting) return

    this.isInspecting = true
    this.addInspectionStyles()

    document.addEventListener('mouseover', this.handleMouseOver, true)
    document.addEventListener('mouseout', this.handleMouseOut, true)
    document.addEventListener('click', this.handleElementClick, true)
    document.addEventListener('mousedown', this.preventMouseEvents, true)
    document.addEventListener('mouseup', this.preventMouseEvents, true)
    document.addEventListener('dblclick', this.preventMouseEvents, true)
    document.addEventListener('contextmenu', this.preventMouseEvents, true)
  }

  exitInspectionMode(): void {
    if (!this.isInspecting) return

    this.isInspecting = false
    this.removeInspectionStyles()

    document.removeEventListener('mouseover', this.handleMouseOver, true)
    document.removeEventListener('mouseout', this.handleMouseOut, true)
    document.removeEventListener('click', this.handleElementClick, true)
    document.removeEventListener('mousedown', this.preventMouseEvents, true)
    document.removeEventListener('mouseup', this.preventMouseEvents, true)
    document.removeEventListener('dblclick', this.preventMouseEvents, true)
    document.removeEventListener('contextmenu', this.preventMouseEvents, true)

    this.removeHoverHighlight()
  }

  isInInspectionMode(): boolean {
    return this.isInspecting
  }

  private addInspectionStyles(): void {
    this.inspectionStyleElement = document.createElement('style')
    this.inspectionStyleElement.id = 'inspector-toolbar-styles'
    this.inspectionStyleElement.textContent = `
      * {
        cursor: crosshair !important;
      }
    `
    document.head.appendChild(this.inspectionStyleElement)
  }

  private removeInspectionStyles(): void {
    if (this.inspectionStyleElement) {
      this.inspectionStyleElement.remove()
      this.inspectionStyleElement = null
    }
  }

  private handleMouseOver(e: Event): void {
    const target = e.target as Element
    if (this.shouldIgnoreElement?.(target)) return

    this.removeHoverHighlight()

    ;(target as HTMLElement).style.outline = '3px solid #3B82F6'
    ;(target as HTMLElement).style.outlineOffset = '-1px'
    this.currentHoveredElement = target
  }

  private handleMouseOut(e: Event): void {
    const target = e.target as Element
    if (this.shouldIgnoreElement?.(target)) return

    // Only remove outline if the element is not selected
    if (!this.isElementSelected?.(target)) {
      ;(target as HTMLElement).style.outline = ''
      ;(target as HTMLElement).style.outlineOffset = ''
    }
  }

  private handleElementClick(e: Event): void {
    const target = e.target as Element
    if (this.shouldIgnoreElement?.(target)) return

    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()

    this.onElementSelect?.(target)
  }

  private preventMouseEvents(e: Event): void {
    const target = e.target as Element
    if (this.shouldIgnoreElement?.(target)) return

    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
  }

  private removeHoverHighlight(): void {
    if (this.currentHoveredElement) {
      // Only remove outline if the element is not selected
      if (!this.isElementSelected?.(this.currentHoveredElement)) {
        ;(this.currentHoveredElement as HTMLElement).style.outline = ''
        ;(this.currentHoveredElement as HTMLElement).style.outlineOffset = ''
      }
      this.currentHoveredElement = null
    }
  }

  destroy(): void {
    this.exitInspectionMode()
  }
}