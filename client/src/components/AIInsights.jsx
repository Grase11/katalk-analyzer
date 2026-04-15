function AIInsights({ insights }) {
  return (
    <div className="ai-insights">
      {insights.map((item, index) => (
        <div key={index} className="insight-card">
          <div className="insight-card__number">{index + 1}</div>
          <div className="insight-card__body">
            <p className="insight-card__text">{item.insight}</p>
            <p className="insight-card__evidence">
              <span className="insight-card__evidence-label">근거</span>
              {item.evidence}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default AIInsights
