import re

def trace_5949():
    with open('src/components/Step3Scenario.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    clean_lines = []
    for line in lines:
        line_clean = re.sub(r'//.*', '', line)
        def repl_str(m):
            return ' ' * len(m.group(0))
        line_clean = re.compile(r"'(.*?)'").sub(repl_str, line_clean)
        line_clean = re.compile(r'"(.*?)"').sub(repl_str, line_clean)
        clean_lines.append(line_clean)
        
    target_line = clean_lines[5948] # 0-indexed 5948 is line 5949
    # find positions of '}' in line 5949
    target_col = target_line.rfind('}')
    if target_col == -1:
        print("No '}' on line 5949!")
        return

    stack = []
    for l_idx in range(5948, -1, -1):
        line = clean_lines[l_idx]
        start_col = target_col - 1 if l_idx == 5948 else len(line) - 1
        for col_idx in range(start_col, -1, -1):
            char = line[col_idx]
            if char == '}':
                stack.append(('}', l_idx + 1))
            elif char == '{':
                if stack:
                    stack.pop()
                    if not stack:
                        print(f"Opening '{{' matching line 5949's '}}' is on line {l_idx + 1}:")
                        print(lines[l_idx].strip())
                        return
                else:
                    print(f"Stray open brace on line {l_idx + 1}")
                    return

trace_5949()
