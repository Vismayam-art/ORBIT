import {
  Mail,
  CalendarDays,
  HardDrive,
  Globe,
} from 'lucide-react'

const apps = [
  {
    name: 'Gmail',
    status: 'Connected',
    icon: Mail,
  },
  {
    name: 'Calendar',
    status: 'Connected',
    icon: CalendarDays,
  },
  {
    name: 'Drive',
    status: 'Connected',
    icon: HardDrive,
  },
  {
    name: 'Web Search',
    status: 'Ready',
    icon: Globe,
  },
]

function ConnectedApps() {
  return (
    <section className="apps-section">

      <div className="section-heading">
        <span>CONNECTED STATE</span>
        <small>LIVE INTEGRATIONS</small>
      </div>

      <div className="apps-grid">

        {apps.map((app) => {
          const Icon = app.icon

          return (
            <div className="app-card" key={app.name}>

              <div className="app-icon">
                <Icon size={18} />
              </div>

              <div>
                <strong>{app.name}</strong>
                <span>{app.status}</span>
              </div>

              <div className="connected-dot" />

            </div>
          )
        })}

      </div>

    </section>
  )
}

export default ConnectedApps