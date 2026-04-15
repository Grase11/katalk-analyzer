function GapItem({ gap, index }) {
  const { startDate, endDate, durationDays, beforePattern, afterPattern } = gap

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  return (
    <div className="gap-item">
      <div className="gap-item__connector">
        <div className="gap-item__dot" />
        {index > 0 && <div className="gap-item__line" />}
      </div>
      <div className="gap-item__content">
        <div className="gap-item__header">
          <span className="gap-item__duration">{durationDays}일 공백</span>
          <span className="gap-item__dates">
            {formatDate(startDate)} ~ {formatDate(endDate)}
          </span>
        </div>
        <div className="gap-item__patterns">
          <div className="gap-item__pattern gap-item__pattern--before">
            <span className="gap-item__pattern-label">공백 전</span>
            <span className="gap-item__pattern-text">{beforePattern}</span>
          </div>
          <span className="gap-item__arrow">→</span>
          <div className="gap-item__pattern gap-item__pattern--after">
            <span className="gap-item__pattern-label">공백 후</span>
            <span className="gap-item__pattern-text">{afterPattern}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function GapTimeline({ gapAnalysis }) {
  const { gaps } = gapAnalysis

  if (!gaps || gaps.length === 0) {
    return (
      <div className="gap-timeline gap-timeline--empty">
        <p>🎉 분석 기간 동안 큰 공백 기간이 없었어요!</p>
      </div>
    )
  }

  return (
    <div className="gap-timeline">
      <p className="gap-timeline__summary">
        총 <strong>{gaps.length}번</strong>의 공백 기간이 발견되었습니다.
      </p>
      <div className="gap-timeline__list">
        {gaps.map((gap, index) => (
          <GapItem key={index} gap={gap} index={index} />
        ))}
      </div>
    </div>
  )
}

export default GapTimeline
