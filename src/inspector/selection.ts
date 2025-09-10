/**
 * Element Selection Manager for element selection, highlighting, and badge management
 */

import type { ElementData } from '../shared/types'
import { XPathUtils } from '../utils/xpath'

export interface SelectedElementInfo {
  color: string
  originalOutline: string
  originalOutlineOffset: string
  index: number
}

export interface ElementSelectionManager {
  selectElement(element: Element, componentFinder?: (el: Element) => any): void
  deselectElement(element: Element): void
  clearAllSelections(): void
  hasElement(element: Element): boolean
  getSelectedElements(): Map<Element, SelectedElementInfo>
  getSelectedCount(): number
  findSelectedParent(element: Element): Element | null
  findSelectedChildren(element: Element): Element[]
  buildHierarchicalStructure(componentFinder?: (el: Element) => any, imagePaths?: Map<Element, string>): ElementData[]
}

export function createElementSelectionManager(): ElementSelectionManager {
  const selectedElements = new Map<Element, SelectedElementInfo>()
  const badges = new Map<Element, HTMLElement>()
  let colorIndex = 0
  const colors = [
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

  function createBadge(
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

  function reindexElements(): void {
    let index = 1

    selectedElements.forEach((data, element) => {
      data.index = index

      const badge = badges.get(element)
      if (badge) {
        const badgeContent = badge.shadowRoot?.querySelector('.badge')
        if (badgeContent) {
          badgeContent.textContent = `(${index}) ${element.tagName}`
        }
      }

      index++
    })
  }

  function findSelectedParent(element: Element): Element | null {
    let currentElement = element.parentElement

    while (currentElement && currentElement !== document.body) {
      if (selectedElements.has(currentElement)) {
        return currentElement
      }
      currentElement = currentElement.parentElement
    }

    return null
  }

  function findSelectedChildren(element: Element): Element[] {
    const children: Element[] = []

    selectedElements.forEach((_, selectedElement) => {
      if (element.contains(selectedElement) && selectedElement !== element) {
        children.push(selectedElement)
      }
    })

    return children
  }

  return {
    selectElement(element: Element, componentFinder?: (el: Element) => any): void {
      const color = colors[colorIndex % colors.length]
      const index = selectedElements.size + 1
      colorIndex++

        ; (element as HTMLElement).style.outline = `3px solid ${color}`
        ; (element as HTMLElement).style.outlineOffset = '-1px'

      const badge = createBadge(index, color, element, componentFinder)
      badges.set(element, badge)

      selectedElements.set(element, {
        color,
        originalOutline: (element as HTMLElement).style.outline,
        originalOutlineOffset: (element as HTMLElement).style.outlineOffset,
        index,
      })
    },

    deselectElement(element: Element): void {
      const elementData = selectedElements.get(element)
      if (elementData) {
        ; (element as HTMLElement).style.outline = ''
          ; (element as HTMLElement).style.outlineOffset = ''

        const badge = badges.get(element)
        if (badge) {
          badge.remove()
          badges.delete(element)
        }

        selectedElements.delete(element)
        reindexElements()
      }
    },

    clearAllSelections(): void {
      selectedElements.forEach((_, element) => {
        ; (element as HTMLElement).style.outline = ''
          ; (element as HTMLElement).style.outlineOffset = ''
      })

      badges.forEach(badge => badge.remove())
      badges.clear()

      selectedElements.clear()
      colorIndex = 0
    },

    hasElement(element: Element): boolean {
      return selectedElements.has(element)
    },

    getSelectedElements(): Map<Element, SelectedElementInfo> {
      return selectedElements
    },

    getSelectedCount(): number {
      return selectedElements.size
    },

    findSelectedParent,

    findSelectedChildren,

    buildHierarchicalStructure(componentFinder?: (el: Element) => any, imagePaths?: Map<Element, string>): ElementData[] {
      const rootElements: Element[] = []

      selectedElements.forEach((_, element) => {
        if (!findSelectedParent(element)) {
          rootElements.push(element)
        }
      })

      const buildElementInfo = (element: Element): ElementData => {
        const data = selectedElements.get(element)!
        const children = findSelectedChildren(element)

        const componentData = componentFinder?.(element)

        const elementInfo: ElementData = {
          index: data.index,
          tagName: element.tagName,
          xpath: XPathUtils.generateXPath(element),
          cssSelector: XPathUtils.generateEnhancedCSSSelector(element),
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
          findSelectedParent(child) === element,
        )

        directChildren.forEach((child) => {
          elementInfo.children.push(buildElementInfo(child))
        })

        return elementInfo
      }

      return rootElements.map(element => buildElementInfo(element))
    }
  }
}