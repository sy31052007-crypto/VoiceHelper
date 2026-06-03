# VoiceHelper — Trợ Lý Ghi Âm & Tóm Tắt Bài Giảng Thông Minh 🚀

**VoiceHelper** là một ứng dụng Web toàn diện (Full-stack) được thiết kế nhằm hỗ trợ sinh viên tối ưu hóa quá trình học tập trên lớp. Ứng dụng cho phép ghi âm trực tiếp lời giảng của giảng viên, tự động chuyển đổi thành văn bản theo thời gian thực, đồng thời ứng dụng Trí tuệ nhân tạo (AI) để tự động tóm tắt nội dung, trích xuất ý chính và tạo bộ câu hỏi ôn tập (Flashcards).

---

## 🌟 Tính Năng Cốt Lõi

- 🎙️ **Speech-to-Text Real-time**: Thu âm và chuyển đổi giọng nói thành văn bản trực tiếp ngay trên giao diện trình duyệt với độ trễ cực thấp. Hỗ trợ song ngữ linh hoạt: **Tiếng Việt (🇻🇳)** và **Tiếng Anh (🇺🇸)**.
- 🧠 **Tóm Tắt Thông Minh**: Sử dụng mô hình AI tiên tiến `gemini-2.5-flash` để bóc tách, cô đọng nội dung bài giảng dài thành một đoạn tóm tắt ngắn gọn, súc tích.
- 📋 **Trích Xuất Key Points**: Tự động liệt kê các luận điểm, kiến thức cốt lõi quan trọng nhất của bài học dưới dạng danh sách rõ ràng.
- 🃏 **Tự Động Tạo Flashcards**: Hệ thống tự động phân tích văn bản để thiết kế bộ câu hỏi và câu trả lời tương ứng, hỗ trợ phương pháp ôn tập chủ động (Active Recall).
- 💾 **Xuất File Đa Dạng**: Cho phép người dùng tải xuống toàn bộ dữ liệu ghi chú dưới dạng file văn bản thuần `.txt` hoặc định dạng `.md` (Markdown) để dễ dàng đồng bộ vào các hệ sinh thái quản lý kiến thức như **Notion** hoặc **Obsidian**.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

### Frontend (Giao diện)
- **Framework**: ReactJS (Khởi tạo nhanh bằng **Vite**)
- **Nhận diện giọng nói**: Web Speech API (Tích hợp sẵn trên trình duyệt Chrome)
- **Icon Ecosystem**: Tabler Icons

### Backend (Máy chủ trung gian)
- **Language**: Python 3.x
- **Web Framework**: Flask
- **CORS Management**: Flask-CORS (Hỗ trợ chia sẻ tài nguyên giữa các nguồn khác cổng)
- **AI Integration**: Google GenAI SDK (`gemini-2.5-flash`)

---

## 📂 Cấu Trúc Thư Mục Dự Án

```text
VoiceHelper/
├── backend/ (hoặc file app.py ở thư mục gốc)
│   └── app.py              # Xử lý API Endpoint, cấu hình Gemini AI
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Logic và Giao diện chính của ứng dụng
│   │   ├── main.jsx        # Điểm khởi chạy cấu hình React
│   │   └── index.css       # Định nghĩa bảng màu hệ thống (CSS Variables)
│   ├── index.html          # File HTML gốc của ứng dụng
│   └── package.json        # Quản lý các thư viện Frontend
├── venv/                   # Môi trường ảo của Python (Được ẩn qua .gitignore)
└── .gitignore              # Chỉ định các file/thư mục không đẩy lên GitHub
