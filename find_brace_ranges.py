import re

def find_large_braces():
    with open('src/components/Step3Scenario.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    code = "".join(lines)
    
    # Strip comments
    code_clean = re.sub(r'//.*', '', code)
    code_clean = re.sub(r'/\*.*?\*/', '', code_clean, flags=re.DOTALL)
    
    # Replace strings with spaces
    def repl_str(m):
        return ' ' * len(m.group(0))
    code_clean = re.compile(r"'(.*?)'").sub(repl_str, code_clean)
    code_clean = re.compile(r'"(.*?)"').sub(repl_str, code_clean)
    code_clean = re.compile(r'`(.*?)`', re.DOTALL).sub(repl_str, code_clean)
    
    stack = []
    large_ranges = []
    
    for idx, char in enumerate(code_clean):
        if char == '{':
            stack.append(idx)
        elif char == '}':
            if stack:
                start_idx = stack.pop()
                line_start = code[:start_idx].count('\n') + 1
                line_end = code[:idx].count('\n') + 1
                if line_end - line_start > 50:
                    large_ranges.append((line_start, line_end, code[start_idx:start_idx+100].replace('\n', ' ')))
                    
    print("Brace expressions spanning more than 50 lines:")
    for s, e, preview in sorted(large_ranges, key=lambda x: x[0]):
        print(f"  Lines {s} to {e} (length {e-s}): {preview[:120]}...")

find_large_braces()
