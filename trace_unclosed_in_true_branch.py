import re

def trace_unclosed():
    with open('src/components/Step3Scenario.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    code_lines = lines[1904:6721] # Lines 1905 to 6721
    
    # Process line by line and find all braces/parentheses
    stack = []
    for offset, line in enumerate(code_lines):
        line_no = 1905 + offset
        
        # Strip comments
        line_clean = re.sub(r'//.*', '', line)
        
        # Replace string contents with spaces of equal length
        def repl_str(m):
            return ' ' * len(m.group(0))
        line_clean = re.compile(r"'(.*?)'").sub(repl_str, line_clean)
        line_clean = re.compile(r'"(.*?)"').sub(repl_str, line_clean)
        line_clean = re.compile(r'`(.*?)`', re.DOTALL).sub(repl_str, line_clean)
        
        for idx, char in enumerate(line_clean):
            if char in '{(':
                stack.append((char, line_no))
            elif char in '})':
                if stack:
                    top_char, top_line = stack[-1]
                    if (char == '}' and top_char == '{') or (char == ')' and top_char == '('):
                        stack.pop()
                    else:
                        # Mismatch
                        pass
                else:
                    # Stray closing
                    pass
                    
    print(f"Remaining stack size: {len(stack)}")
    print("Unclosed items in true branch (from first to last opened):")
    for char, line_no in stack[:15]:
        print(f"  Unclosed '{char}' opened at line {line_no}")

trace_unclosed()
