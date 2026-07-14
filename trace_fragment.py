import re

def trace_fragment():
    with open('src/components/Step3Scenario.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    # Process line by line and track fragment balance
    stack = []
    for idx, line in enumerate(lines):
        line_no = idx + 1
        line_clean = re.sub(r'//.*', '', line)
        
        # Look for `<>` and `</>`
        # Note: we need to ignore them inside strings, but simple scan is fine first
        matches = re.finditer(r'<></>|<>|</>', line_clean)
        for m in matches:
            tok = m.group(0)
            if tok == '<>':
                stack.append(line_no)
            elif tok == '</>':
                if stack:
                    open_line = stack.pop()
                    if line_no == 6717:
                        print(f"Closing '</>' at line 6717 matches opening '<>' at line {open_line}!")
                        return
                else:
                    print(f"Stray closing '</>' at line {line_no}")

trace_fragment()
