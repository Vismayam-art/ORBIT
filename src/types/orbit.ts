export type AgentStage =
  | 'goal'
  | 'state'
  | 'plan'
  | 'act'
  | 'adapt'
  | 'verify'


export type WorkflowStatus =
  | 'idle'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'attention'


export type TaskStatus =
  | 'pending'
  | 'running'
  | 'verifying'
  | 'completed'
  | 'blocked'

export type RiskLevel =
  | 'low'
  | 'medium'
  | 'high'


/*
 * A task that ORBIT can execute.
 */
export interface WorkflowTask {
  id: string
  title: string
  description: string
  tool: string
  status: TaskStatus
  risk: RiskLevel
  depends_on?: string[]
}


/*
 * An event generated during ORBIT execution.
 */
export interface AgentEvent {
  id: string
  time: string
  title: string
  description: string
  type:
    | 'success'
    | 'active'
    | 'info'
    | 'warning'
}


/*
 * Connected external tool/integration.
 */
export interface ConnectedTool {
  name: string
  description: string
  status:
    | 'connected'
    | 'ready'
    | 'offline'
  lastSync: string
}


/*
 * Types of nodes that can appear
 * in the dynamic ORBIT dependency graph.
 */
export type WorkflowNodeType =
  | 'goal'
  | 'state'
  | 'tool'
  | 'action'
  | 'decision'
  | 'adapt'
  | 'verify'
  | 'outcome'


/*
 * A node in the goal-specific dependency graph.
 */
export interface WorkflowNode {
  id: string
  label: string
  description: string
  type: WorkflowNodeType
  tool?: string
}


/*
 * A dependency between two workflow nodes.
 *
 * Example:
 *
 * Calendar → Check meeting
 *
 * means the Check meeting action
 * depends on Calendar state.
 */
export interface WorkflowEdge {
  id: string
  source: string
  target: string
}


/*
 * Defines what ORBIT considers
 * a successful final outcome.
 */
export interface VerificationCriterion {
  id: string
  label: string
  description: string
  status:
    | 'pending'
    | 'passed'
    | 'failed'
}


/*
 * The desired result ORBIT is trying
 * to achieve for the user.
 */
export interface WorkflowOutcome {
  title: string
  description: string
  successCriteria: string[]
}


/*
 * Complete workflow generated from
 * the user's goal.
 */
export interface WorkflowData {
  goal: string

  /*
   * What ORBIT intends to achieve.
   */
  outcome?: WorkflowOutcome

  /*
   * Allows us to identify which
   * goal pattern generated the workflow.
   *
   * Example:
   * presentation
   * meeting
   * research
   */
  workflowType?: string

  status: WorkflowStatus

  currentStage: AgentStage

  tasks: WorkflowTask[]

  events: AgentEvent[]

  /*
   * Dynamic dependency graph.
   */
  nodes?: WorkflowNode[]

  edges?: WorkflowEdge[]

  /*
   * Final outcome verification.
   */
  verification?: VerificationCriterion[]
}