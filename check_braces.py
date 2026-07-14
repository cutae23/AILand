def check_balance_stack(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    code = "".join(lines)
    
    # Strip comments
    import re
    code_clean = re.sub(r'//.*', '', code)
    code_clean = re.sub(r'/\*.*?\*/', '', code_clean, flags=re.DOTALL)
    
    # Strip string literals to avoid counting characters inside strings
    # We replace strings with non-brace placeholders of the same length to preserve indices
    def repl_str(m):
        return ' ' * len(m.group(0))
        
    code_clean = re.compile(r"'(.*?)'").sub(repl_str, code_clean)
    code_clean = re.compile(r'"(.*?)"').sub(repl_str, code_clean)
    code_clean = re.compile(r'`(.*?)`', re.DOTALL).sub(repl_str, code_clean)
    
    stack = []
    
    for idx, char in enumerate(code_clean):
        if char in '{(':
            stack.append((char, idx))
        elif char in '})':
            if not stack:
                # Find line number
                char_count = 0
                line_no = 1
                for i, line in enumerate(lines):
                    char_count += len(line)
                    if char_count >= idx:
                        line_no = i + 1
                        break
                print(f"Stray closing char '{char}' at line {line_no}")
            else:
                top_char, top_idx = stack.pop()
                if (char == '}' and top_char != '{') or (char == ')' and top_char != '('):
                    # We have a mismatch!
                    # Find line numbers
                    char_count = 0
                    top_line_no = 1
                    for i, line in enumerate(lines):
                        char_count += len(line)
                        if char_count >= top_idx:
                            top_line_no = i + 1
                            break
                            
                    char_count = 0
                    cur_line_no = 1
                    for i, line in enumerate(lines):
                        char_count += len(line)
                        if char_count >= idx:
                            cur_line_no = i + 1
                            break
                    print(f"Mismatch: Opened '{top_char}' at line {top_line_no} but closed with '{char}' at line {cur_line_no}")
                    # Put it back or adjust
                    
    print(f"\nRemaining items on stack: {len(stack)}")
    if stack:
        for char, top_idx in stack[:15]:
            char_count = 0
            top_line_no = 1
            for i, line in enumerate(lines):
                char_count += len(line)
                if char_count >= top_idx:
                    top_line_no = i + 1
                    break
            print(f"  Unclosed '{char}' opened at line {top_line_no}")

check_balance_stack('src/components/Step3Scenario.tsx')
