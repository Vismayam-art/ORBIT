import { useState } from 'react'

import {
  compileGoal,
  executeWorkflow,
  replanWorkflow,
} from './data/orbitApi'

import type {
  GeminiWorkflow,
  WorkflowExecutionResult,
} from './data/orbitApi'

import Navbar from './components/layout/Navbar'
import GoalInput from './components/command/GoalInput'
import ConnectedApps from './components/command/ConnectedApps'
import Workspace from './pages/Workspace'

import './App.css'


function App() {

  const [goal, setGoal] =
    useState('')

  const [workspaceActive, setWorkspaceActive] =
    useState(false)

  const [workflow, setWorkflow] =
    useState<GeminiWorkflow | null>(null)

  const [executionResult, setExecutionResult] =
    useState<WorkflowExecutionResult | null>(null)

  const [isRunning, setIsRunning] =
    useState(false)


  // =========================================================
  // RUN INITIAL ORBIT WORKFLOW
  // =========================================================

  const handleRun = async () => {

    if (
      !goal.trim() ||
      isRunning
    ) {
      return
    }

    try {

      setIsRunning(true)

      // Clear previous execution
      setExecutionResult(null)

      console.log(
        'Sending goal to ORBIT:',
        goal,
      )


      // Open Workspace immediately
      setWorkspaceActive(true)


      // -----------------------------------------------------
      // STEP 1 — COMPILE GOAL
      // -----------------------------------------------------

      const compiledWorkflow =
        await compileGoal(goal)

      console.log(
        'Gemini workflow received:',
        compiledWorkflow,
      )


      // Store generated workflow
      setWorkflow(
        compiledWorkflow,
      )


      // -----------------------------------------------------
      // STEP 2 — EXECUTE WORKFLOW
      // -----------------------------------------------------

      try {

        const result =
          await executeWorkflow(
            compiledWorkflow,
          )

        console.log(
          'ORBIT workflow execution completed:',
          result,
        )


        // Store real execution result
        setExecutionResult(
          result,
        )

      } catch (executionError) {

        console.error(
          'ORBIT workflow execution failed:',
          executionError,
        )

      }

    } catch (error) {

      console.error(
        'ORBIT failed:',
        error,
      )

      setWorkspaceActive(false)

      alert(
        'ORBIT could not compile the goal. Check the Console for details.',
      )

    } finally {

      setIsRunning(false)

    }
  }


  // =========================================================
  // REPLAN WORKFLOW
  // =========================================================

  const handleReplan = async (
    changeDescription: string,
  ) => {

    if (
      !workflow ||
      isRunning
    ) {
      return
    }


    try {

      setIsRunning(true)


      console.log(
        'ORBIT detected a change:',
        changeDescription,
      )


      console.log(
        'ORBIT starting replanning...',
      )


      // -----------------------------------------------------
      // STEP 1 — REPLAN
      // -----------------------------------------------------

      const replannedWorkflow =
        await replanWorkflow(
          workflow.goal,
          workflow,
          changeDescription,
        )


      console.log(
        'ORBIT replanned workflow:',
        replannedWorkflow,
      )


      // Replace the old workflow
      setWorkflow(
        replannedWorkflow,
      )


      // Clear old execution result
      setExecutionResult(null)


      // -----------------------------------------------------
      // STEP 2 — EXECUTE NEW WORKFLOW
      // -----------------------------------------------------

      const newExecutionResult =
        await executeWorkflow(
          replannedWorkflow,
        )


      console.log(
        'ORBIT replanned workflow executed:',
        newExecutionResult,
      )


      // Store new execution result
      setExecutionResult(
        newExecutionResult,
      )

    } catch (error) {

      console.error(
        'ORBIT replanning failed:',
        error,
      )

      alert(
        'ORBIT could not replan the workflow. Check the Console for details.',
      )

    } finally {

      setIsRunning(false)

    }
  }


  // =========================================================
  // NAVIGATION
  // =========================================================

  const openCommand = () => {
    setWorkspaceActive(false)
  }


  const openWorkspace = () => {

    if (workflow) {
      setWorkspaceActive(true)
    }

  }


  // =========================================================
  // UI
  // =========================================================

  return (

    <div className="orbit-app">

      <Navbar
        onCommand={openCommand}
        onWorkspace={openWorkspace}
        workspaceActive={workspaceActive}
      />


      {workspaceActive ? (

        <Workspace
          goal={goal}
          workflow={workflow}
          executionResult={executionResult}
          onReplan={handleReplan}
        />

      ) : (

        <main className="command-center">

          <section className="hero">

            <div className="eyebrow">
              AUTONOMOUS AGENT SYSTEM
            </div>


            <h2>
              Tell ORBIT what you want to
              <span> accomplish</span>
            </h2>


            <p className="hero-description">
              ORBIT understands your goal, observes the current
              state, builds a plan, takes action, adapts to change
              and verifies the final outcome.
            </p>


            <GoalInput
              goal={goal}
              setGoal={setGoal}
              onRun={handleRun}
            />

          </section>


          <ConnectedApps />


          <section className="loop-section">

            <div className="section-heading">

              <span>
                ORBIT AGENT LOOP
              </span>

              <small>
                HOW IT WORKS
              </small>

            </div>


            <div className="agent-loop">

              {[
                ['01', 'GOAL', 'Understand'],
                ['02', 'STATE', 'Observe'],
                ['03', 'PLAN', 'Organize'],
                ['04', 'ACT', 'Execute'],
                ['05', 'ADAPT', 'Replan'],
                ['06', 'VERIFY', 'Prove'],
              ].map(
                (
                  [
                    number,
                    title,
                    description,
                  ],
                  index,
                ) => (

                  <div
                    className={`loop-group ${
                      index === 0
                        ? 'active'
                        : ''
                    }`}
                    key={title}
                  >

                    <div className="loop-step">

                      <span>
                        {number}
                      </span>

                      <strong>
                        {title}
                      </strong>

                      <small>
                        {description}
                      </small>

                    </div>


                    {index < 5 && (

                      <div className="loop-arrow">
                        →
                      </div>

                    )}

                  </div>

                ),
              )}

            </div>

          </section>

        </main>

      )}

    </div>

  )
}


export default App