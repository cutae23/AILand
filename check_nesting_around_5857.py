import re

def check_nesting():
    with open('src/components/Step3Scenario.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for i in range(5850, 5880):
        print(f"{i+1:4d}: {lines[i]}", end="")
        
    print("\nTracing exact stack of braces on these lines:")
    stack = []
    for l_idx in range(5850, 5880):
        line = lines[l_idx]
        # Strip comments
        line_clean = re.sub(r'//.*', '', line)
        for c_idx, char in enumerate(line_clean):
            if char == '{':
                stack.append(('{', l_idx + 1, c_idx))
                print(f"Push '{{' at line {l_idx+1} col {c_idx}. Stack size: {len(stack)}")
            elif char == '}':
                if stack:
                    match_char, match_line, match_col = stack.pop()
                    print(f"Pop '}}' at line {l_idx+1} col {c_idx} matching '{match_char}' from line {match_line} col {match_col}. Stack size: {len(stack)}")
                else:
                    print(f"Stray '}}' at line {l_idx+1} col {c_idx}")

check_nesting()
