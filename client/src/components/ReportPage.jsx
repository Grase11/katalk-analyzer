import SummaryCards from './SummaryCards'
import FirstContactChart from './FirstContactChart'
import TopicChart from './TopicChart'
import ToneRadarChart from './ToneRadarChart'
import AIInsights from './AIInsights'
import WhoAmI from './WhoAmI'
import RelationshipGauge from './RelationshipGauge'
import FunPoints from './FunPoints'
import GapTimeline from './GapTimeline'

function ReportPage({ data, onReset }) {
  return (
    <div className="report-page">
      <div className="report-page__header">
        <h1 className="report-page__title">💬 카톡 관계 분석 리포트</h1>
        <p className="report-page__subtitle">AI가 분석한 당신의 대화 패턴</p>
      </div>

      <div className="report-page__sections">
        <section className="report-section">
          <h2 className="report-section__title">📊 핵심 지표</h2>
          <SummaryCards summary={data.summary} />
        </section>

        <section className="report-section">
          <h2 className="report-section__title">📞 먼저 연락 비율</h2>
          <FirstContactChart firstContact={data.firstContact} />
        </section>

        <section className="report-section">
          <h2 className="report-section__title">💬 대화 주제 분포</h2>
          <TopicChart topicDistribution={data.topicDistribution} />
        </section>

        <section className="report-section">
          <h2 className="report-section__title">🎭 말투 분석</h2>
          <ToneRadarChart toneMine={data.toneMine} toneOther={data.toneOther} />
        </section>

        <section className="report-section">
          <h2 className="report-section__title">🔍 AI 인사이트</h2>
          <AIInsights insights={data.aiInsights} />
        </section>

        <section className="report-section">
          <h2 className="report-section__title">🪞 상대방 눈에 비친 나</h2>
          <WhoAmI whoAmI={data.whoAmI} />
        </section>

        <section className="report-section">
          <h2 className="report-section__title">❤️ 관계 종합 점수</h2>
          <RelationshipGauge relationshipScore={data.relationshipScore} />
        </section>

        <section className="report-section">
          <h2 className="report-section__title">🎉 재밌는 포인트</h2>
          <FunPoints funPoints={data.funPoints} />
        </section>

        <section className="report-section">
          <h2 className="report-section__title">⏸️ 공백 기간 분석</h2>
          <GapTimeline gapAnalysis={data.gapAnalysis} />
        </section>
      </div>

      <div className="report-page__footer">
        <button className="report-page__reset-btn" onClick={onReset}>
          🔄 다시 분석하기
        </button>
      </div>
    </div>
  )
}

export default ReportPage
