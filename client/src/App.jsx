import { useState } from 'react'
import axios from 'axios'
import UploadPage from './components/UploadPage'
import LoadingPage from './components/LoadingPage'
import ReportPage from './components/ReportPage'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

// AppState: { phase: 'upload' } | { phase: 'loading' } | { phase: 'report', data } | { phase: 'error', message }

function App() {
  const [appState, setAppState] = useState({ phase: 'upload' })

  const handleFileSubmit = async (file) => {
    setAppState({ phase: 'loading' })

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post(`${API_BASE_URL}/api/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      })
      setAppState({ phase: 'report', data: response.data })
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        (err.code === 'ECONNABORTED'
          ? '분석 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
          : '네트워크 연결을 확인해주세요.')
      setAppState({ phase: 'error', message })
    }
  }

  const handleRetry = () => {
    setAppState({ phase: 'upload' })
  }

  return (
    <div className="app">
      {appState.phase === 'upload' && (
        <UploadPage onFileSubmit={handleFileSubmit} />
      )}
      {appState.phase === 'loading' && <LoadingPage />}
      {appState.phase === 'report' && (
        <ReportPage data={appState.data} onReset={handleRetry} />
      )}
      {appState.phase === 'error' && (
        <div className="error-page">
          <div className="error-page__icon">😢</div>
          <p className="error-page__message">{appState.message}</p>
          <button className="error-page__retry" onClick={handleRetry}>
            다시 시도
          </button>
        </div>
      )}
    </div>
  )
}

export default App
