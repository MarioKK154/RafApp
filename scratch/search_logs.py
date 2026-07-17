import json

log_path = r"C:\Users\mario\.gemini\antigravity\brain\a4a1acf0-918f-45cf-9d9e-a218510c0f47\.system_generated\logs\transcript.jsonl"

matches = []
with open(log_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        try:
            data = json.loads(line)
            content = data.get("content", "")
            if not content:
                continue
            if "database_url" in content.lower() or "supabase" in content.lower():
                matches.append((i, data.get("type"), data.get("source"), content))
        except Exception as e:
            pass

# Print the last 15 matches to see recent settings
for idx, type_, src, content in matches[-15:]:
    print(f"--- Line {idx} ({type_} / {src}) ---")
    print(content[:600])
    print("="*50)
