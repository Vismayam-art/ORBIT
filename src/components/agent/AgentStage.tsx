import {
  Check,
  Circle,
} from 'lucide-react'

interface AgentStageProps {
  currentStage: string
}

const stages = [
  {
    key: 'goal',
    number: '01',
    title: 'GOAL',
    description: 'Understand',
  },
  {
    key: 'state',
    number: '02',
    title: 'STATE',
    description: 'Observe',
  },
  {
    key: 'plan',
    number: '03',
    title: 'PLAN',
    description: 'Organize',
  },
  {
    key: 'act',
    number: '04',
    title: 'ACT',
    description: 'Execute',
  },
  {
    key: 'adapt',
    number: '05',
    title: 'ADAPT',
    description: 'Replan',
  },
  {
    key: 'verify',
    number: '06',
    title: 'VERIFY',
    description: 'Prove',
  },
]

function AgentStage({
  currentStage,
}: AgentStageProps) {
  const currentIndex = stages.findIndex(
    (stage) => stage.key === currentStage,
  )

  return (
    <section className="agent-stage">

      <div className="agent-section-heading">
        <div>
          <span>AGENT LOOP</span>
          <small>ORBIT EXECUTION CYCLE</small>
        </div>

        <div className="agent-stage-indicator">
          STAGE {String(currentIndex + 1).padStart(2, '0')} / 06
        </div>
      </div>


      <div className="agent-stage-track">

        {stages.map((stage, index) => {

          const isCompleted =
            index < currentIndex

          const isCurrent =
            index === currentIndex

          return (
            <div
              className={`agent-stage-item ${
                isCompleted ? 'completed' : ''
              } ${
                isCurrent ? 'current' : ''
              }`}
              key={stage.key}
            >

              <div className="agent-stage-node">

                {isCompleted ? (
                  <Check size={13} />
                ) : isCurrent ? (
                  <span className="agent-stage-pulse" />
                ) : (
                  <Circle size={10} />
                )}

              </div>


              <div className="agent-stage-content">

                <span className="agent-stage-number">
                  {stage.number}
                </span>

                <strong>
                  {stage.title}
                </strong>

                <small>
                  {stage.description}
                </small>

              </div>


              {index < stages.length - 1 && (
                <div
                  className={`agent-stage-connector ${
                    index < currentIndex
                      ? 'completed'
                      : ''
                  }`}
                />
              )}

            </div>
          )
        })}

      </div>

    </section>
  )
}

export default AgentStage