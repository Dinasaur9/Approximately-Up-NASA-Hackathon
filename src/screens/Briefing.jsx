import { SITE } from '../sim/terrain'
import MissionPatch from '../components/MissionPatch.jsx'

const ICONS = {
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </>
  ),
  keys: (
    <>
      <rect x="3" y="10" width="6" height="6" rx="1" />
      <rect x="10.5" y="10" width="6" height="6" rx="1" />
      <rect x="10.5" y="3" width="6" height="6" rx="1" />
    </>
  ),
  gauge: (
    <>
      <path d="M4 15a8 8 0 1 1 16 0" />
      <path d="M12 15 L16 9" />
      <circle cx="12" cy="15" r="1.2" fill="currentColor" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-7.2 7-12a7 7 0 0 0-14 0c0 4.8 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.4" />
    </>
  ),
}

function CardIcon({ name }) {
  return (
    <svg
      className="briefing-card-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </svg>
  )
}

function Briefing({ onNext }) {
  return (
    <section className="screen briefing">
      <div className="briefing-hero">
        <MissionPatch size={152} />
        <div className="briefing-hero-text">
          <p className="eyebrow">Mission Control // Lunar Descent Trainer</p>
          <h1>
            <span className="section-index">01</span>Mission Briefing
          </h1>
          <p className="briefing-lead">
            Pilot a lunar module from orbit insertion to touchdown. Every
            force acting on the ship &mdash; gravity, thrust, momentum
            &mdash; is simulated as a real vector, so the choices you make
            with throttle and attitude are the only thing between a safe
            landing and a crater.
          </p>
        </div>
      </div>

      <article className="briefing-card briefing-featured" data-index="01">
        <h2>
          <CardIcon name="target" />
          Objective
        </h2>
        <p>
          Guide the module onto the lit landing pad. Touch down upright,
          under 6&nbsp;m/s, within 15&deg; of vertical &mdash; and before
          your fuel runs out.
        </p>
      </article>

      <div className="briefing-grid">
        <article className="briefing-card" data-index="02">
          <h2>
            <CardIcon name="keys" />
            Controls
          </h2>
          <dl className="briefing-controls">
            <div>
              <dt>W / &uarr;</dt>
              <dd>Fire main thruster</dd>
            </div>
            <div>
              <dt>A / &larr;</dt>
              <dd>Rotate left</dd>
            </div>
            <div>
              <dt>D / &rarr;</dt>
              <dd>Rotate right</dd>
            </div>
            <div>
              <dt>R</dt>
              <dd>Restart attempt</dd>
            </div>
          </dl>
        </article>

        <article className="briefing-card" data-index="03">
          <h2>
            <CardIcon name="gauge" />
            Flight Parameters
          </h2>
          <ul className="briefing-stats">
            <li>
              <span>Surface gravity</span>
              <strong>1.62 m/s&sup2;</strong>
            </li>
            <li>
              <span>Safe descent speed</span>
              <strong>&le; 6 m/s</strong>
            </li>
            <li>
              <span>Safe tilt</span>
              <strong>&le; 15&deg;</strong>
            </li>
          </ul>
        </article>

        <article className="briefing-card" data-index="04">
          <h2>
            <CardIcon name="pin" />
            Landing Site
          </h2>
          <p>
            A real elevation transect from NASA&apos;s LRO/LOLA laser
            altimeter data, crossing {SITE.site} (
            {Math.abs(SITE.centerLatDeg)}&deg;S), rescaled to fit the
            flight window.
          </p>
        </article>
      </div>

      <p className="briefing-note">
        Watch the two vectors drawn on the ship during flight: blue is your
        velocity, amber is active thrust. Landing well means using thrust to
        cancel velocity before the ground does it for you.
      </p>

      <div className="screen-nav">
        <button type="button" className="screen-nav-primary" onClick={onNext}>
          Start Training
        </button>
      </div>
    </section>
  )
}

export default Briefing
