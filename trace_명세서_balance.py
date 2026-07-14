import re

def trace_balance():
    with open('src/components/Step3Scenario.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    code_lines = lines[5731:5949] # Line 5732 to 5949
    
    stack = []
    # We push on '{' or '(' and pop on '}' or ')'
    # Since we are starting inside the expression, the initial level is 1
    # Let's trace if it ever goes below 0 relative to the start!
    level_curly = 0
    level_paren = 0
    
    for offset, line in enumerate(code_lines):
        line_no = 5732 + offset
        
        # Strip comments
        line_clean = re.sub(r'//.*', '', line)
        
        # Replace string contents with spaces
        def repl_str(m):
            return ' ' * len(m.group(0))
        line_clean = re.compile(r"'(.*?)'").sub(repl_str, line_clean)
        line_clean = re.compile(r'"(.*?)"').sub(repl_str, line_clean)
        line_clean = re.compile(r'`(.*?)`', re.DOTALL).sub(repl_str, line_clean)
        
        for idx, char in enumerate(line_clean):
            if char == '{':
                level_curly += 1
            elif char == '}':
                level_curly -= 1
                if level_curly < 0:
                    print(f"[{line_no}] Premature curly close '}}' at column {idx}")
                    level_curly = 0 # reset
            elif char == '(':
                level_paren += 1
            elif char == ')':
                level_paren -= 1
                if level_paren < 0:
                    print(f"[{line_no}] Premature paren close ')' at column {idx}")
                    level_paren = 0 # reset

    print(f"\nEnd levels: Curly={level_curly}, Paren={level_paren}")

trace_balance()
