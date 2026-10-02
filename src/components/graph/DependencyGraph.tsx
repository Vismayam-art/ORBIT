import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'

import {
  CalendarDays,
  CheckCircle2,
  Database,
  HardDrive,
  ListChecks,
  Mail,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
} from 'lucide-react'

import type {
  WorkflowEdge,
  WorkflowNode,
} from '../../types/orbit'

import '@xyflow/react/dist/style.css'


interface OrbitNodeData extends Record<string, unknown> {
  label: string
  description: string
  type: WorkflowNode['type']
  tool?: string
  active: boolean
}


type OrbitReactNode = Node<OrbitNodeData>


interface DependencyGraphProps {
  currentStage: string
  nodes?: WorkflowNode[]
  edges?: WorkflowEdge[]
}


/* =========================================================
   ICONS
   ========================================================= */

function getNodeIcon(
  node: WorkflowNode,
) {
  if (node.type === 'goal') {
    return Target
  }

  if (node.type === 'state') {
    return Database
  }

  if (node.type === 'verify') {
    return ShieldCheck
  }

  if (node.type === 'outcome') {
    return CheckCircle2
  }

  if (node.tool === 'Calendar') {
    return CalendarDays
  }

  if (node.tool === 'Gmail') {
    return Mail
  }

  if (node.tool === 'Drive') {
    return HardDrive
  }

  if (node.tool === 'Web Search') {
    return Search
  }

  if (node.type === 'action') {
    return Workflow
  }

  if (node.type === 'decision') {
    return ListChecks
  }

  if (node.type === 'adapt') {
    return Workflow
  }

  return Sparkles
}


/* =========================================================
   NODE COMPONENT
   ========================================================= */

function OrbitNodeComponent({
  data,
}: NodeProps<OrbitReactNode>) {

  const Icon = getNodeIcon({
    id: '',
    label: data.label,
    description: data.description,
    type: data.type,
    tool: data.tool,
  })


  const nodeClass = `
    orbit-custom-node
    orbit-node-${data.type}
    ${data.active ? 'active' : ''}
  `


  return (
    <div className={nodeClass}>

      <Handle
        type="target"
        position={Position.Top}
        className="orbit-handle"
      />


      <div className="orbit-node-icon">
        <Icon size={15} />
      </div>


      <div className="orbit-node-text">

        <strong>
          {data.label}
        </strong>


        <span>
          {data.description}
        </span>

      </div>


      <Handle
        type="source"
        position={Position.Bottom}
        className="orbit-handle"
      />

    </div>
  )
}


const nodeTypes = {
  orbit: OrbitNodeComponent,
}


/* =========================================================
   DETERMINE WHEN A NODE SHOULD BE ACTIVE
   ========================================================= */

function getNodeStage(
  node: WorkflowNode,
): string {

  switch (node.type) {

    case 'goal':
      return 'goal'

    case 'state':
    case 'tool':
      return 'state'

    case 'action':
    case 'decision':
      return 'plan'

    case 'adapt':
      return 'adapt'

    case 'verify':
    case 'outcome':
      return 'verify'

    default:
      return 'plan'
  }
}


/* =========================================================
   STAGE ORDER
   ========================================================= */

const stageOrder = [
  'goal',
  'state',
  'plan',
  'act',
  'adapt',
  'verify',
]


function isNodeActive(
  node: WorkflowNode,
  currentStage: string,
): boolean {

  const nodeStage = getNodeStage(node)


  const currentIndex =
    stageOrder.indexOf(
      currentStage.toLowerCase(),
    )


  const nodeIndex =
    stageOrder.indexOf(nodeStage)


  if (currentIndex < 0) {
    return false
  }


  /*
   * ACT activates planned actions.
   */
  if (
    currentStage.toLowerCase() === 'act' &&
    (
      node.type === 'action' ||
      node.type === 'decision'
    )
  ) {
    return true
  }


  /*
   * ADAPT activates the complete
   * execution structure.
   */
  if (
    currentStage.toLowerCase() === 'adapt'
  ) {
    return nodeIndex <= currentIndex
  }


  /*
   * VERIFY activates everything.
   */
  if (
    currentStage.toLowerCase() === 'verify'
  ) {
    return true
  }


  return nodeIndex <= currentIndex
}


/* =========================================================
   BUILD DEPENDENCY LEVELS
   ========================================================= */

function buildLevels(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
) {

  const levels = new Map<string, number>()


  /*
   * Start the GOAL at level 0.
   */
  const goalNode = nodes.find(
    (node) => node.type === 'goal',
  )


  if (goalNode) {
    levels.set(
      goalNode.id,
      0,
    )
  }


  /*
   * Propagate levels through dependencies.
   *
   * A node gets placed one level below
   * the deepest prerequisite.
   */
  let changed = true


  while (changed) {

    changed = false


    edges.forEach((edge) => {

      const sourceLevel =
        levels.get(edge.source)


      if (
        sourceLevel !== undefined
      ) {

        const targetLevel =
          sourceLevel + 1


        const existingLevel =
          levels.get(edge.target)


        if (
          existingLevel === undefined ||
          targetLevel > existingLevel
        ) {

          levels.set(
            edge.target,
            targetLevel,
          )

          changed = true
        }
      }

    })
  }


  /*
   * Any disconnected nodes are placed
   * after the main dependency structure.
   */
  const maxLevel =
    Math.max(
      0,
      ...Array.from(
        levels.values(),
      ),
    )


  nodes.forEach((node) => {

    if (!levels.has(node.id)) {

      levels.set(
        node.id,
        maxLevel + 1,
      )
    }

  })


  return levels
}


/* =========================================================
   BUILD DYNAMIC POSITIONS
   ========================================================= */

function buildPositions(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
) {

  const levels =
    buildLevels(
      nodes,
      edges,
    )


  /*
   * Group nodes by dependency level.
   */
  const levelGroups =
    new Map<number, WorkflowNode[]>()


  nodes.forEach((node) => {

    const level =
      levels.get(node.id) ?? 0


    if (!levelGroups.has(level)) {

      levelGroups.set(
        level,
        [],
      )
    }


    levelGroups
      .get(level)!
      .push(node)

  })


  /*
   * Position map used by React Flow.
   */
  const positions =
    new Map<
      string,
      {
        x: number
        y: number
      }
    >()


  /*
   * IMPORTANT:
   *
   * Vertical spacing is intentionally large
   * because ORBIT nodes contain descriptions
   * and therefore have variable height.
   */
  const LEVEL_HEIGHT = 220


  /*
   * Horizontal spacing between parallel tasks.
   */
  const NODE_WIDTH = 360


  /*
   * Center of the graph.
   */
  const CENTER_X = 500


  /*
   * Sort levels so the dependency structure
   * is always processed top → bottom.
   */
  const sortedLevels =
    Array.from(
      levelGroups.keys(),
    ).sort(
      (a, b) => a - b,
    )


  sortedLevels.forEach(
    (level) => {

      const group =
        levelGroups.get(level) ?? []


      /*
       * Keep the goal and final nodes centered.
       *
       * Parallel task groups are distributed
       * horizontally.
       */
      const count =
        group.length


      group.forEach(
        (node, index) => {

          let x = CENTER_X


          /*
           * One node at this dependency level:
           * keep it centered.
           */
          if (count === 1) {

            x = CENTER_X

          } else {

            /*
             * Multiple nodes:
             * spread them horizontally around
             * the center of the graph.
             */
            const offset =
              index -
              (count - 1) / 2


            x =
              CENTER_X +
              offset * NODE_WIDTH
          }


          /*
           * Every dependency level gets its
           * own vertical lane.
           */
          const y =
            level * LEVEL_HEIGHT


          positions.set(
            node.id,
            {
              x,
              y,
            },
          )

        },
      )

    },
  )


  return positions
}


/* =========================================================
   DEPENDENCY GRAPH
   ========================================================= */

function DependencyGraph({
  currentStage,
  nodes = [],
  edges = [],
}: DependencyGraphProps) {

  /*
   * If a workflow hasn't been generated yet,
   * show a minimal fallback.
   */
  const workflowNodes =
    nodes.length > 0
      ? nodes
      : [
          {
            id: 'goal',
            label: 'GOAL',
            description: 'Desired outcome',
            type: 'goal' as const,
          },
        ]


  const workflowEdges =
    edges


  /*
   * Build positions from the actual
   * dependency structure.
   */
  const positions =
    buildPositions(
      workflowNodes,
      workflowEdges,
    )


  /*
   * Convert ORBIT nodes into
   * React Flow nodes.
   */
  const reactNodes: OrbitReactNode[] =
    workflowNodes.map(
      (node) => {

        const active =
          isNodeActive(
            node,
            currentStage,
          )


        return {

          id: node.id,

          type: 'orbit',

          position:
            positions.get(node.id) ?? {
              x: 500,
              y: 0,
            },

          data: {
            label: node.label,
            description: node.description,
            type: node.type,
            tool: node.tool,
            active,
          },

          className: active
            ? 'active'
            : '',
        }
      },
    )


  /*
   * Convert ORBIT dependencies
   * into React Flow edges.
   */
  const reactEdges: Edge[] =
    workflowEdges.map(
      (edge) => {

        const sourceNode =
          workflowNodes.find(
            (node) =>
              node.id === edge.source,
          )


        const targetNode =
          workflowNodes.find(
            (node) =>
              node.id === edge.target,
          )


        const sourceActive =
          sourceNode
            ? isNodeActive(
                sourceNode,
                currentStage,
              )
            : false


        const targetActive =
          targetNode
            ? isNodeActive(
                targetNode,
                currentStage,
              )
            : false


        return {

          id: edge.id,

          source: edge.source,

          target: edge.target,

          animated:
            sourceActive &&
            targetActive,

          className:
            sourceActive &&
            targetActive
              ? 'active'
              : '',
        }
      },
    )


  return (

    <section className="dependency-graph">

      {/* HEADER */}

      <div className="dependency-header">

        <div>

          <span>
            DEPENDENCY GRAPH
          </span>

          <small>
            GOAL-GENERATED DECISION STRUCTURE
          </small>

        </div>


        <div className="dependency-stage">

          {currentStage.toUpperCase()}

        </div>

      </div>


      {/* GRAPH */}

      <div className="dependency-canvas">

        <ReactFlow
  key={`${reactNodes.map((node) => node.id).join('|')}-${reactEdges.length}`}
  nodes={reactNodes}
  edges={reactEdges}
  nodeTypes={nodeTypes}

          fitView

          fitViewOptions={{
            padding: 0.35,
            minZoom: 0.45,
            maxZoom: 1.1,
          }}

          nodesDraggable={false}
          nodesConnectable={false}
          zoomOnDoubleClick={false}

          proOptions={{
            hideAttribution: true,
          }}

        >

          <Background
            gap={24}
            size={1}
            color="rgba(96, 165, 250, 0.08)"
          />

          <Controls
            showInteractive={false}
          />

        </ReactFlow>

      </div>

    </section>
  )
}


export default DependencyGraph