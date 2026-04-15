import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#e11d48', '#fb7185', '#fda4af', '#fecdd3', '#f9a8d4', '#fbcfe8']

function TopicChart({ topicDistribution }) {
  const { topics } = topicDistribution

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.06) return null
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="topic-chart">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={topics}
            cx="50%"
            cy="50%"
            outerRadius={100}
            dataKey="percentage"
            nameKey="name"
            labelLine={false}
            label={renderCustomLabel}
          >
            {topics.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value}%`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="topic-chart__list">
        {topics.map((topic, index) => (
          <div key={topic.name} className="topic-chart__item">
            <span
              className="topic-chart__dot"
              style={{ background: COLORS[index % COLORS.length] }}
            />
            <span className="topic-chart__name">{topic.name}</span>
            <div className="topic-chart__bar-track">
              <div
                className="topic-chart__bar-fill"
                style={{
                  width: `${topic.percentage}%`,
                  background: COLORS[index % COLORS.length],
                }}
              />
            </div>
            <span className="topic-chart__pct">{topic.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TopicChart
