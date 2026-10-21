import Lander from '../sim/Lander.jsx'

function Sim({ onNext, onBack }) {
  return (
    <section className="screen">
      <h1>Mission Simulation</h1>
      <Lander />
      <div className="screen-nav">
        <button type="button" onClick={onBack}>
          Back
        </button>
        <button type="button" onClick={onNext}>
          Finish Mission
        </button>
      </div>
    </section>
  )
}

export default Sim
