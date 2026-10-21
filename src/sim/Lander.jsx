import { useEffect, useRef, useState } from 'react'
import './Lander.css'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const SCALE = 8 // pixels per meter, for a readable fall speed on screen

const GRAVITY = 1.62 * SCALE // px/s^2, real lunar gravity
const THRUST_ACCEL = 6 * SCALE // px/s^2 while thrusting
const ROTATE_SPEED = 2.4 // rad/s
const FUEL_MAX = 100
const FUEL_BURN_RATE = 15 // fuel units/s while thrusting

const GROUND_Y = CANVAS_HEIGHT - 60
const PAD_X = CANVAS_WIDTH / 2 - 60
const PAD_WIDTH = 120

const SAFE_SPEED_MS = 6 // m/s
const SAFE_ANGLE_RAD = 0.26 // ~15 degrees from upright

const SHIP_HALF_HEIGHT = 12

function createInitialState() {
  return {
    x: CANVAS_WIDTH / 2,
    y: 80,
    vx: 0,
    vy: 0,
    angle: 0,
    fuel: FUEL_MAX,
    status: 'flying', // 'flying' | 'landed' | 'crashed'
  }
}

function Lander() {
  const canvasRef = useRef(null)
  const stateRef = useRef(createInitialState())
  const keysRef = useRef(new Set())
  const [status, setStatus] = useState('flying')

  function resetSim() {
    stateRef.current = createInitialState()
    setStatus('flying')
  }

  useEffect(() => {
    const KEY_MAP = {
      w: 'thrust',
      arrowup: 'thrust',
      ' ': 'thrust',
      a: 'left',
      arrowleft: 'left',
      d: 'right',
      arrowright: 'right',
    }

    function handleKeyDown(e) {
      const action = KEY_MAP[e.key.toLowerCase()]
      if (action) keysRef.current.add(action)
      if (e.key.toLowerCase() === 'r') resetSim()
    }

    function handleKeyUp(e) {
      const action = KEY_MAP[e.key.toLowerCase()]
      if (action) keysRef.current.delete(action)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    let lastTime = performance.now()
    let frameId

    function tick(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      const s = stateRef.current
      if (s.status === 'flying') {
        const keys = keysRef.current
        if (keys.has('left')) s.angle -= ROTATE_SPEED * dt
        if (keys.has('right')) s.angle += ROTATE_SPEED * dt

        const thrusting = keys.has('thrust') && s.fuel > 0
        if (thrusting) {
          s.vx += Math.sin(s.angle) * THRUST_ACCEL * dt
          s.vy += -Math.cos(s.angle) * THRUST_ACCEL * dt
          s.fuel = Math.max(0, s.fuel - FUEL_BURN_RATE * dt)
        }

        s.vy += GRAVITY * dt
        s.x += s.vx * dt
        s.y += s.vy * dt

        if (s.y + SHIP_HALF_HEIGHT >= GROUND_Y) {
          s.y = GROUND_Y - SHIP_HALF_HEIGHT
          const speedMs = Math.hypot(s.vx, s.vy) / SCALE
          const onPad = s.x >= PAD_X && s.x <= PAD_X + PAD_WIDTH
          const upright = Math.abs(s.angle % (Math.PI * 2)) < SAFE_ANGLE_RAD
          s.status =
            onPad && upright && speedMs <= SAFE_SPEED_MS
              ? 'landed'
              : 'crashed'
          s.vx = 0
          s.vy = 0
          setStatus(s.status)
        }
      }

      render(ctx, s)
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [])

  return (
    <div className="lander">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="lander-canvas"
      />
      {status !== 'flying' && (
        <div className="lander-overlay">
          <h2>{status === 'landed' ? 'Touchdown!' : 'Crashed'}</h2>
          <button type="button" onClick={resetSim}>
            Try Again
          </button>
        </div>
      )}
      <p className="lander-controls">
        W / ↑ thrust · A / ← rotate left · D / → rotate right · R restart
      </p>
    </div>
  )
}

function render(ctx, s) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  ctx.fillStyle = '#0b0c14'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  ctx.strokeStyle = '#4b5563'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, GROUND_Y)
  ctx.lineTo(CANVAS_WIDTH, GROUND_Y)
  ctx.stroke()

  ctx.fillStyle = '#c084fc'
  ctx.fillRect(PAD_X, GROUND_Y - 4, PAD_WIDTH, 4)

  ctx.save()
  ctx.translate(s.x, s.y)
  ctx.rotate(s.angle)
  ctx.fillStyle = '#e5e7eb'
  ctx.beginPath()
  ctx.moveTo(0, -SHIP_HALF_HEIGHT)
  ctx.lineTo(10, SHIP_HALF_HEIGHT)
  ctx.lineTo(-10, SHIP_HALF_HEIGHT)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  const arrowScale = 4
  ctx.strokeStyle = '#60a5fa'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(s.x, s.y)
  ctx.lineTo(s.x + s.vx * arrowScale, s.y + s.vy * arrowScale)
  ctx.stroke()

  const altitudeM = Math.max(0, (GROUND_Y - s.y) / SCALE)
  const vxMs = s.vx / SCALE
  const vyMs = s.vy / SCALE

  ctx.fillStyle = '#e5e7eb'
  ctx.font = '16px ui-monospace, Consolas, monospace'
  ctx.textAlign = 'left'
  ctx.fillText(`Altitude: ${altitudeM.toFixed(1)} m`, 16, 28)
  ctx.fillText(`Vx: ${vxMs.toFixed(1)} m/s  Vy: ${vyMs.toFixed(1)} m/s`, 16, 50)
  ctx.fillText(`Fuel: ${s.fuel.toFixed(0)}%`, 16, 72)
}

export default Lander
