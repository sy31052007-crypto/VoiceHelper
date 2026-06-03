from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import pydantic
import os

app = Flask(__name__)
# Cho phép Frontend (Vite/React) gọi API tới Backend mà không bị lỗi CORS
CORS(app)

# ==========================================================
# 1. CẤU HÌNH CƠ CHẾ ÉP ĐỊNH DẠNG ĐẦU RA CỦA AI (STRUCTURED OUTPUT)
# ==========================================================
# Định nghĩa cấu trúc từng thẻ Flashcard theo đúng thiết kế của Frontend
class FlashcardSchema(pydantic.BaseModel):
    question: str
    answer: str

# Định nghĩa cấu trúc tổng thể gói dữ liệu trả về cho Frontend
class LectureAnalysisSchema(pydantic.BaseModel):
    summary: str
    keyPoints: list[str]  # Đổi thành camelCase để khớp hoàn toàn với result.keyPoints của Frontend
    flashcards: list[FlashcardSchema]

# ==========================================================
# 2. CẤU HÌNH GOOGLE GEMINI API
# ==========================================================
# Thay thế chuỗi dưới đây bằng API Key Gemini thực tế của bạn
GEMINI_API_KEY = "AIzaSyBQQGAby2XXjTPpxg7x6A9UtN2hGl33VKk"
genai.configure(api_key=GEMINI_API_KEY)

# ==========================================================
# 3. ĐỊNH NGHĨA API ENDPOINT
# ==========================================================
@app.route('/api/process-note', methods=['POST'])
def process_note():
    try:
        # Lấy dữ liệu JSON gửi lên từ Frontend
        data = request.get_json()
        if not data:
            return jsonify({"error": "Không nhận được dữ liệu (No JSON data provided)"}), 400
            
        transcript_text = data.get('transcript', '').strip()
        language = data.get('language', 'vi-VN') # Nhận diện ngôn ngữ từ hệ thống
        
        # Kiểm tra điều kiện đầu vào của văn bản bài giảng
        if not transcript_text:
            return jsonify({"error": "Nội dung văn bản ghi chú đang bị trống!"}), 400
            
        if len(transcript_text.split()) < 5:
            return jsonify({"error": "Nội dung bài giảng quá ngắn để có thể tóm tắt!"}), 400

        # Khởi tạo model Gemini 1.5 Flash - Tối ưu cho xử lý dữ liệu văn bản nhanh
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Xây dựng câu lệnh Prompt tối ưu hóa theo ngôn ngữ người dùng chọn
        if language == "vi-VN":
            system_instruction = (
                "Bạn là một trợ lý học tập đỉnh cao chuyên phân tích bài giảng. "
                "Hãy tóm tắt ngắn gọn nội dung từ 3-4 câu, liệt kê đúng 5 điểm quan trọng (keyPoints), "
                "và tạo ra ít nhất 3 câu hỏi kèm đáp án tương ứng dưới dạng Flashcard dựa trên văn bản được cung cấp."
            )
        else:
            system_instruction = (
                "You are an expert academic assistant analyzing lecture transcripts. "
                "Summarize the content in 3-4 sentences, list exactly 5 key points, "
                "and generate at least 3 flashcards (questions and answers) based on the text."
            )
            
        full_prompt = f"{system_instruction}\n\nVăn bản cần phân tích:\n{transcript_text}"
        
        # Gọi Gemini API với cấu hình ép kiểu đầu ra thành JSON thông qua Pydantic Schema
        response = model.generate_content(
            full_prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=LectureAnalysisSchema,
                temperature=0.2 # Thấp để AI tập trung vào tính chính xác của dữ liệu bài giảng, ít sáng tạo linh tinh
            )
        )
        
        # Trả trực tiếp chuỗi JSON chuẩ chỉnh từ AI về cho Frontend
        # Phía Frontend chỉ cần gọi response.json() là lấy được data sạch
        return response.text, 200, {'Content-Type': 'application/json'}

    except Exception as e:
        print(f"Lỗi máy chủ: {str(e)}")
        return jsonify({"error": f"Lỗi xử lý hệ thống phía Backend: {str(e)}"}), 500

if __name__ == '__main__':
    # Chạy Backend ở cổng 5000 công khai nội bộ
    app.run(debug=True, host='0.0.0.0', port=5000)