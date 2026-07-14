import re

def verify_true_branch():
    with open('src/components/Step3Scenario.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    code = "".join(lines[1904:6722]) # Lines 1905 to 6722
    
    # Strip comments
    code = re.sub(r'//.*', '', code)
    code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
    
    # Strip strings
    code = re.sub(r"'(.*?)'", "''", code)
    code = re.sub(r'"(.*?)"', '""', code)
    code = re.sub(r'`(.*?)`', '``', code, flags=re.DOTALL)
    
    stack = []
    idx = 0
    length = len(code)
    
    while idx < length:
        line_no = 1905 + code[:idx].count('\n')
        if code[idx] == '<' and idx + 1 < length:
            if code[idx+1] == '!':
                idx += 2
                continue
            elif code[idx+1] == '/':
                start = idx
                idx += 2
                if code[idx] == '>':
                    tag_name = 'FRAGMENT'
                    if stack:
                        top_tag, top_line = stack.pop()
                        if top_tag != 'FRAGMENT':
                            print(f"[{line_no}] Mismatched fragment: Closed </` but expected </{top_tag}> (opened at line {top_line})")
                            stack.append((top_tag, top_line))
                    idx += 1
                    continue
                
                tag_name_match = re.match(r'^([a-zA-Z0-9_.-]+)', code[idx:])
                if tag_name_match:
                    tag_name = tag_name_match.group(1)
                    idx += len(tag_name)
                    while idx < length and code[idx] != '>':
                        idx += 1
                    if idx < length:
                        if stack:
                            top_tag, top_line = stack.pop()
                            if top_tag != tag_name:
                                print(f"[{line_no}] Mismatched tag: Closed </{tag_name}> but expected </{top_tag}> (opened at line {top_line})")
                                stack.append((top_tag, top_line))
                        else:
                            print(f"[{line_no}] Stray closing </{tag_name}>")
                        idx += 1
                else:
                    idx += 1
            else:
                start = idx
                idx += 1
                if code[idx] == '>':
                    stack.append(('FRAGMENT', line_no))
                    idx += 1
                    continue
                
                tag_name_match = re.match(r'^([a-zA-Z0-9_.-]+)', code[idx:])
                if tag_name_match:
                    tag_name = tag_name_match.group(1)
                    idx += len(tag_name)
                    brace_depth = 0
                    while idx < length:
                        char = code[idx]
                        if char == '{':
                            brace_depth += 1
                        elif char == '}':
                            brace_depth -= 1
                        elif char == '>' and brace_depth == 0:
                            break
                        idx += 1
                    tag_content = code[start:idx+1]
                    is_self_closing = tag_content.strip().endswith('/>') or tag_name.lower() in {'img', 'input', 'br', 'hr', 'meta', 'link'}
                    if not is_self_closing:
                        stack.append((tag_name, line_no))
                    idx += 1
                else:
                    idx += 1
        else:
            idx += 1
            
    print(f"\nRemaining unclosed tags in true branch stack: {len(stack)}")
    for tag, line in stack:
        print(f"  Unclosed <{tag}> opened at line {line}")

verify_true_branch()
