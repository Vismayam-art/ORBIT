import {
  Activity,
  Layers3,
  ShieldCheck,
  Workflow,
} from 'lucide-react'

interface AgentStatusProps {
  status: string
  stage: string
  taskCount: number
  toolCount: number
  risk: string
}

function AgentStatus({
  status,
  stage,
  taskCount,
  toolCount,
  risk,
}: AgentStatusProps) {
  return (
    <section className="agent-status">

      <div className="agent-status-header">

        <div className="agent-status-title">

          <div className="agent-status-icon">
            <Activity size={17} />
          </div>

          <div>
            <span>ORBIT CORE</span>
            <small>AUTONOMOUS RUNTIME</small>
          </div>

        </div>

        <div className="agent-running">
          <span className="agent-running-dot" />
          {status}
        </div>

      </div>


      <div className="agent-current-stage">

        <span>CURRENT STAGE</span>

        <strong>{stage}</strong>

        <div className="agent-stage-line">
          <div />
        </div>

      </div>


      <div className="agent-metrics">

        <div className="agent-metric">

          <Workflow size={15} />

          <div>
            <strong>{taskCount}</strong>
            <span>TASKS</span>
          </div>

        </div>


        <div className="agent-metric">

          <Layers3 size={15} />

          <div>
            <strong>{toolCount}</strong>
            <span>TOOLS</span>
          </div>

        </div>


        <div className="agent-metric">

          <ShieldCheck size={15} />

          <div>
            <strong>{risk.toUpperCase()}</strong>
            <span>RISK</span>
          </div>

        </div>

      </div>

    </section>
  )
}

export default AgentStatus