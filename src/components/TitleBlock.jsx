import { SITE } from '../sim/terrain'

function TitleBlock() {
  const date = new Date().toISOString().slice(0, 10)

  return (
    <footer className="title-block">
      <span>LDT&#8209;SIM&#8209;01&nbsp;&nbsp;REV.A</span>
      <span className="title-block-sep" aria-hidden="true" />
      <span>
        SITE&nbsp;&nbsp;DE GERLACHE RIM 2&nbsp;&nbsp;{Math.abs(SITE.centerLatDeg)}&deg;S
      </span>
      <span className="title-block-sep" aria-hidden="true" />
      <span>{date}</span>
    </footer>
  )
}

export default TitleBlock
