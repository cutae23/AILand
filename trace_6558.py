import re

def trace_6558():
    with open('src/components/Step3Scenario.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    # Process line by line so indices map 1-to-1
    clean_lines = []
    for line in lines:
        line_clean = re.sub(r'//.*', '', line)
        def repl_str(m):
            return ' ' * len(m.group(0))
        line_clean = re.compile(r"'(.*?)'").sub(repl_str, line_clean)
        line_clean = re.compile(r'"(.*?)"').sub(repl_str, line_clean)
        clean_lines.append(line_clean)
        
    # Find position of ')' on line 6558 (index 6557)
    target_line = clean_lines[6557]
    target_col = target_line.find(') : (')
    if target_col == -1:
         target_col = target_line.find(') :')
    if target_col == -1:
         target_col = target_line.find(')')
         
    # Walk backwards
    stack = []
    for l_idx in range(6557, -1, -1):
        line = clean_lines[l_idx]
        start_col = target_col - 1 if l_idx == 6557 else len(line) - 1
        for col_idx in range(start_col, -1, -1):
            char = line[col_idx]
            if char == '}':
                stack.append('}')
            elif char == '{':
                if stack:
                    stack.pop()
                else:
                    print(f"Brace open mismatch at line {l_idx + 1}")
            elif char == ')':
                stack.append(')')
            elif char == '(':
                if stack:
                    stack.pop()
                    if not stack:
                        print(f"Opening '(' matching line 6558 is on line {l_idx + 1}:")
                        print(lines[l_idx].strip())
                        return
                else:
                    print(f"Paren open mismatch at line {l_idx + 1}")
                    return

trace_6558()
