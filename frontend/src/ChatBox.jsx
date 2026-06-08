import { useState, useRef, useEffect } from 'react';
import './ChatBox.css';

export default function ChatBox() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Xin chào! Tôi có thể giúp gì?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      setMessages([...history, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      console.error('Lỗi chat:', err);
      setMessages([...history, { role: 'assistant', content: `Lỗi: ${err.message}` }]);
    }
    setLoading(false);
  }

  return (
    <div className="chatbox-wrapper">
      {open && (
        <div className="chatbox-window">
          <div className="chatbox-header">
            <span>🤖 Trợ lý AI</span>
            <button onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="chatbox-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chatbox-msg ${m.role}`}>{m.content}</div>
            ))}
            {loading && <div className="chatbox-msg assistant">...</div>}
            <div ref={bottomRef} />
          </div>
          <div className="chatbox-input-row">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Nhập tin nhắn..." />
            <button onClick={send}>➤</button>
          </div>
        </div>
      )}
      <button className="chatbox-fab" onClick={() => setOpen(o => !o)}>
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}