function buildFailureReasons(result) {
  const reasons = []
  if (!result.onPad) reasons.push('Touched down off the landing pad.')
  if (!result.upright) reasons.push('Tilt exceeded the 15° safe limit.')
  if (result.speedMs > 6) reasons.push(`Descent speed of ${result.speedMs.toFixed(1)} m/s exceeded the 6 m/s limit.`)
  return reasons
}

function Debrief({ result, onRetry, onBack }) {
  return (
    <section className="screen debrief">
      <p className="eyebrow">Mission Control // Post-Flight Report</p>
      <h1>
        <span className="section-index">03</span>Mission Debrief
      </h1>

      {!result && (
        <>
          <p className="briefing-lead">
            No flight data on record yet. Run the simulation to touchdown
            or impact before requesting a debrief.
          </p>
          <div className="screen-nav">
            <button type="button" className="screen-nav-primary" onClick={onRetry}>
              Go to Simulation
            </button>
            <button type="button" onClick={onBack}>
              Back to Briefing
            </button>
          </div>
        </>
      )}

      {result && (
        <>
          <h2 className={`debrief-status debrief-status--${result.status}`}>
            {result.status === 'landed' ? 'Touchdown Confirmed' : 'Mission Failed'}
          </h2>
          <p className="briefing-lead">
            {result.status === 'landed'
              ? 'The module is down safely. Telemetry confirms a controlled descent within every safety margin.'
              : "The module didn't survive contact with the surface. Review the telemetry below before your next attempt."}
          </p>

          <div className="briefing-grid">
            <article className="briefing-card" data-index="01">
              <h2>Touchdown Telemetry</h2>
              <ul className="briefing-stats">
                <li>
                  <span>Impact speed</span>
                  <strong>{result.speedMs.toFixed(1)} m/s</strong>
                </li>
                <li>
                  <span>Fuel remaining</span>
                  <strong>{result.fuel.toFixed(0)}%</strong>
                </li>
                <li>
                  <span>Mission time</span>
                  <strong>{result.timeSec.toFixed(1)} s</strong>
                </li>
                <li>
                  <span>On pad</span>
                  <strong>{result.onPad ? 'Yes' : 'No'}</strong>
                </li>
                <li>
                  <span>Upright</span>
                  <strong>{result.upright ? 'Yes' : 'No'}</strong>
                </li>
              </ul>
            </article>

            <article className="briefing-card" data-index="02">
              <h2>{result.status === 'landed' ? 'Flight Notes' : 'Failure Analysis'}</h2>
              {result.status === 'landed' ? (
                <p>
                  You cancelled enough of your velocity vector with thrust
                  before reaching the surface, and kept the module's
                  attitude close enough to vertical to stay upright.
                </p>
              ) : (
                <ul className="briefing-stats briefing-stats--list">
                  {buildFailureReasons(result).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
            </article>
          </div>

          <div className="screen-nav">
            <button type="button" className="screen-nav-primary" onClick={onRetry}>
              Fly Again
            </button>
            <button type="button" onClick={onBack}>
              Back to Briefing
            </button>
          </div>
        </>
      )}
    </section>
  )
}

export default Debrief
