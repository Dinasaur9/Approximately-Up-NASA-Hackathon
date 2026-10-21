function Debrief({ onBack }) {
  return (
    <section className="screen">
      <h1>Mission Debrief</h1>
      <p>Debrief content goes here.</p>
      <div className="screen-nav">
        <button type="button" onClick={onBack}>
          Back to Briefing
        </button>
      </div>
    </section>
  )
}

export default Debrief
