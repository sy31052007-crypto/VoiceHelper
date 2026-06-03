import { useState, useEffect, useRef, useCallback, useMemo } from "react";

export default function App() {
  // === STATE FOR NOTEBOOK & SUBJECTS ===
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState("new");
  
  // === STATE FOR SEARCH ===
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  // === STATE FOR RECORDING & AI PROCESSING ===
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState("vi-VN");
  const [isProcessing, setIsProcessing] = useState(false);
  
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

  // AI Subject Identification (Mock logic for frontend if backend doesn't return one)
  const identifySubject = (text) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("Giải tích") || lowerText.includes("Calculus") || lowerText.includes("phương trình") || lowerText.includes("cộng")) return "Giải tích";
    if (lowerText.includes("lý") || lowerText.includes("physics") || lowerText.includes("lực") || lowerText.includes("vận tốc") || lowerText.includes("năng lượng")) return "Vật lý"; 
    if (lowerText.includes("Triết học") || lowerText.includes("philosophy") || lowerText.includes("chủ nghĩa") || lowerText.includes("xã hội")) return "Triết học";
    if (lowerText.includes("Xác suất thống kê") || lowerText.includes("tỉ lệ") || lowerText.includes("phần trăm") || lowerText.includes("xác suất")) return "Xác suất thống kê";
    if (lowerText.includes("Code") || lowerText.includes("lập trình") || lowerText.includes("react") || lowerText.includes("javascript")) return "Lập trình";
    if (lowerText.includes("Tiếng anh") || lowerText.includes("english") || lowerText.includes("grammar")) return "Ngoại ngữ";
    return "Khác";
  };

  const processWithAI = async () => {
    const text = transcript.trim();
    if (!text) {
      setError(language === "vi-VN" ? "Chưa có nội dung để xử lý!" : "No content to process!");
      return;
    }
    setIsProcessing(true);
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:5000/api/process-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, language })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Lỗi kết nối Server Backend");
      }
      
      const parsed = await res.json();
      
      // Auto-categorize
      const subject = parsed.subject || identifySubject(text);
      const title = parsed.title || (language === "vi-VN" ? "Ghi chú" : "Note") + ` - ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      
      const newResult = { ...parsed, subject, title };
      
      const newNote = {
        id: Date.now().toString(),
        title: title,
        subject: subject,
        transcript: text,
        result: newResult,
        date: new Date().toISOString()
      };
      
      setNotes(prev => [newNote, ...prev]);
      setActiveNoteId(newNote.id);
      setActiveTab("summary");
      
      // Clear recording
      setTranscript("");
      transcriptRef.current = "";
      setInterimTranscript("");
      
    } catch (err) {
      setError(language === "vi-VN" ? "Lỗi xử lý: " + err.message : "Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const performSmartSearch = () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults(null);
    setActiveNoteId("search");
    
    // Simulate AI semantic search across notes
    setTimeout(() => {
      const query = searchQuery.toLowerCase();
      const matched = notes.filter(n => 
        n.title.toLowerCase().includes(query) || 
        n.transcript.toLowerCase().includes(query) ||
        (n.result && n.result.summary && n.result.summary.toLowerCase().includes(query)) ||
        (n.result && n.result.keyPoints && n.result.keyPoints.some(k => k.toLowerCase().includes(query)))
      );
      
      setSearchResults({
        query: searchQuery,
        answer: language === "vi-VN" 
          ? (matched.length > 0 ? `Tôi đã tìm thấy ${matched.length} ghi chú có liên quan đến "${searchQuery}". Dựa trên dữ liệu, các ghi chú này chủ yếu đề cập đến các chủ đề liên quan. Bạn có thể xem chi tiết bên dưới.` : `Tôi không tìm thấy ghi chú nào liên quan đến "${searchQuery}".`)
          : (matched.length > 0 ? `I found ${matched.length} notes related to "${searchQuery}". Based on the context, you can review the specific details below.` : `I couldn't find any notes matching "${searchQuery}".`),
        relatedNotes: matched
      });
      setIsSearching(false);
    }, 1200);
  };

  const exportFile = (note, fmt) => {
    if (!note) return;
    let content = fmt === "md"
      ? `# ${note.title}\n\n**Môn học:** ${note.subject}\n\n## 📝 Transcript\n\n${note.transcript}\n\n`
      : `${note.title}\nMôn học: ${note.subject}\n${"=".repeat(40)}\n\nTRANSCRIPT:\n${note.transcript}\n\n`;

    const res = note.result;
    if (res) {
      if (fmt === "md") {
        content += `## 📋 Tóm tắt\n\n${res.summary}\n\n## 🔑 Key Points\n\n${res.keyPoints.map(p => `- ${p}`).join("\n")}\n\n## 🃏 Flashcards\n\n${res.flashcards.map(f => `**Q:** ${f.question}\n\n**A:** ${f.answer}`).join("\n\n---\n\n")}`;
      } else {
        content += `SUMMARY:\n${res.summary}\n\nKEY POINTS:\n${res.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\nFLASHCARDS:\n${res.flashcards.map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")}`;
      }
    }
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${note.title.replace(/\s+/g, '_')}.${fmt}`; a.click();
    URL.revokeObjectURL(url);
  };

  const copyTranscript = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const groupedNotes = useMemo(() => {
    const groups = {};
    notes.forEach(note => {
      if (!groups[note.subject]) groups[note.subject] = [];
      groups[note.subject].push(note);
    });
    return groups;
  }, [notes]);

  const wordCount = transcript.split(/\s+/).filter(Boolean).length;
  const readMin = Math.max(1, Math.ceil(wordCount / 150));

  // --- RENDERING HELPERS ---
  const renderNoteResults = (note) => {
    const res = note.result;
    if (!res) return null;
    return (
      <div style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)", overflow:"hidden", marginTop: "1.5rem" }}>
        <div style={{ display:"flex", borderBottom:"0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
          {[
            ["summary", "ti-align-left", language==="vi-VN" ? "Tóm tắt" : "Summary"],
            ["keypoints", "ti-list", "Key Points"],
            ["flashcards", "ti-cards", "Flashcards"]
          ].map(([tab, icon, label]) => (
            <button key={tab} className="tab-btn" onClick={() => setActiveTab(tab)} style={{
              flex:1, padding:"12px 8px", fontSize:14, cursor:"pointer", border:"none", outline:"none",
              background: activeTab===tab ? "var(--color-background-primary)" : "transparent",
              fontWeight: activeTab===tab ? 600 : 400,
              color: activeTab===tab ? "var(--color-text-info)" : "var(--color-text-secondary)",
              borderBottom: activeTab===tab ? "2px solid var(--color-text-info)" : "2px solid transparent",
            }}>
              <i className={`ti ${icon}`} style={{ fontSize:16, marginRight:6 }} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding:"1.5rem" }}>
          {activeTab==="summary" && (
            <div>
              <p style={{ margin:"0 0 16px", lineHeight:1.8, fontSize:15, color: "var(--color-text-primary)" }}>{res.summary}</p>
              <div style={{ borderTop:"0.5px solid var(--color-border-tertiary)", paddingTop:12, display:"flex", alignItems:"center", gap:6 }}>
                <i className="ti ti-sparkles" style={{ fontSize:14, color:"var(--color-text-info)" }} aria-hidden="true" />
                <span style={{ fontSize:13, color:"var(--color-text-tertiary)" }}>
                  {language==="vi-VN" ? "Phân tích tự động bởi AI" : `Auto-analyzed by AI`}
                </span>
              </div>
            </div>
          )}

          {activeTab==="keypoints" && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {res.keyPoints.map((point, i) => (
                <div key={i} className="kp-item" style={{
                  display:"flex", gap:12, alignItems:"flex-start",
                  padding:"12px 16px", background:"var(--color-background-secondary)",
                  borderRadius:"var(--border-radius-md)", border:"1px solid var(--color-border-secondary)",
                  fontSize:15, lineHeight:1.6
                }}>
                  <span style={{
                    minWidth:24, height:24, borderRadius:"50%",
                    background:"var(--color-background-info)", color:"var(--color-text-info)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:12, fontWeight:600, flexShrink:0, marginTop:1
                  }}>{i + 1}</span>
                  <span style={{ color: "var(--color-text-primary)" }}>{point}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab==="flashcards" && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:16 }}>
              {res.flashcards.map((card, i) => (
                <div key={i} style={{
                  background:"var(--color-background-secondary)", border:"1px solid var(--color-border-secondary)",
                  borderRadius:"var(--border-radius-md)", overflow:"hidden"
                }}>
                  <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--color-border-secondary)", background:"var(--color-background-info)" }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"var(--color-text-info)", marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
                      <i className="ti ti-help" style={{ fontSize:14 }} aria-hidden="true" />
                      {language==="vi-VN" ? `Câu hỏi ${i+1}` : `Question ${i+1}`}
                    </div>
                    <p style={{ margin:0, lineHeight:1.6, color:"var(--color-text-primary)", fontSize: 14 }}>{card.question}</p>
                  </div>
                  <div style={{ padding:"12px 16px" }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"var(--color-text-success)", marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
                      <i className="ti ti-bulb" style={{ fontSize:14 }} aria-hidden="true" />
                      {language==="vi-VN" ? "Trả lời" : "Answer"}
                    </div>
                    <p style={{ margin:0, lineHeight:1.6, color:"var(--color-text-secondary)", fontSize: 14 }}>{card.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const activeNote = activeNoteId !== "new" && activeNoteId !== "search" ? notes.find(n => n.id === activeNoteId) : null;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'var(--font-sans)', background: 'var(--color-background-primary)' }}>
      <style>{`
        @keyframes pulse-ring { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
        @keyframes bar-wave { 0%,100%{height:5px} 50%{height:26px} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .rec-dot { width:10px;height:10px;border-radius:50%;background:var(--color-text-danger);animation:pulse-ring 1.2s ease-in-out infinite; }
        .bar { width:4px;border-radius:3px;background:var(--color-text-info);transition:height .1s; }
        .bar.active { animation:bar-wave 1s ease-in-out infinite; }
        .sidebar-item:hover { background: var(--color-border-secondary); }
        .sidebar-item.active { background: var(--color-background-info); color: var(--color-text-info); font-weight: 500; }
        .search-bar:focus-within { border-color: var(--color-text-info) !important; box-shadow: 0 0 0 2px var(--color-background-info); }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--color-border-tertiary); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--color-text-tertiary); }
      `}</style>

      {/* ── Left Sidebar (Table of Contents & Folders) ── */}
      <div style={{ width: '280px', flexShrink: 0, borderRight: '1px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border-tertiary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-primary)' }}>
              <i className="ti ti-books" style={{ color: 'var(--color-text-info)', fontSize: 22 }} /> VoiceHelper
            </h1>
          </div>
          
          <button onClick={() => { setActiveNoteId("new"); setError(""); }} style={{ 
            width: '100%', padding: '10px', background: 'var(--color-background-primary)', 
            border: '1px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', 
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            <i className="ti ti-plus" style={{ fontSize: 16 }} /> {language === "vi-VN" ? "Ghi chú mới" : "New Note"}
          </button>
        </div>

        <div style={{ padding: '1.25rem 1rem', overflowY: 'auto', flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {language === "vi-VN" ? "Mục lục (Tự động)" : "Table of Contents"}
          </div>

          {Object.keys(groupedNotes).length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '1rem 0' }}>
              {language === "vi-VN" ? "Chưa có thư mục nào." : "No folders yet."}
            </div>
          ) : (
            Object.entries(groupedNotes).map(([subject, subjectNotes]) => (
              <div key={subject} style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  <i className="ti ti-folder-filled" style={{ color: 'var(--color-text-tertiary)', fontSize: 16 }} /> {subject}
                  <span style={{ fontSize: 11, background: 'var(--color-border-secondary)', padding: '2px 6px', borderRadius: '10px', color: 'var(--color-text-secondary)' }}>{subjectNotes.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '12px', borderLeft: '1px solid var(--color-border-tertiary)', marginLeft: '7px' }}>
                  {subjectNotes.map(note => (
                    <div key={note.id} className={`sidebar-item ${activeNoteId === note.id ? 'active' : ''}`} onClick={() => { setActiveNoteId(note.id); setActiveTab("summary"); }} style={{ 
                      padding: '6px 12px', fontSize: 13, cursor: 'pointer', borderRadius: 'var(--border-radius-md)', 
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: activeNoteId === note.id ? 'var(--color-text-info)' : 'var(--color-text-secondary)'
                    }}>
                      <i className="ti ti-file-text" style={{ marginRight: 6, opacity: 0.7 }} />
                      {note.title}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-background-primary)', minWidth: 0 }}>
        
        {/* Top Header & Smart Search */}
        <div style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>
          
          <div className="search-bar" style={{ 
            flex: 1, maxWidth: 600, display: 'flex', background: 'var(--color-background-secondary)', 
            borderRadius: 'var(--border-radius-lg)', padding: '10px 16px', alignItems: 'center', 
            border: '1px solid var(--color-border-secondary)', transition: 'all 0.2s'
          }}>
            <i className="ti ti-sparkles" style={{ color: 'var(--color-text-info)', fontSize: 18, marginRight: 12 }} />
            <input 
              type="text" 
              placeholder={language === "vi-VN" ? "Hỏi AI hoặc tìm kiếm thông minh trong các ghi chú..." : "Ask AI or search across notes..."} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && performSmartSearch()}
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 15, color: 'var(--color-text-primary)' }} 
            />
            {isSearching ? (
              <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-text-tertiary)' }} />
            ) : (
              searchQuery && <button onClick={performSmartSearch} style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--color-text-info)' }}><i className="ti ti-arrow-right" style={{fontSize: 18}} /></button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {[["vi-VN","🇻🇳"],["en-US","🇺🇸"]].map(([lang, label]) => (
              <button key={lang} onClick={() => setLanguage(lang)} style={{
                padding:"6px 12px", borderRadius:"var(--border-radius-md)", fontSize:14, cursor: "pointer",
                border: language===lang ? "1px solid var(--color-border-info)" : "1px solid var(--color-border-tertiary)",
                background: language===lang ? "var(--color-background-info)" : "var(--color-background-secondary)",
                color: language===lang ? "var(--color-text-info)" : "var(--color-text-secondary)"
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          
          {/* VIEW: Search Results */}
          {activeNoteId === "search" && searchResults && (
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-background-info)', color: 'var(--color-text-info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-sparkles" style={{ fontSize: 20 }} />
                </div>
                <h2 style={{ margin: 0, fontSize: 20, color: 'var(--color-text-primary)' }}>{language === "vi-VN" ? "Kết quả từ AI" : "AI Results"}</h2>
              </div>
              
              <div style={{ padding: '1.5rem', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--color-border-secondary)', marginBottom: '2rem', fontSize: 15, lineHeight: 1.6, color: 'var(--color-text-primary)' }}>
                {searchResults.answer}
              </div>

              <h3 style={{ fontSize: 16, color: 'var(--color-text-secondary)', marginBottom: '1rem', borderBottom: '1px solid var(--color-border-tertiary)', paddingBottom: '0.5rem' }}>
                {language === "vi-VN" ? "Ghi chú liên quan" : "Related Notes"}
              </h3>
              
              {searchResults.relatedNotes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {searchResults.relatedNotes.map(n => (
                    <div key={n.id} onClick={() => { setActiveNoteId(n.id); setActiveTab("summary"); }} style={{ 
                      padding: '1.25rem', border: '1px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', transition: 'border-color 0.2s' 
                    }} className="sidebar-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: 16, color: 'var(--color-text-info)' }}>{n.title}</h4>
                        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{n.subject}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {n.result?.summary || n.transcript}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>{language === "vi-VN" ? "Không có dữ liệu hiển thị." : "No data to display."}</p>
              )}
            </div>
          )}

          {/* VIEW: New Note / Recording */}
          {activeNoteId === "new" && (
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <h2 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
                  {language === "vi-VN" ? "Tạo ghi chú mới" : "Create a new note"}
                </h2>
                <p style={{ fontSize: 15, color: 'var(--color-text-tertiary)', margin: 0 }}>
                  {language === "vi-VN" ? "Thu âm bài giảng và để AI tự động phân loại, tóm tắt." : "Record your lecture and let AI auto-categorize and summarize it."}
                </p>
              </div>

              {!speechSupported && (
                <div style={{ padding:"12px 16px", background:"var(--color-background-warning)", border:"1px solid var(--color-border-warning)", borderRadius:"var(--border-radius-md)", marginBottom:"1.5rem", fontSize:14, color:"var(--color-text-warning)" }}>
                  <i className="ti ti-alert-triangle" style={{ marginRight:8 }} />
                  {language==="vi-VN" ? "Trình duyệt không hỗ trợ nhận diện giọng nói. Vui lòng dùng Google Chrome." : "Speech recognition not supported. Please use Google Chrome."}
                </div>
              )}

              {error && (
                <div style={{ padding:"12px 16px", background:"var(--color-background-danger)", border:"1px solid var(--color-border-danger)", borderRadius:"var(--border-radius-md)", marginBottom:"1.5rem", fontSize:14, color:"var(--color-text-danger)", display:"flex", gap:10 }}>
                  <i className="ti ti-alert-circle" style={{ fontSize:18, marginTop:2 }} />
                  {error}
                </div>
              )}

              <div style={{ background:"var(--color-background-secondary)", border:"1px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)", padding:"1.5rem", marginBottom:"1.5rem", boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                    <button onClick={isListening ? stopListening : startListening} disabled={!speechSupported} style={{
                      display:"flex", alignItems:"center", gap:8, padding:"10px 20px",
                      borderRadius:"30px", border:"none",
                      cursor: speechSupported ? "pointer" : "not-allowed",
                      background: isListening ? "var(--color-background-danger)" : "var(--color-text-primary)",
                      color: isListening ? "var(--color-text-danger)" : "var(--color-background-primary)",
                      fontWeight:600, fontSize:15, transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      {isListening ? <div className="rec-dot" /> : <i className="ti ti-microphone" style={{ fontSize:18 }} />}
                      {isListening ? (language==="vi-VN" ? "Dừng ghi" : "Stop") : (language==="vi-VN" ? "Bắt đầu ghi" : "Start recording")}
                    </button>

                    {isListening && (
                      <div style={{ display:"flex", gap:4, alignItems:"center", height:30 }}>
                        {[0,.1,.2,.3,.2,.1,0].map((d,i) => (
                          <div key={i} className="bar active" style={{ animationDelay:`${d}s`, height:6 }} />
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {(transcript || interimTranscript) && (
                    <button onClick={() => { setTranscript(""); transcriptRef.current=""; setInterimTranscript(""); setError(""); }} style={{
                      padding:"8px 12px", borderRadius:"var(--border-radius-md)", fontSize:13,
                      border:"1px solid var(--color-border-tertiary)", background:"var(--color-background-primary)",
                      color:"var(--color-text-secondary)", cursor:"pointer"
                    }}>
                      <i className="ti ti-trash" style={{ fontSize:14, marginRight:6 }} />
                      {language==="vi-VN" ? "Xóa nháp" : "Clear"}
                    </button>
                  )}
                </div>

                <div style={{
                  minHeight:180, maxHeight:300, overflowY:"auto",
                  background:"var(--color-background-primary)", border:"1px solid var(--color-border-secondary)",
                  borderRadius:"var(--border-radius-md)", padding:"16px",
                  fontSize:16, lineHeight:1.8,
                  color: transcript||interimTranscript ? "var(--color-text-primary)" : "var(--color-text-tertiary)"
                }}>
                  {transcript || interimTranscript
                    ? <>{transcript}<span style={{ color:"var(--color-text-tertiary)", fontStyle:"italic" }}>{interimTranscript}</span></>
                    : (language==="vi-VN" ? "Nhấn 'Bắt đầu ghi' rồi đọc to nội dung bài giảng. AI sẽ tự động lắng nghe và ghi chép lại..." : "Press 'Start recording' and speak. AI will capture your lecture...")}
                </div>

                {wordCount > 0 && (
                  <div style={{ display:"flex", gap:20, marginTop:12, fontSize:13, color:"var(--color-text-tertiary)", fontWeight: 500 }}>
                    <span><i className="ti ti-text-size" style={{ marginRight:6 }} />{wordCount} {language==="vi-VN" ? "từ" : "words"}</span>
                    <span><i className="ti ti-clock" style={{ marginRight:6 }} />~{readMin} {language==="vi-VN" ? "phút đọc" : "min read"}</span>
                  </div>
                )}
              </div>

              <button onClick={processWithAI} disabled={isProcessing || !transcript} style={{
                width:"100%", padding:"14px", borderRadius:"var(--border-radius-md)", border:"none",
                cursor: transcript && !isProcessing ? "pointer" : "not-allowed",
                background: transcript && !isProcessing ? "var(--color-background-info)" : "var(--color-background-secondary)",
                color: transcript && !isProcessing ? "var(--color-text-info)" : "var(--color-text-tertiary)",
                fontWeight:600, fontSize:16,
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                transition:"all .2s"
              }}>
                {isProcessing
                  ? <><i className="ti ti-loader" style={{ fontSize:18, animation:"spin 1s linear infinite" }} />
                      {language==="vi-VN" ? "AI đang phân tích và lưu vào mục lục..." : "AI is analyzing and saving to folder..."}</>
                  : <><i className="ti ti-sparkles" style={{ fontSize:18 }} />
                      {language==="vi-VN" ? "Lưu & Phân tích bằng AI" : "Save & Analyze with AI"}</>}
              </button>
            </div>
          )}

          {/* VIEW: Existing Note Details */}
          {activeNote && (
            <div style={{ maxWidth: 850, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, background: 'var(--color-background-info)', color: 'var(--color-text-info)', padding: '4px 10px', borderRadius: '20px' }}>
                      <i className="ti ti-folder" style={{ marginRight: 4 }} /> {activeNote.subject}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                      {new Date(activeNote.date).toLocaleString(language === "vi-VN" ? 'vi-VN' : 'en-US')}
                    </span>
                  </div>
                  <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>{activeNote.title}</h2>
                </div>
                
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => copyTranscript(activeNote.transcript)} style={{
                    padding:"8px 12px", borderRadius:"var(--border-radius-md)", fontSize:13, fontWeight: 500,
                    border:"1px solid var(--color-border-secondary)", background:"var(--color-background-primary)",
                    color: copied ? "var(--color-text-success)" : "var(--color-text-secondary)", cursor:"pointer"
                  }}>
                    <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} style={{ fontSize:15, marginRight:6 }} />
                    {copied ? (language==="vi-VN" ? "Đã chép" : "Copied!") : (language==="vi-VN" ? "Chép gốc" : "Copy")}
                  </button>
                  <button onClick={() => exportFile(activeNote, "md")} style={{
                    padding:"8px 12px", borderRadius:"var(--border-radius-md)", fontSize:13, fontWeight: 500,
                    border:"1px solid var(--color-border-secondary)", background:"var(--color-background-primary)",
                    color:"var(--color-text-primary)", cursor:"pointer"
                  }}>
                    <i className="ti ti-download" style={{ fontSize:15, marginRight:6 }} />
                    {language==="vi-VN" ? "Xuất .md" : "Export"}
                  </button>
                </div>
              </div>

              {/* Readonly Transcript Box */}
              <div style={{ background: 'var(--color-background-secondary)', padding: '1rem 1.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-border-tertiary)', marginBottom: '2rem' }}>
                <h4 style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', margin: '0 0 10px 0', letterSpacing: '0.5px' }}>
                  <i className="ti ti-microphone" style={{ marginRight: 6 }} /> Transcript gốc
                </h4>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
                  {activeNote.transcript}
                </p>
              </div>

              {/* Note AI Results */}
              {renderNoteResults(activeNote)}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}