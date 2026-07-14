import re

def trace_all_tags():
    with open('src/components/Step3Scenario.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    code = "".join(lines[1901:6734]) # Lines 1902 to 6734
    
    # Strip comments
    code = re.sub(r'//.*', '', code)
    code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
    
    # Strip JS expressions entirely so we don't look inside them for strings, but keep JSX tags
    # Actually, let's just strip string literals inside JS curly braces
    # A simpler way is to replace string literals with empty string
    code = re.sub(r"'(.*?)'", "''", code)
    code = re.sub(r'"(.*?)"', '""', code)
    code = re.sub(r'`(.*?)`', '``', code, flags=re.DOTALL)
    
    # Find all tags
    # This matches tags like <div>, </div>, <input />, etc.
    tag_pattern = re.compile(r'</?([a-zA-Z0-9_.-]+)(?:\s+[^>]*?)?>')
    
    stack = []
    self_closing_names = {'img', 'input', 'br', 'hr', 'meta', 'link'}
    
    for match in tag_pattern.finditer(code):
        tag_str = match.group(0)
        tag_name = match.group(1)
        
        # Check if self-closing
        if tag_str.endswith('/>') or tag_name.lower() in self_closing_names:
            continue
            
        # We only care about standard JSX tags
        # Capitalized names are components, but they also must balance
        
        # Calculate line number
        char_pos = match.start()
        line_no = 1902 + code[:char_pos].count('\n')
        
        if tag_str.startswith('</'):
            if not stack:
                print(f"[{line_no}] Extra closing tag: {tag_str}")
            else:
                top_tag, top_line = stack.pop()
                if top_tag != tag_name:
                    print(f"[{line_no}] Mismatched tag: Closed </{tag_name}> but expected </{top_tag}> (opened at line {top_line})")
                    # Put it back to try to recover
                    stack.append((top_tag, top_line))
        else:
            stack.append((tag_name, line_no))
            
    print(f"\nRemaining tags on stack: {len(stack)}")
    for tag, line in stack:
        print(f"  Unclosed <{tag}> opened at line {line}")

trace_all_tags()
