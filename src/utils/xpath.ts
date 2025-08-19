/**
 * Enhanced XPath and CSS selector utilities for browser environment
 */

export interface ElementSelector {
  xpath: string
  cssSelector: string
  uniqueId?: string
  position?: {
    index: number
    total: number
  }
}

export class XPathUtils {
  static generateXPath(element: Element): string {
    if (!element) return ''
    if (element === document.body) return '//body'
    if (element === document.documentElement) return '/html'

    const steps: string[] = []
    let contextNode: Element | null = element

    while (contextNode) {
      const step = this.getXPathStep(contextNode, contextNode === element)
      if (!step.value) break

      steps.push(step.value)
      if (step.optimized) break

      const parent = contextNode.parentNode
      if (!parent || parent.nodeType === Node.DOCUMENT_NODE) break

      contextNode = parent as Element
    }

    steps.reverse()
    return (steps.length && steps[0].includes('@id') ? '' : '/') + steps.join('/')
  }

  private static getXPathStep(node: Element, isTargetNode: boolean): { value: string; optimized: boolean } {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return { value: '', optimized: false }
    }

    const id = node.getAttribute('id')
    if (id && this.isValidId(id)) {
      if (document.querySelectorAll(`#${CSS.escape(id)}`).length === 1) {
        return {
          value: `//*[@id="${id}"]`,
          optimized: true,
        }
      }
    }

    const nodeName = node.nodeName.toLowerCase()

    if (nodeName === 'body' || nodeName === 'head' || nodeName === 'html') {
      return {
        value: nodeName,
        optimized: true,
      }
    }

    const ownIndex = this.getXPathIndex(node)
    if (ownIndex === -1) {
      return { value: '', optimized: false }
    }

    let ownValue = nodeName

    if (isTargetNode && nodeName === 'input' && node.getAttribute('type') && !id && !node.getAttribute('class')) {
      ownValue += `[@type="${node.getAttribute('type')}"]`
    }

    if (ownIndex > 0) {
      ownValue += `[${ownIndex + 1}]`
    }

    return {
      value: ownValue,
      optimized: false,
    }
  }

  private static getXPathIndex(node: Element): number {
    const siblings = node.parentNode?.children
    if (!siblings) return 0

    const areNodesSimilar = (left: Element, right: Element) => {
      if (left === right) return true
      return left.nodeName.toLowerCase() === right.nodeName.toLowerCase()
    }

    let hasSameNamedElements = false
    for (let i = 0; i < siblings.length; ++i) {
      if (areNodesSimilar(node, siblings[i] as Element) && siblings[i] !== node) {
        hasSameNamedElements = true
        break
      }
    }

    if (!hasSameNamedElements) return 0

    let ownIndex = 0
    for (let i = 0; i < siblings.length; ++i) {
      if (areNodesSimilar(node, siblings[i] as Element)) {
        if (siblings[i] === node) {
          return ownIndex
        }
        ++ownIndex
      }
    }

    return -1
  }

  private static isValidId(id: string): boolean {
    return Boolean(id) && /^\S.*$/.test(id) && !/[[\](){}<>]/.test(id)
  }

  /**
   * Generate optimized CSS selector using optimal-select library
   */
  static generateOptimalSelector(element: Element): string {
    return this.generateEnhancedCSSSelector(element)
  }

  /**
   * Generate enhanced CSS selector optimized for browser environment
   */
  static generateEnhancedCSSSelector(element: Element): string {
    const parts: string[] = []
    let currentElement: Element | null = element

    while (currentElement && currentElement !== document.body) {
      let selector = currentElement.tagName.toLowerCase()

      // Add ID if available and unique
      if (currentElement.id && this.isUniqueId(currentElement.id)) {
        selector += `#${currentElement.id}`
        parts.unshift(selector)
        break
      }

      // Add meaningful classes
      if (currentElement.className && typeof currentElement.className === 'string') {
        const classes = currentElement.className.split(' ')
          .filter(c => c && !c.includes('css-') && !c.includes('emotion-'))
          .slice(0, 2) // Limit to avoid overly specific selectors

        if (classes.length > 0) {
          selector += '.' + classes.join('.')
        }
      }

      // Add nth-child if needed for uniqueness
      const siblings = Array.from(currentElement.parentElement?.children || [])
        .filter(sibling => sibling.tagName === currentElement!.tagName)

      if (siblings.length > 1) {
        const index = siblings.indexOf(currentElement) + 1
        selector += `:nth-child(${index})`
      }

      parts.unshift(selector)
      currentElement = currentElement.parentElement
    }

    return parts.join(' > ')
  }

  /**
   * Validate XPath by testing if it uniquely identifies the element
   */
  static validateXPath(xpath: string, targetElement: Element): boolean {
    try {
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      )

      return result.singleNodeValue === targetElement
    } catch (error) {
      console.warn('XPath validation failed:', error)
      return false
    }
  }

  /**
   * Validate CSS selector by testing if it uniquely identifies the element
   */
  static validateCSSSelector(selector: string, targetElement: Element): boolean {
    try {
      const elements = document.querySelectorAll(selector)
      return elements.length === 1 && elements[0] === targetElement
    } catch (error) {
      console.warn('CSS selector validation failed:', error)
      return false
    }
  }

  /**
   * Find element using XPath
   */
  static findElementByXPath(xpath: string): Element | null {
    try {
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      )

      return result.singleNodeValue as Element
    } catch (error) {
      console.warn('Failed to find element by XPath:', error)
      return null
    }
  }

  /**
   * Generate comprehensive selector information for an element
   */
  static generateElementSelector(element: Element): ElementSelector {
    const xpath = this.generateXPath(element)
    const cssSelector = this.generateOptimalSelector(element)

    // Get position information
    const siblings = Array.from(element.parentElement?.children || [])
      .filter(sibling => sibling.tagName === element.tagName)

    const position = siblings.length > 1 ? {
      index: siblings.indexOf(element) + 1,
      total: siblings.length
    } : undefined

    const selector: ElementSelector = {
      xpath,
      cssSelector,
      position
    }

    // Add unique ID if available
    if (element.id && this.isUniqueId(element.id)) {
      selector.uniqueId = element.id
    }

    return selector
  }

  /**
   * Check if an ID is unique in the document
   */
  private static isUniqueId(id: string): boolean {
    try {
      return document.querySelectorAll(`#${CSS.escape(id)}`).length === 1
    } catch (error) {
      return false
    }
  }

  /**
   * Generate multiple selector strategies for robust element identification
   */
  static generateRobustSelectors(element: Element): {
    primary: ElementSelector
    fallbacks: string[]
    confidence: 'high' | 'medium' | 'low'
  } {
    const primary = this.generateElementSelector(element)
    const fallbacks: string[] = []

    // Add fallback strategies
    if (element.id && this.isUniqueId(element.id)) {
      fallbacks.push(`#${element.id}`)
    }

    // Add attribute-based selectors
    if (element.getAttribute('data-testid')) {
      fallbacks.push(`[data-testid="${element.getAttribute('data-testid')}"]`)
    }

    if (element.getAttribute('aria-label')) {
      fallbacks.push(`[aria-label="${element.getAttribute('aria-label')}"]`)
    }

    // Add text-based selector if element has unique text
    const textContent = element.textContent?.trim()
    if (textContent && textContent.length > 0 && textContent.length < 50) {
      const elementsWithSameText = Array.from(document.querySelectorAll('*'))
        .filter(el => el.textContent?.trim() === textContent)

      if (elementsWithSameText.length === 1) {
        fallbacks.push(`${element.tagName.toLowerCase()}:contains("${textContent}")`)
      }
    }

    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low' = 'low'

    if (this.validateXPath(primary.xpath, element) && this.validateCSSSelector(primary.cssSelector, element)) {
      confidence = 'high'
    } else if (fallbacks.length > 0) {
      confidence = 'medium'
    }

    return {
      primary,
      fallbacks,
      confidence
    }
  }
}