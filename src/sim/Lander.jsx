import { useEffect, useRef, useState } from 'react'
import './Lander.css'
import { SITE, createTerrain, TERRAIN_TOP_Y } from './terrain'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const SCALE = 8 // pixels per meter, for a readable fall speed on screen

const GRAVITY = 1.62 * SCALE // px/s^2, real lunar gravity
const THRUST_ACCEL = 6 * SCALE // px/s^2 while thrusting
const ROTATE_SPEED = 2.4 // rad/s
const FUEL_MAX = 100
const FUEL_BURN_RATE = 15 // fuel units/s while thrusting

const SAFE_SPEED_MS = 6 // m/s
const SAFE_ANGLE_RAD = 0.26 // ~15 degrees from upright

const SHIP_HALF_HEIGHT = 12
const SHIP_FOOT_Y = SHIP_HALF_HEIGHT + 5 // where the footpads actually touch down, below the body's bottom edge

function createInitialState() {
  return {
    x: CANVAS_WIDTH / 2,
    y: 80,
    vx: 0,
    vy: 0,
    angle: 0,
    fuel: FUEL_MAX,
    status: 'flying', // 'flying' | 'landed' | 'crashed'
    eventTime: 0,
  }
}

function mulberry32(seed) {
  let a = seed
  return function random() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function generateStarLayer(seed, count, rMin, rMax, speedMin, speedMax) {
  const random = mulberry32(seed)
  return Array.from({ length: count }, () => ({
    x: random() * CANVAS_WIDTH,
    y: random() * (TERRAIN_TOP_Y - 10),
    r: random() * (rMax - rMin) + rMin,
    phase: random() * Math.PI * 2,
    speed: random() * (speedMax - speedMin) + speedMin,
  }))
}

function generateStars() {
  return {
    far: generateStarLayer(1337, 70, 0.3, 0.9, 0.3, 0.8),
    near: generateStarLayer(2024, 35, 0.8, 1.6, 0.6, 1.3),
  }
}

function generateRegolith(terrain) {
  const random = mulberry32(555)
  return Array.from({ length: 220 }, () => {
    const x = random() * CANVAS_WIDTH
    const groundY = terrain.terrainYAt(x)
    const y = groundY + random() * (CANVAS_HEIGHT - groundY)
    return { x, y, r: random() * 1.3 + 0.3, shade: random() }
  })
}

function rotateVec(vx, vy, theta) {
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  return [vx * c - vy * s, vx * s + vy * c]
}

function spawnDebris(x, y) {
  return Array.from({ length: 24 }, () => {
    const a = Math.random() * Math.PI * 2
    const speed = Math.random() * 140 + 40
    return {
      kind: 'debris',
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 40,
      life: Math.random() * 0.4 + 0.5,
      age: 0,
    }
  })
}

function spawnThrustSparks(x, y, angle) {
  const nozzleX = x - SHIP_HALF_HEIGHT * Math.sin(angle)
  const nozzleY = y + SHIP_HALF_HEIGHT * Math.cos(angle)
  const exhaustX = -Math.sin(angle)
  const exhaustY = Math.cos(angle)
  return Array.from({ length: 2 }, () => {
    const [dx, dy] = rotateVec(exhaustX, exhaustY, (Math.random() - 0.5) * 0.6)
    const speed = 70 + Math.random() * 70
    return {
      kind: 'spark',
      x: nozzleX,
      y: nozzleY,
      vx: dx * speed,
      vy: dy * speed,
      life: 0.22 + Math.random() * 0.18,
      age: 0,
    }
  })
}

function spawnDust(x, groundY) {
  const dir = Math.random() < 0.5 ? -1 : 1
  return [
    {
      kind: 'dust',
      x,
      y: groundY - 2,
      vx: dir * (30 + Math.random() * 50),
      vy: -Math.random() * 15,
      life: 0.6 + Math.random() * 0.4,
      age: 0,
    },
  ]
}

function Lander({ onOutcome }) {
  const canvasRef = useRef(null)
  const stateRef = useRef(createInitialState())
  const keysRef = useRef(new Set())
  const starsRef = useRef(null)
  const terrainRef = useRef(null)
  const regolithRef = useRef(null)
  const particlesRef = useRef([])
  const missionStartRef = useRef(performance.now())
  const onOutcomeRef = useRef(onOutcome)
  onOutcomeRef.current = onOutcome
  const [status, setStatus] = useState('flying')

  // a fresh terrain (and landing pad placement) is rolled once per mount,
  // so every time you load into the sim the strip is somewhere new
  if (!terrainRef.current) terrainRef.current = createTerrain()
  if (!starsRef.current) starsRef.current = generateStars()
  if (!regolithRef.current) regolithRef.current = generateRegolith(terrainRef.current)

  function resetSim() {
    // a successful landing rolls a new terrain/pad for the next attempt;
    // a crash (or a mid-flight restart) keeps the same one to retry
    if (stateRef.current.status === 'landed') {
      terrainRef.current = createTerrain()
      regolithRef.current = generateRegolith(terrainRef.current)
    }
    stateRef.current = createInitialState()
    particlesRef.current = []
    missionStartRef.current = performance.now()
    setStatus('flying')
    onOutcomeRef.current?.(null)
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
      const terrain = terrainRef.current
      let thrusting = false

      if (s.status === 'flying') {
        const keys = keysRef.current
        if (keys.has('left')) s.angle -= ROTATE_SPEED * dt
        if (keys.has('right')) s.angle += ROTATE_SPEED * dt

        thrusting = keys.has('thrust') && s.fuel > 0
        if (thrusting) {
          s.vx += Math.sin(s.angle) * THRUST_ACCEL * dt
          s.vy += -Math.cos(s.angle) * THRUST_ACCEL * dt
          s.fuel = Math.max(0, s.fuel - FUEL_BURN_RATE * dt)
          particlesRef.current.push(...spawnThrustSparks(s.x, s.y, s.angle))

          const groundYNow = terrain.terrainYAt(s.x)
          if (groundYNow - (s.y + SHIP_FOOT_Y) < 48 && Math.random() < 0.5) {
            particlesRef.current.push(...spawnDust(s.x, groundYNow))
          }
        }

        s.vy += GRAVITY * dt
        s.x += s.vx * dt
        s.y += s.vy * dt

        const groundY = terrain.terrainYAt(s.x)
        if (s.y + SHIP_FOOT_Y >= groundY) {
          s.y = groundY - SHIP_FOOT_Y
          const speedMs = Math.hypot(s.vx, s.vy) / SCALE
          const onPad = s.x >= terrain.padX && s.x <= terrain.padX + terrain.padWidth
          const upright = Math.abs(s.angle % (Math.PI * 2)) < SAFE_ANGLE_RAD
          s.status =
            onPad && upright && speedMs <= SAFE_SPEED_MS
              ? 'landed'
              : 'crashed'
          s.eventTime = now
          if (s.status === 'crashed') {
            particlesRef.current.push(...spawnDebris(s.x, s.y))
          }
          onOutcomeRef.current?.({
            status: s.status,
            speedMs,
            fuel: s.fuel,
            onPad,
            upright,
            timeSec: (now - missionStartRef.current) / 1000,
          })
          s.vx = 0
          s.vy = 0
          setStatus(s.status)
        }
      }

      particlesRef.current.forEach((p) => {
        p.age += dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += GRAVITY * (p.kind === 'dust' ? 0.15 : 0.4) * dt
      })
      particlesRef.current = particlesRef.current.filter((p) => p.age < p.life)

      render(ctx, s, now, thrusting, {
        stars: starsRef.current,
        regolith: regolithRef.current,
        particles: particlesRef.current,
        terrain,
      })
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
        <div className={`lander-overlay lander-overlay--${status}`}>
          <h2>{status === 'landed' ? 'Touchdown!' : 'Mission Failed'}</h2>
          <p className="lander-overlay-sub">
            {status === 'landed'
              ? 'Velocity and angle were within safe limits.'
              : 'Too fast, too steep, or off the pad.'}
          </p>
          <button type="button" onClick={resetSim}>
            Try Again
          </button>
        </div>
      )}
      <p className="lander-controls">
        W / ↑ thrust &nbsp;·&nbsp; A / ← rotate left &nbsp;·&nbsp; D / → rotate right
        &nbsp;·&nbsp; R restart
      </p>
      <p className="lander-site-caption">
        Terrain: real elevation data from {SITE.site} ({Math.abs(SITE.centerLatDeg)}°S) &mdash; {SITE.source}
      </p>
    </div>
  )
}

function drawStarLayer(ctx, stars, now, parallaxX) {
  stars.forEach((star) => {
    const twinkle = 0.55 + 0.45 * Math.sin(now / (300 / star.speed) + star.phase)
    ctx.globalAlpha = twinkle
    ctx.fillStyle = '#e8ecff'
    ctx.beginPath()
    ctx.arc(star.x + parallaxX, star.y, star.r, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

function drawStars(ctx, stars, now, shipX) {
  const drift = (shipX - CANVAS_WIDTH / 2)
  drawStarLayer(ctx, stars.far, now, -drift * 0.015)
  drawStarLayer(ctx, stars.near, now, -drift * 0.035)
}

function drawGround(ctx, now, regolith, terrain) {
  const points = terrain.points
  const { padX, padWidth, padY } = terrain

  const groundGradient = ctx.createLinearGradient(0, TERRAIN_TOP_Y, 0, CANVAS_HEIGHT)
  groundGradient.addColorStop(0, '#3a3650')
  groundGradient.addColorStop(1, '#17151f')
  ctx.fillStyle = groundGradient
  ctx.beginPath()
  ctx.moveTo(0, CANVAS_HEIGHT)
  points.forEach((p) => ctx.lineTo(p.x, p.y))
  ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT)
  ctx.closePath()
  ctx.fill()

  // regolith speckle texture
  regolith.forEach((d) => {
    ctx.globalAlpha = 0.08 + d.shade * 0.1
    ctx.fillStyle = d.shade > 0.5 ? '#6b7280' : '#0a0a12'
    ctx.beginPath()
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1

  // soft horizon rim glow, then the crisp ridge line on top
  ctx.save()
  ctx.shadowColor = 'rgba(61, 111, 224, 0.6)'
  ctx.shadowBlur = 14
  ctx.strokeStyle = 'rgba(61, 111, 224, 0.3)'
  ctx.lineWidth = 3
  ctx.beginPath()
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.stroke()
  ctx.restore()

  ctx.strokeStyle = 'rgba(148, 178, 255, 0.55)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.stroke()

  // landing pad: white/red hazard marking with pulsing glow + corner lights
  const pulse = 0.5 + 0.5 * Math.sin(now / 260)
  ctx.save()
  ctx.shadowColor = '#3d6fe0'
  ctx.shadowBlur = 8 + pulse * 10
  ctx.fillStyle = '#e5e7eb'
  ctx.fillRect(padX, padY - 4, padWidth, 4)
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.rect(padX, padY - 4, padWidth, 4)
  ctx.clip()
  ctx.strokeStyle = '#fc3d21'
  ctx.lineWidth = 4
  for (let sx = padX - 20; sx < padX + padWidth + 20; sx += 10) {
    ctx.beginPath()
    ctx.moveTo(sx, padY)
    ctx.lineTo(sx + 14, padY - 14)
    ctx.stroke()
  }
  ctx.restore()

  const lightAlpha = 0.4 + 0.6 * pulse
  ;[padX, padX + padWidth].forEach((lx) => {
    ctx.globalAlpha = lightAlpha
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.arc(lx, padY - 6, 3, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

function drawShip(ctx, s, thrusting) {
  ctx.save()
  ctx.translate(s.x, s.y)
  ctx.rotate(s.angle)

  if (thrusting) {
    const flicker = 11 + Math.random() * 11
    const flameGradient = ctx.createLinearGradient(0, SHIP_HALF_HEIGHT + 2, 0, SHIP_HALF_HEIGHT + flicker)
    flameGradient.addColorStop(0, '#ffffff')
    flameGradient.addColorStop(0.35, '#fff7cc')
    flameGradient.addColorStop(0.7, '#fbbf24')
    flameGradient.addColorStop(1, 'rgba(252, 61, 33, 0)')
    ctx.fillStyle = flameGradient
    ctx.beginPath()
    ctx.moveTo(-4, SHIP_HALF_HEIGHT + 2)
    ctx.lineTo(4, SHIP_HALF_HEIGHT + 2)
    ctx.lineTo(0, SHIP_HALF_HEIGHT + flicker)
    ctx.closePath()
    ctx.fill()
  }

  // antenna
  ctx.strokeStyle = '#9ca3af'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(3, -SHIP_HALF_HEIGHT + 1)
  ctx.lineTo(8, -SHIP_HALF_HEIGHT - 7)
  ctx.stroke()
  ctx.fillStyle = '#9ca3af'
  ctx.beginPath()
  ctx.arc(8, -SHIP_HALF_HEIGHT - 7, 1, 0, Math.PI * 2)
  ctx.fill()

  // legs with footpads
  ctx.strokeStyle = '#9ca3af'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-7, 4)
  ctx.lineTo(-15, SHIP_HALF_HEIGHT + 5)
  ctx.moveTo(7, 4)
  ctx.lineTo(15, SHIP_HALF_HEIGHT + 5)
  ctx.stroke()
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.moveTo(-18, SHIP_HALF_HEIGHT + 5)
  ctx.lineTo(-12, SHIP_HALF_HEIGHT + 5)
  ctx.moveTo(12, SHIP_HALF_HEIGHT + 5)
  ctx.lineTo(18, SHIP_HALF_HEIGHT + 5)
  ctx.stroke()

  // engine bell (descent stage)
  ctx.fillStyle = '#4b5563'
  ctx.beginPath()
  ctx.moveTo(-4, SHIP_HALF_HEIGHT - 4)
  ctx.lineTo(4, SHIP_HALF_HEIGHT - 4)
  ctx.lineTo(3, SHIP_HALF_HEIGHT + 2)
  ctx.lineTo(-3, SHIP_HALF_HEIGHT + 2)
  ctx.closePath()
  ctx.fill()

  // body (ascent stage)
  const bodyGradient = ctx.createLinearGradient(-9, 0, 9, 0)
  bodyGradient.addColorStop(0, '#c7cbd4')
  bodyGradient.addColorStop(0.5, '#eef0f4')
  bodyGradient.addColorStop(1, '#aab0bd')
  ctx.fillStyle = bodyGradient
  ctx.beginPath()
  ctx.moveTo(0, -SHIP_HALF_HEIGHT)
  ctx.lineTo(9, SHIP_HALF_HEIGHT - 4)
  ctx.lineTo(-9, SHIP_HALF_HEIGHT - 4)
  ctx.closePath()
  ctx.fill()

  // gold foil insulation accents
  ctx.strokeStyle = '#d4af37'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(-6, 6)
  ctx.lineTo(-3, 2)
  ctx.moveTo(-3, 7)
  ctx.lineTo(0, 3)
  ctx.moveTo(6, 6)
  ctx.lineTo(3, 2)
  ctx.stroke()

  // cockpit window
  ctx.fillStyle = '#0b3d91'
  ctx.beginPath()
  ctx.arc(0, -3, 3.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#7fb0ff'
  ctx.beginPath()
  ctx.arc(-1, -4, 1.6, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawVector(ctx, x, y, dx, dy, color, label) {
  if (Math.hypot(dx, dy) < 4) return
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + dx, y + dy)
  ctx.stroke()

  const angle = Math.atan2(dy, dx)
  const headLen = 7
  ctx.beginPath()
  ctx.moveTo(x + dx, y + dy)
  ctx.lineTo(
    x + dx - headLen * Math.cos(angle - Math.PI / 6),
    y + dy - headLen * Math.sin(angle - Math.PI / 6),
  )
  ctx.lineTo(
    x + dx - headLen * Math.cos(angle + Math.PI / 6),
    y + dy - headLen * Math.sin(angle + Math.PI / 6),
  )
  ctx.closePath()
  ctx.fill()

  if (label) {
    ctx.font = "12px 'Space Mono', ui-monospace, Consolas, monospace"
    ctx.fillText(label, x + dx + 6, y + dy + 4)
  }
}

function drawParticles(ctx, particles) {
  particles.forEach((p) => {
    const t = p.age / p.life
    ctx.globalAlpha = Math.max(0, 1 - t)
    if (p.kind === 'spark') {
      ctx.fillStyle = t < 0.4 ? '#fff7cc' : '#fbbf24'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 1.8 * (1 - t) + 0.4, 0, Math.PI * 2)
      ctx.fill()
    } else if (p.kind === 'dust') {
      ctx.fillStyle = '#8b8378'
      ctx.globalAlpha *= 0.5
      ctx.beginPath()
      ctx.arc(p.x, p.y, 1.5 + t * 2.5, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.fillStyle = t < 0.5 ? '#fbbf24' : '#6b7280'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  })
  ctx.globalAlpha = 1
}

function drawCornerBrackets(ctx) {
  const m = 10
  const len = 22
  ctx.strokeStyle = 'rgba(61, 111, 224, 0.55)'
  ctx.lineWidth = 2
  ;[
    { x: m, y: m, dx: 1, dy: 1 },
    { x: CANVAS_WIDTH - m, y: m, dx: -1, dy: 1 },
    { x: m, y: CANVAS_HEIGHT - m, dx: 1, dy: -1 },
    { x: CANVAS_WIDTH - m, y: CANVAS_HEIGHT - m, dx: -1, dy: -1 },
  ].forEach(({ x, y, dx, dy }) => {
    ctx.beginPath()
    ctx.moveTo(x + len * dx, y)
    ctx.lineTo(x, y)
    ctx.lineTo(x, y + len * dy)
    ctx.stroke()
  })
}

function drawVignette(ctx) {
  const vignette = ctx.createRadialGradient(
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2,
    CANVAS_HEIGHT * 0.35,
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2,
    CANVAS_HEIGHT * 0.78,
  )
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.45)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
}

function drawHud(ctx, s, terrain) {
  const altitudeM = Math.max(0, (terrain.terrainYAt(s.x) - s.y) / SCALE)
  const vxMs = s.vx / SCALE
  const vyMs = s.vy / SCALE
  const speedMs = Math.hypot(vxMs, vyMs)

  ctx.save()
  ctx.fillStyle = 'rgba(11, 12, 20, 0.6)'
  ctx.strokeStyle = 'rgba(61, 111, 224, 0.45)'
  ctx.lineWidth = 1
  roundRect(ctx, 12, 12, 230, 112, 8)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#e5e7eb'
  ctx.font = "14px 'Space Mono', ui-monospace, Consolas, monospace"
  ctx.textAlign = 'left'
  ctx.fillText(`Altitude   ${altitudeM.toFixed(1)} m`, 24, 32)
  ctx.fillText(`Speed      ${speedMs.toFixed(1)} m/s`, 24, 52)
  ctx.fillText(`Vx ${vxMs.toFixed(1).padStart(6)}  Vy ${vyMs.toFixed(1).padStart(6)}`, 24, 72)

  const fuelPct = s.fuel / FUEL_MAX
  ctx.fillStyle = '#e5e7eb'
  ctx.fillText('Fuel', 24, 92)
  const barX = 70
  const barY = 84
  const barW = 150
  const barH = 10
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  roundRect(ctx, barX, barY, barW, barH, 4)
  ctx.fill()
  ctx.fillStyle = fuelPct > 0.5 ? '#4ade80' : fuelPct > 0.2 ? '#fbbf24' : '#f87171'
  roundRect(ctx, barX, barY, barW * fuelPct, barH, 4)
  ctx.fill()

  ctx.fillStyle = 'rgba(229,231,235,0.6)'
  ctx.font = "11px 'Space Mono', ui-monospace, Consolas, monospace"
  ctx.fillText(`Safe landing: <${SAFE_SPEED_MS} m/s, <15° tilt`, 24, 112)
  ctx.restore()
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function render(ctx, s, now, thrusting, assets) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  let shakeX = 0
  let shakeY = 0
  if (s.status === 'crashed') {
    const t = (now - s.eventTime) / 400
    if (t < 1) {
      const mag = (1 - t) * 7
      shakeX = (Math.random() - 0.5) * mag
      shakeY = (Math.random() - 0.5) * mag
    }
  }

  ctx.save()
  ctx.translate(shakeX, shakeY)

  const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
  sky.addColorStop(0, '#05060f')
  sky.addColorStop(1, '#0b1f4d')
  ctx.fillStyle = sky
  ctx.fillRect(-10, -10, CANVAS_WIDTH + 20, CANVAS_HEIGHT + 20)

  drawStars(ctx, assets.stars, now, s.x)
  drawGround(ctx, now, assets.regolith, assets.terrain)

  if (s.status !== 'crashed') {
    drawShip(ctx, s, thrusting)
  }
  drawParticles(ctx, assets.particles)

  if (s.status === 'flying') {
    const arrowScale = 4
    drawVector(ctx, s.x, s.y, s.vx * arrowScale, s.vy * arrowScale, '#4f83ff', 'v')
    if (thrusting) {
      const thrustScale = 22
      drawVector(
        ctx,
        s.x,
        s.y,
        Math.sin(s.angle) * thrustScale,
        -Math.cos(s.angle) * thrustScale,
        '#fbbf24',
        'thrust',
      )
    }
  }

  if (s.status === 'landed') {
    const t = Math.min(1, (now - s.eventTime) / 700)
    ctx.strokeStyle = `rgba(74, 222, 128, ${1 - t})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(s.x, assets.terrain.padY - 4, 10 + t * 40, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.restore()

  drawVignette(ctx)
  drawHud(ctx, s, assets.terrain)
  drawCornerBrackets(ctx)
}

export default Lander
