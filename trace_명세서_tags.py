import re

def check_html_tags():
    with open('src/components/Step3Scenario.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    code = "".join(lines[5731:5948]) # Lines 5732 to 5948
    
    # Strip comments and string literals
    code = re.sub(r'//.*', '', code)
    code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
    code = re.sub(r"'(.*?)'", "''", code)
    code = re.sub(r'"(.*?)"', '""', code)
    code = re.sub(r'`(.*?)`', '``', code, flags=re.DOTALL)
    
    # Tag regex: find all tags
    tag_pattern = re.compile(r'</?([a-zA-Z0-9_-]+)(?:\s+[^>]*?)?>')
    
    stack = []
    errors = []
    
    self_closing_names = {'img', 'input', 'br', 'hr', 'meta', 'link'}
    
    for match in tag_pattern.finditer(code):
        tag_str = match.group(0)
        tag_name = match.group(1)
        
        # If the tag is explicitly self-closing (ends in /> or has self-closing pattern)
        if tag_str.endswith('/>') or tag_name.lower() in self_closing_names:
            continue
            
        # Ignore capitalized components that are usually self-closing or handled otherwise (though let's trace them)
        if tag_str.startswith('</'):
            if not stack:
                errors.append(f"Stray closing tag: {tag_str} at char pos {match.start()}")
            else:
                top_tag, top_pos = stack.pop()
                if top_tag != tag_name:
                    errors.append(f"Mismatched tag: Opened <{top_tag}> but closed </{tag_name}>")
                    # push it back to keep tracking
                    stack.append((top_tag, top_pos))
        else:
            stack.append((tag_name, match.start()))
            
    print(f"Stack size at end: {len(stack)}")
    if stack:
        print("Unclosed tags remaining in stack (from first to last opened):")
        for tag, pos in stack:
            # find line number
            char_count = 0
            line_no = 5732
            for i, line in enumerate(lines[5731:]):
                char_count += len(line)
                if char_count >= pos:
                    line_no = 5732 + i
                    break
            print(f"  <{tag}> opened around line {line_no}")
            
    if errors:
        print("\nErrors:")
        for err in errors:
            print(f"  {err}")

check_html_tags()
