from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import pydantic

app = Flask(__name__)
CORS(app)

# ========== CẤU HÌNH GEMINI API ==========
GEMINI_API_KEY = "AQ.Ab8RN6JVRjgVjFR3fdBuDA5ha5-xU6Zpkgqf39ZQ2gs3Sh--_w"
genai.configure(api_key=GEMINI_API_KEY)

# ========== SCHEMA CHO PROCESS-NOTE ==========
class FlashcardSchema(pydantic.BaseModel):
    question: str
    answer: str

class LectureAnalysisSchema(pydantic.BaseModel):
    summary: str
    keyPoints: list[str]
    flashcards: list[FlashcardSchema]

# ========== ENDPOINT: CHAT (dùng Gemini) ==========
@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        messages = data.get("messages", [])

        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction="Bạn là trợ lý AI thân thiện. Trả lời ngắn gọn, rõ ràng bằng ngôn ngữ người dùng đang dùng."
        )

        # Chuyển messages sang định dạng Gemini
        history = []
        for msg in messages[:-1]:
            role = "user" if msg["role"] == "user" else "model"
            history.append({"role": role, "parts": [msg["content"]]})

        chat_session = model.start_chat(history=history)
        last_message = messages[-1]["content"] if messages else ""
        response = chat_session.send_message(last_message)

        return jsonify({"reply": response.text})

    except Exception as e:
        print(f"Lỗi chat: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ========== ENDPOINT: PROCESS-NOTE ==========
@app.route('/api/process-note', methods=['POST'])
def process_note():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Không nhận được dữ liệu"}), 400

        transcript_text = data.get('transcript', '').strip()
        language = data.get('language', 'vi-VN')

        if not transcript_text:
            return jsonify({"error": "Nội dung văn bản ghi chú đang bị trống!"}), 400

        if len(transcript_text.split()) < 5:
            return jsonify({"error": "Nội dung bài giảng quá ngắn để có thể tóm tắt!"}), 400

        model = genai.GenerativeModel('gemini-2.5-flash')

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

        response = model.generate_content(
            full_prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=LectureAnalysisSchema,
                temperature=0.2
            )
        )

        return response.text, 200, {'Content-Type': 'application/json'}

    except Exception as e:
        print(f"Lỗi máy chủ: {str(e)}")
        return jsonify({"error": f"Lỗi xử lý hệ thống phía Backend: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)