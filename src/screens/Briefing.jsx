function Briefing({ onNext }) {
  return (
    <section className="screen">
      <h1>Mission Briefing</h1>
      <p>Briefing content goes here.</p>
      <div className="screen-nav">
        <button type="button" onClick={onNext}>
          Start Training
        </button>
      </div>
    </section>
  )
}

export default Briefing
