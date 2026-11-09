import { getEquipmentForecast } from './resourceEquipment.js'

const format = (value) => value.toFixed(2)
const systemIds = { oxygen: 'HAB / O2-01', food: 'AGRI / FOOD-01', solar: 'EVA / PWR-01', shelter: 'HAB / RAD-01' }
function Reading({ label, children }) {
  return <div className="equipment-reading"><dt>{label}</dt><dd>{children}</dd></div>
}

export default function ResourceEquipmentControls({ equipment, session, dispatch }) {
  const { state, controls } = session
  const report = getEquipmentForecast(session)
  const { system, key, title } = equipment
  const power = report?.electricity.systems[system]
  const supply = system === 'oxygen' || system === 'food' ? report?.[system] : null
  const blockedByShelter = system === 'food' && controls.shelterMode
  const insufficient = report && Object.values(report.electricity.systems).some((entry) => entry.deliveredKWh < entry.requestedKWh)
  const status = !report ? 'Operations ended' : system === 'solar' ? (report.environment.sunlight ? 'Sunlight generation' : 'Darkness · standby') : blockedByShelter ? 'Shelter interlock' : !controls[key] ? 'Requested OFF' : power.poweredFraction < 1 ? 'Power limited' : 'Plan fully powered'
  const tone = !report ? 'idle' : (system === 'solar' ? insufficient : blockedByShelter || (controls[key] && power.poweredFraction < 1)) ? 'warning' : system === 'solar' ? (report.environment.sunlight ? 'ready' : 'idle') : controls[key] ? 'ready' : 'idle'
  return <section className="resource-equipment" aria-label={title}>
    <header className="equipment-system-header">
      <div><p className="equipment-system-id">{systemIds[system]}</p><h3>{title}</h3></div>
      <span className={`equipment-status equipment-status-${tone}`} role="status"><i aria-hidden="true" />{status}</span>
    </header>
    <h4>Current telemetry</h4>
    <dl className="equipment-readings">
      {(system === 'oxygen' || system === 'food') && <Reading label="Stored reserve">{format(state.resources[system === 'oxygen' ? 'oxygenKg' : 'foodKg'])} <small>kg</small></Reading>}
      {system === 'solar' && <Reading label="Battery reserve">{format(state.resources.batteryKWh)} <small>kWh</small></Reading>}
      {system === 'shelter' && <Reading label="Cumulative exposure">{format(state.crew.cumulativeDoseMGy)} <small>mGy</small></Reading>}
      {key && <Reading label="Requested setting">{controls[key] ? 'ON' : 'OFF'}</Reading>}
    </dl>
    {report && <>
      <div className="equipment-forecast-heading"><h4>Hour {report.environment.turnNumber} / Preview</h4><span>{report.environment.sunlight ? 'Sunlight' : 'Darkness'} · {report.environment.radiationStorm ? 'Radiation storm' : 'Normal radiation'}</span></div>
      <dl className="equipment-readings">
        {power && <Reading label="Power delivered / requested">{format(power.deliveredKWh)} / {format(power.requestedKWh)} <small>kWh · {format(power.poweredFraction * 100)}% powered</small></Reading>}
        {supply && <>
          <Reading label="Production / crew demand">+{format(supply.producedKg)} / −{format(supply.consumedKg)} <small>kg next hour</small></Reading>
          <Reading label="Supply shortage">{format(supply.shortfallKg)} <small>kg</small></Reading>
        </>}
        {system === 'shelter' && <Reading label="Added exposure">+{format(report.radiation.addedDoseMGy)} <small>mGy next hour</small></Reading>}
        {system === 'solar' && <>
          <Reading label="Solar generation">{format(report.electricity.solarGeneratedKWh)} <small>kWh · {report.environment.solarPowerKW} kW</small></Reading>
          <Reading label="Delivered to systems">{format(Object.values(report.electricity.systems).reduce((sum, entry) => sum + entry.deliveredKWh, 0))} <small>kWh</small></Reading>
          <Reading label="Battery change">{format(report.electricity.endingBatteryKWh - state.resources.batteryKWh)} <small>kWh</small></Reading>
          <Reading label="Ending battery">{format(report.electricity.endingBatteryKWh)} <small>kWh</small></Reading>
          <Reading label="Spilled energy">{format(report.electricity.spilledKWh)} <small>kWh</small></Reading>
        </>}
      </dl>
      {system === 'solar' && <>
        <p className={`equipment-power-summary${insufficient ? ' equipment-caution' : ''}`}>{insufficient ? 'Insufficient power for requested systems' : 'All requested systems fully powered'}</p>
        <details className="equipment-allocation"><summary>System power allocation</summary><dl className="equipment-readings">
          {Object.entries(report.electricity.systems).map(([name, entry]) => <Reading key={name} label={`${name}: delivered / requested`}>{format(entry.deliveredKWh)} / {format(entry.requestedKWh)} <small>kWh</small></Reading>)}
        </dl></details>
      </>}
    </>}
    {!report && <p className="equipment-caution">Resource mission {state.status}. Restart from Mission Control. No next-hour forecast is available.</p>}
    <div className="equipment-controls">
      <h4>{key ? 'System control' : 'Environmental control'}</h4>
      {system === 'solar' ? <p>Solar generation follows the sunlight forecast automatically.</p> : <button className="equipment-toggle" type="button" disabled={!report || blockedByShelter} aria-pressed={controls[key]} onClick={() => dispatch({ type: 'toggle', key })}>
        <span><strong>{controls[key] ? 'Disable' : 'Enable'} {title}</strong><small>Setting for the next simulated hour</small></span><span className="equipment-switch" aria-hidden="true"><i /></span>
      </button>}
      {system === 'shelter' && <p>Shelter needs power and reduces exposure. It switches food production off; re-enable food after leaving shelter.</p>}
      {blockedByShelter && <p className="equipment-caution" role="status">Disable shelter before enabling food production.</p>}
    </div>
    <p className="equipment-sync-note">Shared with Mission Control · Changes do not advance time. Requested ON does not guarantee power.</p>
    <p className="equipment-assumptions">Resources change only with Advance One Hour. Training repairs remain separate. Simplified gameplay values; not verified NASA engineering or medical data.</p>
  </section>
}
