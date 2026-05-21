import { useState, useEffect, useRef, useCallback } from "react";

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState("vi-VN");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [error, setError] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [copied, setCopied] = useState(false);

  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");

  useEffect(() => {
    if (!("SpeechRecognition" in window) && !("webkitSpeechRecognition" in window)) {
      setSpeechSupported(false);
    }
  }, []);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (e) => {
      let interim = "";
      let final = transcriptRef.current;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      transcriptRef.current = final;
      setTranscript(final);
      setInterimTranscript(interim);
    };

    recognition.onerror = (e) => {
      const msgs = {
        "not-allowed": language === "vi-VN" ? "Trình duyệt bị từ chối quyền micro. Hãy cho phép quyền microphone." : "Microphone permission denied.",
        "no-speech": language === "vi-VN" ? "Không phát hiện giọng nói." : "No speech detected.",
        "network": language === "vi-VN" ? "Lỗi mạng khi nhận diện giọng nói." : "Network error during speech recognition."
      };
      setError(msgs[e.error] || `Error: ${e.error}`);
      setIsListening(false);
    };

    recognition.onend = () => { setIsListening(false); setInterimTranscript(""); };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setError("");
  }, [language]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // Hàm kết nối trực tiếp tới Backend Python/Flask của bạn
  const processWithAI = async () => {
    const text = transcript.trim();
    if (!text) {
      setError(language === "vi-VN" ? "Chưa có nội dung để xử lý!" : "No content to process!");
      return;
    }
    setIsProcessing(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("http://127.0.0.1:5000/api/process-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          transcript: text,
          language: language
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Lỗi kết nối Server Backend");
      }
      
      const parsed = await res.json();
      setResult(parsed);
      setActiveTab("summary");
    } catch (err) {
      setError(language === "vi-VN" ? "Lỗi xử lý: " + err.message : "Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportFile = (fmt) => {
    let content = fmt === "md"
      ? `# VoiceHelper — Ghi chú bài giảng\n\n## 📝 Transcript\n\n${transcript}\n\n`
      : `VoiceHelper — Ghi chú bài giảng\n${"=".repeat(40)}\n\nTRANSCRIPT:\n${transcript}\n\n`;

    if (result) {
      if (fmt === "md") {
        content += `## 📋 Tóm tắt\n\n${result.summary}\n\n## 🔑 Key Points\n\n${result.keyPoints.map(p => `- ${p}`).join("\n")}\n\n## 🃏 Flashcards\n\n${result.flashcards.map(f => `**Q:** ${f.question}\n\n**A:** ${f.answer}`).join("\n\n---\n\n")}`;
      } else {
        content += `SUMMARY:\n${result.summary}\n\nKEY POINTS:\n${result.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\nFLASHCARDS:\n${result.flashcards.map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")}`;
      }
    }
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `voicehelper-notes.${fmt}`; a.click();
    URL.revokeObjectURL(url);
  };

  const copyTranscript = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = transcript.split(/\s+/).filter(Boolean).length;
  const readMin = Math.max(1, Math.ceil(wordCount / 150));

  return (
    <div style={{ fontFamily: "var(--font-sans)", padding: "1.25rem 1rem", maxWidth: 700, margin: "0 auto" }}>
      <style>{`
        @keyframes pulse-ring { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
        @keyframes bar-wave { 0%,100%{height:5px} 50%{height:26px} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .rec-dot { width:10px;height:10px;border-radius:50%;background:var(--color-text-danger);animation:pulse-ring 1.2s ease-in-out infinite; }
        .bar { width:4px;border-radius:3px;background:var(--color-text-info);transition:height .1s; }
        .bar.active { animation:bar-wave 1s ease-in-out infinite; }
        .tab-btn { cursor:pointer;border:none;outline:none;background:transparent;transition:all .15s; }
        .tab-btn:hover { background:var(--color-background-secondary); }
        .kp-item:hover { border-color:var(--color-border-info)!important; }
        .fc-flip { perspective:800px; }
        .export-btn:hover { background:var(--color-background-secondary)!important; }
        .lang-btn { cursor:pointer;transition:all .15s; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <i className="ti ti-microphone" style={{ fontSize:22, color:"var(--color-text-info)" }} aria-hidden="true" />
          <span style={{ fontSize:19, fontWeight:500 }}>VoiceHelper</span>
          <span style={{ fontSize:12, color:"var(--color-text-tertiary)", background:"var(--color-background-secondary)", padding:"2px 8px", borderRadius:"var(--border-radius-md)", border:"0.5px solid var(--color-border-tertiary)" }}>T3</span>
        </div>
        <div style={{ display:"flex", gap:5 }}>
          {[["vi-VN","🇻🇳 Việt"],["en-US","🇺🇸 EN"]].map(([lang, label]) => (
            <button key={lang} className="lang-btn" onClick={() => setLanguage(lang)} style={{
              padding:"4px 10px", borderRadius:"var(--border-radius-md)", fontSize:13,
              border: language===lang ? "1.5px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
              background: language===lang ? "var(--color-background-info)" : "transparent",
              color: language===lang ? "var(--color-text-info)" : "var(--color-text-secondary)"
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── Speech not supported ── */}
      {!speechSupported && (
        <div style={{ padding:"10px 14px", background:"var(--color-background-warning)", border:"0.5px solid var(--color-border-warning)", borderRadius:"var(--border-radius-md)", marginBottom:"1rem", fontSize:13, color:"var(--color-text-warning)" }}>
          <i className="ti ti-alert-triangle" style={{ marginRight:6, fontSize:14 }} aria-hidden="true" />
          {language==="vi-VN" ? "Trình duyệt không hỗ trợ Web Speech API. Vui lòng dùng Google Chrome." : "Web Speech API not supported. Please use Google Chrome."}
        </div>
      )}

      {/* ── Recording Card ── */}
      <div style={{ background:"var(--color-background-secondary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)", padding:"1rem 1.1rem", marginBottom:"0.875rem" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.875rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={isListening ? stopListening : startListening} disabled={!speechSupported} style={{
              display:"flex", alignItems:"center", gap:7, padding:"7px 16px",
              borderRadius:"var(--border-radius-md)", border:"none",
              cursor: speechSupported ? "pointer" : "not-allowed",
              background: isListening ? "var(--color-background-danger)" : "var(--color-background-info)",
              color: isListening ? "var(--color-text-danger)" : "var(--color-text-info)",
              fontWeight:500, fontSize:14
            }}>
              {isListening ? <div className="rec-dot" /> : <i className="ti ti-microphone" style={{ fontSize:15 }} aria-hidden="true" />}
              {isListening ? (language==="vi-VN" ? "Dừng" : "Stop") : (language==="vi-VN" ? "Bắt đầu ghi" : "Start recording")}
            </button>

            {isListening && (
              <div style={{ display:"flex", gap:3, alignItems:"center", height:28 }}>
                {[0,.1,.2,.3,.2,.1,0].map((d,i) => (
                  <div key={i} className="bar active" style={{ animationDelay:`${d}s`, height:5 }} />
                ))}
              </div>
            )}
            {isListening && (
              <span style={{ fontSize:12, color:"var(--color-text-danger)" }}>
                {language==="vi-VN" ? "Đang ghi..." : "Recording..."}
              </span>
            )}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {transcript && (
              <button onClick={copyTranscript} style={{
                padding:"5px 10px", borderRadius:"var(--border-radius-md)", fontSize:12,
                border:"0.5px solid var(--color-border-tertiary)", background:"transparent",
                color: copied ? "var(--color-text-success)" : "var(--color-text-secondary)", cursor:"pointer"
              }}>
                <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} style={{ fontSize:13, marginRight:4 }} aria-hidden="true" />
                {copied ? (language==="vi-VN" ? "Đã chép" : "Copied!") : (language==="vi-VN" ? "Chép" : "Copy")}
              </button>
            )}
            <button onClick={() => { setTranscript(""); transcriptRef.current=""; setInterimTranscript(""); setResult(null); setError(""); }} style={{
              padding:"5px 10px", borderRadius:"var(--border-radius-md)", fontSize:12,
              border:"0.5px solid var(--color-border-tertiary)", background:"transparent",
              color:"var(--color-text-secondary)", cursor:"pointer"
            }}>
              <i className="ti ti-trash" style={{ fontSize:13, marginRight:4 }} aria-hidden="true" />
              {language==="vi-VN" ? "Xóa" : "Clear"}
            </button>
          </div>
        </div>

        <div style={{
          minHeight:110, maxHeight:190, overflowY:"auto",
          background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)",
          borderRadius:"var(--border-radius-md)", padding:"10px 14px",
          fontSize:14, lineHeight:1.75,
          color: transcript||interimTranscript ? "var(--color-text-primary)" : "var(--color-text-tertiary)"
        }}>
          {transcript || interimTranscript
            ? <>{transcript}<span style={{ color:"var(--color-text-tertiary)", fontStyle:"italic" }}>{interimTranscript}</span></>
            : (language==="vi-VN" ? "Nhấn 'Bắt đầu ghi' rồi đọc to nội dung bài giảng..." : "Press 'Start recording' and speak to capture lecture content...")}
        </div>

        {wordCount > 0 && (
          <div style={{ display:"flex", gap:16, marginTop:7, fontSize:12, color:"var(--color-text-tertiary)" }}>
            <span><i className="ti ti-text-size" style={{ fontSize:11, marginRight:4 }} aria-hidden="true" />{wordCount} {language==="vi-VN" ? "từ" : "words"}</span>
            <span><i className="ti ti-clock" style={{ fontSize:11, marginRight:4 }} aria-hidden="true" />~{readMin} {language==="vi-VN" ? "phút đọc" : "min read"}</span>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ padding:"9px 14px", background:"var(--color-background-danger)", border:"0.5px solid var(--color-border-danger)", borderRadius:"var(--border-radius-md)", marginBottom:"0.875rem", fontSize:13, color:"var(--color-text-danger)", display:"flex", alignItems:"flex-start", gap:8 }}>
          <i className="ti ti-alert-circle" style={{ fontSize:15, marginTop:1, flexShrink:0 }} aria-hidden="true" />
          {error}
        </div>
      )}

      {/* ── Process Button ── */}
      <button onClick={processWithAI} disabled={isProcessing || !transcript} style={{
        width:"100%", padding:"11px", borderRadius:"var(--border-radius-md)", border:"none",
        cursor: transcript && !isProcessing ? "pointer" : "not-allowed",
        background: transcript && !isProcessing ? "var(--color-background-info)" : "var(--color-background-secondary)",
        color: transcript && !isProcessing ? "var(--color-text-info)" : "var(--color-text-tertiary)",
        fontWeight:500, fontSize:14, marginBottom:"1.25rem",
        display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        transition:"opacity .15s"
      }}>
        {isProcessing
          ? <><i className="ti ti-loader" style={{ fontSize:15, animation:"spin 1s linear infinite" }} aria-hidden="true" />
              {language==="vi-VN" ? "AI đang xử lý..." : "AI processing..."}</>
          : <><i className="ti ti-sparkles" style={{ fontSize:15 }} aria-hidden="true" />
              {language==="vi-VN" ? "Tóm tắt + Tạo Key Points + Flashcards" : "Summarize + Key Points + Flashcards"}</>}
      </button>

      {/* ── Results ── */}
      {result && (
        <div style={{ background:"var(--color-background-secondary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)", overflow:"hidden", marginBottom:"1rem" }}>
          <div style={{ display:"flex", borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
            {[
              ["summary", "ti-align-left", language==="vi-VN" ? "Tóm tắt" : "Summary"],
              ["keypoints", "ti-list", "Key Points"],
              ["flashcards", "ti-cards", "Flashcards"]
            ].map(([tab, icon, label]) => (
              <button key={tab} className="tab-btn" onClick={() => setActiveTab(tab)} style={{
                flex:1, padding:"9px 4px", fontSize:13,
                fontWeight: activeTab===tab ? 500 : 400,
                color: activeTab===tab ? "var(--color-text-info)" : "var(--color-text-secondary)",
                borderBottom: activeTab===tab ? "2px solid var(--color-border-info)" : "2px solid transparent",
              }}>
                <i className={`ti ${icon}`} style={{ fontSize:13, marginRight:5 }} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding:"1rem 1.1rem" }}>
            {activeTab==="summary" && (
              <div>
                <p style={{ margin:"0 0 12px", lineHeight:1.8, fontSize:14 }}>{result.summary}</p>
                <div style={{ borderTop:"0.5px solid var(--color-border-tertiary)", paddingTop:10, display:"flex", alignItems:"center", gap:6 }}>
                  <i className="ti ti-info-circle" style={{ fontSize:13, color:"var(--color-text-tertiary)" }} aria-hidden="true" />
                  <span style={{ fontSize:12, color:"var(--color-text-tertiary)" }}>
                    {language==="vi-VN" ? "Được phân tích bởi Gemini AI" : `Analyzed by Gemini AI`}
                  </span>
                </div>
              </div>
            )}

            {activeTab==="keypoints" && (
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {result.keyPoints.map((point, i) => (
                  <div key={i} className="kp-item" style={{
                    display:"flex", gap:10, alignItems:"flex-start",
                    padding:"9px 12px", background:"var(--color-background-primary)",
                    borderRadius:"var(--border-radius-md)", border:"0.5px solid var(--color-border-tertiary)",
                    fontSize:14, lineHeight:1.6, transition:"border-color .15s"
                  }}>
                    <span style={{
                      minWidth:22, height:22, borderRadius:"50%",
                      background:"var(--color-background-info)", color:"var(--color-text-info)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:11, fontWeight:500, flexShrink:0, marginTop:1
                    }}>{i + 1}</span>
                    {point}
                  </div>
                ))}
              </div>
            )}

            {activeTab==="flashcards" && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(190px, 1fr))", gap:10 }}>
                {result.flashcards.map((card, i) => (
                  <div key={i} style={{
                    background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)",
                    borderRadius:"var(--border-radius-md)", overflow:"hidden", fontSize:13
                  }}>
                    <div style={{ padding:"10px 12px 8px", borderBottom:"0.5px solid var(--color-border-tertiary)", background:"var(--color-background-info)" }}>
                      <div style={{ fontSize:11, fontWeight:500, color:"var(--color-text-info)", marginBottom:5, display:"flex", alignItems:"center", gap:5 }}>
                        <i className="ti ti-help" style={{ fontSize:11 }} aria-hidden="true" />
                        {language==="vi-VN" ? `Câu hỏi ${i+1}` : `Question ${i+1}`}
                      </div>
                      <p style={{ margin:0, lineHeight:1.55, color:"var(--color-text-primary)" }}>{card.question}</p>
                    </div>
                    <div style={{ padding:"10px 12px" }}>
                      <div style={{ fontSize:11, fontWeight:500, color:"var(--color-text-success)", marginBottom:5, display:"flex", alignItems:"center", gap:5 }}>
                        <i className="ti ti-check" style={{ fontSize:11 }} aria-hidden="true" />
                        {language==="vi-VN" ? "Trả lời" : "Answer"}
                      </div>
                      <p style={{ margin:0, lineHeight:1.55, color:"var(--color-text-secondary)" }}>{card.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Export ── */}
      {(transcript || result) && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:8 }}>
          <span style={{ fontSize:12, color:"var(--color-text-tertiary)" }}>
            <i className="ti ti-download" style={{ fontSize:13, marginRight:4 }} aria-hidden="true" />
            {language==="vi-VN" ? "Xuất file:" : "Export:"}
          </span>
          {["txt","md"].map(fmt => (
            <button key={fmt} className="export-btn" onClick={() => exportFile(fmt)} style={{
              padding:"5px 12px", borderRadius:"var(--border-radius-md)", fontSize:13,
              border:"0.5px solid var(--color-border-secondary)", background:"transparent",
              color:"var(--color-text-primary)", cursor:"pointer", transition:"background .15s"
            }}>
              <i className="ti ti-file-text" style={{ fontSize:12, marginRight:4 }} aria-hidden="true" />
              .{fmt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}