import { useReducer } from 'react'
import ResourcePanel from '../components/outpost/ResourcePanel.jsx'
import { OUTPOST_CONFIG as C } from '../outpost/config.js'
import { advanceOutpostHour } from '../outpost/model.js'
import { createResourceSession, resourceSessionReducer } from '../outpost/session.js'
import './LunarOutpost.css'

const format = (value) => value.toFixed(2)
const systemNames = { habitat: 'Essential habitat', shelter: 'Shelter support', oxygen: 'Oxygen generator', food: 'Food production' }

function TurnReport({ report }) {
  return (
    <>
      <dl className="outpost-readings">
        <div><dt>Solar energy generated</dt><dd>{format(report.electricity.solarGeneratedKWh)} kWh</dd></div>
        <div><dt>Battery after hour</dt><dd>{format(report.electricity.endingBatteryKWh)} kWh</dd></div>
        <div><dt>Solar energy spilled</dt><dd>{format(report.electricity.spilledKWh)} kWh</dd></div>
        {Object.entries({ Oxygen: report.oxygen, Food: report.food }).map(([name, supply]) => (
          <div key={name}><dt>{name}: production / demand</dt><dd>+{format(supply.producedKg)} / −{format(supply.consumedKg)} kg</dd></div>
        ))}
        <div><dt>Radiation transmitted</dt><dd>{format(report.radiation.transmission * 100)}%</dd></div>
        <div><dt>Exposure added</dt><dd>+{format(report.radiation.addedDoseMGy)} mGy</dd></div>
        <div><dt>Crew health lost</dt><dd>{format(report.health.totalLoss)} points</dd></div>
      </dl>
      <ul className="outpost-notes">
        {Object.entries(report.electricity.systems).map(([name, system]) => (
          <li key={name} className={system.deliveredKWh < system.requestedKWh ? 'outpost-warning-text' : ''}>
            {systemNames[name]}: {format(system.deliveredKWh)} / {format(system.requestedKWh)} kWh delivered / requested
            {system.deliveredKWh < system.requestedKWh && ' — insufficient power'}.
          </li>
        ))}
        {Object.entries({ Oxygen: report.oxygen, Food: report.food }).map(([name, supply]) => (
          <li key={name} className={supply.shortfallKg > 0 ? 'outpost-warning-text' : ''}>
            {name} ends at {format(supply.endingKg)} kg; shortage {format(supply.shortfallKg)} kg;
            {' '}capacity overflow {format(supply.discardedKg)} kg.
          </li>
        ))}
      </ul>
    </>
  )
}

export default function LunarOutpost({ onBack }) {
  const [session, dispatch] = useReducer(resourceSessionReducer, undefined, createResourceSession)
  return <LunarOutpostDashboard session={session} dispatch={dispatch} onBack={onBack} />
}

// Controlled view: the terminal mounts this without creating a second session.
export function LunarOutpostDashboard({ session, dispatch, onBack }) {
  const { state, controls } = session
  const active = state.status === 'active'
  // The model owns all simulation calculations, including forecast and shortages.
  const preview = active ? advanceOutpostHour(state, controls) : null
  const forecast = preview?.lastTurn.environment

  function toggle(key) {
    dispatch({ type: 'toggle', key })
  }

  function advance() {
    dispatch({ type: 'advance' })
  }

  function restart() {
    dispatch({ type: 'restart' })
  }

  return (
    <section className="outpost" aria-labelledby="outpost-title">
      <header className="outpost-header">
        <p className="outpost-kicker">Approximately Up // Surface Operations</p>
        <h1 id="outpost-title">Lunar Outpost Management</h1>
        <p>Keep {state.crew.count} astronauts alive for {C.missionHours} hours. Balance life support, stored energy,
          food production, and protection from radiation.</p>
        <p className="outpost-clock" role="status">Hour {state.elapsedHours} / {C.missionHours} · Crew {state.crew.count}
          {' '}· {active ? 'Mission active' : state.status === 'succeeded' ? 'Mission succeeded' : 'Mission failed'}</p>
        <progress aria-label="Mission hours completed" max={C.missionHours} value={state.elapsedHours} />
      </header>

      <div className="outpost-resources">
        <ResourcePanel label="Oxygen reserve" value={state.resources.oxygenKg} unit="kg O₂" maximum={C.oxygenCapacityKg}
          description={`Capacity ${C.oxygenCapacityKg} kg · Crew uses ${C.oxygenConsumptionKgPerHour} kg/hour.`}
          warning={active && preview.lastTurn.oxygen.shortfallKg > 0 ? 'Next hour has unmet oxygen demand.' : null} />
        <ResourcePanel label="Stored electrical energy" value={state.resources.batteryKWh} unit="kWh" maximum={C.batteryCapacityKWh}
          description={`Capacity ${C.batteryCapacityKWh} kWh · Solar power and stored energy supply loads.`}
          warning={active && Object.values(preview.lastTurn.electricity.systems).some((s) => s.deliveredKWh < s.requestedKWh) ? 'Next hour has insufficient electricity.' : null} />
        <ResourcePanel label="Food reserve" value={state.resources.foodKg} unit="kg" maximum={C.foodCapacityKg}
          description={`Capacity ${C.foodCapacityKg} kg · Crew uses ${C.foodConsumptionKgPerHour} kg/hour.`}
          warning={active && preview.lastTurn.food.shortfallKg > 0 ? 'Next hour has unmet food demand.' : null} />
        <ResourcePanel label="Crew health" value={state.crew.health} unit="points" maximum={C.maximumHealth}
          description="Shortages and habitat power loss reduce health. Health does not regenerate."
          warning={active && preview.crew.health < state.crew.health ? 'Selected plan reduces crew health.' : null} />
        <ResourcePanel label="Cumulative radiation" value={state.crew.cumulativeDoseMGy} unit="mGy" maximum={C.radiationFailureMGy}
          description={`Exposure accumulates · Gameplay failure threshold ${C.radiationFailureMGy} mGy.`}
          warning={active && preview.crew.cumulativeDoseMGy >= C.radiationFailureMGy ? 'Next hour reaches the exposure limit.' : null} />
      </div>

      {!active && (
        <section className={`outpost-panel outpost-result ${state.status === 'failed' ? 'outpost-warning' : ''}`} role="status">
          <h2>{state.status === 'succeeded' ? 'Mission complete — crew survived' : 'Mission failed'}</h2>
          <p>{state.status === 'succeeded' ? 'You maintained the outpost through the full mission. Review your final telemetry above.' : `Mission ended after hour ${state.elapsedHours}.`}</p>
          {state.failureReasons.length > 0 && <ul>{state.failureReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
        </section>
      )}

      <div className="outpost-columns">
        <section className="outpost-panel">
          <h2>System allocation</h2>
          <fieldset disabled={!active} className="outpost-controls">
            <legend>Choose settings for the next hour</legend>
            {[
              ['oxygenGeneratorOn', 'Oxygen generator', `${C.oxygenPowerKW} kW → up to ${C.oxygenProductionKgPerHour} kg O₂/hour`],
              ['foodProductionOn', 'Food production', `${C.foodPowerKW} kW → up to ${C.foodProductionKgPerHour} kg/hour`],
              ['shelterMode', 'Storm shelter', `${C.shelterPowerKW} kW extra · food production unavailable`],
            ].map(([key, label, detail]) => (
              <label key={key} className="outpost-control">
                <input type="checkbox" checked={controls[key]} onChange={() => toggle(key)} disabled={!active || (key === 'foodProductionOn' && controls.shelterMode)} />
                <span><strong>{label}: {controls[key] ? 'ON' : 'OFF'}</strong><small>{detail}</small></span>
              </label>
            ))}
          </fieldset>
          {controls.shelterMode && <p className="outpost-callout">Shelter occupancy switches food production off. Re-enable production after leaving shelter.</p>}
          <p className="outpost-caption">Electricity priority: habitat → shelter → oxygen → food. Essential habitat uses {C.habitatPowerKW} kW continuously.</p>
        </section>

        <section className="outpost-panel">
          <h2>{forecast ? `Hour ${forecast.turnNumber} forecast` : 'Operations concluded'}</h2>
          {forecast ? <>
            <p className="outpost-forecast">{forecast.sunlight ? 'Sunlight' : 'Darkness'} · {forecast.solarPowerKW} kW solar</p>
            <p className={forecast.radiationStorm ? 'outpost-warning-text' : ''}>
              {forecast.radiationStorm ? 'Warning: radiation storm' : 'Normal radiation'} · {forecast.externalDoseMGyPerHour} mGy/hour outside shielding
            </p>
          </> : <p>Restart to begin a new {C.missionHours}-hour mission.</p>}
          <p className="outpost-caption">Lighting repeats every {C.lightingCycleHours} hours: {C.sunlightHoursPerCycle} sunlight, then darkness.
            Storm windows: {C.stormWindows.map(([start, end]) => `${start}–${end}`).join(' and ')}.</p>
          <p className="outpost-caption">Passive shielding transmits {C.passiveTransmission * 100}% of radiation.
            Fully supported shelter transmits {C.shelterTransmission * 100}%. Shielding is permanent; exposure accumulates.</p>
        </section>
      </div>

      {preview && <section className="outpost-panel" aria-labelledby="outpost-preview-title">
        <h2 id="outpost-preview-title">Next hour preview</h2>
        <p className="outpost-caption">Settings change this forecast immediately. Resources change only when you advance.</p>
        <TurnReport report={preview.lastTurn} />
        {preview.status !== 'active' && <p className={preview.status === 'failed' ? 'outpost-warning-text' : 'outpost-callout'} role="status">
          {preview.status === 'failed' ? `Warning: this turn ends the mission. ${preview.failureReasons.join(' ')}` : 'This turn completes the mission successfully.'}
        </p>}
      </section>}

      <nav className="outpost-actions" aria-label="Outpost mission actions">
        <button type="button" className="outpost-primary" onClick={advance} disabled={!active}>Advance One Hour</button>
        <button type="button" onClick={restart}>Restart Mission</button>
        {onBack && <button type="button" onClick={onBack}>Back to Briefing</button>}
      </nav>

      <section className="outpost-panel">
        <h2>Last completed hour</h2>
        {state.lastTurn ? <><p>Hour {state.elapsedHours} · {state.lastTurn.environment.sunlight ? 'Sunlight' : 'Darkness'}</p>
          <TurnReport report={state.lastTurn} /></> : <p>No hours advanced yet. Set your systems and inspect the preview to begin.</p>}
      </section>

      <details className="outpost-panel">
        <summary>Engineering notes and gameplay assumptions</summary>
        <ul className="outpost-notes">
          <li>Use sunlight to replenish supplies before darkness. Excess solar energy is lost when the battery is full.</li>
          <li>Oxygen production competes with food production for electricity. Partial power means partial production.</li>
          <li>Shelter reduces radiation exposure but consumes power and prevents food production.</li>
          <li>Empty reserves are safe only if demand is met that hour. Shortages damage health; zero health or the exposure limit ends the mission.</li>
          <li>All numerical values are invented, simplified gameplay assumptions, not verified NASA engineering or medical data.
            The lighting cycle is compressed; feedstocks, battery losses, and crop startup are omitted.</li>
        </ul>
      </details>
    </section>
  )
}
