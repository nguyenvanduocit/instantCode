/**
 * XPath generation utilities for element selection
 */

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
}