function WhoAmI({ whoAmI }) {
  const { description, evidences } = whoAmI

  return (
    <div className="who-am-i">
      <div className="who-am-i__description-box">
        <span className="who-am-i__quote-mark">"</span>
        <p className="who-am-i__description">{description}</p>
        <span className="who-am-i__quote-mark who-am-i__quote-mark--close">"</span>
      </div>
      {evidences && evidences.length > 0 && (
        <div className="who-am-i__evidences">
          <p className="who-am-i__evidences-title">📌 근거</p>
          <ul className="who-am-i__evidence-list">
            {evidences.map((ev, index) => (
              <li key={index} className="who-am-i__evidence-item">
                <span className="who-am-i__evidence-bullet">•</span>
                {ev}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default WhoAmI
