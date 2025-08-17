/**
 * Framework component detection and file location extraction
 */

export interface ComponentInfo {
  componentLocation: string
  componentName?: string
}

/**
 * Find the nearest component in the DOM tree
 */
export function findNearestComponent(element: Element): ComponentInfo | null {
  if (!element || element === document.body) return null

  try {
    // Try Vue detection first (works for Vue 2 and Vue 3)
    let componentInfo = getVueComponentInfo(element)
    
    // Debug logging
    if (componentInfo) {
      console.log('🟢 Vue component found:', componentInfo)
    } else {
      console.log('🔍 No Vue component found for element:', element.tagName, 'Checking properties:', {
        __vnode: !!(element as any).__vnode,
        __vueParentComponent: !!(element as any).__vueParentComponent,
        __vue__: !!(element as any).__vue__,
        __v_inspector: !!(element as any).__v_inspector
      })
    }
    
    // If Vue detection fails, try vanilla component attributes
    if (!componentInfo) {
      componentInfo = getVanillaComponentInfo(element)
      if (componentInfo) {
        console.log('🟡 Vanilla component found:', componentInfo)
      }
    }

    if (componentInfo) {
      return componentInfo
    }

    return findNearestComponent(element.parentElement!)
  } catch (e) {
    console.error('Error finding nearest component:', e)
    return null
  }
}

function getVanillaComponentInfo(element: Element): ComponentInfo | null {
  const componentName = element.getAttribute('data-component-name')
  const componentFile = element.getAttribute('data-component-file')

  if (!componentName && !componentFile) {
    return null
  }

  return {
    componentLocation: `${componentFile}@${componentName}`,
  }
}

function getVueComponentInfo(element: Element): ComponentInfo | null {
  if (!element) return null

  const elementAny = element as any

  // Try multiple Vue property paths for different Vue versions and configurations
  
  // Vue 3 with __v_inspector in props
  let codeLocation = elementAny.__vnode?.props?.__v_inspector
  
  // Vue 3 with parent component
  if (!codeLocation) {
    codeLocation = elementAny.__vueParentComponent?.vnode?.props?.__v_inspector
  }
  
  // Direct __v_inspector on element
  if (!codeLocation) {
    codeLocation = elementAny.__v_inspector
  }
  
  // Vue component instance with __v_inspector
  if (!codeLocation) {
    const vueInstance = elementAny.__vue__ || elementAny.__vueParentComponent
    if (vueInstance) {
      codeLocation = vueInstance.__v_inspector ||
                    vueInstance.$options?.__v_inspector ||
                    vueInstance.type?.__v_inspector
    }
  }
  
  // Check vnode directly
  if (!codeLocation) {
    const vnode = elementAny.__vnode || elementAny.$vnode
    if (vnode) {
      codeLocation = vnode.__v_inspector ||
                    vnode.props?.__v_inspector ||
                    vnode.componentOptions?.__v_inspector
    }
  }

  if (!codeLocation) {
    return null
  }

  return {
    componentLocation: codeLocation,
  }
}