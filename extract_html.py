#!/usr/bin/env python3
"""Extract the FEDPromptly forum HTML from the conversation transcript."""
import ast
import os

SRC = "summarized_conversations/original_conversation_1788789203_5684.txt"
OUT_DIR = "fedpromptly-frontend"
OUT_FILE = os.path.join(OUT_DIR, "index_original.html")

def main():
    with open(SRC, "r", encoding="utf-8") as f:
        lines = f.readlines()

    print(f"Total lines: {len(lines)}")

    html = None
    for idx, line in enumerate(lines, 1):
        line = line.rstrip("\n")
        if not line.strip():
            continue
        # Each line is a dict like {'role': 'user', 'content': '...'}
        try:
            obj = ast.literal_eval(line)
        except Exception as e:
            print(f"Line {idx}: parse error: {e}")
            continue
        if not isinstance(obj, dict):
            continue
        content = obj.get("content", "")
        marker = "<!DOCTYPE html>"
        pos = content.find(marker)
        if pos != -1:
            print(f"Line {idx} ({obj.get('role')}): contains HTML at offset {pos}, "
                  f"content length {len(content)}")
            html = content[pos:]
            break

    if html is None:
        print("ERROR: no HTML found in transcript")
        return 1

    # Trim trailing junk after </html> if present
    end = html.find("</html>")
    if end != -1:
        html = html[: end + len("</html>")]

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"Wrote {len(html)} chars, {html.count(chr(10))} lines to {OUT_FILE}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
