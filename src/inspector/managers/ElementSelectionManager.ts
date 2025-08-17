/**
 * Manages element selection, highlighting, and badge creation
 */

import type { ElementData } from '../../shared/types'
import { XPathUtils } from '../utils/xpath'

export interface SelectedElementInfo {
  color: string
  originalOutline: string
  originalOutlineOffset: string
  index: number
}

export class ElementSelectionManager {
  private selectedElements = new Map<Element, SelectedElementInfo>()
  private badges = new Map<Element, HTMLElement>()
  private colorIndex = 0
  private readonly colors = [
    '#FF6B6B',
    '#FF9671',
    '#FFA75F',
    '#F9D423',
    '#FECA57',
    '#FF9FF3',
    '#FF7E67',
    '#FF8C42',
    '#FFC857',
    '#FFA26B',
  ]

  selectElement(element: Element, componentFinder?: (el: Element) => any): void {
    const color = this.colors[this.colorIndex % this.colors.length]
    const index = this.selectedElements.size + 1
    this.colorIndex++

    ;(element as HTMLElement).style.outline = `3px solid ${color}`
    ;(element as HTMLElement).style.outlineOffset = '-1px'

    const badge = this.createBadge(index, color, element, componentFinder)
    this.badges.set(element, badge)

    this.selectedElements.set(element, {
      color,
      originalOutline: (element as HTMLElement).style.outline,
      originalOutlineOffset: (element as HTMLElement).style.outlineOffset,
      index,
    })
  }

  deselectElement(element: Element): void {
    const elementData = this.selectedElements.get(element)
    if (elementData) {
      ;(element as HTMLElement).style.outline = ''
      ;(element as HTMLElement).style.outlineOffset = ''

      const badge = this.badges.get(element)
      if (badge) {
        badge.remove()
        this.badges.delete(element)
      }

      this.selectedElements.delete(element)
      this.reindexElements()
    }
  }

  clearAllSelections(): void {
    this.selectedElements.forEach((_, element) => {
      ;(element as HTMLElement).style.outline = ''
      ;(element as HTMLElement).style.outlineOffset = ''
    })

    this.badges.forEach(badge => badge.remove())
    this.badges.clear()

    this.selectedElements.clear()
    this.colorIndex = 0
  }

  hasElement(element: Element): boolean {
    return this.selectedElements.has(element)
  }

  getSelectedElements(): Map<Element, SelectedElementInfo> {
    return this.selectedElements
  }

  getSelectedCount(): number {
    return this.selectedElements.size
  }

  findSelectedParent(element: Element): Element | null {
    let currentElement = element.parentElement

    while (currentElement && currentElement !== document.body) {
      if (this.selectedElements.has(currentElement)) {
        return currentElement
      }
      currentElement = currentElement.parentElement
    }

    return null
  }

  findSelectedChildren(element: Element): Element[] {
    const children: Element[] = []

    this.selectedElements.forEach((_, selectedElement) => {
      if (element.contains(selectedElement) && selectedElement !== element) {
        children.push(selectedElement)
      }
    })

    return children
  }

  buildHierarchicalStructure(componentFinder?: (el: Element) => any): ElementData[] {
    const rootElements: Element[] = []

    this.selectedElements.forEach((_, element) => {
      if (!this.findSelectedParent(element)) {
        rootElements.push(element)
      }
    })

    const buildElementInfo = (element: Element): ElementData => {
      const data = this.selectedElements.get(element)!
      const children = this.findSelectedChildren(element)

      const componentData = componentFinder?.(element)

      const elementInfo: ElementData = {
        index: data.index,
        tagName: element.tagName,
        xpath: XPathUtils.generateXPath(element),
        textContent: element.textContent?.substring(0, 100) || '',
        attributes: Array.from(element.attributes).reduce((acc, attr) => {
          if (attr.name !== 'style') {
            acc[attr.name] = attr.value
          }
          return acc
        }, {} as Record<string, string>),
        children: [],
      }

      if (componentData) {
        elementInfo.componentData = componentData
      }

      const directChildren = children.filter(child =>
        this.findSelectedParent(child) === element,
      )

      directChildren.forEach((child) => {
        elementInfo.children.push(buildElementInfo(child))
      })

      return elementInfo
    }

    return rootElements.map(element => buildElementInfo(element))
  }

  private createBadge(
    index: number, 
    color: string, 
    element: Element,
    componentFinder?: (el: Element) => any
  ): HTMLElement {
    const badge = document.createElement('div')
    badge.classList.add('inspector-badge')

    const shadow = badge.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = `
      .badge {
        height: 20px;
        padding: 0 5px;
        background-color: ${color};
        color: white;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        pointer-events: none;
      }
    `

    const badgeContent = document.createElement('div')
    badgeContent.classList.add('badge', 'inspector-ignore')

    const component = componentFinder?.(element)
    if (component && component.componentLocation) {
      const componentPath = component.componentLocation.split('@')[0]
      const fileName = componentPath.split('/').pop()
      badgeContent.textContent = `(${index}) [${fileName}]`
    } else {
      badgeContent.textContent = `(${index}) ${element.tagName}`
    }

    shadow.appendChild(style)
    shadow.appendChild(badgeContent)

    const topMargin = -15
    const leftMargin = 7

    const rect = element.getBoundingClientRect()
    badge.style.position = 'fixed'
    badge.style.top = `${rect.top + topMargin}px`
    badge.style.left = `${rect.left + leftMargin}px`
    badge.style.zIndex = '999998'

    document.body.appendChild(badge)

    const updatePosition = () => {
      const rect = element.getBoundingClientRect()
      badge.style.top = `${rect.top + topMargin}px`
      badge.style.left = `${rect.left + leftMargin}px`
    }

    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    ;(badge as any)._cleanup = () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }

    return badge
  }

  private reindexElements(): void {
    let index = 1

    this.selectedElements.forEach((data, element) => {
      data.index = index

      const badge = this.badges.get(element)
      if (badge) {
        const badgeContent = badge.shadowRoot?.querySelector('.badge')
        if (badgeContent) {
          badgeContent.textContent = `(${index}) ${element.tagName}`
        }
      }

      index++
    })
  }
}