import { useState, useRef } from 'react'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function validateFile(file) {
  if (!file.name.toLowerCase().endsWith('.txt')) {
    return 'txt 파일만 업로드 가능합니다'
  }
  if (file.size > MAX_FILE_SIZE) {
    return '파일 크기는 10MB 이하만 가능합니다'
  }
  return null
}

export default function UploadPage({ onFileSubmit }) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  const handleFile = (file) => {
    if (!file) return
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      setSelectedFile(null)
      return
    }
    setError(null)
    setSelectedFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const handleInputChange = (e) => {
    handleFile(e.target.files[0])
  }

  const handleSubmit = async () => {
    if (!selectedFile) return
    setUploading(true)
    await onFileSubmit(selectedFile)
    setUploading(false)
  }

  return (
    <div className="upload-page">
      <h1 className="upload-page__title">💬 카톡 관계 분석기</h1>
      <p className="upload-page__subtitle">
        카카오톡 대화 내보내기 파일을 업로드하면<br />
        AI가 관계를 분석해드립니다
      </p>

      <div
        className={`dropzone${dragActive ? ' dropzone--active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
        <div className="dropzone__icon">📂</div>
        {selectedFile ? (
          <>
            <p className="dropzone__text" style={{ color: '#e11d48', fontWeight: 600 }}>
              {selectedFile.name}
            </p>
            <p className="dropzone__hint">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </>
        ) : (
          <>
            <p className="dropzone__text">여기에 파일을 드래그하거나</p>
            <p className="dropzone__hint">txt 파일 · 최대 10MB</p>
          </>
        )}
        <button
          className="dropzone__button"
          onClick={(e) => {
            e.stopPropagation()
            if (!uploading) inputRef.current?.click()
          }}
          disabled={uploading}
        >
          파일 선택
        </button>
      </div>

      {error && (
        <div className="upload-error" role="alert">
          ⚠️ {error}
        </div>
      )}

      {selectedFile && !error && !uploading && (
        <button
          className="dropzone__button"
          style={{ marginTop: '0.5rem', padding: '0.75rem 2.5rem', fontSize: '1rem' }}
          onClick={handleSubmit}
        >
          분석 시작하기 ✨
        </button>
      )}

      {uploading && (
        <div className="upload-progress">
          <p className="upload-progress__text">파일 업로드 중...</p>
          <div className="upload-progress__bar-track">
            <div className="upload-progress__bar-fill" style={{ width: '60%' }} />
          </div>
        </div>
      )}
    </div>
  )
}
