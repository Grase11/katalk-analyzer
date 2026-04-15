function RelationshipGauge({ relationshipScore }) {
  const { score, label, description } = relationshipScore

  const clampedScore = Math.max(0, Math.min(100, score))

  // Color gradient based on score
  const getColor = (s) => {
    if (s >= 80) return '#e11d48'
    if (s >= 60) return '#fb7185'
    if (s >= 40) return '#fda4af'
    return '#fecdd3'
  }

  const color = getColor(clampedScore)

  // SVG arc gauge
  const radius = 80
  const strokeWidth = 14
  const circumference = Math.PI * radius // half circle
  const progress = (clampedScore / 100) * circumference

  return (
    <div className="relationship-gauge">
      <div className="gauge-svg-wrapper">
        <svg width="220" height="130" viewBox="0 0 220 130">
          {/* Background arc */}
          <path
            d={`M ${110 - radius} 110 A ${radius} ${radius} 0 0 1 ${110 + radius} 110`}
            fill="none"
            stroke="#fecdd3"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d={`M ${110 - radius} 110 A ${radius} ${radius} 0 0 1 ${110 + radius} 110`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
          />
          {/* Score text */}
          <text x="110" y="95" textAnchor="middle" fontSize="36" fontWeight="800" fill={color}>
            {clampedScore}
          </text>
          <text x="110" y="115" textAnchor="middle" fontSize="13" fill="#6b7280">
            / 100
          </text>
        </svg>
      </div>

      <div className="gauge-label" style={{ color }}>
        {label}
      </div>
      <p className="gauge-description">{description}</p>

      {/* Progress bar fallback / additional visual */}
      <div className="gauge-bar-track">
        <div
          className="gauge-bar-fill"
          style={{ width: `${clampedScore}%`, background: color }}
        />
      </div>
      <div className="gauge-bar-labels">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  )
}

export default RelationshipGauge
