import {
  Activity,
  Command,
  Sparkles,
} from 'lucide-react'

interface NavbarProps {
  onCommand: () => void
  onWorkspace: () => void
  workspaceActive: boolean
}

function Navbar({
  onCommand,
  onWorkspace,
  workspaceActive,
}: NavbarProps) {
  return (
    <header className="navbar">

      {/* BRAND */}

      <div className="brand">

        <div className="orbit-mark">
          <span className="orbit-ring" />
          <span className="orbit-core">O</span>
          
        </div>

        <div className="brand-text">
          <h1>ORBIT</h1>
          <span>AUTONOMOUS OUTCOME ENGINE</span>
        </div>

      </div>


      {/* CENTER INTELLIGENCE STATUS */}

      <div className="nav-intelligence">

        <div className="intelligence-icon">
          <Sparkles size={13} />
        </div>

        <div className="intelligence-copy">
          <strong>ORBIT CORE</strong>

          <span>
            {workspaceActive
              ? 'EXECUTING WORKFLOW'
              : 'READY TO EXECUTE'}
          </span>
        </div>

        <span className="intelligence-pulse" />

      </div>


      {/* NAVIGATION */}

      <div className="nav-actions">

        <button
          className={`nav-button ${
            !workspaceActive ? 'active' : ''
          }`}
          onClick={onCommand}
        >
          <Command size={15} />
          <span>COMMAND</span>
        </button>


        <button
          className={`nav-button ${
            workspaceActive ? 'active' : ''
          }`}
          onClick={onWorkspace}
        >
          <Activity size={15} />
          <span>WORKSPACE</span>
        </button>


        

      </div>

    </header>
  )
}

export default Navbar