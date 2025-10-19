from flask import Flask, request, jsonify
import google.generativeai as genai
import os
from dotenv import load_dotenv

# === Load API Key ===
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# === Initialize Flask ===
app = Flask(__name__, static_folder="static", static_url_path="")

# === Serve Homepage ===
@app.route("/")
def index():
    return app.send_static_file("index.html")

# === Chat Endpoint ===
@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(force=True) or {}
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({"reply": "Please enter a message."})

    # === Emergency Detection ===
    emergency_phrases = [
        "chest pain", "shortness of breath", "severe bleeding", "unconscious",
        "heart attack", "stroke", "bleeding heavily", "not breathing"
    ]
    if any(p in user_message.lower() for p in emergency_phrases):
        return jsonify({
            "reply": "⚠️ It sounds like a medical emergency. Please call your local emergency number or visit the nearest hospital immediately."
        })

    # === Create Model Instance ===
    try:
        # Use a valid Gemini model
        model = genai.GenerativeModel("gemini-2.0-flash")  

        # === Prompt for small-point replies ===
        chat_prompt = [
            {
                "role": "user",
                "parts": [
                    "You are Dr.Chat, a professional and friendly healthcare assistant. "
                    "Provide responses in multiple short points. "
                    "Use emojis where appropriate. "
                    "Avoid long paragraphs, lists, bullets, or markdown. "
                    "Always remind the user this is general guidance and not a substitute for a doctor's consultation."
                ]
            },
            {"role": "user", "parts": [user_message]}
        ]

        # === Generate Response ===
        response = model.generate_content(chat_prompt)
        reply = response.text.strip() if response and response.text else "Sorry, I couldn’t generate a reply right now."

    except Exception as e:
        reply = f"Error contacting Gemini API: {e}"

    return jsonify({"reply": reply})

# === Run Server ===
if __name__ == "__main__":
    app.run(debug=True, port=5500)
