function SummaryCard({ icon, label, value, highlight }) {
  return (
    <div className="summary-card" style={highlight ? { borderColor: 'var(--rose-400)', background: 'var(--rose-50)' } : {}}>
      <div className="summary-card__icon">{icon}</div>
      <div className="summary-card__label">{label}</div>
      <div className="summary-card__value">{value}</div>
    </div>
  )
}

function SummaryCards({ summary }) {
  const { totalMessages, periodDays, relationshipType, relationshipTemperature } = summary

  return (
    <div className="summary-cards">
      <SummaryCard
        icon="💬"
        label="총 메시지 수"
        value={totalMessages.toLocaleString('ko-KR') + '개'}
      />
      <SummaryCard
        icon="📅"
        label="대화 기간"
        value={periodDays.toLocaleString('ko-KR') + '일'}
      />
      <SummaryCard
        icon="🤝"
        label="관계 유형"
        value={relationshipType}
        highlight
      />
      <SummaryCard
        icon="🌡️"
        label="관계 온도"
        value={relationshipTemperature + '°C'}
        highlight
      />
    </div>
  )
}

export default SummaryCards
