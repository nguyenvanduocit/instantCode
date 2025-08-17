/**
 * Formats and displays Claude Code messages
 */

import { HtmlUtils } from '../utils/html'
import type { ElementData, PageInfo } from '../../shared/types'

export class MessageFormatter {
  private lastMessageHash: string = ''
  private messageHistory: Set<string> = new Set()

  formatPrompt(userPrompt: string, selectedElements: ElementData[], pageInfo: PageInfo): string {
    let formattedPrompt = `<userRequest>${userPrompt}</userRequest>`

    const replacer = (_key: string, value: any) => {
      if (value === '' || (Array.isArray(value) && value.length === 0) || value === null) {
        return undefined
      }
      return value
    }

    if (pageInfo) {
      formattedPrompt += `<pageInfo>${JSON.stringify(pageInfo, replacer)}</pageInfo>`
    }

    if (selectedElements && selectedElements.length > 0) {
      formattedPrompt += `<inspectedElements>${JSON.stringify(selectedElements, replacer)}</inspectedElements>`
    }

    return formattedPrompt
  }

  shouldDisplayMessage(jsonData: any): boolean {
    const messageHash = this.hashMessage(jsonData)
    
    // Skip if this exact message was just displayed
    if (messageHash === this.lastMessageHash) {
      return false
    }
    
    // For assistant messages, check if similar content was recently shown
    if (jsonData.type === 'assistant' && this.messageHistory.has(messageHash)) {
      return false
    }
    
    // Update deduplication tracking
    this.lastMessageHash = messageHash
    if (jsonData.type === 'assistant') {
      this.messageHistory.add(messageHash)
      // Keep only last 10 message hashes to prevent memory growth
      if (this.messageHistory.size > 10) {
        const firstHash = this.messageHistory.values().next().value
        if (firstHash) {
          this.messageHistory.delete(firstHash)
        }
      }
    }
    
    return true
  }

  formatClaudeMessage(data: any): string {
    try {
      let content = ''
      let meta = ''
      let badge = ''

      if (data.type === 'assistant' && data.message?.content) {
        const extracted = this.extractAssistantContent(data.message.content)
        content = extracted.text
        badge = extracted.badge || ''
        if (data.message?.usage) {
          const usage = data.message.usage
          meta = `${usage.input_tokens || 0}↑ ${usage.output_tokens || 0}↓`
        }
      } else if (data.type === 'user' && data.message?.content) {
        const extracted = this.extractUserContent(data.message.content)
        content = extracted.text
        badge = extracted.badge || ''
      } else if (data.type === 'system') {
        content = `System: ${data.subtype || 'message'}`
        badge = '⚙️ System'
        if (data.cwd) meta = `${data.cwd}`
      } else if (data.type === 'result') {
        content = data.result || 'Task completed'
        badge = '✅ Result'
        if (data.duration_ms) meta = `${data.duration_ms}ms`
      } else {
        content = JSON.stringify(data, null, 1)
      }

      const badgeHtml = badge ? `<div class="message-badge">${HtmlUtils.escapeHtml(badge)}</div>` : ''
      return `<div class="message-wrapper">${badgeHtml}<div class="message-content">${HtmlUtils.escapeHtml(content)}</div>${meta ? `<div class="message-meta">${meta}</div>` : ''}</div>`
    } catch (error) {
      console.error('Error formatting Claude message:', error)
      return `<div class="message-content">${HtmlUtils.escapeHtml(JSON.stringify(data))}</div>`
    }
  }

  private extractAssistantContent(content: any[]): { text: string, badge?: string } {
    const items = content.map(item => {
      if (item.type === 'text') {
        return { text: item.text, badge: undefined }
      } else if (item.type === 'tool_use') {
        return { 
          text: `${item.name}${item.input ? ': ' + JSON.stringify(item.input).substring(0, 100) + '...' : ''}`,
          badge: '🔧 Edit'
        }
      }
      return { text: '', badge: undefined }
    }).filter(item => item.text)
    
    if (items.length === 0) return { text: '' }
    
    // If there's a tool use, prioritize its badge
    const toolUseItem = items.find(item => item.badge)
    if (toolUseItem) {
      return {
        text: items.map(item => item.text).join('\n'),
        badge: toolUseItem.badge
      }
    }
    
    return { text: items.map(item => item.text).join('\n') }
  }

  private extractUserContent(content: any[]): { text: string, badge?: string } {
    const items = content.map(item => {
      if (item.type === 'text') {
        return { text: item.text, badge: undefined }
      } else if (item.type === 'tool_result') {
        const result = typeof item.content === 'string' ? item.content : JSON.stringify(item.content)
        return { 
          text: `${result.substring(0, 150)}${result.length > 150 ? '...' : ''}`,
          badge: '📤 Tool result'
        }
      }
      return { text: '', badge: undefined }
    }).filter(item => item.text)
    
    if (items.length === 0) return { text: '' }
    
    // If there's a tool result, prioritize its badge
    const toolResultItem = items.find(item => item.badge)
    if (toolResultItem) {
      return {
        text: items.map(item => item.text).join('\n'),
        badge: toolResultItem.badge
      }
    }
    
    return { text: items.map(item => item.text).join('\n') }
  }

  private hashMessage(jsonData: any): string {
    let content = ''
    if (jsonData.type === 'assistant' && jsonData.message?.content) {
      content = this.extractAssistantContent(jsonData.message.content).text
    } else if (jsonData.type === 'user' && jsonData.message?.content) {
      content = this.extractUserContent(jsonData.message.content).text
    } else {
      content = JSON.stringify(jsonData)
    }
    
    return HtmlUtils.hashString(content || '')
  }

  clearHistory(): void {
    this.lastMessageHash = ''
    this.messageHistory.clear()
  }
}