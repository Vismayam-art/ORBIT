import type { WorkflowData } from '../types/orbit'

export const mockWorkflow: WorkflowData = {
  goal: 'Prepare everything for my team presentation tomorrow.',
  status: 'running',
  currentStage: 'plan',

  tasks: [
    {
      id: 'task-1',
      title: 'Inspect calendar',
      description: 'Find tomorrow’s presentation-related events.',
      tool: 'Calendar',
      status: 'completed',
      risk: 'low',
    },
    {
      id: 'task-2',
      title: 'Find presentation files',
      description: 'Locate the latest presentation assets in Drive.',
      tool: 'Drive',
      status: 'completed',
      risk: 'low',
    },
    {
      id: 'task-3',
      title: 'Review team communication',
      description: 'Search recent email context for updates.',
      tool: 'Gmail',
      status: 'running',
      risk: 'low',
    },
    {
      id: 'task-4',
      title: 'Build preparation summary',
      description: 'Combine relevant information into an actionable brief.',
      tool: 'ORBIT',
      status: 'pending',
      risk: 'low',
    },
    {
      id: 'task-5',
      title: 'Verify outcome',
      description: 'Confirm all presentation requirements are satisfied.',
      tool: 'Verifier',
      status: 'pending',
      risk: 'low',
    },
  ],

  events: [
    {
      id: 'event-1',
      time: '20:41:02',
      title: 'Goal understood',
      description: 'Converted natural language into an actionable outcome.',
      type: 'success',
    },
    {
      id: 'event-2',
      time: '20:41:05',
      title: 'State collection started',
      description: 'Checking Calendar, Drive and Gmail.',
      type: 'success',
    },
    {
      id: 'event-3',
      time: '20:41:09',
      title: 'Dependencies mapped',
      description: 'Five execution tasks identified.',
      type: 'success',
    },
    {
      id: 'event-4',
      time: '20:41:13',
      title: 'Plan activated',
      description: 'Executing tasks based on current state.',
      type: 'active',
    },
    {
      id: 'event-5',
      time: '20:41:17',
      title: 'Gmail context requested',
      description: 'Searching recent team communication.',
      type: 'info',
    },
  ],
}