import {
  Check,
  Info,
  Loader2,
} from 'lucide-react'

interface TimelineEvent {
  id: string
  time: string
  title: string
  description: string
  type: 'success' | 'active' | 'info' | 'warning'
}

interface AgentTimelineProps {
  events: TimelineEvent[]
}

function AgentTimeline({
  events,
}: AgentTimelineProps) {
  return (
    <section className="agent-timeline">

      <div className="timeline-header">

        <div>
          <span>AGENT ACTIVITY</span>
          <small>LIVE EXECUTION TRACE</small>
        </div>

        <div className="timeline-live">
          <span />
          LIVE
        </div>

      </div>


      <div className="timeline-list">

        {events.map((event) => (

          <div
            className={`timeline-event timeline-${event.type}`}
            key={event.id}
          >

            <div className="timeline-time">
              {event.time}
            </div>


            <div className="timeline-line">

              <div className="timeline-node">

                {event.type === 'success' && (
                  <Check size={11} />
                )}

                {event.type === 'active' && (
                  <Loader2
                    size={11}
                    className="timeline-spinner"
                  />
                )}

                {event.type === 'info' && (
                  <Info size={11} />
                )}

              </div>

            </div>


            <div className="timeline-content">

              <strong>
                {event.title}
              </strong>

              <p>
                {event.description}
              </p>

            </div>

          </div>

        ))}

      </div>

    </section>
  )
}

export default AgentTimeline