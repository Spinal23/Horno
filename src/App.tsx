import { useEffect, useRef, useState } from "react"

const WIDTH = 840
const HEIGHT = 260
const LEFT = 50
const TOP = 20
const PLOT_WIDTH = 770
const PLOT_HEIGHT = 190
const xAt = (minute: number, span = 30) => LEFT + (minute / span) * PLOT_WIDTH
const yAt = (temperature: number) => TOP + PLOT_HEIGHT * (1 - temperature / 250)

function Icon({ name, size = 20 }: { name: "heat" | "bulb" | "temp" | "target" | "chart" | "link" | "clock" | "download"; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  const paths = {
    heat: <><path d="M12 3c2.5 3 4 5.2 4 8a4 4 0 0 1-8 0c0-1.6.8-3.3 2-4.8-.1 2.1.8 3.1 2 3.5C12.9 7.6 12.6 5.4 12 3Z"/><path d="M9 17.5a3.2 3.2 0 0 0 6 0"/></>,
    bulb: <><path d="M9 18h6M10 21h4M8.2 14.5a7 7 0 1 1 7.6 0c-.8.5-1.3 1.4-1.3 2.5h-5c0-1.1-.5-2-1.3-2.5Z"/><path d="M12 4v2M5.6 7l1.5 1M18.4 7l-1.5 1"/></>,
    temp: <><path d="M14 14.7V5a3 3 0 0 0-6 0v9.7a5 5 0 1 0 6 0Z"/><path d="M11 11v7"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 6-8"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20l1.2-1.2"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></>,
  }
  return <svg {...common}>{paths[name]}</svg>
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>
}

function SectionTitle({ icon, children, detail }: { icon: "heat" | "bulb" | "temp" | "target" | "chart" | "link" | "clock"; children: React.ReactNode; detail?: string }) {
  return <div className="section-title"><span className="section-icon"><Icon name={icon} size={17}/></span><div><h2>{children}</h2>{detail && <p>{detail}</p>}</div></div>
}

function Bulb({ on, index }: { on: boolean; index: number }) {
  return <div className={`bulb-unit ${on ? "bulb-on" : "bulb-off"}`} aria-label={`Foco ${index + 1} ${on ? "encendido" : "apagado"}`} title={`Foco ${index + 1}: ${on ? "encendido" : "apagado"}`}><Icon name="bulb" size={22}/><span>F{index + 1}</span></div>
}

function Gauge({ value }: { value: number | null }) {
  const radius = 72
  const circumference = 2 * Math.PI * radius * 0.75
  const progress = value === null ? 0 : Math.max(0, Math.min(1, value / 250))
  return <div className="gauge" aria-label={value === null ? "Esperando lectura" : `Temperatura ${value} grados`}>
    <svg viewBox="0 0 180 158" role="img">
      <defs><linearGradient id="gauge-gradient"><stop stopColor="#F59E0B"/><stop offset="1" stopColor="#EA580C"/></linearGradient></defs>
      <circle cx="90" cy="86" r={radius} fill="none" stroke="#E8EDF3" strokeWidth="12" strokeDasharray={`${circumference} 999`} strokeLinecap="round" transform="rotate(135 90 86)"/>
      {progress > 0 && <circle cx="90" cy="86" r={radius} fill="none" stroke="url(#gauge-gradient)" strokeWidth="12" strokeDasharray={`${circumference * progress} 999`} strokeLinecap="round" transform="rotate(135 90 86)"/>}
      <text x="90" y="83" textAnchor="middle" className="gauge-number">{value === null ? "—" : value.toFixed(1)}</text>
      <text x="90" y="107" textAnchor="middle" className="gauge-unit">°C</text>
      <text x="26" y="144" textAnchor="middle" className="gauge-range">0</text>
      <text x="154" y="144" textAnchor="middle" className="gauge-range">250</text>
    </svg>
  </div>
}

export default function App() {
  const [setpoint, setSetpoint] = useState(0)
  const [appliedSetpoint, setAppliedSetpoint] = useState(0)
  const [temperature, setTemperature] = useState<number | null>(null)
  const [confirmedHeating] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [simulationSeconds, setSimulationSeconds] = useState(0)
  const [oven, setOven] = useState("durapax")
  const [temperatureLimit, setTemperatureLimit] = useState("")
  const [warningMargin, setWarningMargin] = useState(5)
  const [thermalTime, setThermalTime] = useState(180)
  const simulationOrigin = useRef<number | null>(null)
  const simulationTemperature = useRef(24)
  const simulationHeatState = useRef(false)
  const [history, setHistory] = useState<number[]>([])
  const [clock, setClock] = useState("")
  const [range, setRange] = useState<5 | 10 | 30>(30)

  useEffect(() => {
    const update = () => setClock(new Date().toLocaleTimeString("es-SV", { hour12: false }))
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!simulating) return
    const timer = window.setInterval(() => {
      if (simulationOrigin.current === null) return
      const elapsed = Math.floor((Date.now() - simulationOrigin.current) / 1000)
      const seconds = elapsed
      const ambient = 24
      const goal = Math.min(appliedSetpoint, Number(temperatureLimit))
      const equilibrium = Math.min(Number(temperatureLimit), goal + 12)
      const current = simulationTemperature.current
      const heat = current < goal - 0.5
      simulationHeatState.current = heat
      let nextTemperature = heat
        ? current + (equilibrium - current) * (1 - Math.exp(-1 / Math.max(10, thermalTime)))
        : current + (ambient - current) * (1 - Math.exp(-1 / Math.max(30, thermalTime * 1.5)))
      if (temperatureLimit && nextTemperature >= Number(temperatureLimit)) {
        nextTemperature = Number(temperatureLimit)
        simulationHeatState.current = false
        setSimulating(false)
      }
      simulationTemperature.current = Math.max(ambient, nextTemperature)
      const displayTemperature = Number(simulationTemperature.current.toFixed(1))
      setTemperature(displayTemperature)
      setHistory(previous => [...previous, displayTemperature].slice(-1800))
      setSimulationSeconds(seconds)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [simulating, appliedSetpoint, temperatureLimit, thermalTime])

  useEffect(() => {
    if (simulating) return
    simulationHeatState.current = false
  }, [simulating])

  const heating = confirmedHeating || (simulating && simulationHeatState.current)
  const configuredLimit = oven === "durapax" && temperatureLimit !== "" && Number.isFinite(Number(temperatureLimit))
  const alertState = configuredLimit && temperature !== null
    ? temperature >= Number(temperatureLimit) ? "exceeded" : temperature >= Number(temperatureLimit) - warningMargin ? "near" : "normal"
    : "unset"
  const canSimulate = configuredLimit && appliedSetpoint > 24 && appliedSetpoint <= Number(temperatureLimit)
  const chartValues = history.slice(-range * 60)
  const temperaturePath = chartValues.map((value, index) => `${index === 0 ? "M" : "L"}${xAt(index / 60, range).toFixed(1)},${yAt(value).toFixed(1)}`).join(" ")
  const setpointY = yAt(appliedSetpoint)
  const limitY = configuredLimit ? yAt(Number(temperatureLimit)) : null

  const startSimulation = () => {
    if (!canSimulate) return
    simulationOrigin.current = Date.now()
    simulationTemperature.current = 24
    simulationHeatState.current = true
    setTemperature(24)
    setHistory([24])
    setSimulationSeconds(0)
    setSimulating(true)
  }
  const stopSimulation = () => {
    setSimulating(false)
    simulationHeatState.current = false
  }

  const exportCsv = () => {
    const contents = ["Hora,Temperatura,Consigna,Estado de focos,Modo", `,${temperature === null ? "Sin lectura" : temperature},${appliedSetpoint},${heating ? "Encendidos" : "Apagados"},${simulating ? "Simulación" : "Hardware"}`].join("\n")
    const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "registro-horno.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Icon name="heat" size={21}/></div><div><div className="brand-title">Operación Horno <span>4.0</span></div><div className="brand-subtitle">Control térmico</div></div></div>
      <div className="connection-pill"><span className="status-dot"/><span>ESP32 desconectado</span></div>
      <div className="topbar-meta"><span className="preview-label">VISTA PREVIA</span><span className="clock">{clock}</span></div>
    </header>

    <main className="dashboard">
      <div className="page-heading"><div><p className="eyebrow">MONITOREO Y CONTROL</p><h1>Panel de temperatura</h1><p className="page-description">Visualiza la lectura del LM35 y controla los focos del horno.</p></div><div className="session-badge"><Icon name="clock" size={15}/> {simulating ? "Simulación en curso" : "Listo para conectar"}</div></div>

      <Card className="oven-config"><div className="oven-select-wrap"><label htmlFor="oven-select" className="field-label">Horno en uso</label><select id="oven-select" className="oven-select" value={oven} onChange={event => setOven(event.target.value)}><option value="durapax">Horno 1 · Durapax</option><option value="wip" disabled>Horno 2 · Por definir (WIP)</option></select></div><div className="limit-setting"><label htmlFor="temp-limit">Límite térmico del recipiente</label><div className="limit-input-wrap"><input id="temp-limit" type="number" min="25" max="250" step="1" placeholder="Configurar" value={temperatureLimit} onChange={event => { const value = event.target.value; setTemperatureLimit(value === "" ? "" : String(Math.min(250, Math.max(25, Number(value))))) }}/><span>°C</span></div></div><div className="margin-setting"><label htmlFor="warning-margin">Avisar antes</label><div className="limit-input-wrap"><input id="warning-margin" type="number" min="1" max="30" step="1" value={warningMargin} onChange={event => setWarningMargin(Math.min(30, Math.max(1, Number(event.target.value) || 1)))}/><span>°C</span></div></div><div className={`safety-status safety-${alertState}`} role="status"><span className="safety-indicator"/><div><strong>{alertState === "exceeded" ? "Límite alcanzado" : alertState === "near" ? "Cerca del límite" : alertState === "normal" ? "Dentro del límite" : "Límite pendiente"}</strong><small>{alertState === "unset" ? "Define el máximo permitido para este recipiente" : alertState === "near" ? `Alerta a ${warningMargin} °C del máximo configurado` : alertState === "exceeded" ? "Detén el calentamiento y revisa el proceso" : `Máximo configurado: ${temperatureLimit} °C`}</small></div></div></Card>

      <div className="overview-grid">
        <Card className="temperature-card"><SectionTitle icon="temp">Temperatura actual</SectionTitle><Gauge value={temperature}/><div className={`reading-state ${history.length ? "reading-simulated" : ""}`}><span className={history.length ? "simulation-dot" : "warning-dot"}/>{history.length ? "Simulada" : "Sin lectura"}</div><p className="sensor-caption">{history.length ? "Modelo térmico · no es lectura LM35" : "Sensor LM35 · esperando conexión"}</p></Card>

        <Card className="setpoint-card"><SectionTitle icon="target">Temperatura objetivo</SectionTitle><label className="field-label" htmlFor="setpoint-input">Consigna seleccionada</label><div className="setpoint-control"><button className="step-button" aria-label="Disminuir consigna" onClick={() => setSetpoint(value => Math.max(0, value - 5))}>−</button><div className="setpoint-value"><input id="setpoint-input" type="number" min="0" max="250" step="1" value={setpoint} onChange={event => setSetpoint(Math.min(250, Math.max(0, Number(event.target.value) || 0)))}/><span>°C</span></div><button className="step-button" aria-label="Aumentar consigna" onClick={() => setSetpoint(value => Math.min(250, value + 5))}>+</button></div><div className="range-label"><span>Rango permitido</span><span>{configuredLimit ? `0–${temperatureLimit} °C` : "0–250 °C"}</span></div><button className="primary-button" disabled={configuredLimit && setpoint > Number(temperatureLimit)} onClick={() => setAppliedSetpoint(setpoint)}>Aplicar consigna</button>{configuredLimit && setpoint > Number(temperatureLimit) && <div className="simulation-validation">La consigna supera el límite del horno.</div>}<div className="applied-row"><span>Consigna aplicada</span><strong>{appliedSetpoint} °C</strong></div></Card>

        <Card className="system-card"><SectionTitle icon="link">Estado del sistema</SectionTitle><div className="system-list"><div><span>ESP32</span><strong className="text-warning">Desconectado</strong></div><div><span>Sensor LM35</span><strong className="text-muted">{history.length ? "Sin conexión · demo" : "Sin lectura"}</strong></div><div><span>Orden a los focos</span><strong className={heating ? "text-orange" : "text-muted"}>{heating ? "Encendido" : "Apagado"}</strong></div><div><span>Origen del estado</span><strong className="text-muted">{history.length ? "Simulación local" : "Hardware sin conectar"}</strong></div></div><div className="notice"><span className="notice-icon">i</span><span>Los focos solo reflejan una orden confirmada del ESP32 o el modelo simulado.</span></div></Card>
      </div>

      <div className="content-grid">
        <Card className="chart-card"><div className="chart-heading"><SectionTitle icon="chart" detail={simulating ? "Curva térmica estimada · modo simulación" : "La curva se dibuja con datos del sensor o la simulación"}>Historial térmico</SectionTitle><div className="range-switch" aria-label="Rango de la gráfica">{([5, 10, 30] as const).map(value => <button key={value} className={range === value ? "selected" : ""} onClick={() => setRange(value)}>{value} min</button>)}</div></div><div className="chart-area"><svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Gráfica de temperatura en tiempo real"><defs><linearGradient id="temperature-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e9873d" stopOpacity=".2"/><stop offset="100%" stopColor="#e9873d" stopOpacity="0"/></linearGradient></defs>{[0,50,100,150,200,250].map(value => <g key={value}><line x1={LEFT} x2={LEFT + PLOT_WIDTH} y1={yAt(value)} y2={yAt(value)} className="grid-line"/><text x={LEFT - 12} y={yAt(value) + 4} textAnchor="end" className="axis-label">{value}</text></g>)}<line x1={LEFT} x2={LEFT + PLOT_WIDTH} y1={TOP + PLOT_HEIGHT} y2={TOP + PLOT_HEIGHT} className="axis-line"/>{Array.from({ length: 7 }, (_, i) => <g key={i}><line x1={xAt(i * range / 6, range)} x2={xAt(i * range / 6, range)} y1={TOP + PLOT_HEIGHT} y2={TOP + PLOT_HEIGHT + 5} className="axis-line"/><text x={xAt(i * range / 6, range)} y={TOP + PLOT_HEIGHT + 22} textAnchor="middle" className="axis-label">{Math.round(i * range / 6)}</text></g>)}<text x={LEFT + PLOT_WIDTH / 2} y={HEIGHT - 3} textAnchor="middle" className="axis-title">Tiempo (min)</text><text x="15" y={TOP + PLOT_HEIGHT / 2} textAnchor="middle" transform={`rotate(-90 15 ${TOP + PLOT_HEIGHT / 2})`} className="axis-title">Temperatura (°C)</text><line x1={LEFT} x2={LEFT + PLOT_WIDTH} y1={setpointY} y2={setpointY} className="setpoint-line"/><text x={LEFT + PLOT_WIDTH - 3} y={setpointY - 5} textAnchor="end" className="setpoint-label">Consigna {appliedSetpoint}°</text>{limitY !== null && <><line x1={LEFT} x2={LEFT + PLOT_WIDTH} y1={limitY} y2={limitY} className="limit-line"/><text x={LEFT + PLOT_WIDTH - 3} y={limitY - 5} textAnchor="end" className="limit-label">Límite {temperatureLimit}°</text></>}{temperaturePath && <><path d={`${temperaturePath} L${xAt(Math.min(range, (chartValues.length - 1) / 60), range)} ${TOP + PLOT_HEIGHT} L${LEFT} ${TOP + PLOT_HEIGHT} Z`} className="temperature-area"/><path d={temperaturePath} className="temperature-line"/><circle cx={xAt(Math.min(range, (chartValues.length - 1) / 60), range)} cy={yAt(chartValues[chartValues.length - 1])} r="4.5" className="temperature-point"/></>}{!temperaturePath && <g className="chart-empty"><rect x="235" y="87" width="370" height="62" rx="14"/><circle cx="273" cy="118" r="16"/><path d="M273 109v12m0 5v.1"/><text x="300" y="115">Aún no hay lecturas</text><text x="300" y="133" className="chart-empty-sub">Inicia la simulación o conecta el ESP32</text></g>}</svg></div><div className="chart-legend"><span className="legend-mark"/><span>Temperatura {simulating ? "simulada" : "LM35"}</span><span className="setpoint-legend"/><span>Consigna</span>{configuredLimit && <><span className="limit-legend"/><span>Límite del horno</span></>}</div></Card>

        <Card className="control-card"><div className="control-header"><div><p className="eyebrow">SALIDA DE CALOR</p><h2>Focos calefactores</h2></div><span className={`control-lock ${simulating ? "simulation-chip" : ""}`}>{simulating ? "Simulación activa" : "Hardware desconectado"}</span></div><div className="lamp-summary"><div className="bulb-grid">{[0,1,2,3].map(index => <Bulb key={index} index={index} on={heating}/>)}</div><div className="lamp-spec"><strong>2 ramas en paralelo · 2 focos en serie por rama</strong><span>7.5 W · 127 V nominal por foco</span><span>Potencia nominal declarada: 30 W</span></div></div><div className="electrical-note">A 127 V, dos focos de 127 V en serie reciben cerca de 63.5 V cada uno. La potencia real no será la nominal; confirma el circuito antes de energizarlo.</div><div className="lamp-state"><span>Orden a los focos</span><strong className={heating ? "text-orange" : "text-muted"}>{heating ? "ENCENDIDOS" : "APAGADOS"}</strong></div><div className="simulation-panel"><div className="simulation-heading"><div><h3>Simulación térmica</h3><p>Modelo exponencial ilustrativo · no acciona el ESP32</p></div><span className="simulation-tag">{simulating ? `T+ ${Math.floor(simulationSeconds/60).toString().padStart(2,"0")}:${(simulationSeconds%60).toString().padStart(2,"0")}` : "DEMO"}</span></div><label className="field-label" htmlFor="simulation-time">Tiempo de respuesta estimado</label><div className="simulation-time-row"><input id="simulation-time" type="range" min="30" max="900" step="30" value={thermalTime} onChange={event => setThermalTime(Number(event.target.value))} disabled={simulating}/><strong>{Math.round(thermalTime/60)} min</strong></div><small className="simulation-help">Constante del modelo; ajústala con datos experimentales.</small><div className="simulation-actions"><button className="simulation-start" disabled={!canSimulate || simulating} onClick={startSimulation}>Iniciar simulación</button><button className="simulation-stop" disabled={!simulating} onClick={stopSimulation}>Detener</button></div>{!configuredLimit && <small className="simulation-validation">Configura primero el límite térmico del horno.</small>}{configuredLimit && appliedSetpoint > Number(temperatureLimit) && <small className="simulation-validation">La consigna supera el límite. Redúcela antes de simular.</small>}</div></Card>
      </div>

      <div className="bottom-grid"><Card className="sensor-card"><SectionTitle icon="temp" detail={history.length ? "Modelo local · no conectado al ESP32" : "Entrada analógica del ESP32"}>Lectura del sensor</SectionTitle><div className="sensor-reading"><span>{temperature === null ? "—" : temperature.toFixed(1)}</span><small>°C</small></div><div className="sensor-footer"><span className={history.length ? "simulation-dot" : "warning-dot"}/>{history.length ? "Valor calculado por simulación" : "Esperando conexión serial"}</div></Card><Card className="log-card"><div className="log-heading"><SectionTitle icon="clock" detail="Lecturas y órdenes del calentador">Registro de actividad</SectionTitle><button className="export-button" onClick={exportCsv}><Icon name="download" size={15}/>Exportar CSV</button></div><div className="log-empty">{history.length ? `${history.length} muestras simuladas · Temperatura actual ${temperature?.toFixed(1)} °C` : "Las lecturas y cambios de estado aparecerán aquí."}</div></Card></div>

      <footer className="footer"><span>Operación Horno 4.0</span><span>Interfaz de monitoreo · ESP32 no conectado</span></footer>
    </main>
  </div>
}
