import { lazy, Suspense, useState } from 'react'
import Briefing from './screens/Briefing.jsx'
import Sim from './screens/Sim.jsx'
import Debrief from './screens/Debrief.jsx'
import LunarOutpost from './screens/LunarOutpost.jsx'
import TitleBlock from './components/TitleBlock.jsx'
import './App.css'

const LunarExterior = lazy(() => import('./outpost3d/LunarExterior.jsx'))

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
          <Briefing
            onNext={() => setScreen('sim')}
            onOutpost={() => setScreen('outpost')}
            onExplore={() => setScreen('exterior')}
          />
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
        {screen === 'outpost' && (
          <LunarOutpost onBack={goToBriefing} />
        )}
        {screen === 'exterior' && (
          <Suspense fallback={<section className="screen"><p role="status">Loading lunar exterior…</p><div className="screen-nav"><button onClick={goToBriefing}>Back to Briefing</button></div></section>}>
            <LunarExterior onBack={goToBriefing} />
          </Suspense>
        )}
      </main>
      <TitleBlock />
    </>
  )
}

export default App
