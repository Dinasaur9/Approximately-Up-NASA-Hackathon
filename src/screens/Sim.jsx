import { useState } from 'react'
import Lander from '../sim/Lander.jsx'

function Sim({ onBack, onFinish }) {
  const [result, setResult] = useState(null)

  return (
    <section className="screen">
      <p className="eyebrow">Mission Control // Live Telemetry</p>
      <h1>
        <span className="section-index">02</span>Mission Simulation
      </h1>
      <Lander onOutcome={setResult} />
      <div className="screen-nav">
        <button type="button" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="screen-nav-primary"
          disabled={!result}
          onClick={() => result && onFinish(result)}
        >
          {result ? 'Finish Mission' : 'Awaiting Touchdown…'}
        </button>
      </div>
    </section>
  )
}

export default Sim
