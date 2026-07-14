import re

def parse_expressions():
    with open('src/components/Step3Scenario.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    code = "".join(lines)
    
    # Clean comments
    code_clean = re.sub(r'//.*', '', code)
    code_clean = re.sub(r'/\*.*?\*/', '', code_clean, flags=re.DOTALL)
    
    # Clean strings
    def repl_str(m):
        return ' ' * len(m.group(0))
    code_clean = re.compile(r"'(.*?)'").sub(repl_str, code_clean)
    code_clean = re.compile(r'"(.*?)"').sub(repl_str, code_clean)
    code_clean = re.compile(r'`(.*?)`', re.DOTALL).sub(repl_str, code_clean)
    
    stack = []
    exprs = []
    
    for idx, char in enumerate(code_clean):
        if char == '{':
            stack.append(idx)
        elif char == '}':
            if stack:
                depth = len(stack)
                start_idx = stack.pop()
                if depth <= 3: # depth 1 is level 0, depth 2 is level 1, depth 3 is level 2
                    line_start = code[:start_idx].count('\n') + 1
                    line_end = code[:idx].count('\n') + 1
                    expr_text = code[start_idx:start_idx+80].replace('\n', ' ').strip()
                    exprs.append((depth, line_start, line_end, expr_text))
            else:
                line_no = code[:idx].count('\n') + 1
                print(f"Stray closing curly brace '}}' at line {line_no}")
                
    print("Expressions inside the return block:")
    for depth, s, e, txt in exprs:
        if s >= 1900:
            print(f"  [Depth {depth}] Lines {s}-{e}: {txt[:100]}...")

parse_expressions()
