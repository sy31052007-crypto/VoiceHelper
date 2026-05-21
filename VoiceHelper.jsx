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
      // Gọi tới Backend Flask đang chạy trên máy của bạn
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
        throw new Error(errorData.error || "Lỗi server Backend");
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