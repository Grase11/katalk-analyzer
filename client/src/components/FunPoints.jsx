function FunPoints({ funPoints }) {
  return (
    <div className="fun-points">
      {funPoints.map((point, index) => (
        <div key={index} className="fun-card">
          <div className="fun-card__header">
            <span className="fun-card__emoji">🎯</span>
            <h3 className="fun-card__title">{point.title}</h3>
          </div>
          <p className="fun-card__description">{point.description}</p>
          {point.excerpt && (
            <div className="fun-card__excerpt">
              <p className="fun-card__excerpt-label">💬 실제 대화</p>
              <pre className="fun-card__excerpt-text">{point.excerpt}</pre>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default FunPoints
