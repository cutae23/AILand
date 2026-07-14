import re

def find_unbalance():
    with open('src/components/Step3Scenario.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    code = "".join(lines[1901:6734]) # Lines 1902 to 6734
    
    # Strip comments
    code = re.sub(r'//.*', '', code)
    code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
    
    # Replace strings with spaces of the same length
    def repl_str(m):
        return ' ' * len(m.group(0))
    code = re.compile(r"'(.*?)'").sub(repl_str, code)
    code = re.compile(r'"(.*?)"').sub(repl_str, code)
    code = re.compile(r'`(.*?)`', re.DOTALL).sub(repl_str, code)
    
    stack = []
    
    for idx, char in enumerate(code):
        line_no = 1902 + code[:idx].count('\n')
        
        if char in '{(':
            stack.append((char, line_no, idx))
        elif char in '})':
            if not stack:
                print(f"[{line_no}] Extra closing '{char}' at col {idx}")
            else:
                top_char, top_line, top_idx = stack.pop()
                if char == '}' and top_char != '{':
                    print(f"[{line_no}] Mismatched brace: Closed '}}' but expected ')' to close '(' from line {top_line}")
                    # Put back to keep tracing
                    stack.append((top_char, top_line, top_idx))
                elif char == ')' and top_char != '(':
                    print(f"[{line_no}] Mismatched parenthesis: Closed ')' but expected '}}' to close '{{' from line {top_line}")
                    stack.append((top_char, top_line, top_idx))
                    
    print(f"\nRemaining items on stack: {len(stack)}")
    for char, line, idx in stack:
        print(f"  Unclosed '{char}' from line {line}")

find_unbalance()
