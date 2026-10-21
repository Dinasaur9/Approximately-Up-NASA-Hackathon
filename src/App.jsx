import { useState } from 'react'
import Briefing from './screens/Briefing.jsx'
import Sim from './screens/Sim.jsx'
import Debrief from './screens/Debrief.jsx'
import TitleBlock from './components/TitleBlock.jsx'
import './App.css'

function App() {
  const [screen, setScreen] = useState('briefing')
  const [missionResult, setMissionResult] = useState(null)

  function goToBriefing() {
    setMissionResult(null)
    setScreen('briefing')
  }

  return (
    <>
      <main id="app">
        {screen === 'briefing' && (
          <Briefing onNext={() => setScreen('sim')} />
        )}
        {screen === 'sim' && (
          <Sim
            onBack={goToBriefing}
            onFinish={(result) => {
              setMissionResult(result)
              setScreen('debrief')
            }}
          />
        )}
        {screen === 'debrief' && (
          <Debrief
            result={missionResult}
            onRetry={() => {
              setMissionResult(null)
              setScreen('sim')
            }}
            onBack={goToBriefing}
          />
        )}
      </main>
      <TitleBlock />
    </>
  )
}

export default App
