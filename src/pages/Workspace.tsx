import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import AgentStatus from '../components/agent/AgentStatus'
import AgentStage from '../components/agent/AgentStage'
import AgentTimeline from '../components/agent/AgentTimeline'
import DependencyGraph from '../components/graph/DependencyGraph'

import { mockWorkflow } from '../data/mockWorkflow'

import {
  approveTask,
  rejectTask,
} from '../data/orbitApi'

import type {
  GeminiTask,
  GeminiWorkflow,
  WorkflowExecutionResult,
} from '../data/orbitApi'

import type {
  AgentEvent,
  RiskLevel,
  TaskStatus,
  WorkflowData,
  WorkflowEdge,
  WorkflowNode,
  WorkflowTask,
} from '../types/orbit'


interface WorkspaceProps {
  goal?: string
  workflow?: GeminiWorkflow | null
  executionResult?: WorkflowExecutionResult | null
  onReplan?: (changeDescription: string) => void
}


const stages = [
  'goal',
  'state',
  'plan',
  'act',
  'adapt',
  'verify',
] as const


/*
 * Convert Gemini risk values into the
 * frontend risk type.
 */
function normalizeRisk(
  risk: string,
): RiskLevel {
  const normalized =
    String(risk || '').toLowerCase()

  if (normalized === 'high') {
    return 'high'
  }

  if (normalized === 'medium') {
    return 'medium'
  }

  return 'low'
}


/*
 * Build the dependency graph from
 * the Gemini-generated workflow.
 */
function buildWorkflowGraph(
  workflow: GeminiWorkflow,
): {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
} {
  const nodes: WorkflowNode[] = []
  const edges: WorkflowEdge[] = []

  /*
   * GOAL node
   */
  nodes.push({
    id: 'goal-node',
    label: 'GOAL',
    description: workflow.goal,
    type: 'goal',
  })

  /*
   * TASK nodes
   */
  workflow.tasks.forEach((task) => {
    nodes.push({
      id: task.id,
      label: task.title,
      description: task.description,
      type: 'action',
      tool: task.tool,
    })
  })

  /*
   * VERIFY node
   */
  nodes.push({
    id: 'verify-node',
    label: 'VERIFY',
    description:
      workflow.verification.length > 0
        ? workflow.verification
            .map(
              (criterion) =>
                criterion.label,
            )
            .join(' • ')
        : 'Check whether the desired outcome has been achieved.',
    type: 'verify',
  })

  /*
   * OUTCOME node
   */
  nodes.push({
    id: 'outcome-node',
    label: 'OUTCOME',
    description: workflow.outcome,
    type: 'outcome',
  })

  /*
   * Connect tasks.
   */
  workflow.tasks.forEach((task) => {
    const dependencies =
      task.depends_on ?? []

    if (dependencies.length === 0) {
      edges.push({
        id: `goal-${task.id}`,
        source: 'goal-node',
        target: task.id,
      })
    }

    dependencies.forEach(
      (dependencyId) => {
        const dependencyExists =
          workflow.tasks.some(
            (candidate) =>
              candidate.id ===
              dependencyId,
          )

        if (!dependencyExists) {
          return
        }

        edges.push({
          id: `${dependencyId}-${task.id}`,
          source: dependencyId,
          target: task.id,
        })
      },
    )
  })

  /*
   * Find final tasks.
   */
  const dependencyIds = new Set(
    workflow.tasks.flatMap(
      (task) =>
        task.depends_on ?? [],
    ),
  )

  const finalTasks =
    workflow.tasks.filter(
      (task) =>
        !dependencyIds.has(task.id),
    )

  /*
   * Final tasks -> VERIFY
   */
  finalTasks.forEach((task) => {
    edges.push({
      id: `${task.id}-verify`,
      source: task.id,
      target: 'verify-node',
    })
  })

  /*
   * VERIFY -> OUTCOME
   */
  edges.push({
    id: 'verify-outcome',
    source: 'verify-node',
    target: 'outcome-node',
  })

  return {
    nodes,
    edges,
  }
}


/*
 * Convert Gemini workflow into the
 * existing frontend WorkflowData shape.
 */
function convertGeminiWorkflow(
  geminiWorkflow: GeminiWorkflow,
): WorkflowData {
  const graph =
    buildWorkflowGraph(
      geminiWorkflow,
    )

  const tasks: WorkflowTask[] =
    geminiWorkflow.tasks.map(
      (task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        tool: task.tool,
        status: 'pending',
        risk: normalizeRisk(
          task.risk,
        ),
        depends_on:
          task.depends_on ?? [],
      }),
    )

  const events: AgentEvent[] = []

  events.push({
    id: 'goal-understood',
    time: 'NOW',
    title: 'Goal understood',
    description:
      `ORBIT converted the request into an actionable outcome: ${geminiWorkflow.outcome}`,
    type: 'success',
  })

  events.push({
    id: 'state-identified',
    time: 'NOW',
    title: 'Required state identified',
    description:
      geminiWorkflow.current_state
        .length > 0
        ? geminiWorkflow.current_state.join(
            ' ',
          )
        : 'No additional current-state information was provided.',
    type: 'info',
  })

  events.push({
    id: 'dependencies-mapped',
    time: 'NOW',
    title: 'Dependencies mapped',
    description:
      `${geminiWorkflow.tasks.length} goal-specific tasks were generated with explicit task dependencies.`,
    type: 'success',
  })

  events.push({
    id: 'execution-plan-created',
    time: 'NOW',
    title: 'Execution plan created',
    description:
      geminiWorkflow.tasks.length >
      0
        ? `The first planned action is "${geminiWorkflow.tasks[0].title}".`
        : 'No executable tasks were generated.',
    type: 'active',
  })

  geminiWorkflow.tasks.forEach(
    (task, index) => {
      const dependencies =
        task.depends_on ?? []

      events.push({
        id: `task-${task.id}`,
        time: 'QUEUED',
        title: `Task ${index + 1}: ${task.title}`,
        description:
          dependencies.length > 0
            ? `Waiting for: ${dependencies.join(', ')}`
            : `Ready to execute using ${task.tool}.`,
        type:
          dependencies.length > 0
            ? 'info'
            : 'active',
      })
    },
  )

  return {
    goal: geminiWorkflow.goal,

    outcome: {
      title: 'Desired Outcome',
      description:
        geminiWorkflow.outcome,
      successCriteria:
        geminiWorkflow.verification.map(
          (criterion) =>
            criterion.label,
        ),
    },

    workflowType:
      'Gemini Goal Compilation',

    status: 'running',

    currentStage: 'goal',

    tasks,

    events,

    nodes: graph.nodes,

    edges: graph.edges,

    verification:
      geminiWorkflow.verification.map(
        (criterion) => ({
          id: criterion.id,
          label: criterion.label,
          description:
            criterion.description,
          status: 'pending',
        }),
      ),
  }
}


/*
 * Topological execution order.
 */
function getExecutionOrder(
  tasks: WorkflowTask[],
): WorkflowTask[] {
  const remaining = [...tasks]
  const ordered: WorkflowTask[] = []
  const completedIds =
    new Set<string>()

  while (remaining.length > 0) {
    const executableIndex =
      remaining.findIndex(
        (task) =>
          (task.depends_on ?? []).every(
            (dependencyId) =>
              completedIds.has(
                dependencyId,
              ),
          ),
      )

    /*
     * Safety fallback.
     */
    if (executableIndex === -1) {
      ordered.push(...remaining)
      break
    }

    const [task] =
      remaining.splice(
        executableIndex,
        1,
      )

    ordered.push(task)

    completedIds.add(task.id)
  }

  return ordered
}


/*
 * Convert backend task result
 * into frontend TaskStatus.
 */
function getBackendTaskStatus(
  executionResult: WorkflowExecutionResult,
  taskId: string,
): TaskStatus | null {
  const result =
    executionResult
      .workflow_execution
      .results.find(
        (item) =>
          item.task_id === taskId,
      )

  if (!result) {
    return null
  }

  const status =
    String(
      result.status || '',
    ).toLowerCase()

  const decision =
    String(
      result.decision || '',
    ).toLowerCase()

  const verification =
    (
      result as {
        verification?: {
          verified?: boolean
          status?: string
        }
      }
    ).verification

  /*
   * Verified task.
   */
  if (
    verification?.verified ===
      true ||
    verification?.status ===
      'passed'
  ) {
    return 'completed'
  }

  /*
   * Successful task.
   */
  if (status === 'success') {
    return 'completed'
  }

  /*
   * Approval required.
   */
  if (
    status === 'waiting' ||
    decision ===
      'approval_required'
  ) {
    return 'blocked'
  }

  /*
   * Failed or blocked.
   */
  if (
    status === 'error' ||
    status === 'blocked' ||
    status === 'failed'
  ) {
    return 'blocked'
  }

  return 'pending'
}


/*
 * Build timeline events from
 * real backend execution.
 */
function buildExecutionEvents(
  executionResult: WorkflowExecutionResult,
): AgentEvent[] {
  const results =
    executionResult
      .workflow_execution
      .results ?? []

  return results.map(
    (result, index) => {
      const status =
        String(
          result.status || '',
        ).toLowerCase()

      const decision =
        String(
          result.decision || '',
        ).toLowerCase()

      const verification =
        (
          result as {
            verification?: {
              verified?: boolean
              status?: string
              reason?: string
              evidence_count?: number
            }
          }
        ).verification

      let type:
        | 'success'
        | 'active'
        | 'info'
        | 'warning' =
        'info'

      if (
        verification?.verified ===
          true ||
        verification?.status ===
          'passed'
      ) {
        type = 'success'
      } else if (
        status === 'waiting' ||
        decision ===
          'approval_required'
      ) {
        type = 'warning'
      } else if (
        status === 'success'
      ) {
        type = 'success'
      } else if (
        status === 'error' ||
        status === 'blocked'
      ) {
        type = 'warning'
      }

      let description =
        `Backend status: ${status.toUpperCase()}.`

      if (result.tool) {
        description +=
          ` Tool: ${result.tool}.`
      }

      if (result.query) {
        description +=
          ` Query: "${result.query}".`
      }

      if (verification?.reason) {
        description +=
          ` ${verification.reason}`
      }

      if (
        typeof verification?.evidence_count ===
        'number'
      ) {
        description +=
          ` Evidence: ${verification.evidence_count}.`
      }

      if (result.reason) {
        description +=
          ` ${result.reason}`
      }

      if (result.message) {
        description +=
          ` ${result.message}`
      }

      return {
        id: `execution-${result.task_id}-${index}`,
        time: 'LIVE',
        title: `Executed: ${result.task_title}`,
        description,
        type,
      }
    },
  )
}


function Workspace({
  goal,
  workflow: geminiWorkflow,
  executionResult,
  onReplan,
}: WorkspaceProps) {

  /*
   * Use the real Gemini workflow.
   */
  const workflow =
    useMemo<WorkflowData>(() => {
      if (geminiWorkflow) {
        return convertGeminiWorkflow(
          geminiWorkflow,
        )
      }

      return mockWorkflow
    }, [
      geminiWorkflow,
      goal,
    ])

  /*
   * ORBIT visual stage.
   */
  const [
    stageIndex,
    setStageIndex,
  ] = useState(0)

  /*
   * Change detection state.
   */
  const [
    changeDetected,
    setChangeDetected,
  ] = useState(false)

  /*
   * Prevent repeated replanning
   * for the same goal.
   */
  const hasReplanned =
    useRef(false)

  /*
   * Track the current goal so a
   * genuinely new goal can reset
   * the replan guard.
   */
  const lastGoal =
    useRef<string | undefined>(
      goal,
    )

  /*
   * Human approval state.
   */
  const [
    approvalTask,
    setApprovalTask,
  ] = useState<GeminiTask | null>(
    null,
  )

  const [
    approvalLoading,
    setApprovalLoading,
  ] = useState(false)

  const [
    approvalMessage,
    setApprovalMessage,
  ] = useState('')

  const [
    approvalDecision,
    setApprovalDecision,
  ] = useState<
    | 'pending'
    | 'approved'
    | 'rejected'
    | null
  >(null)

  /*
   * Current ORBIT stage.
   */
  const currentStage =
    stages[stageIndex]

  /*
   * Reset UI when a new workflow
   * or goal arrives.
   *
   * IMPORTANT:
   * We do NOT reset hasReplanned when
   * only the workflow changes. This
   * prevents an infinite replan loop.
   */
  useEffect(() => {
    setStageIndex(0)
    setChangeDetected(false)

    setApprovalTask(null)
    setApprovalLoading(false)
    setApprovalMessage('')
    setApprovalDecision(null)

    if (lastGoal.current !== goal) {
      hasReplanned.current = false
      lastGoal.current = goal
    }
  }, [
    geminiWorkflow,
    goal,
  ])

  /*
   * Move through:
   * GOAL → STATE → PLAN → ACT
   * → ADAPT → VERIFY
   */
  useEffect(() => {
    if (
      stageIndex >=
      stages.length - 1
    ) {
      return
    }

    const timer =
      window.setTimeout(() => {
        setStageIndex(
          (current) =>
            current + 1,
        )
      }, 2500)

    return () => {
      window.clearTimeout(timer)
    }
  }, [stageIndex])

  /*
   * REAL ADAPT → REPLAN CONNECTION
   *
   * When ORBIT reaches ACT, we simulate
   * an external state change.
   *
   * The UI shows CHANGE DETECTED and
   * the existing App.tsx onReplan()
   * callback starts the real backend
   * replanning pipeline.
   */
  useEffect(() => {
    if (
      currentStage !== 'act' ||
      hasReplanned.current
    ) {
      return
    }

    const changeTimer =
      window.setTimeout(() => {
        /*
         * Lock this workflow against
         * repeated replanning.
         */
        hasReplanned.current =
          true

        /*
         * Preserve existing UI.
         */
        setChangeDetected(true)

        console.log(
          'ORBIT: External change detected.',
        )

        /*
         * Call the existing backend
         * replanning pipeline.
         */
        if (onReplan) {
          onReplan(
            'External state changed during execution. The current plan may no longer satisfy the original goal and must be replanned.',
          )
        }
      }, 1200)

    return () => {
      window.clearTimeout(
        changeTimer,
      )
    }
  }, [
    currentStage,
    onReplan,
  ])

  /*
   * Detect a high-risk task that
   * requires human approval.
   */
  useEffect(() => {
    if (!executionResult) {
      return
    }

    const waitingResult =
      (
        executionResult
          .workflow_execution
          .results ?? []
      ).find((result) => {
        const status =
          String(
            result.status || '',
          ).toLowerCase()

        const decision =
          String(
            result.decision || '',
          ).toLowerCase()

        return (
          status === 'waiting' ||
          decision ===
            'approval_required'
        )
      })

    if (
      !waitingResult ||
      !geminiWorkflow
    ) {
      return
    }

    const sourceTask =
      geminiWorkflow.tasks.find(
        (task) =>
          task.id ===
          waitingResult.task_id,
      )

    if (!sourceTask) {
      return
    }

    setApprovalTask(
      sourceTask,
    )

    setApprovalDecision(
      'pending',
    )

    setApprovalMessage(
      waitingResult.reason ||
        'This action requires human approval before ORBIT can continue.',
    )
  }, [
    executionResult,
    geminiWorkflow,
  ])

  /*
   * APPROVE ACTION
   */
  const handleApproveTask =
    async () => {
      if (
        !approvalTask ||
        approvalLoading
      ) {
        return
      }

      try {
        setApprovalLoading(true)

        setApprovalMessage(
          'Sending approval to ORBIT...',
        )

        const result =
          await approveTask(
            approvalTask,
          )

        const execution =
          result.execution

        setApprovalDecision(
          'approved',
        )

        setApprovalMessage(
          execution?.message ||
            result.message ||
            (
              execution?.status ===
              'blocked'
                ? 'Approval received. The requested external action is not implemented in the current MVP.'
                : 'Approval received by ORBIT.'
            ),
        )
      } catch (error) {
        console.error(
          'ORBIT approval failed:',
          error,
        )

        setApprovalMessage(
          error instanceof Error
            ? error.message
            : 'ORBIT could not process the approval.',
        )

        setApprovalDecision(
          'pending',
        )
      } finally {
        setApprovalLoading(
          false,
        )
      }
    }

  /*
   * REJECT ACTION
   */
  const handleRejectTask =
    async () => {
      if (
        !approvalTask ||
        approvalLoading
      ) {
        return
      }

      try {
        setApprovalLoading(true)

        setApprovalMessage(
          'Sending rejection to ORBIT...',
        )

        const result =
          await rejectTask(
            approvalTask.id,
          )

        setApprovalDecision(
          'rejected',
        )

        setApprovalMessage(
          result.message ||
            'Task rejected. ORBIT will not execute this action.',
        )
      } catch (error) {
        console.error(
          'ORBIT rejection failed:',
          error,
        )

        setApprovalMessage(
          error instanceof Error
            ? error.message
            : 'ORBIT could not process the rejection.',
        )

        setApprovalDecision(
          'pending',
        )
      } finally {
        setApprovalLoading(
          false,
        )
      }
    }

  /*
   * Workflow metrics.
   */
  const taskCount =
    workflow.tasks.length

  const toolCount =
    new Set(
      workflow.tasks.map(
        (task) => task.tool,
      ),
    ).size

  const riskLevels =
    workflow.tasks.map(
      (task) => task.risk,
    )

  const risk =
    riskLevels.includes('high')
      ? 'high'
      : riskLevels.includes(
          'medium',
        )
        ? 'medium'
        : 'low'

  /*
   * Backend execution events.
   */
  const executionEvents =
    useMemo(() => {
      if (!executionResult) {
        return []
      }

      return buildExecutionEvents(
        executionResult,
      )
    }, [
      executionResult,
    ])

  /*
   * Combine generated events
   * with backend events.
   */
  const allEvents =
    useMemo(
      () => [
        ...workflow.events,
        ...executionEvents,
      ],
      [
        workflow.events,
        executionEvents,
      ],
    )

  /*
   * Reveal timeline events.
   */
  const visibleEvents =
    executionResult
      ? allEvents
      : allEvents.slice(
          0,
          Math.min(
            stageIndex + 4,
            allEvents.length,
          ),
        )

  /*
   * Dependency-aware task order.
   */
  const executionOrder =
    useMemo(
      () =>
        getExecutionOrder(
          workflow.tasks,
        ),
      [workflow.tasks],
    )

  /*
   * Frontend visual simulation
   * while backend results are loading.
   */
  const simulatedTasks =
    workflow.tasks.map(
      (task) => {
        const executionIndex =
          executionOrder.findIndex(
            (candidate) =>
              candidate.id ===
              task.id,
          )

        /*
         * GOAL / STATE / PLAN
         */
        if (stageIndex < 3) {
          return {
            ...task,
            status:
              'pending' as TaskStatus,
          }
        }

        /*
         * ACT
         */
        if (
          stageIndex === 3 &&
          executionIndex === 0
        ) {
          return {
            ...task,
            status:
              'running' as TaskStatus,
          }
        }

        if (
          stageIndex === 3 &&
          executionIndex > 0
        ) {
          return {
            ...task,
            status:
              'pending' as TaskStatus,
          }
        }

        /*
         * ADAPT
         */
        if (
          stageIndex === 4 &&
          executionIndex === 0
        ) {
          return {
            ...task,
            status:
              'completed' as TaskStatus,
          }
        }

        if (
          stageIndex === 4 &&
          executionIndex === 1
        ) {
          return {
            ...task,
            status:
              'running' as TaskStatus,
          }
        }

        if (
          stageIndex === 4 &&
          executionIndex > 1
        ) {
          return {
            ...task,
            status:
              'pending' as TaskStatus,
          }
        }

        /*
         * VERIFY
         */
        if (stageIndex >= 5) {
          return {
            ...task,
            status:
              'completed' as TaskStatus,
          }
        }

        return {
          ...task,
          status:
            'pending' as TaskStatus,
        }
      },
    )

  /*
   * Backend status overrides
   * visual simulation.
   */
  const displayedTasks =
    workflow.tasks.map(
      (task) => {
        const backendStatus =
          executionResult
            ? getBackendTaskStatus(
                executionResult,
                task.id,
              )
            : null

        if (backendStatus) {
          return {
            ...task,
            status:
              backendStatus,
          }
        }

        const simulatedTask =
          simulatedTasks.find(
            (item) =>
              item.id === task.id,
          )

        return (
          simulatedTask || {
            ...task,
            status:
              'pending' as TaskStatus,
          }
        )
      },
    )

  /*
   * Backend verification results.
   */
  const verificationResults =
    executionResult
      ? executionResult
          .workflow_execution
          .results.map(
            (result) => ({
              taskId:
                result.task_id,

              taskTitle:
                result.task_title,

              status:
                result.status,

              verification:
                (
                  result as {
                    verification?: {
                      verified?: boolean
                      status?: string
                      reason?: string
                      evidence_count?: number
                    }
                  }
                ).verification,
            }),
          )
      : []

  /*
   * Backend workflow status.
   */
  const backendWorkflowStatus =
    executionResult
      ?.workflow_execution
      ?.status?.toLowerCase()

  const hasBackendExecution =
    Boolean(
      executionResult,
    )

  const backendCompleted =
    backendWorkflowStatus ===
      'completed' ||
    (
      executionResult !==
        null &&
      executionResult !==
        undefined &&
      executionResult
        .workflow_execution
        .completed_tasks
        .length ===
        taskCount
    )

  /*
   * Runtime status.
   */
  const runtimeStatus =
    hasBackendExecution
      ? backendCompleted
        ? 'COMPLETE'
        : 'EXECUTING'
      : stageIndex === 5
        ? 'COMPLETE'
        : 'EXECUTING'

  /*
   * Verification counts.
   */
  const verifiedCount =
    verificationResults.filter(
      (item) =>
        item.verification
          ?.verified === true ||
        item.verification
          ?.status === 'passed',
    ).length

  const verificationFailedCount =
    verificationResults.filter(
      (item) =>
        item.verification
          ?.verified === false ||
        item.verification
          ?.status === 'failed',
    ).length


  return (
    <main className="workspace-page">

      {/* =================================================
          WORKSPACE HEADER
          ================================================= */}

      <section className="workspace-header">

        <div>

          <div className="workspace-eyebrow">
            AUTONOMOUS EXECUTION ENVIRONMENT
          </div>

          <h1>
            ORBIT <span>WORKSPACE</span>
          </h1>

          <p>
            Observe how ORBIT understands, plans,
            executes, adapts and verifies your goal.
          </p>

          <div className="workspace-goal">
            <span>
              ACTIVE GOAL
            </span>

            <strong>
              {geminiWorkflow?.goal ||
                goal?.trim() ||
                workflow.goal}
            </strong>
          </div>

        </div>

        <div className="workspace-runtime">

          <span className="workspace-runtime-dot" />

          <div>

            <strong>
              ORBIT CORE
            </strong>

            <small>
              {runtimeStatus}
            </small>

          </div>

        </div>

      </section>


      {/* =================================================
          CHANGE DETECTION
          ================================================= */}

      {changeDetected &&
        !executionResult && (
          <section className="change-detection-panel">

            <div className="change-detection-icon">
              ⚠
            </div>

            <div className="change-detection-content">

              <strong>
                CHANGE DETECTED
              </strong>

              <p>
                External state changed during execution.
                The current plan may no longer satisfy the goal.
              </p>

            </div>

            <div className="change-detection-status">

              {currentStage === 'act'
                ? 'REPLAN REQUIRED'
                : currentStage === 'adapt'
                  ? 'REPLANNING'
                  : 'PLAN UPDATED'}

            </div>

          </section>
        )}


      {/* =================================================
          STATUS
          ================================================= */}

      <section className="workspace-status-grid">

        <AgentStatus
          status={runtimeStatus}
          stage={
            hasBackendExecution &&
            backendCompleted
              ? 'VERIFY'
              : currentStage.toUpperCase()
          }
          taskCount={taskCount}
          toolCount={toolCount}
          risk={risk}
        />

        <AgentStage
          currentStage={
            hasBackendExecution &&
            backendCompleted
              ? 'verify'
              : currentStage
          }
        />

      </section>


      {/* =================================================
          MAIN WORKSPACE
          ================================================= */}

      <section className="workspace-main-grid">

        <DependencyGraph
          currentStage={
            hasBackendExecution &&
            backendCompleted
              ? 'verify'
              : currentStage
          }
          nodes={workflow.nodes}
          edges={workflow.edges}
        />

        <AgentTimeline
          events={visibleEvents}
        />

      </section>


      {/* =================================================
          TASK EXECUTION
          ================================================= */}

      <section className="workspace-task-panel">

        <div className="workspace-panel-heading">

          <div>

            <span>
              TASK EXECUTION
            </span>

            <small>
              GOAL-SPECIFIC WORKFLOW
            </small>

          </div>

          <div className="workspace-task-count">
            {taskCount} TASKS
          </div>

        </div>


        <div className="workspace-task-list">

          {displayedTasks.map(
            (task, index) => (

              <div
                className={`workspace-task ${task.status}`}
                key={task.id}
              >

                <div className="workspace-task-number">
                  {String(index + 1).padStart(
                    2,
                    '0',
                  )}
                </div>

                <div className="workspace-task-info">

                  <strong>
                    {task.title}
                  </strong>

                  <span>
                    {task.description}
                  </span>

                </div>

                <div className="workspace-task-tool">
                  {task.tool}
                </div>

                <div
                  className={`workspace-task-status ${task.status}`}
                >

                  <span />

                  {task.status.toUpperCase()}

                </div>

              </div>

            ),
          )}

        </div>


        {/* =================================================
            HUMAN-IN-THE-LOOP APPROVAL
            ================================================= */}

        {approvalTask && (
          <div className="workspace-approval-panel">

            <div className="workspace-panel-heading">

              <div>

                <span>
                  HUMAN APPROVAL REQUIRED
                </span>

                <small>
                  HIGH-RISK ACTION GUARDRAIL
                </small>

              </div>

              <div className="workspace-task-count">

                {approvalDecision ===
                  'approved'
                  ? 'APPROVED'
                  : approvalDecision ===
                      'rejected'
                    ? 'REJECTED'
                    : 'ACTION PAUSED'}

              </div>

            </div>


            <div className="workspace-task approval-task">

              <div className="workspace-task-number">
                !
              </div>

              <div className="workspace-task-info">

                <strong>
                  {approvalTask.title}
                </strong>

                <span>
                  {approvalTask.description}
                </span>

              </div>

              <div className="workspace-task-tool">
                {approvalTask.tool}
              </div>

              <div className="workspace-task-status blocked">

                <span />

                HIGH RISK

              </div>

            </div>


            <p className="approval-message">
              {approvalMessage}
            </p>


            <div className="approval-actions">

              <button
                type="button"
                className="approval-button approval-button-reject"
                onClick={
                  handleRejectTask
                }
                disabled={
                  approvalLoading ||
                  approvalDecision ===
                    'rejected'
                }
              >
                {approvalLoading &&
                approvalDecision !==
                  'approved'
                  ? 'PROCESSING...'
                  : 'REJECT ACTION'}
              </button>


              <button
                type="button"
                className="approval-button approval-button-approve"
                onClick={
                  handleApproveTask
                }
                disabled={
                  approvalLoading ||
                  approvalDecision ===
                    'approved'
                }
              >
                {approvalLoading &&
                approvalDecision !==
                  'rejected'
                  ? 'PROCESSING...'
                  : 'APPROVE ACTION'}
              </button>

            </div>


            {approvalDecision ===
              'approved' && (
              <div className="approval-result-approved">
                APPROVAL RECORDED — ORBIT RECEIVED HUMAN AUTHORIZATION
              </div>
            )}


            {approvalDecision ===
              'rejected' && (
              <div className="approval-result-rejected">
                ACTION REJECTED — ORBIT WILL NOT PROCEED WITH THIS TASK
              </div>
            )}

          </div>
        )}


        {/* =================================================
            REAL VERIFICATION RESULT
            ================================================= */}

        {executionResult && (

          <div className="workspace-verification-summary">

            <div className="workspace-panel-heading">

              <div>

                <span>
                  VERIFICATION
                </span>

                <small>
                  BACKEND EVIDENCE CHECK
                </small>

              </div>

              <div className="workspace-task-count">
                {verifiedCount}/
                {verificationResults.length}
                {' '}
                VERIFIED
              </div>

            </div>


            {verificationResults.map(
              (item) => {

                const verified =
                  item.verification
                    ?.verified === true ||
                  item.verification
                    ?.status === 'passed'

                const failed =
                  item.verification
                    ?.verified === false ||
                  item.verification
                    ?.status === 'failed'

                return (

                  <div
                    key={`verification-${item.taskId}`}
                    className={`workspace-task ${
                      verified
                        ? 'completed'
                        : failed
                          ? 'blocked'
                          : 'pending'
                    }`}
                  >

                    <div className="workspace-task-number">
                      ✓
                    </div>

                    <div className="workspace-task-info">

                      <strong>
                        {item.taskTitle}
                      </strong>

                      <span>
                        {item.verification
                          ?.reason ||
                          'Verification result received from ORBIT backend.'}
                      </span>

                    </div>

                    <div className="workspace-task-tool">

                      {typeof item
                        .verification
                        ?.evidence_count ===
                        'number'
                        ? `${item.verification.evidence_count} EVIDENCE`
                        : 'VERIFICATION'}

                    </div>

                    <div
                      className={`workspace-task-status ${
                        verified
                          ? 'completed'
                          : failed
                            ? 'blocked'
                            : 'pending'
                      }`}
                    >

                      <span />

                      {verified
                        ? 'PASSED'
                        : failed
                          ? 'FAILED'
                          : 'PENDING'}

                    </div>

                  </div>

                )
              },
            )}

          </div>

        )}

      </section>


      {/* =================================================
          REAL EXECUTION SUMMARY
          ================================================= */}

      {executionResult && (

        <section className="workspace-system-bar">

          <div>

            <span className="system-bar-dot" />

            BACKEND EXECUTION

          </div>


          <div>

            <strong>
              {
                executionResult
                  .workflow_execution
                  .completed_tasks
                  .length
              }
            </strong>

            COMPLETED

          </div>


          <div>

            <strong>
              {verifiedCount}
            </strong>

            VERIFIED

          </div>


          <div>

            <strong>
              {verificationFailedCount}
            </strong>

            FAILED

          </div>


          <div>

            <strong>
              {runtimeStatus}
            </strong>

            STATUS

          </div>

        </section>

      )}


      {/* =================================================
          SYSTEM FOOTER
          ================================================= */}

      <section className="workspace-system-bar">

        <div>

          <span className="system-bar-dot" />

          STATE FRESH

        </div>


        <div>

          <strong>
            {toolCount}
          </strong>

          TOOLS

        </div>


        <div>

          <strong>
            {taskCount}
          </strong>

          TASKS

        </div>


        <div>

          <strong>
            {risk.toUpperCase()}
          </strong>

          RISK

        </div>


        <div>

          <strong>
            ACTIVE
          </strong>

          GUARDRAILS

        </div>

      </section>

    </main>
  )
}


export default Workspace