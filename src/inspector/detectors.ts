/**
 * Framework component detection and file location extraction
 */

import { createLogger } from './logger'
import { sourceMapResolver, extractLocationFromStackTrace } from '../utils/sourcemap'
import { XPathUtils, ElementSelector } from '../utils/xpath'

export interface ComponentInfo {
  componentLocation: string
  componentName?: string
  // Enhanced element-specific location data
  elementLocation?: {
    file: string
    line: number
    column: number
    endLine?: number
    endColumn?: number
    source?: string // The actual source code of this element
  }
  // Framework-specific metadata
  framework?: 'vue' | 'react' | 'angular' | 'svelte' | 'vanilla'
  // Source map data for precise mapping
  sourceMap?: {
    originalLine: number
    originalColumn: number
    originalSource: string
    originalName?: string
  }
  // Element hierarchy in source (e.g., "Button > .content > span")
  sourceHierarchy?: string
  // Enhanced selector information for robust element identification
  selectors?: {
    primary: ElementSelector
    fallbacks: string[]
    confidence: 'high' | 'medium' | 'low'
  }
}

/**
 * Find the nearest component in the DOM tree
 */
export function findNearestComponent(element: Element, verbose = false): ComponentInfo | null {
  if (!element || element === document.body) return null

  const logger = createLogger(verbose)

  try {
    // Try Vue detection first (works for Vue 2 and Vue 3)
    let componentInfo = getVueComponentInfo(element)
    
    // Debug logging
    if (componentInfo) {
      logger.log('🟢 Vue component found:', componentInfo)
    } else {
      logger.log('🔍 No Vue component found for element:', element.tagName, 'Checking properties:', {
        __vnode: !!(element as any).__vnode,
        __vueParentComponent: !!(element as any).__vueParentComponent,
        __vue__: !!(element as any).__vue__,
        __v_inspector: !!(element as any).__v_inspector
      })
    }
    
    // If Vue detection fails, try React detection
    if (!componentInfo) {
      componentInfo = getReactComponentInfo(element)
      if (componentInfo) {
        logger.log('🔵 React component found:', componentInfo)
      }
    }

    // If React detection fails, try vanilla component attributes
    if (!componentInfo) {
      componentInfo = getVanillaComponentInfo(element)
      if (componentInfo) {
        logger.log('🟡 Vanilla component found:', componentInfo)
      }
    }

    if (componentInfo) {
      // Enhance with selector information
      try {
        const selectorInfo = XPathUtils.generateRobustSelectors(element)
        componentInfo.selectors = selectorInfo
        
        if (verbose) {
          logger.log('🎯 Generated selectors:', {
            xpath: selectorInfo.primary.xpath,
            css: selectorInfo.primary.cssSelector,
            confidence: selectorInfo.confidence,
            fallbacks: selectorInfo.fallbacks.length
          })
        }
      } catch (error) {
        if (verbose) {
          logger.warn('Failed to generate selectors:', error)
        }
      }
      
      return componentInfo
    }

    return findNearestComponent(element.parentElement!, verbose)
  } catch (e) {
    logger.error('Error finding nearest component:', e)
    return null
  }
}

/**
 * Extract React component information from DOM elements
 */
function getReactComponentInfo(element: Element): ComponentInfo | null {
  if (!element) return null

  const elementAny = element as any

  // Try different React fiber properties
  const fiberKey = Object.keys(elementAny).find(key => 
    key.startsWith('__reactFiber') || 
    key.startsWith('__reactInternalInstance') ||
    key.startsWith('_reactInternalFiber')
  )

  if (!fiberKey) {
    return null
  }

  const fiber = elementAny[fiberKey]
  if (!fiber) {
    return null
  }

  try {
    const componentInfo = extractReactComponentInfo(fiber, element)
    return componentInfo
  } catch (error) {
    console.warn('Failed to extract React component info:', error)
    return null
  }
}

/**
 * Extract component information from React fiber
 */
function extractReactComponentInfo(fiber: any, element: Element): ComponentInfo | null {
  if (!fiber) return null

  let currentFiber = fiber
  let componentName = ''
  let componentFile = ''

  // Walk up the fiber tree to find component information
  while (currentFiber) {
    // Look for component name
    if (currentFiber.type && typeof currentFiber.type === 'function') {
      componentName = currentFiber.type.name || currentFiber.type.displayName || 'Anonymous'
      
      // Try to get file location from React DevTools source mapping
      if (currentFiber.type.__source) {
        componentFile = currentFiber.type.__source.fileName || ''
      }
      
      break
    }
    
    // Also check for component classes
    if (currentFiber.type && currentFiber.type.prototype && currentFiber.type.prototype.render) {
      componentName = currentFiber.type.name || 'Component'
      break
    }

    currentFiber = currentFiber.return || currentFiber._debugOwner
  }

  if (!componentName && !componentFile) {
    return null
  }

  const componentInfo: ComponentInfo = {
    componentLocation: componentFile ? `${componentFile}@${componentName}` : componentName,
    componentName,
    framework: 'react'
  }

  // Try to extract element-specific location information
  const elementLocationInfo = extractReactElementLocation(fiber, element)
  if (elementLocationInfo) {
    Object.assign(componentInfo, elementLocationInfo)
  }

  return componentInfo
}

/**
 * Extract element-specific location data from React fiber
 */
function extractReactElementLocation(fiber: any, element: Element): Partial<ComponentInfo> | null {
  try {
    const locationInfo: Partial<ComponentInfo> = {}

    // Try to get element-specific location from React source mapping
    if (fiber._debugSource) {
      locationInfo.elementLocation = {
        file: fiber._debugSource.fileName || '',
        line: fiber._debugSource.lineNumber || 0,
        column: fiber._debugSource.columnNumber || 0
      }
    }

    // Build source hierarchy from React component tree
    const hierarchy = buildReactSourceHierarchy(fiber, element)
    if (hierarchy) {
      locationInfo.sourceHierarchy = hierarchy
    }

    // Look for source map information in React DevTools
    const sourceMapInfo = extractReactSourceMap(fiber)
    if (sourceMapInfo) {
      locationInfo.sourceMap = sourceMapInfo
    }

    return Object.keys(locationInfo).length > 0 ? locationInfo : null
  } catch (error) {
    console.warn('Failed to extract React element location:', error)
    return null
  }
}

/**
 * Build source hierarchy from React component tree
 */
function buildReactSourceHierarchy(fiber: any, element: Element): string | null {
  try {
    const parts: string[] = []
    let currentFiber = fiber

    // Walk up the fiber tree to build hierarchy
    while (currentFiber && parts.length < 3) { // Limit depth to avoid noise
      if (currentFiber.type && typeof currentFiber.type === 'function') {
        const name = currentFiber.type.name || currentFiber.type.displayName
        if (name && name !== 'Fragment') {
          parts.unshift(name)
        }
      } else if (currentFiber.type && typeof currentFiber.type === 'string') {
        // DOM element
        parts.push(currentFiber.type)
      }

      currentFiber = currentFiber.return
    }

    // Add element classes if meaningful
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ')
        .filter(c => c && !c.includes('css-') && !c.includes('emotion-'))
        .slice(0, 2) // Limit to avoid noise
      
      if (classes.length > 0) {
        parts.push('.' + classes.join('.'))
      }
    }

    return parts.length > 0 ? parts.join(' > ') : null
  } catch (error) {
    return null
  }
}

/**
 * Extract source map information from React fiber
 */
function extractReactSourceMap(fiber: any): ComponentInfo['sourceMap'] | null {
  try {
    // Look for source map data in React DevTools
    if (fiber._debugSource) {
      return {
        originalLine: fiber._debugSource.lineNumber || 0,
        originalColumn: fiber._debugSource.columnNumber || 0,
        originalSource: fiber._debugSource.fileName || '',
        originalName: fiber.type?.name || fiber.type?.displayName
      }
    }
    
    return null
  } catch (error) {
    return null
  }
}

function getVanillaComponentInfo(element: Element): ComponentInfo | null {
  const componentName = element.getAttribute('data-component-name')
  const componentFile = element.getAttribute('data-component-file')

  if (!componentName && !componentFile) {
    return null
  }

  return {
    componentLocation: `${componentFile}@${componentName}`,
    framework: 'vanilla'
  }
}

/**
 * Enhanced component detection with source map support
 */
export async function findNearestComponentWithSourceMaps(
  element: Element, 
  verbose = false
): Promise<ComponentInfo | null> {
  // First try the regular detection
  const basicInfo = findNearestComponent(element, verbose)
  if (!basicInfo) return null

  // If we have basic component info, try to enhance it with source maps
  try {
    const enhancedInfo = await enhanceWithSourceMaps(basicInfo, element)
    const finalInfo = enhancedInfo || basicInfo
    
    // Ensure selectors are included (they might not be if this was called directly)
    if (!finalInfo.selectors) {
      try {
        const selectorInfo = XPathUtils.generateRobustSelectors(element)
        finalInfo.selectors = selectorInfo
      } catch (error) {
        if (verbose) {
          console.warn('Failed to generate selectors for enhanced component info:', error)
        }
      }
    }
    
    return finalInfo
  } catch (error) {
    if (verbose) {
      console.warn('Failed to enhance component info with source maps:', error)
    }
    return basicInfo
  }
}

/**
 * Enhance component info with source map data
 */
async function enhanceWithSourceMaps(
  componentInfo: ComponentInfo, 
  _element: Element
): Promise<ComponentInfo | null> {
  try {
    // Try to extract file location from component location
    const locationParts = componentInfo.componentLocation.split('@')
    if (locationParts.length < 2) return null

    const filePath = locationParts[0]
    
    // Try different approaches to get source location
    let sourceLocation = null

    // 1. Try to use element position heuristics (future enhancement)
    // const elementRect = element.getBoundingClientRect()
    // const elementId = element.id || element.className || element.tagName

    // 2. Try to create a synthetic error to get stack trace location
    try {
      throw new Error('Location detection')
    } catch (error) {
      const stackLocation = extractLocationFromStackTrace(error as Error)
      if (stackLocation && stackLocation.file.includes(filePath)) {
        sourceLocation = stackLocation
      }
    }

    // 3. If we have a file path, try to resolve it with source maps
    if (sourceLocation || filePath) {
      const fileUrl = sourceLocation?.file || filePath
      const line = sourceLocation?.line || 1
      const column = sourceLocation?.column || 1

      const enhancedLocation = await sourceMapResolver.getEnhancedLocationInfo(
        fileUrl, 
        line, 
        column
      )

      if (enhancedLocation) {
        return {
          ...componentInfo,
          elementLocation: {
            file: enhancedLocation.file,
            line: enhancedLocation.line,
            column: enhancedLocation.column,
            source: enhancedLocation.sourcesContent?.[0]?.slice(0, 200)
          },
          sourceMap: {
            originalLine: enhancedLocation.line,
            originalColumn: enhancedLocation.column,
            originalSource: enhancedLocation.originalSource || enhancedLocation.file
          }
        }
      }
    }

    return null
  } catch (error) {
    console.warn('Failed to enhance with source maps:', error)
    return null
  }
}

/**
 * Attempt to extract precise element location using browser DevTools APIs
 */
export function extractPreciseElementLocation(element: Element): ComponentInfo['elementLocation'] | null {
  try {
    // This is a placeholder for more advanced techniques that might work
    // in development environments with proper tooling

    // 1. Check for data attributes that might contain location info
    const locationAttr = element.getAttribute('data-source-location')
    if (locationAttr) {
      const parts = locationAttr.split(':')
      if (parts.length >= 3) {
        return {
          file: parts[0],
          line: parseInt(parts[1], 10),
          column: parseInt(parts[2], 10)
        }
      }
    }

    // 2. Check for webpack HMR location data
    const hmrData = (element as any).__hmr_location
    if (hmrData) {
      return {
        file: hmrData.filename || '',
        line: hmrData.line || 0,
        column: hmrData.column || 0
      }
    }

    // 3. Check for Vite HMR data
    const viteData = (element as any).__vite_hmr
    if (viteData && viteData.source) {
      return {
        file: viteData.source.file || '',
        line: viteData.source.line || 0,
        column: viteData.source.column || 0,
        source: viteData.source.content
      }
    }

    return null
  } catch (error) {
    return null
  }
}

function getVueComponentInfo(element: Element): ComponentInfo | null {
  if (!element) return null

  const elementAny = element as any

  // Try multiple Vue property paths for different Vue versions and configurations
  
  // Vue 3 with __v_inspector in props
  let codeLocation = elementAny.__vnode?.props?.__v_inspector
  let vueInstance = null
  let vnode = null
  
  // Vue 3 with parent component
  if (!codeLocation) {
    codeLocation = elementAny.__vueParentComponent?.vnode?.props?.__v_inspector
    vueInstance = elementAny.__vueParentComponent
    vnode = elementAny.__vueParentComponent?.vnode
  }
  
  // Direct __v_inspector on element
  if (!codeLocation) {
    codeLocation = elementAny.__v_inspector
  }
  
  // Vue component instance with __v_inspector
  if (!codeLocation) {
    vueInstance = elementAny.__vue__ || elementAny.__vueParentComponent
    if (vueInstance) {
      codeLocation = vueInstance.__v_inspector ||
                    vueInstance.$options?.__v_inspector ||
                    vueInstance.type?.__v_inspector
    }
  }
  
  // Check vnode directly
  if (!codeLocation && !vnode) {
    vnode = elementAny.__vnode || elementAny.$vnode
    if (vnode) {
      codeLocation = vnode.__v_inspector ||
                    vnode.props?.__v_inspector ||
                    vnode.componentOptions?.__v_inspector
    }
  }

  if (!codeLocation) {
    return null
  }

  const componentInfo: ComponentInfo = {
    componentLocation: codeLocation,
    framework: 'vue'
  }

  // Try to extract element-specific location information
  const elementLocationInfo = extractVueElementLocation(element, vnode, vueInstance)
  if (elementLocationInfo) {
    Object.assign(componentInfo, elementLocationInfo)
  }

  return componentInfo
}

/**
 * Extract element-specific location data from Vue internals
 */
function extractVueElementLocation(element: Element, vnode: any, _vueInstance: any): Partial<ComponentInfo> | null {
  try {
    const locationInfo: Partial<ComponentInfo> = {}

    // Try to get element-specific location from Vue devtools data
    if (vnode?.loc) {
      locationInfo.elementLocation = {
        file: vnode.loc.source || '',
        line: vnode.loc.start?.line || 0,
        column: vnode.loc.start?.column || 0,
        endLine: vnode.loc.end?.line,
        endColumn: vnode.loc.end?.column,
        source: vnode.loc.source?.slice(vnode.loc.start?.offset, vnode.loc.end?.offset)
      }
    }

    // Try to extract source hierarchy from Vue component tree
    if (vnode?.type?.name || element.tagName) {
      const hierarchy = buildVueSourceHierarchy(element, vnode)
      if (hierarchy) {
        locationInfo.sourceHierarchy = hierarchy
      }
    }

    // Look for source map information
    const sourceMapInfo = extractVueSourceMap(vnode, _vueInstance)
    if (sourceMapInfo) {
      locationInfo.sourceMap = sourceMapInfo
    }

    return Object.keys(locationInfo).length > 0 ? locationInfo : null
  } catch (error) {
    console.warn('Failed to extract Vue element location:', error)
    return null
  }
}

/**
 * Build source hierarchy from Vue component tree
 */
function buildVueSourceHierarchy(element: Element, vnode: any): string | null {
  try {
    const parts: string[] = []
    
    // Add component name if available
    if (vnode?.type?.name) {
      parts.push(vnode.type.name)
    }
    
    // Add element tag or component tag
    if (element.tagName && element.tagName.toLowerCase() !== 'div') {
      parts.push(element.tagName.toLowerCase())
    }
    
    // Add class hierarchy if meaningful
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ')
        .filter(c => c && !c.startsWith('v-') && !c.includes('transition'))
        .slice(0, 2) // Limit to avoid noise
      
      if (classes.length > 0) {
        parts.push('.' + classes.join('.'))
      }
    }

    return parts.length > 0 ? parts.join(' > ') : null
  } catch (error) {
    return null
  }
}

/**
 * Extract source map information from Vue internals
 */
function extractVueSourceMap(vnode: any, _vueInstance: any): ComponentInfo['sourceMap'] | null {
  try {
    // Look for source map data in Vue internals
    // This is framework-specific and may vary by Vue version
    if (vnode?.__source) {
      return {
        originalLine: vnode.__source.line || 0,
        originalColumn: vnode.__source.column || 0,
        originalSource: vnode.__source.file || '',
        originalName: vnode.__source.name
      }
    }
    
    return null
  } catch (error) {
    return null
  }
}

/**
 * Enhanced element identification with comprehensive fallback strategies
 * This provides multiple ways to identify and re-locate an element
 */
export function generateComprehensiveElementIdentification(element: Element, verbose = false): {
  component: ComponentInfo | null
  identification: {
    // Primary identification strategies
    primary: {
      xpath: string
      cssSelector: string
      confidence: 'high' | 'medium' | 'low'
    }
    // Fallback strategies for robust element re-identification
    fallbacks: {
      attributes: Record<string, string>
      dataAttributes: Record<string, string>
      textContent?: string
      position: {
        tagName: string
        siblingIndex: number
        totalSiblings: number
        parentPath: string
      }
      uniqueFeatures: string[]
    }
    // Framework-specific identification
    frameworkSpecific?: {
      react?: {
        fiberKey?: string
        componentStack?: string[]
      }
      vue?: {
        instancePath?: string
        directiveKeys?: string[]
      }
    }
  }
} {
  const logger = createLogger(verbose)
  
  // Get component information
  const component = findNearestComponent(element, verbose)
  
  // Generate comprehensive identification
  const selectors = XPathUtils.generateRobustSelectors(element)
  
  // Extract all meaningful attributes
  const attributes: Record<string, string> = {}
  const dataAttributes: Record<string, string> = {}
  
  for (const attr of element.attributes) {
    if (attr.name.startsWith('data-')) {
      dataAttributes[attr.name] = attr.value
    } else if (!attr.name.startsWith('class') && !attr.name.startsWith('style')) {
      attributes[attr.name] = attr.value
    }
  }
  
  // Get position information
  const siblings = Array.from(element.parentElement?.children || [])
  const tagSiblings = siblings.filter(sibling => sibling.tagName === element.tagName)
  
  // Build parent path for context
  const parentPath = (() => {
    const path: string[] = []
    let current = element.parentElement
    let depth = 0
    
    while (current && current !== document.body && depth < 5) {
      let pathPart = current.tagName.toLowerCase()
      if (current.id) pathPart += `#${current.id}`
      else if (current.className) {
        const classes = current.className.toString().split(' ')
          .filter(c => c && !c.includes('css-') && !c.includes('emotion-'))
          .slice(0, 2)
        if (classes.length) pathPart += `.${classes.join('.')}`
      }
      path.unshift(pathPart)
      current = current.parentElement
      depth++
    }
    
    return path.join(' > ')
  })()
  
  // Identify unique features
  const uniqueFeatures: string[] = []
  
  if (element.id && XPathUtils.validateCSSSelector(`#${element.id}`, element)) {
    uniqueFeatures.push(`unique-id:${element.id}`)
  }
  
  if (dataAttributes['data-testid']) {
    uniqueFeatures.push(`test-id:${dataAttributes['data-testid']}`)
  }
  
  if (attributes['aria-label']) {
    uniqueFeatures.push(`aria-label:${attributes['aria-label']}`)
  }
  
  const textContent = element.textContent?.trim()
  if (textContent && textContent.length > 0 && textContent.length < 100) {
    const sameTextElements = document.querySelectorAll('*')
    const matchingElements = Array.from(sameTextElements).filter(el => 
      el.textContent?.trim() === textContent
    )
    if (matchingElements.length === 1) {
      uniqueFeatures.push(`unique-text:${textContent.slice(0, 50)}`)
    }
  }
  
  // Framework-specific identification
  const frameworkSpecific: any = {}
  
  if (component?.framework === 'react') {
    const elementAny = element as any
    const fiberKey = Object.keys(elementAny).find(key => 
      key.startsWith('__reactFiber') || 
      key.startsWith('__reactInternalInstance')
    )
    
    if (fiberKey) {
      frameworkSpecific.react = { fiberKey }
      
      // Try to build component stack
      try {
        const fiber = elementAny[fiberKey]
        const componentStack: string[] = []
        let currentFiber = fiber
        
        while (currentFiber && componentStack.length < 5) {
          if (currentFiber.type && typeof currentFiber.type === 'function') {
            const name = currentFiber.type.name || currentFiber.type.displayName
            if (name) componentStack.unshift(name)
          }
          currentFiber = currentFiber.return
        }
        
        if (componentStack.length > 0) {
          frameworkSpecific.react.componentStack = componentStack
        }
      } catch (error) {
        logger.warn('Failed to extract React component stack:', error)
      }
    }
  }
  
  if (component?.framework === 'vue') {
    const elementAny = element as any
    
    frameworkSpecific.vue = {}
    
    // Look for Vue directive keys
    const directiveKeys = Object.keys(elementAny).filter(key => 
      key.startsWith('__v') || key.startsWith('_v')
    )
    
    if (directiveKeys.length > 0) {
      frameworkSpecific.vue.directiveKeys = directiveKeys
    }
  }
  
  const result = {
    component,
    identification: {
      primary: {
        xpath: selectors.primary.xpath,
        cssSelector: selectors.primary.cssSelector,
        confidence: selectors.confidence
      },
      fallbacks: {
        attributes,
        dataAttributes,
        textContent: textContent || undefined,
        position: {
          tagName: element.tagName.toLowerCase(),
          siblingIndex: tagSiblings.indexOf(element) + 1,
          totalSiblings: tagSiblings.length,
          parentPath
        },
        uniqueFeatures
      },
      frameworkSpecific: Object.keys(frameworkSpecific).length > 0 ? frameworkSpecific : undefined
    }
  }
  
  if (verbose) {
    logger.log('🔍 Comprehensive element identification:', {
      hasComponent: !!component,
      confidence: selectors.confidence,
      uniqueFeatures: uniqueFeatures.length,
      fallbacks: selectors.fallbacks.length,
      framework: component?.framework
    })
  }
  
  return result
}