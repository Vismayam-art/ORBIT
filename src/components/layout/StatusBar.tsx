import {
  Database,
  ShieldCheck,
  Zap,
  CircleDot,
} from 'lucide-react'

function StatusBar() {
  return (
    <div className="status-bar">

      <div className="status-item">
        <CircleDot size={13} />
        <span>AGENT CORE</span>
        <strong>READY</strong>
      </div>

      <div className="status-item">
        <Database size={13} />
        <span>STATE</span>
        <strong>FRESH</strong>
      </div>

      <div className="status-item">
        <Zap size={13} />
        <span>AUTONOMY</span>
        <strong>CONTROLLED</strong>
      </div>

      <div className="status-item">
        <ShieldCheck size={13} />
        <span>GUARDRAILS</span>
        <strong>ACTIVE</strong>
      </div>

    </div>
  )
}

export default StatusBar