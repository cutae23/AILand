import re

def check_region():
    with open('src/components/Step3Scenario.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    code_lines = lines[2115:6732]
    
    # Process line by line and find all tag names and braces/parentheses
    stack = []
    for offset, line in enumerate(code_lines):
        line_no = 2116 + offset
        
        # Strip comments
        line_clean = re.sub(r'//.*', '', line)
        
        # Replace string contents with empty quotes to preserve markers
        def repl_str(m):
            return ' ' * len(m.group(0))
        line_clean = re.compile(r"'(.*?)'").sub(repl_str, line_clean)
        line_clean = re.compile(r'"(.*?)"').sub(repl_str, line_clean)
        
        # Search for tags: <div ...>, </div>, etc.
        # Simple tokenization for braces, parentheses, and tags
        tokens = re.findall(r'</?[a-zA-Z0-9_-]+|[\{\}\(\)]', line_clean)
        
        for tok in tokens:
            if tok.startswith('<'):
                if tok.startswith('</'):
                    tag = tok[2:]
                    if stack and stack[-1][0] == tag:
                        stack.pop()
                    else:
                        print(f"[{line_no}] Close tag </{tag}> doesn't match top of stack: {stack[-5:] if stack else 'EMPTY'}")
                else:
                    tag = tok[1:]
                    if tag not in ['img', 'input', 'br', 'hr']:
                        stack.append((tag, line_no))
            elif tok in '{(':
                stack.append((tok, line_no))
            elif tok in '})':
                if stack:
                    top, t_line = stack[-1]
                    if (tok == '}' and top == '{') or (tok == ')' and top == '('):
                        stack.pop()
                    else:
                        print(f"[{line_no}] Closing '{tok}' doesn't match top: {stack[-5:]}")
                else:
                    print(f"[{line_no}] Stray closing '{tok}'")

    print("\nFinal stack:")
    for item in stack:
        print(f"  {item}")

check_region()
