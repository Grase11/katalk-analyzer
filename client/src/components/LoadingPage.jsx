export default function LoadingPage() {
  return (
    <div className="loading-page">
      <div className="loading-page__icon">🔍</div>
      <h2 className="loading-page__title">관계를 분석하는 중...</h2>
      <p className="loading-page__subtitle">
        AI가 대화 패턴을 꼼꼼히 살펴보고 있어요<br />
        잠시만 기다려주세요 (최대 1~2분 소요)
      </p>
      <div className="loading-bar">
        <div className="loading-bar__track">
          <div className="loading-bar__fill" />
        </div>
        <p className="loading-bar__text">분석 중...</p>
      </div>
    </div>
  )
}
