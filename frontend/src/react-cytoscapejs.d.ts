declare module 'react-cytoscapejs' {
  import type { Core, ElementDefinition } from 'cytoscape'

  const CytoscapeComponent: import('react').ComponentType<{
    elements: ElementDefinition[]
    cy?: (cy: Core) => void
    stylesheet?: any[]
    style?: import('react').CSSProperties
    userZoomingEnabled?: boolean
    userPanningEnabled?: boolean
    boxSelectionEnabled?: boolean
    layout?: any
    minZoom?: number
    maxZoom?: number
    autoungrabify?: boolean
    zoomingEnabled?: boolean
    panningEnabled?: boolean
  }>

  export default CytoscapeComponent
}
