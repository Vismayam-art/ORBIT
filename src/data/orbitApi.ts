const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://orbit-backend-xcg6.onrender.com"

const apiUrl = (path: string) =>
  `${API_BASE_URL}${path}`

import type {
  VerificationCriterion,
} from '../types/orbit'


// ============================================================
// GEMINI WORKFLOW TYPES
// ============================================================

export interface GeminiWorkflow {
  goal: string
  outcome: string
  constraints: string[]
  current_state: string[]
  tasks: GeminiTask[]
  verification: VerificationCriterion[]
}


export interface GeminiTask {
  id: string
  title: string
  description: string
  tool: string
  risk: string
  depends_on: string[]
}


// ============================================================
// COMPILE GOAL
// ============================================================

interface CompileGoalResponse {
  status: string
  workflow: GeminiWorkflow
}


export async function compileGoal(
  goal: string,
): Promise<GeminiWorkflow> {

  const response = await fetch(
    apiUrl('/compile-goal'),
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        goal,
      }),
    },
  )


  if (!response.ok) {
    throw new Error(
      `ORBIT backend error: ${response.status}`,
    )
  }


  const data: CompileGoalResponse =
    await response.json()


  if (data.status !== 'success') {
    throw new Error(
      'ORBIT failed to compile the goal',
    )
  }


  return data.workflow
}


// ============================================================
// WORKFLOW EXECUTION
// ============================================================

export interface WorkflowExecutionResult {

  status: string

  workflow_execution: {

    status: string

    completed_tasks: string[]

    results: Array<{

      task_id: string

      task_title: string

      status: string

      risk?: string

      decision?: string

      tool?: string

      query?: string

      evidence?: Array<{

        id: string

        sender: string

        subject: string

        date: string

        body: string

      }>

      reason?: string

      message?: string

      verification?: {

        verified?: boolean

        status?: string

        reason?: string

        evidence_count?: number

      }

    }>

  }

}


// ============================================================
// EXECUTE WORKFLOW
// ============================================================

export async function executeWorkflow(
  workflow: GeminiWorkflow,
): Promise<WorkflowExecutionResult> {

  const response = await fetch(
    apiUrl('/workflow/execute'),
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        workflow,
      }),
    },
  )


  if (!response.ok) {
    throw new Error(
      `ORBIT execution error: ${response.status}`,
    )
  }


  const data: WorkflowExecutionResult =
    await response.json()


  if (data.status !== 'success') {
    throw new Error(
      'ORBIT workflow execution failed',
    )
  }


  return data
}


// ============================================================
// REPLANNING
// ============================================================

export async function replanWorkflow(
  originalGoal: string,
  previousWorkflow: GeminiWorkflow,
  changeDescription: string,
): Promise<GeminiWorkflow> {

  const response = await fetch(
    apiUrl('/workflow/replan'),
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        original_goal: originalGoal,
        previous_workflow: previousWorkflow,
        change_description: changeDescription,
      }),
    },
  )


  if (!response.ok) {
    throw new Error(
      `ORBIT replanning error: ${response.status}`,
    )
  }


  const data = await response.json()


  if (data.status !== 'success') {
    throw new Error(
      data.message ||
      'ORBIT failed to replan the workflow',
    )
  }


  return data.workflow
}


// ============================================================
// APPROVAL
// ============================================================

export interface ApprovalResult {

  status: string

  execution?: {

    task_id?: string

    task_title?: string

    status?: string

    risk?: string

    decision?: string

    tool?: string

    query?: string

    evidence?: Array<{

      id: string

      sender: string

      subject: string

      date: string

      body: string

    }>

    reason?: string

    message?: string

    verification?: {

      verified?: boolean

      status?: string

      reason?: string

      evidence_count?: number

    }

  }

  message?: string
}


// ============================================================
// APPROVE TASK
// ============================================================

export async function approveTask(
  task: GeminiTask,
): Promise<ApprovalResult> {

  const response = await fetch(
    apiUrl('/approval/approve'),
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        task,
      }),
    },
  )


  if (!response.ok) {
    throw new Error(
      `ORBIT approval error: ${response.status}`,
    )
  }


  const data: ApprovalResult =
    await response.json()


  if (data.status !== 'success') {
    throw new Error(
      data.message ||
      'ORBIT could not approve the task',
    )
  }


  return data
}


// ============================================================
// REJECT TASK
// ============================================================

export async function rejectTask(
  taskId: string,
): Promise<ApprovalResult> {

  const response = await fetch(
    apiUrl('/approval/reject'),
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        task_id: taskId,
      }),
    },
  )


  if (!response.ok) {
    throw new Error(
      `ORBIT rejection error: ${response.status}`,
    )
  }


  const data: ApprovalResult =
    await response.json()


  if (data.status !== 'success') {
    throw new Error(
      data.message ||
      'ORBIT could not reject the task',
    )
  }


  return data
}