import type { AppRouter } from './src/shared/types'
import { createTRPCProxyClient } from '@trpc/client'

// This test file validates that type inference works correctly

const client = createTRPCProxyClient<AppRouter>({
  links: []
})

// This should show type errors if types aren't properly shared
async function testTypes() {
  // Should have correct input types
  const result = await client.sendMessage.subscribe({
    userPrompt: 'test',
    selectedElements: [{
      index: 0,
      tagName: 'div',
      xpath: '/div',
      textContent: 'text',
      attributes: {},
      children: []
    }],
    pageInfo: {
      url: 'http://test.com',
      title: 'Test'
    }
  }, {
    onData: (data) => {
      // Should have correct output types
      if (data.type === 'claude_json') {
        console.log(data.claudeJson)
      }
    }
  })

  // Test type error - this should fail
  // @ts-expect-error
  await client.sendMessage.subscribe({
    invalidField: 'test'
  })

  // Test health endpoint
  const health = await client.health.query()
  console.log(health.status) // Should be typed as string
  console.log(health.timestamp) // Should be typed as string
}