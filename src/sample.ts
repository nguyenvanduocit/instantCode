import { randomUUID } from 'node:crypto'
import type { SendMessage, SendMessageResponse } from './shared/schemas'

function safeSessionId(provided?: string): string {
  return provided && provided.trim().length > 0 ? provided : randomUUID()
}


/**
 * Stream a deterministic sequence of mock frames that mimic the real Claude
 * streaming protocol. This allows the UI to be developed without calling
 * the actual backend.
 */
export async function* sampleSendMessageResponses(input: SendMessage): AsyncGenerator<SendMessageResponse> {
  const sessionId = safeSessionId(input.sessionId) || 'bb4d41a1-6565-4fa5-9ad7-511fcda58508'
  const cwd = input.cwd || '/example'

  // Based on actual console logs from the inspector - TodoList creation workflow
  const systemInit: SendMessageResponse = {
    type: 'system',
    subtype: 'init',
    cwd,
    session_id: sessionId,
    tools: ['Task', 'Bash', 'Glob', 'Grep', 'LS', 'ExitPlanMode', 'Read', 'Edit', 'MultiEdit', 'Write', 'NotebookEdit', 'WebFetch', 'TodoWrite', 'WebSearch', 'BashOutput', 'KillBash'],
    mcp_servers: [],
    model: 'claude-opus-4-1-20250805',
    permissionMode: 'bypassPermissions',
    slash_commands: ['task', 'mental-model', 'scan-for-leak', 'add-dir', 'agents', 'clear', 'compact', 'config', 'cost', 'doctor', 'exit', 'help', 'ide', 'init', 'install-github-app', 'mcp', 'memory', 'migrate-installer', 'model', 'output-style', 'output-style:new', 'pr-comments', 'release-notes', 'resume', 'status', 'statusline', 'bug', 'review', 'security-review', 'upgrade', 'vim', 'permissions', 'hooks', 'export', 'logout', 'login', 'bashes'],
    apiKeySource: 'none',
  }

  // First assistant message acknowledging the request
  const assistant1: SendMessageResponse = {
    type: 'assistant',
    message: {
      id: 'msg_014VZjvwXxrhzud5uC8Lf8t4',
      type: 'message',
      role: 'assistant',
      model: 'claude-opus-4-1-20250805',
      content: [
        {
          type: 'text',
          text: "I'll help you change the SVG icon to a heart and create a todo list. Let me start by tracking these tasks.",
        },
      ],
      stop_reason: null,
      stop_sequence: null,
      usage: {
        input_tokens: 3,
        cache_creation_input_tokens: 474,
        cache_read_input_tokens: 14273,
        output_tokens: 4
      },
    },
    parent_tool_use_id: null,
    session_id: sessionId,
  }

  // Assistant creates todo list
  const assistant2: SendMessageResponse = {
    type: 'assistant',
    message: {
      id: 'msg_014VZjvwXxrhzud5uC8Lf8t4',
      type: 'message',
      role: 'assistant',
      model: 'claude-opus-4-1-20250805',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_015Hh1LdvKYqKegPDYBdjbvc',
          name: 'TodoWrite',
          input: {
            todos: [
              {
                id: '1',
                content: 'Change SVG icon to heart in IconEcosystem.vue',
                status: 'pending',
              },
              {
                id: '2',
                content: 'Create a todo list component',
                status: 'pending',
              },
            ],
          },
        },
      ],
    },
    parent_tool_use_id: null,
    session_id: sessionId,
  }

  // User confirms todo creation
  const user1: SendMessageResponse = {
    type: 'user',
    message: {
      role: 'user',
      content: [
        {
          tool_use_id: 'toolu_015Hh1LdvKYqKegPDYBdjbvc',
          type: 'tool_result',
          content: 'Todos have been modified successfully. Ensure that you continue to use the todo list to track your progress. Please proceed with the current tasks if applicable',
        },
      ],
    },
    parent_tool_use_id: null,
    session_id: sessionId,
  }

  // Assistant starts analyzing the icon component
  const assistant3: SendMessageResponse = {
    type: 'assistant',
    message: {
      id: 'msg_01Jy6ueLyqDxkhdAjdPUTGSj',
      type: 'message',
      role: 'assistant',
      model: 'claude-opus-4-1-20250805',
      content: [
        {
          type: 'text',
          text: 'Let me first look at the current icon component:',
        },
      ],
    },
    parent_tool_use_id: null,
    session_id: sessionId,
  }

  // Assistant reads the icon file
  const assistant4: SendMessageResponse = {
    type: 'assistant',
    message: {
      id: 'msg_01Jy6ueLyqDxkhdAjdPUTGSj',
      type: 'message',
      role: 'assistant',
      model: 'claude-opus-4-1-20250805',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_01AqjNTDYEe3mxd4GQTUG38b',
          name: 'Read',
          input: {
            file_path: cwd + '/src/components/icons/IconEcosystem.vue',
          },
        },
      ],
    },
    parent_tool_use_id: null,
    session_id: sessionId,
  }

  // User provides file content
  const user2: SendMessageResponse = {
    type: 'user',
    message: {
      role: 'user',
      content: [
        {
          tool_use_id: 'toolu_01AqjNTDYEe3mxd4GQTUG38b',
          type: 'tool_result',
          content: '     1→<template>\n     2→  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="20" fill="currentColor">\n     3→    <path\n     4→      d="M11.447 8.894a1 1 0 1 0-.894-1.789l.894 1.789zm-2.894-.789a1 1 0 1 0 .894 1.789l-.894-1.789zm0 1.789a1 1 0 1 0 .894-1.789l-.894 1.789zM7.447 7.106a1 1 0 1 0-.894 1.789l.894-1.789zM10 9a1 1 0 1 0-2 0h2zm-2 2.5a1 1 0 1 0 2 0H8zm9.447-5.606a1 1 0 1 0-.894-1.789l.894 1.789zm-2.894-.789a1 1 0 1 0 .894 1.789l-.894-1.789zm2 .789a1 1 0 1 0 .894-1.789l-.894 1.789zm-1.106-2.789a1 1 0 1 0-.894 1.789l.894-1.789zM18 5a1 1 0 1 0-2 0h2zm-2 2.5a1 1 0 1 0 2 0h-2zm-5.447-4.606a1 1 0 1 0 .894-1.789l-.894 1.789zM9 1l.447-.894a1 1 0 0 0-.894 0L9 1zm-2.447.106a1 1 0 1 0 .894 1.789l-.894-1.789zm-6 3a1 1 0 1 0 .894 1.789L.553 4.106zm2.894.789a1 1 0 1 0-.894-1.789l.894 1.789zm-2-.789a1 1 0 1 0-.894 1.789l.894-1.789zm1.106 2.789a1 1 0 1 0 .894-1.789l-.894 1.789zM2 5a1 1 0 1 0-2 0h2zM0 7.5a1 1 0 1 0 2 0H0zm8.553 12.394a1 1 0 1 0 .894-1.789l-.894 1.789zm-1.106-2.789a1 1 0 1 0-.894 1.789l.894-1.789zm1.106 1a1 1 0 1 0 .894 1.789l-.894-1.789zm2.894.789a1 1 0 1 0-.894-1.789l.894 1.789zM8 19a1 1 0 1 0 2 0H8zm2-2.5a1 1 0 1 0-2 0h2zm-7.447.394a1 1 0 1 0 .894-1.789l-.894 1.789zM1 15H0a1 1 0 0 0 .553.894L1 15zm1-2.5a1 1 0 1 0-2 0h2zm12.553 2.606a1 1 0 1 0 .894 1.789l-.894-1.789zM17 15l.447.894A1 1 0 0 0 18 15h-1zm1-2.5a1 1 0 1 0-2 0h2zm-7.447-5.394l-2 1 .894 1.789 2-1-.894-1.789zm-1.106 1l-2-1-.894 1.789 2 1 .894-1.789zM8 9v2.5h2V9H8zm8.553-4.894l-2 1 .894 1.789 2-1-.894-1.789zm.894 0l-2-1-.894 1.789 2 1 .894-1.789zM16 5v2.5h2V5h-2zm-4.553-3.894l-2-1-.894 1.789 2 1 .894-1.789zm-2.894-1l-2 1 .894 1.789 2-1L8.553.106zM1.447 5.894l2-1-.894-1.789-2 1 .894 1.789zm-.894 0l2 1 .894-1.789-2-1-.894 1.789zM0 5v2.5h2V5H0zm9.447 13.106l-2-1-.894 1.789 2 1 .894-1.789zm0 1.789l2-1-.894-1.789-2 1 .894 1.789zM10 19v-2.5H8V19h2zm-6.553-3.894l-2-1-.894 1.789 2 1 .894-1.789zM2 15v-2.5H0V15h2zm13.447 1.894l2-1-.894-1.789-2 1 .894 1.789zM18 15v-2.5h-2V15h2z"\n     5→    />\n     6→  </svg>\n     7→</template>',
        },
      ],
    },
    parent_tool_use_id: null,
    session_id: sessionId,
  }

  // Assistant updates todo and replaces with heart icon
  const assistant5: SendMessageResponse = {
    type: 'assistant',
    message: {
      id: 'msg_01LYhFgFNTcfAX27m4Swcww1',
      type: 'message',
      role: 'assistant',
      model: 'claude-opus-4-1-20250805',
      content: [
        {
          type: 'text',
          text: "Now I'll update the first task and replace the SVG with a heart icon:",
        },
      ],
    },
    parent_tool_use_id: null,
    session_id: sessionId,
  }

  // Update todo to in_progress
  const assistant6: SendMessageResponse = {
    type: 'assistant',
    message: {
      id: 'msg_01LYhFgFNTcfAX27m4Swcww1',
      type: 'message',
      role: 'assistant',
      model: 'claude-opus-4-1-20250805',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_0124pBCJFaSV9Kt2Mbma4iyr',
          name: 'TodoWrite',
          input: {
            todos: [
              {
                id: '1',
                content: 'Change SVG icon to heart in IconEcosystem.vue',
                status: 'in_progress',
              },
              {
                id: '2',
                content: 'Create a todo list component',
                status: 'pending',
              },
            ],
          },
        },
      ],
    },
    parent_tool_use_id: null,
    session_id: sessionId,
  }

  // User confirms todo update
  const user3: SendMessageResponse = {
    type: 'user',
    message: {
      role: 'user',
      content: [
        {
          tool_use_id: 'toolu_0124pBCJFaSV9Kt2Mbma4iyr',
          type: 'tool_result',
          content: 'Todos have been modified successfully. Ensure that you continue to use the todo list to track your progress. Please proceed with the current tasks if applicable',
        },
      ],
    },
    parent_tool_use_id: null,
    session_id: sessionId,
  }

  // Assistant edits the icon file
  const assistant7: SendMessageResponse = {
    type: 'assistant',
    message: {
      id: 'msg_015cKyLiEvevtoDuQNkawaxi',
      type: 'message',
      role: 'assistant',
      model: 'claude-opus-4-1-20250805',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_01GVkf9r27GWPs8ReQsMMtjH',
          name: 'Edit',
          input: {
            file_path: cwd + '/src/components/icons/IconEcosystem.vue',
            old_string: '<template>\n  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="20" fill="currentColor">\n    <path\n      d="M11.447 8.894a1 1 0 1 0-.894-1.789l.894 1.789zm-2.894-.789a1 1 0 1 0 .894 1.789l-.894-1.789zm0 1.789a1 1 0 1 0 .894-1.789l-.894 1.789zM7.447 7.106a1 1 0 1 0-.894 1.789l.894-1.789zM10 9a1 1 0 1 0-2 0h2zm-2 2.5a1 1 0 1 0 2 0H8zm9.447-5.606a1 1 0 1 0-.894-1.789l.894 1.789zm-2.894-.789a1 1 0 1 0 .894 1.789l-.894-1.789zm2 .789a1 1 0 1 0 .894-1.789l-.894 1.789zm-1.106-2.789a1 1 0 1 0-.894 1.789l.894-1.789zM18 5a1 1 0 1 0-2 0h2zm-2 2.5a1 1 0 1 0 2 0h-2zm-5.447-4.606a1 1 0 1 0 .894-1.789l-.894 1.789zM9 1l.447-.894a1 1 0 0 0-.894 0L9 1zm-2.447.106a1 1 0 1 0 .894 1.789l-.894-1.789zm-6 3a1 1 0 1 0 .894 1.789L.553 4.106zm2.894.789a1 1 0 1 0-.894-1.789l.894 1.789zm-2-.789a1 1 0 1 0-.894 1.789l.894-1.789zm1.106 2.789a1 1 0 1 0 .894-1.789l-.894 1.789zM2 5a1 1 0 1 0-2 0h2zM0 7.5a1 1 0 1 0 2 0H0zm8.553 12.394a1 1 0 1 0 .894-1.789l-.894 1.789zm-1.106-2.789a1 1 0 1 0-.894 1.789l.894-1.789zm1.106 1a1 1 0 1 0 .894 1.789l-.894-1.789zm2.894.789a1 1 0 1 0-.894-1.789l.894 1.789zM8 19a1 1 0 1 0 2 0H8zm2-2.5a1 1 0 1 0-2 0h2zm-7.447.394a1 1 0 1 0 .894-1.789l-.894 1.789zM1 15H0a1 1 0 0 0 .553.894L1 15zm1-2.5a1 1 0 1 0-2 0h2zm12.553 2.606a1 1 0 1 0 .894 1.789l-.894-1.789zM17 15l.447.894A1 1 0 0 0 18 15h-1zm1-2.5a1 1 0 1 0-2 0h2zm-7.447-5.394l-2 1 .894 1.789 2-1-.894-1.789zm-1.106 1l-2-1-.894 1.789 2 1 .894-1.789zM8 9v2.5h2V9H8zm8.553-4.894l-2 1 .894 1.789 2-1-.894-1.789zm.894 0l-2-1-.894 1.789 2 1 .894-1.789zM16 5v2.5h2V5h-2zm-4.553-3.894l-2-1-.894 1.789 2 1 .894-1.789zm-2.894-1l-2 1 .894 1.789 2-1L8.553.106zM1.447 5.894l2-1-.894-1.789-2 1 .894 1.789zm-.894 0l2 1 .894-1.789-2-1-.894 1.789zM0 5v2.5h2V5H0zm9.447 13.106l-2-1-.894 1.789 2 1 .894-1.789zm0 1.789l2-1-.894-1.789-2 1 .894 1.789zM10 19v-2.5H8V19h2zm-6.553-3.894l-2-1-.894 1.789 2 1 .894-1.789zM2 15v-2.5H0V15h2zm13.447 1.894l2-1-.894-1.789-2 1 .894 1.789zM18 15v-2.5h-2V15h2z"\n    />\n  </svg>\n</template>',
            new_string: '<template>\n  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">\n    <path\n      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"\n    />\n  </svg>\n</template>',
          },
        },
      ],
    },
    parent_tool_use_id: null,
    session_id: sessionId,
  }

  // User confirms edit
  const user4: SendMessageResponse = {
    type: 'user',
    message: {
      role: 'user',
      content: [
        {
          tool_use_id: 'toolu_01GVkf9r27GWPs8ReQsMMtjH',
          type: 'tool_result',
          content: 'The file /hhee/example/src/components/icons/IconEcosystem.vue has been updated. Here\'s the result of running `cat -n` on a snippet of the edited file:\n     1→<template>\n     2→  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">\n     3→    <path\n     4→      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"\n     5→    />\n     6→  </svg>\n     7→</template>',
        },
      ],
    },
    parent_tool_use_id: null,
    session_id: sessionId,
  }

  // Mark first todo as completed and move to second task
  const assistant8: SendMessageResponse = {
    type: 'assistant',
    message: {
      id: 'msg_01AaUHa68FqK1dWn4Yv5MhZ7',
      type: 'message',
      role: 'assistant',
      model: 'claude-opus-4-1-20250805',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_01Px6pjEThZnwDm5iCDYQLBt',
          name: 'TodoWrite',
          input: {
            todos: [
              {
                id: '1',
                content: 'Change SVG icon to heart in IconEcosystem.vue',
                status: 'completed',
              },
              {
                id: '2',
                content: 'Create a todo list component',
                status: 'in_progress',
              },
            ],
          },
        },
      ],
    },
    parent_tool_use_id: null,
    session_id: sessionId,
  }

  // Final result summary
  const resultSummary: SendMessageResponse = {
    type: 'result',
    subtype: 'success',
    is_error: false,
    duration_ms: 162363,
    duration_api_ms: 161192,
    num_turns: 27,
    result: "Done! I've:\n1. Changed the SVG icon to a heart shape in `IconEcosystem.vue`\n2. Created a new `TodoList.vue` component with full functionality to add, check off, and delete tasks\n3. Added the TodoList component to your main App.vue\n\nThe todo list is now displayed on your page with a clean design and interactive features.",
    session_id: sessionId,
    total_cost_usd: 1.2048615999999999,
    usage: {
      input_tokens: 112,
      cache_creation_input_tokens: 15192,
      cache_read_input_tokens: 394054,
      output_tokens: 4355,
    },
    permission_denials: [],
  }

  // Sequence matching the console logs
  const frames: SendMessageResponse[] = [
    systemInit,
    assistant1,
    assistant2,
    user1,
    assistant3,
    assistant4,
    user2,
    assistant5,
    assistant6,
    user3,
    assistant7,
    user4,
    assistant8,
    resultSummary,
  ]

  // Add artificial delay to simulate streaming
  for (const frame of frames) {
    await new Promise(resolve => setTimeout(resolve, 100))
    yield frame
  }
}