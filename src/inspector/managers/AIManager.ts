/**
 * Handles AI communication via tRPC
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
} from '../../shared/types'

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

    // Close existing WebSocket if any
    if (this.wsClient) {
      this.wsClient.close()
    }

    // Create WebSocket client for subscriptions
    const wsUrl = aiEndpoint.replace('http://', 'ws://').replace('https://', 'wss://')
    this.wsClient = createWSClient({
      url: `${wsUrl}/trpc`,
    })

    // Create tRPC client with proper links
    this.trpcClient = createTRPCProxyClient<AppRouter>({
      links: [
        splitLink({
          condition(op) {
            // Use WebSocket for subscriptions, HTTP for queries/mutations
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

    // Cancel any existing subscription to prevent duplicates
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

    // Use tRPC subscription
    const subscription = this.trpcClient.sendMessage.subscribe(
      structuredInput,
      {
        onData: (data) => {
          console.log(`📥 [CLIENT ${this.clientId}] SSE data received:`, data)
          
          // Update global session ID when received in response
          if ((data.type === 'claude_json' || data.type === 'claude_response' || data.type === 'complete') && data.sessionId) {
            this.globalSessionId = data.sessionId
            console.log('Session ID updated:', this.globalSessionId)
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