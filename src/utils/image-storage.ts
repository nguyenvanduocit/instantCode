/**
 * Image Storage Utilities for server-side file operations
 */

import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { createLogger } from './logger'
import type { SaveImageRequest, SaveImageResponse } from '../shared/types'

export interface ImageStorageError {
  type: 'FILE_SYSTEM_ERROR' | 'INVALID_DATA' | 'STORAGE_FULL' | 'PERMISSION_ERROR'
  message: string
}

export type StorageResult<T, E = ImageStorageError> = 
  | { success: true; data: T }
  | { success: false; error: E }

const logger = createLogger(false)

/**
 * Get the tmp directory path for inspector captures
 */
function getTmpDirectory(cwd?: string): string {
  const projectRoot = cwd || process.cwd()
  return join(projectRoot, 'tmp', 'inspector-captures')
}

/**
 * Ensure tmp directory exists
 */
async function ensureTmpDirectoryExists(tmpDir: string): Promise<StorageResult<void>> {
  try {
    await fs.access(tmpDir)
  } catch {
    try {
      await fs.mkdir(tmpDir, { recursive: true })
      logger.log(`Created tmp directory: ${tmpDir}`)
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'FILE_SYSTEM_ERROR',
          message: `Failed to create tmp directory: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }
    }
  }
  
  return { success: true, data: undefined }
}

/**
 * Validate base64 image data
 */
function validateBase64ImageData(imageData: string): StorageResult<Buffer> {
  try {
    // Check if it's a data URL (data:image/png;base64,...)
    const base64Match = imageData.match(/^data:image\/[a-zA-Z]+;base64,(.+)$/)
    const base64String = base64Match ? base64Match[1] : imageData
    
    // Validate base64 format
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64String)) {
      return {
        success: false,
        error: {
          type: 'INVALID_DATA',
          message: 'Invalid base64 format'
        }
      }
    }
    
    const buffer = Buffer.from(base64String, 'base64')
    
    // Basic validation - check if it looks like PNG data
    if (buffer.length < 8 || !buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
      logger.warn('Image data does not appear to be PNG format')
    }
    
    return { success: true, data: buffer }
    
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'INVALID_DATA',
        message: `Base64 decoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

/**
 * Check if filename already exists and generate unique name if needed
 */
async function ensureUniqueFilename(tmpDir: string, filename: string): Promise<StorageResult<string>> {
  try {
    let uniqueFilename = filename
    let counter = 1
    
    while (true) {
      const fullPath = join(tmpDir, uniqueFilename)
      
      try {
        await fs.access(fullPath)
        // File exists, generate new name
        const nameParts = filename.split('.')
        const extension = nameParts.pop()
        const baseName = nameParts.join('.')
        
        // Replace the index number if it exists in the original format
        const indexMatch = baseName.match(/^(.+)-(\d+)$/)
        if (indexMatch) {
          uniqueFilename = `${indexMatch[1]}-${counter + parseInt(indexMatch[2])}.${extension}`
        } else {
          uniqueFilename = `${baseName}-${counter}.${extension}`
        }
        counter++
        
        // Prevent infinite loop
        if (counter > 1000) {
          return {
            success: false,
            error: {
              type: 'FILE_SYSTEM_ERROR',
              message: 'Too many filename collisions'
            }
          }
        }
      } catch {
        // File doesn't exist, we can use this filename
        break
      }
    }
    
    return { success: true, data: uniqueFilename }
    
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'FILE_SYSTEM_ERROR',
        message: `Filename uniqueness check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

/**
 * Perform atomic file write operation
 */
async function atomicFileWrite(filePath: string, data: Buffer): Promise<StorageResult<void>> {
  const tempPath = `${filePath}.tmp`
  
  try {
    // Write to temporary file first
    await fs.writeFile(tempPath, data)
    
    // Atomically rename to final location
    await fs.rename(tempPath, filePath)
    
    logger.log(`Successfully saved image to ${filePath}`)
    return { success: true, data: undefined }
    
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempPath)
    } catch {
      // Ignore cleanup errors
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Categorize the error
    let errorType: ImageStorageError['type'] = 'FILE_SYSTEM_ERROR'
    if (errorMessage.includes('ENOSPC') || errorMessage.includes('no space')) {
      errorType = 'STORAGE_FULL'
    } else if (errorMessage.includes('EACCES') || errorMessage.includes('permission denied')) {
      errorType = 'PERMISSION_ERROR'
    }
    
    return {
      success: false,
      error: {
        type: errorType,
        message: `File write failed: ${errorMessage}`
      }
    }
  }
}

/**
 * Save base64 image data to tmp directory
 */
export async function saveElementImage(
  request: SaveImageRequest,
  cwd?: string
): Promise<StorageResult<SaveImageResponse>> {
  const tmpDir = getTmpDirectory(cwd)
  
  // Ensure tmp directory exists
  const dirResult = await ensureTmpDirectoryExists(tmpDir)
  if (!dirResult.success) {
    return dirResult
  }
  
  // Validate image data
  const validationResult = validateBase64ImageData(request.imageData)
  if (!validationResult.success) {
    return validationResult
  }
  
  // Ensure filename is unique
  const filenameResult = await ensureUniqueFilename(tmpDir, request.filename)
  if (!filenameResult.success) {
    return filenameResult
  }
  
  const uniqueFilename = filenameResult.data
  const fullPath = join(tmpDir, uniqueFilename)
  
  // Perform atomic file write
  const writeResult = await atomicFileWrite(fullPath, validationResult.data)
  if (!writeResult.success) {
    return writeResult
  }
  
  const response: SaveImageResponse = {
    success: true,
    imagePath: fullPath,
    filename: uniqueFilename
  }
  
  return { success: true, data: response }
}

/**
 * Check if file exists at given path
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Get file stats for given path
 */
export async function getFileStats(filePath: string): Promise<StorageResult<{ size: number; created: Date; modified: Date }>> {
  try {
    const stats = await fs.stat(filePath)
    
    return {
      success: true,
      data: {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      }
    }
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'FILE_SYSTEM_ERROR',
        message: `Failed to get file stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

/**
 * Clean up old image files (optional utility)
 */
export async function cleanupOldImages(
  maxAgeHours: number = 24,
  cwd?: string
): Promise<StorageResult<{ deletedCount: number; totalSize: number }>> {
  const tmpDir = getTmpDirectory(cwd)
  
  try {
    const files = await fs.readdir(tmpDir)
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)
    
    let deletedCount = 0
    let totalSize = 0
    
    for (const file of files) {
      if (!file.startsWith('element-') || !file.endsWith('.png')) {
        continue // Skip non-image files
      }
      
      const filePath = join(tmpDir, file)
      const stats = await fs.stat(filePath)
      
      if (stats.mtime < cutoffTime) {
        totalSize += stats.size
        await fs.unlink(filePath)
        deletedCount++
        logger.log(`Cleaned up old image: ${file}`)
      }
    }
    
    return {
      success: true,
      data: { deletedCount, totalSize }
    }
    
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'FILE_SYSTEM_ERROR',
        message: `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}