import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const AXES = [
  { key: 'warmth', label: '따뜻함' },
  { key: 'consideration', label: '배려심' },
  { key: 'humor', label: '유머감각' },
  { key: 'activeness', label: '적극성' },
]

function ToneRadarChart({ toneMine, toneOther }) {
  const data = AXES.map(({ key, label }) => ({
    subject: label,
    나: toneMine[key],
    상대방: toneOther[key],
  }))

  return (
    <div className="tone-radar">
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 13, fill: '#374151' }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Radar name="나" dataKey="나" stroke="#e11d48" fill="#e11d48" fillOpacity={0.3} />
          <Radar name="상대방" dataKey="상대방" stroke="#fb7185" fill="#fb7185" fillOpacity={0.2} />
          <Tooltip />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>

      <div className="tone-radar__keywords">
        <div className="tone-radar__keyword-group">
          <p className="tone-radar__keyword-title" style={{ color: '#e11d48' }}>나의 말투 키워드</p>
          <div className="tone-radar__tags">
            {toneMine.keywords.map((kw) => (
              <span key={kw} className="tone-tag tone-tag--mine">{kw}</span>
            ))}
          </div>
        </div>
        <div className="tone-radar__keyword-group">
          <p className="tone-radar__keyword-title" style={{ color: '#fb7185' }}>상대방 말투 키워드</p>
          <div className="tone-radar__tags">
            {toneOther.keywords.map((kw) => (
              <span key={kw} className="tone-tag tone-tag--other">{kw}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ToneRadarChart
