/**
 * Inspection Manager for mouse inspection mode handling
 */

export interface InspectionManager {
  enterInspectionMode(): void
  exitInspectionMode(): void
  isInInspectionMode(): boolean
  destroy(): void
}

export function createInspectionManager(
  onElementSelect?: (element: Element) => void,
  shouldIgnoreElement?: (element: Element) => boolean,
  isElementSelected?: (element: Element) => boolean
): InspectionManager {
  let isInspecting = false
  let currentHoveredElement: Element | null = null
  let inspectionStyleElement: HTMLStyleElement | null = null

  function addInspectionStyles(): void {
    inspectionStyleElement = document.createElement('style')
    inspectionStyleElement.id = 'annotator-toolbar-styles'
    inspectionStyleElement.textContent = `
      * {
        cursor: crosshair !important;
      }
    `
    document.head.appendChild(inspectionStyleElement)
  }

  function removeInspectionStyles(): void {
    if (inspectionStyleElement) {
      inspectionStyleElement.remove()
      inspectionStyleElement = null
    }
  }

  function removeHoverHighlight(): void {
    if (currentHoveredElement) {
      if (!isElementSelected?.(currentHoveredElement)) {
        ; (currentHoveredElement as HTMLElement).style.outline = ''
          ; (currentHoveredElement as HTMLElement).style.outlineOffset = ''
      }
      currentHoveredElement = null
    }
  }

  function handleMouseOver(e: Event): void {
    const target = e.target as Element
    if (shouldIgnoreElement?.(target)) return

    removeHoverHighlight()

    ;(target as HTMLElement).style.outline = '3px solid #3B82F6'
    ;(target as HTMLElement).style.outlineOffset = '-1px'
    currentHoveredElement = target
  }

  function handleMouseOut(e: Event): void {
    const target = e.target as Element
    if (shouldIgnoreElement?.(target)) return

    if (!isElementSelected?.(target)) {
      ;(target as HTMLElement).style.outline = ''
      ;(target as HTMLElement).style.outlineOffset = ''
    }
  }

  function handleElementClick(e: Event): void {
    const target = e.target as Element
    if (shouldIgnoreElement?.(target)) return

    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()

    onElementSelect?.(target)
  }

  function preventMouseEvents(e: Event): void {
    const target = e.target as Element
    if (shouldIgnoreElement?.(target)) return

    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
  }

  return {
    enterInspectionMode(): void {
      if (isInspecting) return

      isInspecting = true
      addInspectionStyles()

      document.addEventListener('mouseover', handleMouseOver, true)
      document.addEventListener('mouseout', handleMouseOut, true)
      document.addEventListener('click', handleElementClick, true)
      document.addEventListener('mousedown', preventMouseEvents, true)
      document.addEventListener('mouseup', preventMouseEvents, true)
      document.addEventListener('dblclick', preventMouseEvents, true)
      document.addEventListener('contextmenu', preventMouseEvents, true)
    },

    exitInspectionMode(): void {
      if (!isInspecting) return

      isInspecting = false
      removeInspectionStyles()

      document.removeEventListener('mouseover', handleMouseOver, true)
      document.removeEventListener('mouseout', handleMouseOut, true)
      document.removeEventListener('click', handleElementClick, true)
      document.removeEventListener('mousedown', preventMouseEvents, true)
      document.removeEventListener('mouseup', preventMouseEvents, true)
      document.removeEventListener('dblclick', preventMouseEvents, true)
      document.removeEventListener('contextmenu', preventMouseEvents, true)

      removeHoverHighlight()
    },

    isInInspectionMode(): boolean {
      return isInspecting
    },

    destroy(): void {
      if (isInspecting) {
        isInspecting = false
        removeInspectionStyles()

        document.removeEventListener('mouseover', handleMouseOver, true)
        document.removeEventListener('mouseout', handleMouseOut, true)
        document.removeEventListener('click', handleElementClick, true)
        document.removeEventListener('mousedown', preventMouseEvents, true)
        document.removeEventListener('mouseup', preventMouseEvents, true)
        document.removeEventListener('dblclick', preventMouseEvents, true)
        document.removeEventListener('contextmenu', preventMouseEvents, true)

        removeHoverHighlight()
      }
    }
  }
}