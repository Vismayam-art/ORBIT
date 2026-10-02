import type {
  WorkflowData,
  WorkflowEdge,
  WorkflowNode,
  WorkflowTask,
  VerificationCriterion,
} from '../types/orbit'


/*
 * =========================================================
 * ORBIT GENERAL-PURPOSE WORKFLOW GENERATOR
 * =========================================================
 *
 * ORBIT does not maintain one fixed workflow for each task.
 *
 * Instead:
 *
 * USER GOAL
 *    ↓
 * OUTCOME
 *    ↓
 * STATE
 *    ↓
 * DEPENDENCIES
 *    ↓
 * ACTIONS
 *    ↓
 * ADAPT / REPLAN
 *    ↓
 * VERIFY
 *
 * This is currently a deterministic planning layer.
 * Later, the same interface can be connected to Gemini
 * or another reasoning model without changing the UI.
 */


/* =========================================================
   INTERNAL TYPES
   ========================================================= */

type Intent =
  | 'study'
  | 'schedule'
  | 'research'
  | 'create'
  | 'plan'
  | 'analyze'
  | 'apply'
  | 'organize'
  | 'problem-solving'
  | 'generic'


interface PlanStep {
  id: string
  label: string
  description: string
  type: WorkflowNode['type']
  tool?: string
  taskTitle?: string
  taskDescription?: string
  risk?: WorkflowTask['risk']
}


/* =========================================================
   TEXT HELPERS
   ========================================================= */

function normalizeGoal(goal: string): string {
  return goal
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}


function containsAny(
  text: string,
  words: string[],
): boolean {
  return words.some((word) =>
    text.includes(word),
  )
}


/* =========================================================
   INTENT DETECTION
   ========================================================= */

function detectIntent(goal: string): Intent {

  const text = normalizeGoal(goal)


  /*
   * STUDY / LEARNING
   */

  if (
    containsAny(text, [
      'study',
      'test',
      'exam',
      'learn',
      'revise',
      'revision',
      'prepare for',
      'practice',
      'dsa',
      'coding test',
      'interview preparation',
      'interview prep',
    ])
  ) {
    return 'study'
  }


  /*
   * SCHEDULING
   */

  if (
    containsAny(text, [
      'meeting',
      'meet',
      'schedule',
      'calendar',
      'google meet',
      'appointment',
      'call',
      'book a time',
    ])
  ) {
    return 'schedule'
  }


  /*
   * RESEARCH
   */

  if (
    containsAny(text, [
      'research',
      'investigate',
      'find information',
      'study the topic',
      'analyze the topic',
      'explore',
      'look into',
      'find out',
    ])
  ) {
    return 'research'
  }


  /*
   * APPLICATION / JOB
   */

  if (
    containsAny(text, [
      'internship',
      'job application',
      'apply',
      'application',
      'resume',
      'cv',
      'cover letter',
      'placement',
    ])
  ) {
    return 'apply'
  }


  /*
   * CREATION
   */

  if (
    containsAny(text, [
      'build',
      'create',
      'develop',
      'make',
      'design',
      'website',
      'application',
      'app',
      'project',
      'presentation',
      'slides',
      'report',
      'document',
    ])
  ) {
    return 'create'
  }


  /*
   * PLANNING
   */

  if (
    containsAny(text, [
      'plan',
      'organize',
      'prepare',
      'arrange',
      'trip',
      'travel',
      'event',
      'roadmap',
    ])
  ) {
    return 'plan'
  }


  /*
   * ANALYSIS
   */

  if (
    containsAny(text, [
      'analyze',
      'analyse',
      'compare',
      'evaluate',
      'review',
      'audit',
      'understand',
    ])
  ) {
    return 'analyze'
  }


  /*
   * ORGANIZATION
   */

  if (
    containsAny(text, [
      'organize',
      'sort',
      'clean',
      'manage',
      'arrange files',
      'organize files',
    ])
  ) {
    return 'organize'
  }


  /*
   * DEFAULT
   */

  return 'generic'
}


/* =========================================================
   OUTCOME GENERATION
   ========================================================= */

function createOutcome(
  goal: string,
  intent: Intent,
) {

  const outcomes: Record<
    Intent,
    {
      title: string
      description: string
    }
  > = {

    study: {
      title: 'Preparation complete',
      description:
        'The required preparation has been completed and readiness has been verified.',
    },

    schedule: {
      title: 'Schedule successfully arranged',
      description:
        'A suitable schedule has been identified and verified.',
    },

    research: {
      title: 'Research result ready',
      description:
        'Relevant information has been collected, analyzed and verified.',
    },

    create: {
      title: 'Requested deliverable ready',
      description:
        'The requested deliverable has been created and checked.',
    },

    plan: {
      title: 'Plan ready',
      description:
        'A structured plan has been created and verified against the goal.',
    },

    analyze: {
      title: 'Analysis complete',
      description:
        'The relevant information has been analyzed and the result verified.',
    },

    apply: {
      title: 'Application ready',
      description:
        'The application materials have been prepared and checked.',
    },

    organize: {
      title: 'Organization complete',
      description:
        'The requested information or resources have been organized and verified.',
    },

    'problem-solving': {
      title: 'Solution verified',
      description:
        'A solution has been developed and checked against the required outcome.',
    },

    generic: {
      title: 'Goal completed',
      description:
        'The requested outcome has been executed and verified.',
    },
  }


  const outcome = outcomes[intent]


  return {
    title: outcome.title,

    description:
      `${outcome.description} Goal: ${goal}`,

    successCriteria: [
      'Goal requirements understood',
      'Required state collected',
      'Execution completed',
      'Final outcome verified',
    ],
  }
}


/* =========================================================
   PLAN BUILDERS
 * ========================================================= */

function getPlan(
  intent: Intent,
  goal: string,
): PlanStep[] {

  /*
   * -------------------------------------------------------
   * STUDY
   * -------------------------------------------------------
   */

  if (intent === 'study') {

    return [

      {
        id: 'scope',
        label: 'UNDERSTAND SCOPE',
        description:
          'Identify the topics, requirements and constraints of the preparation goal.',
        type: 'state',
        tool: 'ORBIT',
        taskTitle: 'Identify preparation scope',
        taskDescription:
          `Determine what must be covered for: ${goal}`,
        risk: 'low',
      },

      {
        id: 'assessment',
        label: 'ASSESS CURRENT STATE',
        description:
          'Determine current preparation level and identify knowledge gaps.',
        type: 'action',
        tool: 'ORBIT',
        taskTitle: 'Assess current preparation',
        taskDescription:
          'Identify strengths, weaknesses and unfinished areas.',
        risk: 'low',
      },

      {
        id: 'gaps',
        label: 'IDENTIFY GAPS',
        description:
          'Prioritize weak or incomplete areas.',
        type: 'decision',
        tool: 'ORBIT',
        taskTitle: 'Prioritize weak areas',
        taskDescription:
          'Determine which areas require the most attention.',
        risk: 'low',
      },

      {
        id: 'plan',
        label: 'BUILD STUDY PLAN',
        description:
          'Create an execution plan based on scope, time and gaps.',
        type: 'action',
        tool: 'ORBIT',
        taskTitle: 'Build study plan',
        taskDescription:
          'Create an ordered preparation plan.',
        risk: 'low',
      },

      {
        id: 'practice',
        label: 'PRACTICE',
        description:
          'Execute targeted practice based on identified gaps.',
        type: 'action',
        tool: 'ORBIT',
        taskTitle: 'Practice relevant problems',
        taskDescription:
          'Work through exercises relevant to the preparation goal.',
        risk: 'low',
      },

      {
        id: 'revision',
        label: 'REVISE',
        description:
          'Review weak areas and consolidate learning.',
        type: 'action',
        tool: 'ORBIT',
        taskTitle: 'Revise weak areas',
        taskDescription:
          'Review mistakes and reinforce weak concepts.',
        risk: 'low',
      },

      {
        id: 'adapt',
        label: 'REPLAN',
        description:
          'Adjust the preparation strategy if progress or available time changes.',
        type: 'adapt',
        tool: 'ORBIT',
        taskTitle: 'Adapt preparation plan',
        taskDescription:
          'Reprioritize the plan based on the latest preparation state.',
        risk: 'low',
      },

      {
        id: 'verify',
        label: 'VERIFY READINESS',
        description:
          'Check whether the preparation requirements have been satisfied.',
        type: 'verify',
        tool: 'Verifier',
        taskTitle: 'Verify readiness',
        taskDescription:
          'Confirm that the preparation goal has been satisfied.',
        risk: 'low',
      },

      {
        id: 'outcome',
        label: 'READY',
        description:
          'Preparation outcome has been verified.',
        type: 'outcome',
        tool: 'ORBIT',
      },

    ]
  }


  /*
   * -------------------------------------------------------
   * SCHEDULING
   * -------------------------------------------------------
   */

  if (intent === 'schedule') {

    return [

      {
        id: 'requirements',
        label: 'UNDERSTAND REQUIREMENTS',
        description:
          'Identify participants, timing and scheduling constraints.',
        type: 'state',
        tool: 'ORBIT',
        taskTitle: 'Identify scheduling requirements',
        taskDescription:
          'Determine participants, preferred timing and constraints.',
        risk: 'low',
      },

      {
        id: 'calendar',
        label: 'CHECK AVAILABILITY',
        description:
          'Inspect calendar state for suitable time windows.',
        type: 'tool',
        tool: 'Calendar',
        taskTitle: 'Check calendar availability',
        taskDescription:
          'Find available time windows for the requested schedule.',
        risk: 'low',
      },

      {
        id: 'constraints',
        label: 'CHECK CONSTRAINTS',
        description:
          'Apply timing and participant constraints.',
        type: 'decision',
        tool: 'ORBIT',
        taskTitle: 'Check scheduling constraints',
        taskDescription:
          'Remove time options that violate known constraints.',
        risk: 'low',
      },

      {
        id: 'options',
        label: 'GENERATE OPTIONS',
        description:
          'Generate viable scheduling options.',
        type: 'action',
        tool: 'ORBIT',
        taskTitle: 'Generate scheduling options',
        taskDescription:
          'Create suitable options from the current scheduling state.',
        risk: 'low',
      },

      {
        id: 'adapt',
        label: 'REPLAN',
        description:
          'Generate new options if calendar state changes.',
        type: 'adapt',
        tool: 'ORBIT',
        taskTitle: 'Replan schedule',
        taskDescription:
          'Regenerate options using the updated state.',
        risk: 'low',
      },

      {
        id: 'verify',
        label: 'VERIFY',
        description:
          'Confirm that the selected option satisfies the requirements.',
        type: 'verify',
        tool: 'Verifier',
        taskTitle: 'Verify selected schedule',
        taskDescription:
          'Confirm the selected schedule satisfies all known constraints.',
        risk: 'low',
      },

      {
        id: 'outcome',
        label: 'SCHEDULE READY',
        description:
          'The requested schedule has been verified.',
        type: 'outcome',
        tool: 'ORBIT',
      },

    ]
  }


  /*
   * -------------------------------------------------------
   * RESEARCH
   * -------------------------------------------------------
   */

  if (intent === 'research') {

    return [

      {
        id: 'scope',
        label: 'DEFINE QUESTION',
        description:
          'Clarify the information required to satisfy the goal.',
        type: 'state',
        tool: 'ORBIT',
        taskTitle: 'Define research scope',
        taskDescription:
          `Determine the information required for: ${goal}`,
        risk: 'low',
      },

      {
        id: 'sources',
        label: 'FIND SOURCES',
        description:
          'Identify relevant information sources.',
        type: 'tool',
        tool: 'Web Search',
        taskTitle: 'Find relevant sources',
        taskDescription:
          'Search available information sources.',
        risk: 'low',
      },

      {
        id: 'evidence',
        label: 'COLLECT EVIDENCE',
        description:
          'Gather relevant information and supporting evidence.',
        type: 'action',
        tool: 'Web Search',
        taskTitle: 'Collect evidence',
        taskDescription:
          'Gather information required to answer the research goal.',
        risk: 'low',
      },

      {
        id: 'analysis',
        label: 'ANALYZE',
        description:
          'Compare, organize and interpret the collected information.',
        type: 'action',
        tool: 'ORBIT',
        taskTitle: 'Analyze findings',
        taskDescription:
          'Analyze the collected information and identify relevant insights.',
        risk: 'low',
      },

      {
        id: 'synthesis',
        label: 'BUILD RESULT',
        description:
          'Turn findings into a useful result.',
        type: 'action',
        tool: 'ORBIT',
        taskTitle: 'Build research result',
        taskDescription:
          'Create a structured result from the analyzed evidence.',
        risk: 'low',
      },

      {
        id: 'adapt',
        label: 'REPLAN',
        description:
          'Search for additional evidence when the current information is insufficient.',
        type: 'adapt',
        tool: 'ORBIT',
        taskTitle: 'Expand research path',
        taskDescription:
          'Collect additional evidence if gaps are detected.',
        risk: 'low',
      },

      {
        id: 'verify',
        label: 'VERIFY EVIDENCE',
        description:
          'Check completeness and evidence coverage.',
        type: 'verify',
        tool: 'Verifier',
        taskTitle: 'Verify research result',
        taskDescription:
          'Check whether the final result is sufficiently supported.',
        risk: 'low',
      },

      {
        id: 'outcome',
        label: 'RESULT READY',
        description:
          'Verified research result.',
        type: 'outcome',
        tool: 'ORBIT',
      },

    ]
  }


  /*
   * -------------------------------------------------------
   * CREATION
   * -------------------------------------------------------
   */

  if (intent === 'create') {

    return [

      {
        id: 'requirements',
        label: 'UNDERSTAND REQUIREMENTS',
        description:
          'Identify what must be created and the constraints around it.',
        type: 'state',
        tool: 'ORBIT',
        taskTitle: 'Understand requirements',
        taskDescription:
          `Determine requirements for: ${goal}`,
        risk: 'low',
      },

      {
        id: 'resources',
        label: 'COLLECT RESOURCES',
        description:
          'Find relevant files, references and existing material.',
        type: 'tool',
        tool: 'Drive',
        taskTitle: 'Collect required resources',
        taskDescription:
          'Find existing material that can support the deliverable.',
        risk: 'low',
      },

      {
        id: 'plan',
        label: 'DESIGN APPROACH',
        description:
          'Determine the structure and execution approach.',
        type: 'action',
        tool: 'ORBIT',
        taskTitle: 'Design execution approach',
        taskDescription:
          'Create a practical approach for producing the requested result.',
        risk: 'low',
      },

      {
        id: 'execute',
        label: 'CREATE',
        description:
          'Produce the requested deliverable.',
        type: 'action',
        tool: 'ORBIT',
        taskTitle: 'Create deliverable',
        taskDescription:
          'Execute the planned creation steps.',
        risk: 'medium',
      },

      {
        id: 'review',
        label: 'REVIEW',
        description:
          'Inspect the generated result for issues.',
        type: 'decision',
        tool: 'ORBIT',
        taskTitle: 'Review deliverable',
        taskDescription:
          'Check the result against the requirements.',
        risk: 'low',
      },

      {
        id: 'adapt',
        label: 'REPLAN',
        description:
          'Modify the creation path if requirements or state change.',
        type: 'adapt',
        tool: 'ORBIT',
        taskTitle: 'Adapt creation plan',
        taskDescription:
          'Update the execution plan based on newly discovered requirements.',
        risk: 'medium',
      },

      {
        id: 'verify',
        label: 'VERIFY',
        description:
          'Confirm that the requested deliverable satisfies the goal.',
        type: 'verify',
        tool: 'Verifier',
        taskTitle: 'Verify deliverable',
        taskDescription:
          'Confirm the final result satisfies the defined requirements.',
        risk: 'low',
      },

      {
        id: 'outcome',
        label: 'DELIVERABLE READY',
        description:
          'Requested deliverable is ready.',
        type: 'outcome',
        tool: 'ORBIT',
      },

    ]
  }


  /*
   * -------------------------------------------------------
   * APPLICATION / JOB
   * -------------------------------------------------------
   */

  if (intent === 'apply') {

    return [

      {
        id: 'requirements',
        label: 'CHECK REQUIREMENTS',
        description:
          'Identify application requirements, qualifications and deadlines.',
        type: 'state',
        tool: 'Web Search',
        taskTitle: 'Check application requirements',
        taskDescription:
          'Identify the requirements relevant to the application.',
        risk: 'low',
      },

      {
        id: 'profile',
        label: 'CHECK PROFILE',
        description:
          'Inspect available resume, skills and experience.',
        type: 'tool',
        tool: 'Drive',
        taskTitle: 'Inspect application profile',
        taskDescription:
          'Review available resume and supporting material.',
        risk: 'low',
      },

      {
        id: 'gaps',
        label: 'IDENTIFY GAPS',
        description:
          'Compare requirements with the available profile.',
        type: 'decision',
        tool: 'ORBIT',
        taskTitle: 'Identify application gaps',
        taskDescription:
          'Determine which requirements need attention.',
        risk: 'low',
      },

      {
        id: 'tailor',
        label: 'TAILOR MATERIALS',
        description:
          'Adapt application material to the requirements.',
        type: 'action',
        tool: 'ORBIT',
        taskTitle: 'Tailor application materials',
        taskDescription:
          'Prepare relevant resume, cover letter or supporting material.',
        risk: 'medium',
      },

      {
        id: 'review',
        label: 'REVIEW APPLICATION',
        description:
          'Check the application before submission.',
        type: 'decision',
        tool: 'ORBIT',
        taskTitle: 'Review application',
        taskDescription:
          'Check completeness and alignment with requirements.',
        risk: 'low',
      },

      {
        id: 'adapt',
        label: 'REPLAN',
        description:
          'Adjust the application strategy if requirements change.',
        type: 'adapt',
        tool: 'ORBIT',
        taskTitle: 'Adapt application strategy',
        taskDescription:
          'Update the application plan using the latest requirements.',
        risk: 'medium',
      },

      {
        id: 'verify',
        label: 'VERIFY',
        description:
          'Confirm the application is complete.',
        type: 'verify',
        tool: 'Verifier',
        taskTitle: 'Verify application',
        taskDescription:
          'Confirm that required materials and information are present.',
        risk: 'low',
      },

      {
        id: 'outcome',
        label: 'APPLICATION READY',
        description:
          'Application is prepared and verified.',
        type: 'outcome',
        tool: 'ORBIT',
      },

    ]
  }


  /*
   * -------------------------------------------------------
   * ANALYSIS
   * -------------------------------------------------------
   */

  if (intent === 'analyze') {

    return [

      {
        id: 'scope',
        label: 'DEFINE ANALYSIS',
        description:
          'Determine what needs to be evaluated.',
        type: 'state',
        tool: 'ORBIT',
        taskTitle: 'Define analysis scope',
        taskDescription:
          `Determine the analysis requirements for: ${goal}`,
        risk: 'low',
      },

      {
        id: 'collect',
        label: 'COLLECT DATA',
        description:
          'Gather relevant information.',
        type: 'tool',
        tool: 'Drive',
        taskTitle: 'Collect relevant data',
        taskDescription:
          'Gather the information required for analysis.',
        risk: 'low',
      },

      {
        id: 'analyze',
        label: 'ANALYZE',
        description:
          'Process and interpret the collected information.',
        type: 'action',
        tool: 'ORBIT',
        taskTitle: 'Analyze information',
        taskDescription:
          'Evaluate the collected information.',
        risk: 'low',
      },

      {
        id: 'compare',
        label: 'COMPARE RESULTS',
        description:
          'Identify meaningful differences or patterns.',
        type: 'decision',
        tool: 'ORBIT',
        taskTitle: 'Compare findings',
        taskDescription:
          'Compare relevant results and identify patterns.',
        risk: 'low',
      },

      {
        id: 'adapt',
        label: 'REPLAN',
        description:
          'Collect additional information if the analysis is incomplete.',
        type: 'adapt',
        tool: 'ORBIT',
        taskTitle: 'Adapt analysis',
        taskDescription:
          'Update the analysis path if new information is required.',
        risk: 'low',
      },

      {
        id: 'verify',
        label: 'VERIFY',
        description:
          'Confirm that the analysis answers the original goal.',
        type: 'verify',
        tool: 'Verifier',
        taskTitle: 'Verify analysis',
        taskDescription:
          'Confirm that the analysis satisfies the goal.',
        risk: 'low',
      },

      {
        id: 'outcome',
        label: 'ANALYSIS READY',
        description:
          'Verified analysis result.',
        type: 'outcome',
        tool: 'ORBIT',
      },

    ]
  }


  /*
   * -------------------------------------------------------
   * GENERIC PLANNING
   * -------------------------------------------------------
   */

  if (intent === 'plan') {

    return [

      {
        id: 'requirements',
        label: 'UNDERSTAND GOAL',
        description:
          'Determine the desired outcome and constraints.',
        type: 'state',
        tool: 'ORBIT',
        taskTitle: 'Understand goal',
        taskDescription:
          `Define what success means for: ${goal}`,
        risk: 'low',
      },

      {
        id: 'state',
        label: 'COLLECT STATE',
        description:
          'Gather information required to create the plan.',
        type: 'tool',
        tool: 'ORBIT',
        taskTitle: 'Collect current state',
        taskDescription:
          'Gather relevant information and constraints.',
        risk: 'low',
      },

      {
        id: 'options',
        label: 'GENERATE OPTIONS',
        description:
          'Create possible approaches.',
        type: 'action',
        tool: 'ORBIT',
        taskTitle: 'Generate possible approaches',
        taskDescription:
          'Create viable ways to achieve the desired outcome.',
        risk: 'low',
      },

      {
        id: 'decision',
        label: 'SELECT APPROACH',
        description:
          'Choose an approach based on the goal and constraints.',
        type: 'decision',
        tool: 'ORBIT',
        taskTitle: 'Select execution approach',
        taskDescription:
          'Choose the most suitable approach based on available information.',
        risk: 'low',
      },

      {
        id: 'adapt',
        label: 'REPLAN',
        description:
          'Adjust the plan when the current state changes.',
        type: 'adapt',
        tool: 'ORBIT',
        taskTitle: 'Adapt plan',
        taskDescription:
          'Update the plan when new information appears.',
        risk: 'low',
      },

      {
        id: 'verify',
        label: 'VERIFY PLAN',
        description:
          'Confirm that the plan satisfies the goal.',
        type: 'verify',
        tool: 'Verifier',
        taskTitle: 'Verify plan',
        taskDescription:
          'Check that the plan addresses the required outcome.',
        risk: 'low',
      },

      {
        id: 'outcome',
        label: 'PLAN READY',
        description:
          'Verified plan.',
        type: 'outcome',
        tool: 'ORBIT',
      },

    ]
  }


  /*
   * -------------------------------------------------------
   * ORGANIZATION
   * -------------------------------------------------------
   */

  if (intent === 'organize') {

    return [

      {
        id: 'scope',
        label: 'UNDERSTAND ORGANIZATION',
        description:
          'Determine what needs to be organized and according to which criteria.',
        type: 'state',
        tool: 'ORBIT',
        taskTitle: 'Define organization criteria',
        taskDescription:
          'Determine how the requested information should be organized.',
        risk: 'low',
      },

      {
        id: 'collect',
        label: 'COLLECT ITEMS',
        description:
          'Gather relevant items or information.',
        type: 'tool',
        tool: 'Drive',
        taskTitle: 'Collect relevant items',
        taskDescription:
          'Gather the items that need to be organized.',
        risk: 'low',
      },

      {
        id: 'organize',
        label: 'ORGANIZE',
        description:
          'Apply the defined structure.',
        type: 'action',
        tool: 'ORBIT',
        taskTitle: 'Organize items',
        taskDescription:
          'Apply the selected organization structure.',
        risk: 'medium',
      },

      {
        id: 'review',
        label: 'REVIEW',
        description:
          'Inspect the organization result.',
        type: 'decision',
        tool: 'ORBIT',
        taskTitle: 'Review organization',
        taskDescription:
          'Check whether the organization satisfies the goal.',
        risk: 'low',
      },

      {
        id: 'adapt',
        label: 'REPLAN',
        description:
          'Adjust organization if requirements change.',
        type: 'adapt',
        tool: 'ORBIT',
        taskTitle: 'Adapt organization',
        taskDescription:
          'Modify the organization strategy when necessary.',
        risk: 'medium',
      },

      {
        id: 'verify',
        label: 'VERIFY',
        description:
          'Confirm the final organization.',
        type: 'verify',
        tool: 'Verifier',
        taskTitle: 'Verify organization',
        taskDescription:
          'Confirm that the organization satisfies the goal.',
        risk: 'low',
      },

      {
        id: 'outcome',
        label: 'ORGANIZATION READY',
        description:
          'Organization completed.',
        type: 'outcome',
        tool: 'ORBIT',
      },

    ]
  }


  /*
   * -------------------------------------------------------
   * GENERIC
   * -------------------------------------------------------
   */

  return [

    {
      id: 'understand',
      label: 'UNDERSTAND GOAL',
      description:
        'Convert the natural-language request into a measurable outcome.',
      type: 'state',
      tool: 'ORBIT',
      taskTitle: 'Understand goal',
      taskDescription:
        `Convert the request into an actionable objective: ${goal}`,
      risk: 'low',
    },

    {
      id: 'state',
      label: 'COLLECT CURRENT STATE',
      description:
        'Determine what information, resources and constraints are relevant.',
      type: 'state',
      tool: 'ORBIT',
      taskTitle: 'Collect current state',
      taskDescription:
        'Gather the information required to plan the goal.',
      risk: 'low',
    },

    {
      id: 'dependencies',
      label: 'MAP DEPENDENCIES',
      description:
        'Determine which actions and resources are required.',
      type: 'decision',
      tool: 'ORBIT',
      taskTitle: 'Map dependencies',
      taskDescription:
        'Identify the actions and dependencies required for the outcome.',
      risk: 'low',
    },

    {
      id: 'plan',
      label: 'BUILD PLAN',
      description:
        'Create an executable sequence of actions.',
      type: 'action',
      tool: 'ORBIT',
      taskTitle: 'Build execution plan',
      taskDescription:
        'Generate an ordered plan for achieving the goal.',
      risk: 'low',
    },

    {
      id: 'execute',
      label: 'EXECUTE',
      description:
        'Perform the actions required by the generated plan.',
      type: 'action',
      tool: 'ORBIT',
      taskTitle: 'Execute plan',
      taskDescription:
        'Perform the required actions.',
      risk: 'medium',
    },

    {
      id: 'adapt',
      label: 'REPLAN',
      description:
        'Adjust the workflow when the observed state differs from the plan.',
      type: 'adapt',
      tool: 'ORBIT',
      taskTitle: 'Adapt workflow',
      taskDescription:
        'Rebuild the plan using the latest state.',
      risk: 'medium',
    },

    {
      id: 'verify',
      label: 'VERIFY OUTCOME',
      description:
        'Confirm that the requested outcome has actually been achieved.',
      type: 'verify',
      tool: 'Verifier',
      taskTitle: 'Verify outcome',
      taskDescription:
        'Check the final state against the original goal.',
      risk: 'low',
    },

    {
      id: 'outcome',
      label: 'OUTCOME READY',
      description:
        'The requested outcome has been verified.',
      type: 'outcome',
      tool: 'ORBIT',
    },

  ]
}


/* =========================================================
   NODE CREATION
   ========================================================= */

function createNodes(
  plan: PlanStep[],
): WorkflowNode[] {

  const goalNode: WorkflowNode = {
    id: 'goal',
    label: 'GOAL',
    description: 'User-defined desired outcome',
    type: 'goal',
    tool: 'ORBIT',
  }

  const workflowNodes: WorkflowNode[] =
    plan.map((step) => ({
      id: step.id,
      label: step.label,
      description: step.description,
      type: step.type,
      tool: step.tool,
    }))

  return [
    goalNode,
    ...workflowNodes,
  ]
}


/* =========================================================
   EDGE CREATION
   ========================================================= */

function createEdges(
  plan: PlanStep[],
): WorkflowEdge[] {

  const edges: WorkflowEdge[] = []


  /*
   * Normal execution path.
   */
  for (
    let index = 0;
    index < plan.length - 1;
    index++
  ) {

    const current =
      plan[index]

    const next =
      plan[index + 1]

    edges.push({

      id:
        `${current.id}-${next.id}`,

      source:
        current.id,

      target:
        next.id,

    })

  }


  /*
   * ADAPT loops back into the planning
   * portion of the workflow.
   *
   * This is what gives ORBIT its
   * autonomous replanning behavior.
   */

  const adapt =
    plan.find(
      (step) =>
        step.type === 'adapt',
    )

  const planNode =
    plan.find(
      (step) =>
        step.id === 'plan' ||
        step.id === 'options' ||
        step.id === 'recommend' ||
        step.id === 'decision',
    )


  if (
    adapt &&
    planNode &&
    adapt.id !== planNode.id
  ) {

    edges.push({

      id:
        `${adapt.id}-loop-${planNode.id}`,

      source:
        adapt.id,

      target:
        planNode.id,

    })

  }


  return edges
}


/* =========================================================
   TASK CREATION
   ========================================================= */

function createTasks(
  plan: PlanStep[],
): WorkflowTask[] {

  return plan
    .filter(
      (step) =>
        step.taskTitle !== undefined,
    )
    .map(
      (step) => ({

        id:
          `task-${step.id}`,

        title:
          step.taskTitle!,

        description:
          step.taskDescription ??
          step.description,

        tool:
          step.tool ??
          'ORBIT',

        status:
          'pending',

        risk:
          step.risk ??
          'low',

      }),
    )
}


/* =========================================================
   VERIFICATION
   ========================================================= */

function createVerification(
  intent: Intent,
  goal: string,
): VerificationCriterion[] {
let criteria: string[]


  switch (intent) {

    case 'study':

      criteria = [
        'Required topics identified',
        'Preparation gaps addressed',
        'Practice completed',
        'Readiness verified',
      ]

      break


    case 'schedule':

      criteria = [
        'Scheduling requirements understood',
        'Availability checked',
        'Constraints satisfied',
        'Schedule verified',
      ]

      break


    case 'research':

      criteria = [
        'Research scope defined',
        'Relevant evidence collected',
        'Findings analyzed',
        'Result verified',
      ]

      break


    case 'create':

      criteria = [
        'Requirements understood',
        'Deliverable created',
        'Deliverable reviewed',
        'Final result verified',
      ]

      break


    case 'apply':

      criteria = [
        'Application requirements checked',
        'Materials prepared',
        'Application reviewed',
        'Application verified',
      ]

      break


    case 'analyze':

      criteria = [
        'Analysis scope defined',
        'Relevant data collected',
        'Findings analyzed',
        'Analysis verified',
      ]

      break


    default:

      criteria = [
        'Goal requirements understood',
        'Required state collected',
        'Execution completed',
        'Final outcome verified',
      ]

  }


  return criteria.map(
    (criterion, index) => ({

      id:
        `verification-${index + 1}`,

      label:
        criterion,

      description:
        `${criterion} for the goal: ${goal}`,

      status:
        'pending',

    }),
  )
}


/* =========================================================
   EVENTS
   ========================================================= */

function createEvents(
  intent: Intent,
  goal: string,
) {

  return [

    {
      id: 'goal-understood',

      time: 'NOW',

      title: 'Goal understood',

      description:
        `ORBIT converted the request into an actionable outcome: ${goal}`,

      type:
        'success' as const,
    },


    {
      id: 'state-identified',

      time: 'NOW',

      title: 'Required state identified',

      description:
        `ORBIT identified the context required for the ${intent} workflow.`,

      type:
        'info' as const,
    },


    {
      id: 'dependencies-mapped',

      time: 'NOW',

      title: 'Dependencies mapped',

      description:
        'ORBIT generated a goal-specific dependency structure.',

      type:
        'success' as const,
    },


    {
      id: 'plan-created',

      time: 'NOW',

      title: 'Execution plan created',

      description:
        'The workflow is ready for autonomous execution.',

      type:
        'active' as const,
    },

  ]
}


/* =========================================================
   MAIN WORKFLOW GENERATOR
   ========================================================= */

export function generateWorkflow(
  goal: string,
): WorkflowData {

  const cleanGoal =
    goal.trim()


  /*
   * Safety fallback.
   */
  if (!cleanGoal) {

    return generateWorkflow(
      'Complete the requested goal',
    )

  }


  const intent =
    detectIntent(cleanGoal)


  const plan =
    getPlan(
      intent,
      cleanGoal,
    )


  const nodes =
    createNodes(plan)


  const edges =
    createEdges(plan)


  const tasks =
    createTasks(plan)


  const verification =
    createVerification(
      intent,
      cleanGoal,
    )


  const outcome =
    createOutcome(
      cleanGoal,
      intent,
    )


  const events =
    createEvents(
      intent,
      cleanGoal,
    )


  return {

    goal:
      cleanGoal,

    outcome,

    workflowType:
      intent,

    status:
      'running',

    currentStage:
      'goal',

    nodes,

    edges,

    tasks,

    events,

    verification,

  }
}