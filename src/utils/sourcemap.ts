/**
 * Source Map utilities for mapping runtime elements back to source code
 */

export interface SourceMapPosition {
  line: number
  column: number
  source?: string
  name?: string
}

export interface SourceMapInfo {
  file: string
  line: number
  column: number
  endLine?: number
  endColumn?: number
  originalSource?: string
  sourcesContent?: string[]
}

/**
 * Basic source map consumer for parsing VLQ-encoded mappings
 * Note: This is a simplified implementation. For production use,
 * consider using the 'source-map' library for full compatibility.
 */
export class BasicSourceMapConsumer {
  // private _mappings: string // Reserved for future VLQ parsing
  private sources: string[]
  // private _names: string[] // Reserved for future name mapping
  private sourcesContent?: string[]

  constructor(sourceMap: any) {
    // this._mappings = sourceMap.mappings || '' // Reserved for future VLQ parsing
    this.sources = sourceMap.sources || []
    // this._names = sourceMap.names || [] // Reserved for future name mapping
    this.sourcesContent = sourceMap.sourcesContent
  }

  /**
   * Find original position for generated position
   * This is a simplified implementation that looks for approximate mappings
   */
  originalPositionFor(line: number, column: number): SourceMapPosition | null {
    try {
      // For a basic implementation, we'll use heuristics
      // In a real implementation, you'd parse the VLQ mappings properly
      
      // If we have sources content, we can try to do basic mapping
      if (this.sources.length > 0) {
        return {
          line: line,
          column: column,
          source: this.sources[0], // Use first source as fallback
          name: undefined
        }
      }

      return null
    } catch (error) {
      console.warn('Failed to parse source map:', error)
      return null
    }
  }

  /**
   * Get source content for a given source file
   */
  sourceContentFor(source: string): string | null {
    if (!this.sourcesContent) return null
    
    const index = this.sources.indexOf(source)
    return index >= 0 ? this.sourcesContent[index] : null
  }

  /**
   * Get all available sources
   */
  getSources(): string[] {
    return [...this.sources]
  }
}

/**
 * Attempt to find and parse source maps from various sources
 */
export class SourceMapResolver {
  private sourceMapCache = new Map<string, BasicSourceMapConsumer>()

  /**
   * Try to find source map for a given file URL
   */
  async findSourceMapForFile(fileUrl: string): Promise<BasicSourceMapConsumer | null> {
    // Check cache first
    if (this.sourceMapCache.has(fileUrl)) {
      return this.sourceMapCache.get(fileUrl)!
    }

    try {
      // Try to find source map from various sources
      let sourceMapUrl = null

      // 1. Try inline source map comment
      const response = await fetch(fileUrl)
      const content = await response.text()
      
      const inlineMatch = content.match(/\/\/# sourceMappingURL=data:application\/json[;,](?:charset[:=]\S+?[;,])?base64,(.*)/)
      if (inlineMatch) {
        const sourceMapData = JSON.parse(atob(inlineMatch[1]))
        const consumer = new BasicSourceMapConsumer(sourceMapData)
        this.sourceMapCache.set(fileUrl, consumer)
        return consumer
      }

      // 2. Try external source map file
      const externalMatch = content.match(/\/\/# sourceMappingURL=(.*)/)
      if (externalMatch) {
        sourceMapUrl = new URL(externalMatch[1].trim(), fileUrl).href
      } else {
        // 3. Try conventional .map file
        sourceMapUrl = fileUrl + '.map'
      }

      if (sourceMapUrl) {
        const mapResponse = await fetch(sourceMapUrl)
        if (mapResponse.ok) {
          const sourceMapData = await mapResponse.json()
          const consumer = new BasicSourceMapConsumer(sourceMapData)
          this.sourceMapCache.set(fileUrl, consumer)
          return consumer
        }
      }

    } catch (error) {
      console.warn('Failed to load source map for', fileUrl, error)
    }

    return null
  }

  /**
   * Resolve original position from generated position using source maps
   */
  async resolvePosition(fileUrl: string, line: number, column: number): Promise<SourceMapPosition | null> {
    const sourceMap = await this.findSourceMapForFile(fileUrl)
    if (!sourceMap) return null

    return sourceMap.originalPositionFor(line, column)
  }

  /**
   * Get enhanced location info by combining runtime data with source maps
   */
  async getEnhancedLocationInfo(
    fileUrl: string, 
    line: number, 
    column: number
  ): Promise<SourceMapInfo | null> {
    try {
      const originalPos = await this.resolvePosition(fileUrl, line, column)
      if (!originalPos) return null

      const sourceMap = await this.findSourceMapForFile(fileUrl)
      if (!sourceMap) return null

      const sourceContent = originalPos.source ? 
        sourceMap.sourceContentFor(originalPos.source) : null

      return {
        file: originalPos.source || fileUrl,
        line: originalPos.line,
        column: originalPos.column,
        originalSource: originalPos.source,
        sourcesContent: sourceContent ? [sourceContent] : undefined
      }
    } catch (error) {
      console.warn('Failed to get enhanced location info:', error)
      return null
    }
  }

  /**
   * Clear the source map cache
   */
  clearCache(): void {
    this.sourceMapCache.clear()
  }
}

// Global source map resolver instance
export const sourceMapResolver = new SourceMapResolver()

/**
 * Helper function to extract source location from browser stack traces
 */
export function extractLocationFromStackTrace(error: Error): { file: string, line: number, column: number } | null {
  try {
    const stack = error.stack
    if (!stack) return null

    // Parse stack trace to find first meaningful location
    const lines = stack.split('\n')
    for (const line of lines) {
      // Match Chrome/Firefox style stack traces
      const chromeMatch = line.match(/at.*\((.*):(\d+):(\d+)\)/)
      const firefoxMatch = line.match(/@(.*):(\d+):(\d+)/)
      
      const match = chromeMatch || firefoxMatch
      if (match) {
        return {
          file: match[1],
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10)
        }
      }
    }

    return null
  } catch (error) {
    return null
  }
}