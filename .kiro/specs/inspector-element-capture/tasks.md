# Implementation Plan

- [x] 1. Create element screenshot capture functionality
- [x] 1.1 Build element-to-canvas conversion utility
  - Create pure function to convert DOM element to canvas
  - Implement element bounds calculation for precise capture  
  - Add canvas-to-blob conversion with PNG format
  - Handle edge cases for elements outside viewport
  - _Requirements: 1.1_

- [x] 1.2 Generate unique descriptive filenames for captured images
  - Create filename generation function using timestamp and element identifiers
  - Include element tag name and CSS selector hash in filename
  - Ensure filename uniqueness with collision detection
  - Format filenames for easy AI understanding (element-timestamp-hash.png)
  - _Requirements: 1.3, 2.2, 3.1_

- [x] 1.3 Integrate screenshot capture with element selection workflow
  - Extend existing element selection to trigger automatic screenshot capture
  - Store captured image path with selected element data
  - Maintain backward compatibility with existing selection functionality
  - Add graceful fallback when screenshot capture fails
  - _Requirements: 1.1_

- [x] 2. Build server-side image storage functionality
- [x] 2.1 Create image file storage utilities
  - Build function to save base64 image data to tmp directory
  - Create tmp directory structure under project root (tmp/inspector-captures/)
  - Implement atomic file write operations to prevent corruption
  - Add file existence checks to prevent overwrites
  - _Requirements: 1.2, 3.2_

- [x] 2.2 Add image storage endpoint to tRPC router
  - Create saveElementImage procedure in existing tRPC router
  - Accept base64 image data and element metadata
  - Return saved file path and success status
  - Include proper error handling for file system operations
  - _Requirements: 1.2, 3.2_

- [x] 2.3 Extend data schemas for image path support
  - Add optional imagePath field to ElementData schema
  - Extend SendMessage schema to include array of image paths
  - Update type definitions to support image metadata
  - Maintain backward compatibility with existing schemas
  - _Requirements: 2.1, 2.3_

- [x] 3. Integrate image capture with AI message flow
- [x] 3.1 Modify element selection to collect image paths
  - Update selection manager to capture screenshots on element selection
  - Collect image paths from all selected elements  
  - Store image paths in element data for later retrieval
  - Handle multiple element selections with multiple images
  - _Requirements: 2.3_

- [x] 3.2 Include image paths in AI message formatting
  - Extend AI message preparation to include captured image paths
  - Add image path references to AI prompt formatting
  - Ensure image paths are properly formatted for AI understanding
  - Maintain existing AI message functionality
  - _Requirements: 2.1, 2.3_

- [x] 3.3 Add error handling for image capture failures
  - Implement graceful degradation when browser doesn't support screenshots
  - Continue AI workflow even if image capture fails
  - Log capture failures for debugging without breaking user flow
  - Provide fallback to text-only AI interaction
  - _Requirements: 1.1, 2.1_

- [ ] 4. Validate image capture functionality through code review
- [ ] 4.1 Review element screenshot capture implementation
  - Examine screenshot capture code for different element types handling
  - Verify element bounds calculation and viewport handling logic
  - Review unique filename generation and collision detection
  - Check error handling and graceful failure patterns
  - _Requirements: 1.1, 1.3, 3.1_

- [ ] 4.2 Review server-side image storage implementation
  - Examine tmp directory creation and file storage logic
  - Verify file path generation and uniqueness mechanisms
  - Review error handling for storage failures and edge cases
  - Check atomic file operations and data integrity measures
  - _Requirements: 1.2, 3.2_

- [ ] 4.3 Review end-to-end AI message integration
  - Examine complete workflow from element selection to AI message
  - Verify multiple element selection and image path handling
  - Review AI prompt formatting with image path references
  - Check backward compatibility with existing AI workflow
  - _Requirements: 2.1, 2.2, 2.3_