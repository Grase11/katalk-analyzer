import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#e11d48', '#fb7185', '#fda4af', '#fecdd3']

function FirstContactChart({ firstContact }) {
  const { ratios, totalSessions } = firstContact

  const data = Object.entries(ratios).map(([name, value]) => ({ name, value }))

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={700}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="first-contact-chart">
      <p className="chart-meta">총 {totalSessions.toLocaleString('ko-KR')}번의 대화 세션 분석</p>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            dataKey="value"
            labelLine={false}
            label={renderCustomLabel}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value}%`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="first-contact-chart__legend">
        {data.map((entry, index) => (
          <div key={entry.name} className="first-contact-chart__legend-item">
            <span
              className="first-contact-chart__legend-dot"
              style={{ background: COLORS[index % COLORS.length] }}
            />
            <span className="first-contact-chart__legend-name">{entry.name}</span>
            <span className="first-contact-chart__legend-value">{entry.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FirstContactChart
