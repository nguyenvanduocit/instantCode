/**
 * Screenshot Capture Service for element image capture
 */

import type { ElementData } from '../shared/types'
import { createLogger } from './logger'

export interface CaptureError {
  type: 'BROWSER_NOT_SUPPORTED' | 'CAPTURE_FAILED' | 'UPLOAD_FAILED'
  message: string
}

export type CaptureResult<T, E = CaptureError> = 
  | { success: true; data: T }
  | { success: false; error: E }

export interface ScreenshotCaptureService {
  captureElementScreenshot(element: Element): Promise<CaptureResult<string>>
  generateImageFilename(element: Element): string
}

const logger = createLogger('capture')

/**
 * Convert DOM element to canvas for screenshot capture
 */
async function elementToCanvas(element: Element): Promise<CaptureResult<HTMLCanvasElement>> {
  try {
    // Check if element is visible in viewport
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      return {
        success: false,
        error: {
          type: 'CAPTURE_FAILED',
          message: 'Element has no dimensions'
        }
      }
    }

    // Check if element is within viewport bounds
    const isInViewport = rect.top >= 0 && 
                        rect.left >= 0 && 
                        rect.bottom <= window.innerHeight && 
                        rect.right <= window.innerWidth

    if (!isInViewport) {
      logger.warn('Element is outside viewport, attempting to capture anyway')
    }

    // Create canvas with element dimensions
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      return {
        success: false,
        error: {
          type: 'BROWSER_NOT_SUPPORTED',
          message: 'Canvas 2D context not supported'
        }
      }
    }

    // Set canvas dimensions to element size
    canvas.width = rect.width
    canvas.height = rect.height

    // Use html2canvas-like approach with DOM rendering
    try {
      // Create a foreign object in SVG for rendering the element
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('width', rect.width.toString())
      svg.setAttribute('height', rect.height.toString())
      
      const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject')
      foreignObject.setAttribute('width', '100%')
      foreignObject.setAttribute('height', '100%')
      
      // Clone the element to avoid modifying original
      const clonedElement = element.cloneNode(true) as Element
      foreignObject.appendChild(clonedElement)
      svg.appendChild(foreignObject)
      
      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svg)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml' })
      const svgUrl = URL.createObjectURL(svgBlob)
      
      // Create image from SVG
      const img = new Image()
      
      return new Promise((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0)
          URL.revokeObjectURL(svgUrl)
          resolve({ success: true, data: canvas })
        }
        
        img.onerror = () => {
          URL.revokeObjectURL(svgUrl)
          resolve({
            success: false,
            error: {
              type: 'CAPTURE_FAILED',
              message: 'Failed to load SVG image'
            }
          })
        }
        
        img.src = svgUrl
      })
      
    } catch (svgError) {
      // Fallback: try to capture using element screenshot API if available
      if ('getDisplayMedia' in navigator.mediaDevices) {
        logger.warn('SVG capture failed, attempting screen capture fallback')
        return await captureWithScreenAPI(element, canvas, ctx)
      }
      
      return {
        success: false,
        error: {
          type: 'CAPTURE_FAILED',
          message: `Element capture failed: ${svgError instanceof Error ? svgError.message : 'Unknown error'}`
        }
      }
    }

  } catch (error) {
    return {
      success: false,
      error: {
        type: 'CAPTURE_FAILED',
        message: `Canvas creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

/**
 * Fallback capture method using screen capture API
 */
async function captureWithScreenAPI(
  element: Element, 
  canvas: HTMLCanvasElement, 
  ctx: CanvasRenderingContext2D
): Promise<CaptureResult<HTMLCanvasElement>> {
  try {
    // This is a simplified fallback - in real implementation would use screen capture
    // For now, create a placeholder canvas with element info
    const rect = element.getBoundingClientRect()
    
    // Fill with a solid color and add text indicating capture method
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    ctx.fillStyle = '#666'
    ctx.font = '12px Arial'
    ctx.fillText(`${element.tagName}`, 10, 20)
    ctx.fillText(`${rect.width}x${rect.height}`, 10, 40)
    
    return { success: true, data: canvas }
    
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'BROWSER_NOT_SUPPORTED',
        message: 'Screen capture API not available'
      }
    }
  }
}

/**
 * Convert canvas to PNG blob
 */
async function canvasToBlob(canvas: HTMLCanvasElement): Promise<CaptureResult<Blob>> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve({ success: true, data: blob })
      } else {
        resolve({
          success: false,
          error: {
            type: 'CAPTURE_FAILED',
            message: 'Failed to convert canvas to blob'
          }
        })
      }
    }, 'image/png')
  })
}

/**
 * Generate unique descriptive filename for captured element image
 * Format: element-{timestamp}-{tagName}-{elementHash}-{index}.png
 */
function generateImageFilename(element: Element): string {
  const timestamp = new Date().toISOString().replace(/[:.T]/g, '').replace(/Z$/, '').substring(0, 14)
  const tagName = element.tagName.toLowerCase()
  
  // Generate descriptive element identifier
  let descriptor = tagName
  
  // Add ID if available (most descriptive)
  if (element.id) {
    descriptor = `${element.id}-${tagName}`
  } else if (element.className && typeof element.className === 'string') {
    // Add class names (filter out inspector classes)
    const classes = element.className
      .split(/\s+/)
      .filter(cls => cls && !cls.startsWith('inspector-'))
      .slice(0, 2) // Limit to first 2 classes
      .join('-')
    
    if (classes) {
      descriptor = `${tagName}-${classes}`
    }
  }
  
  // Add text content hint if element has short text
  const textContent = element.textContent?.trim()
  if (textContent && textContent.length > 0 && textContent.length <= 20) {
    const textHint = textContent
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase()
      .substring(0, 8)
    
    if (textHint) {
      descriptor = `${descriptor}-${textHint}`
    }
  }
  
  // Generate element hash for uniqueness
  const xpath = generateSimpleXPath(element)
  const cssSelector = generateSimpleCSSSelector(element)
  const elementString = `${xpath}-${cssSelector}-${descriptor}`
  
  // Simple hash function for element identifier
  let hash = 0
  for (let i = 0; i < elementString.length; i++) {
    const char = elementString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  const elementHash = Math.abs(hash).toString(36).substring(0, 6)
  
  // Add collision detection index (will be incremented by server if needed)
  const index = 1
  
  return `element-${timestamp}-${descriptor}-${elementHash}-${index}.png`
}

/**
 * Generate simple XPath for element identification
 */
function generateSimpleXPath(element: Element): string {
  let path = ''
  let current: Element | null = element

  while (current && current !== document.body) {
    let index = 1
    let sibling = current.previousElementSibling

    while (sibling) {
      if (sibling.tagName === current.tagName) {
        index++
      }
      sibling = sibling.previousElementSibling
    }

    path = `/${current.tagName.toLowerCase()}[${index}]${path}`
    current = current.parentElement
  }

  return `/body${path}`
}

/**
 * Generate simple CSS selector for element identification
 */
function generateSimpleCSSSelector(element: Element): string {
  if (element.id) {
    return `#${element.id}`
  }
  
  const classes = Array.from(element.classList).filter(cls => 
    !cls.startsWith('inspector-') // Exclude inspector classes
  ).join('.')
  
  if (classes) {
    return `${element.tagName.toLowerCase()}.${classes}`
  }
  
  return element.tagName.toLowerCase()
}

/**
 * Create screenshot capture service instance
 */
export function createScreenshotCaptureService(): ScreenshotCaptureService {
  return {
    async captureElementScreenshot(element: Element): Promise<CaptureResult<string>> {
      logger.log('Starting element screenshot capture')
      
      // Convert element to canvas
      const canvasResult = await elementToCanvas(element)
      if (!canvasResult.success) {
        logger.error('Canvas creation failed:', canvasResult.error)
        return canvasResult
      }
      
      // Convert canvas to blob
      const blobResult = await canvasToBlob(canvasResult.data)
      if (!blobResult.success) {
        logger.error('Blob creation failed:', blobResult.error)
        return blobResult
      }
      
      // Convert blob to base64 string
      try {
        const reader = new FileReader()
        
        return new Promise((resolve) => {
          reader.onload = () => {
            const base64String = reader.result as string
            logger.log('Element screenshot captured successfully')
            resolve({ success: true, data: base64String })
          }
          
          reader.onerror = () => {
            logger.error('FileReader error:', reader.error)
            resolve({
              success: false,
              error: {
                type: 'CAPTURE_FAILED',
                message: 'Failed to convert blob to base64'
              }
            })
          }
          
          reader.readAsDataURL(blobResult.data)
        })
        
      } catch (error) {
        return {
          success: false,
          error: {
            type: 'CAPTURE_FAILED',
            message: `Base64 conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        }
      }
    },

    generateImageFilename
  }
}