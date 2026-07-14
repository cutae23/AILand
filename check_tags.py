import re

def check_html_tags(filename):
    with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
        
    # Get the code block from line 1902 (0-indexed 1901) to 6735
    code = "".join(lines[1901:6735])
    
    # Strip comments
    code = re.sub(r'//.*', '', code)
    code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
    
    # Strip string literals to avoid matching < or > inside strings
    code = re.sub(r"'(.*?)'", "''", code)
    code = re.sub(r'"(.*?)"', '""', code)
    code = re.sub(r'`(.*?)`', '``', code, flags=re.DOTALL)
    
    # Simple regex to find HTML tags
    # We want to match tags like <div>, </div>, but not self-closing tags like <br />, <Sparkles />, etc.
    # Also ignore tags that start with lowercase letter or are standard React elements.
    tag_pattern = re.compile(r'</?([a-zA-Z0-9_-]+)(?:\s+[^>]*?)?>')
    
    # Find all tags
    stack = []
    errors = []
    
    # Let's filter out known self-closing tag patterns that might not end in /
    # inside standard React code, e.g. <img ...>, <input ...> etc.
    self_closing_names = {'img', 'input', 'br', 'hr', 'meta', 'link'}
    
    for match in tag_pattern.finditer(code):
        tag_str = match.group(0)
        tag_name = match.group(1)
        
        # If the tag is explicitly self-closing (ends in />), skip it
        if tag_str.endswith('/>'):
            continue
            
        # If it's a known self-closing HTML tag, skip it
        if tag_name.lower() in self_closing_names:
            continue
            
        # Ignore custom React components that are usually capitalized
        # (Though we might want to check them too, let's include everything first, except self-closing ones)
        if tag_str.startswith('</'):
            # Closing tag
            if not stack:
                errors.append(f"Stray closing tag: {tag_str} at char pos {match.start()}")
            else:
                top_tag, top_pos = stack.pop()
                if top_tag != tag_name:
                    errors.append(f"Mismatched tag: Opened <{top_tag}> but closed </{tag_name}> at pos {match.start()}")
        else:
            # Opening tag
            stack.append((tag_name, match.start()))
            
    print(f"Stack size at end: {len(stack)}")
    if stack:
        print("Unclosed tags remaining in stack (from first to last opened):")
        for tag, pos in stack:
            # Let's find line number
            char_count = 0
            line_no = 1902
            for i, line in enumerate(lines[1901:]):
                char_count += len(line)
                if char_count >= pos:
                    line_no = 1902 + i
                    break
            print(f"  <{tag}> opened around line {line_no}")
            
    if errors:
        print("\nErrors found:")
        for err in errors:
            print(f"  {err}")

check_html_tags('src/components/Step3Scenario.tsx')
