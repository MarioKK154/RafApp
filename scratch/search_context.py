import json

log_path = r"C:\Users\mario\.gemini\antigravity\brain\a4a1acf0-918f-45cf-9d9e-a218510c0f47\.system_generated\logs\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        try:
            data = json.loads(line)
            content = data.get("content", "")
            if not content:
                continue
            if "Alembic migrations are configured to overwrite" in content:
                print(f"--- Line {i} ({data.get('type')}) ---")
                print(content[:1500])
                print("="*50)
        except Exception as e:
            pass
