import {
  ArrowUpRight,
  BrainCircuit,
  CircleCheck,
  Sparkles,
} from 'lucide-react'

interface GoalInputProps {
  goal: string
  setGoal: (goal: string) => void
  onRun: () => void
}

function GoalInput({
  goal,
  setGoal,
  onRun,
}: GoalInputProps) {
  return (
    <div className="goal-container">

      {/* HEADER */}

      <div className="goal-header">

        <div className="goal-heading">

          <div className="goal-number">
            01
          </div>

          <div>
            <div className="goal-title">
              <Sparkles size={15} />
              DEFINE YOUR OUTCOME
            </div>

            <div className="goal-subtitle">
              Tell ORBIT what success looks like.
            </div>
          </div>

        </div>

        <div className="goal-mode">
          <BrainCircuit size={14} />
          NATURAL LANGUAGE
        </div>

      </div>


      {/* QUESTION */}

      <div className="goal-question">
        What should ORBIT accomplish for you?
      </div>


      {/* INPUT */}

      <div className="goal-input-wrapper">

        <textarea
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          placeholder="e.g. Prepare everything for my team's presentation tomorrow."
          rows={5}
        />

        {!goal && (
          <div className="goal-input-hint">
            Describe the outcome. ORBIT will determine the steps.
          </div>
        )}

      </div>


      {/* CAPABILITIES */}

      <div className="goal-capabilities">

        <div className="capability">
          <CircleCheck size={14} />
          <span>STATE AWARE</span>
        </div>

        <div className="capability">
          <CircleCheck size={14} />
          <span>TOOL ACCESS</span>
        </div>

        <div className="capability">
          <CircleCheck size={14} />
          <span>ADAPTIVE EXECUTION</span>
        </div>

      </div>


      {/* FOOTER */}

      <div className="goal-footer">

        <div className="goal-ready">

          <span className="goal-ready-dot" />

          <div>
            <strong>OBJECTIVE READY</strong>
            <span>
              ORBIT will plan before acting
            </span>
          </div>

        </div>

        <button
          className="run-button"
          onClick={onRun}
          disabled={!goal.trim()}
        >
          <span>RUN ORBIT</span>
          <ArrowUpRight size={17} />
        </button>

      </div>

    </div>
  )
}

export default GoalInput