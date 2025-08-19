declare module 'optimal-select' {
  interface Options {
    root?: Element
    skip?: (element: Element) => boolean
    priority?: string[]
    ignore?: {
      class?: (name: string) => boolean
      attribute?: (name: string, value: string, defaultPredicate: (name: string, value: string) => boolean) => boolean
      tag?: (name: string) => boolean
    }
  }
  
  function select(element: Element, options?: Options): string
  export { select }
}