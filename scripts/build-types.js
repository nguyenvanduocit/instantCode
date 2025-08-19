const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const rootDir = path.join(__dirname, '..')

// Generate TypeScript declarations
async function generateTypes() {
  return new Promise((resolve, reject) => {
    console.log('Generating TypeScript declarations...')
    
    const tsc = spawn('bunx', ['tsc', '--emitDeclarationOnly', '--outDir', 'dist'], {
      cwd: rootDir,
      stdio: 'inherit'
    })

    tsc.on('close', (code) => {
      if (code === 0) {
        console.log('TypeScript declarations generated successfully')
        resolve()
      } else {
        reject(new Error(`TypeScript compilation failed with code ${code}`))
      }
    })

    tsc.on('error', (err) => {
      reject(new Error(`Failed to start TypeScript compiler: ${err.message}`))
    })
  })
}

generateTypes().catch((err) => {
  console.error('Type generation failed:', err)
  process.exit(1)
})