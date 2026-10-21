import { useState } from 'react'
import Briefing from './screens/Briefing.jsx'
import Sim from './screens/Sim.jsx'
import Debrief from './screens/Debrief.jsx'
import './App.css'

const SCREENS = {
  briefing: Briefing,
  sim: Sim,
  debrief: Debrief,
}

function App() {
  const [screen, setScreen] = useState('briefing')

  const Screen = SCREENS[screen]

  return (
    <main id="app">
      <Screen
        onNext={() => setScreen(screen === 'briefing' ? 'sim' : 'debrief')}
        onBack={() => setScreen('briefing')}
      />
    </main>
  )
}

export default App
