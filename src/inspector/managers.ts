/**
 * Consolidated manager classes for element selection, AI communication, inspection, and state management
 */

import {
  createTRPCProxyClient,
  createWSClient,
  httpBatchLink,
  splitLink,
  wsLink
} from '@trpc/client'
import superjson from 'superjson'
import type { 
  AppRouter, 
  ElementData, 
  PageInfo, 
  SendMessageInput,
  SendMessageResponse
} from '../shared/types'
import { XPathUtils } from '../utils/xpath'
import { ToolbarEventEmitter } from './events'

// AI Manager
export interface AIMessageHandler {
  onData: (data: SendMessageResponse) => void
  onError: (error: any) => void
  onComplete: () => void
}

export class AIManager {
  private trpcClient: ReturnType<typeof createTRPCProxyClient<AppRouter>> | null = null
  private wsClient: ReturnType<typeof createWSClient> | null = null
  private currentSubscription: any = null
  private globalSessionId: string | null = null
  private clientId: string = Math.random().toString(36).substring(7)

  initialize(aiEndpoint: string): void {
    if (!aiEndpoint) return

    if (this.wsClient) {
      this.wsClient.close()
    }

    const wsUrl = aiEndpoint.replace('http://', 'ws://').replace('https://', 'wss://')
    this.wsClient = createWSClient({
      url: `${wsUrl}/trpc`,
    })

    this.trpcClient = createTRPCProxyClient<AppRouter>({
      links: [
        splitLink({
          condition(op) {
            return op.type === 'subscription'
          },
          true: wsLink({
            client: this.wsClient,
            transformer: superjson,
          }),
          false: httpBatchLink({
            url: `${aiEndpoint}/trpc`,
            transformer: superjson,
          }),
        }),
      ],
    })
  }

  async sendMessage(
    userPrompt: string,
    selectedElements: ElementData[],
    pageInfo: PageInfo,
    cwd: string,
    handler: AIMessageHandler
  ): Promise<void> {
    if (!this.trpcClient) {
      throw new Error('tRPC client not initialized')
    }

    if (this.currentSubscription) {
      console.log(`🟡 [CLIENT ${this.clientId}] Cancelling existing subscription before creating new one`)
      this.currentSubscription.unsubscribe()
      this.currentSubscription = null
    }
    
    console.log(`🟢 [CLIENT ${this.clientId}] Creating new subscription for prompt: "${userPrompt.substring(0, 30)}..."`)

    const structuredInput: SendMessageInput = {
      userPrompt,
      selectedElements,
      pageInfo,
      cwd,
      sessionId: this.globalSessionId || undefined
    }

    const subscription = this.trpcClient.sendMessage.subscribe(
      structuredInput,
      {
        onData: (data) => {
          console.log(`📥 [CLIENT ${this.clientId}] SSE data received:`, data)
          
          if ((data.type === 'claude_json' || data.type === 'claude_response' || data.type === 'complete') && data.sessionId) {
            this.globalSessionId = data.sessionId
          }
          
          handler.onData(data)
          
          if (data.type === 'complete') {
            console.log(`✅ [CLIENT ${this.clientId}] AI request completed with session ID:`, data.sessionId)
            this.currentSubscription = null
            handler.onComplete()
          }
        },
        onError: (error) => {
          console.error(`❌ [CLIENT ${this.clientId}] Subscription error:`, error)
          this.currentSubscription = null
          handler.onError(error)
        },
      }
    )

    this.currentSubscription = subscription
  }

  async newChat(): Promise<void> {
    if (this.trpcClient) {
      try {
        await this.trpcClient.newChat.mutate()
        this.globalSessionId = null
      } catch (error) {
        console.error('Failed to start new chat:', error)
        throw error
      }
    } else {
      console.warn('tRPC client not initialized')
      throw new Error('tRPC client not initialized')
    }
  }

  cancel(): void {
    if (this.currentSubscription) {
      console.log('Cancelling current AI request')
      this.currentSubscription.unsubscribe()
      this.currentSubscription = null
    }
  }

  getSessionId(): string | null {
    return this.globalSessionId
  }

  isInitialized(): boolean {
    return this.trpcClient !== null
  }

  isProcessing(): boolean {
    return this.currentSubscription !== null
  }

  destroy(): void {
    if (this.currentSubscription) {
      this.currentSubscription.unsubscribe()
    }
    if (this.wsClient) {
      this.wsClient.close()
    }
  }
}

// Element Selection Manager
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

// Inspection Manager
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

// State Manager
export interface ToolbarState {
  isExpanded: boolean
  isInspecting: boolean
  isProcessing: boolean
  sessionId: string | null
  selectedElements: ElementData[]
  messages: SendMessageResponse[]
}

export class ToolbarStateManager {
  private state: ToolbarState
  private events: ToolbarEventEmitter
  private cleanupFunctions: (() => void)[] = []

  constructor(eventEmitter: ToolbarEventEmitter) {
    this.events = eventEmitter
    this.state = {
      isExpanded: false,
      isInspecting: false,
      isProcessing: false,
      sessionId: null,
      selectedElements: [],
      messages: []
    }
    
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.cleanupFunctions.push(
      this.events.on('ui:expand', () => {
        this.state.isExpanded = true
        this.onStateChange()
      }),
      
      this.events.on('ui:collapse', () => {
        this.state.isExpanded = false
        this.state.isInspecting = false
        this.onStateChange()
      }),
      
      this.events.on('ui:enter-inspection', () => {
        this.state.isInspecting = true
        this.onStateChange()
      }),
      
      this.events.on('ui:exit-inspection', () => {
        this.state.isInspecting = false
        this.onStateChange()
      }),
      
      this.events.on('ui:processing-start', () => {
        this.state.isProcessing = true
        this.state.isInspecting = false
        this.onStateChange()
      }),
      
      this.events.on('ui:processing-end', () => {
        this.state.isProcessing = false
        this.onStateChange()
      })
    )

    this.cleanupFunctions.push(
      this.events.on('selection:changed', (elements) => {
        this.state.selectedElements = elements
        this.onStateChange()
      }),
      
      this.events.on('selection:clear', () => {
        this.state.selectedElements = []
        this.onStateChange()
      })
    )

    this.cleanupFunctions.push(
      this.events.on('session:updated', ({ sessionId }) => {
        this.state.sessionId = sessionId
        this.onStateChange()
      }),
      
      this.events.on('session:new', () => {
        this.state.sessionId = null
        this.state.selectedElements = []
        this.state.messages = []
        this.onStateChange()
      })
    )

    this.cleanupFunctions.push(
      this.events.on('messages:add', (message) => {
        this.state.messages.push(message)
        
        if ((message.type === 'claude_json' || message.type === 'claude_response' || message.type === 'complete') && message.sessionId) {
          this.state.sessionId = message.sessionId
        }
        
        if (message.type === 'complete') {
          this.state.isProcessing = false
        }
        
        this.onStateChange()
      }),
      
      this.events.on('messages:clear', () => {
        this.state.messages = []
        this.onStateChange()
      })
    )

    this.cleanupFunctions.push(
      this.events.on('prompt:clear', () => {
        this.onStateChange()
      })
    )
  }

  private onStateChange(): void {
    // console.log('Toolbar state changed:', this.state)
  }

  getState(): Readonly<ToolbarState> {
    return { ...this.state }
  }

  isExpanded(): boolean {
    return this.state.isExpanded
  }

  isInspecting(): boolean {
    return this.state.isInspecting
  }

  isProcessing(): boolean {
    return this.state.isProcessing
  }

  getSessionId(): string | null {
    return this.state.sessionId
  }

  getSelectedElements(): ElementData[] {
    return [...this.state.selectedElements]
  }

  getMessages(): SendMessageResponse[] {
    return [...this.state.messages]
  }

  destroy(): void {
    this.cleanupFunctions.forEach(cleanup => cleanup())
    this.cleanupFunctions = []
  }
}