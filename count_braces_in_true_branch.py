import re

def count_braces():
    with open('src/components/Step3Scenario.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    code = "".join(lines[1904:6721]) # Line 1905 to 6721
    
    # Strip comments and strings
    code_clean = re.sub(r'//.*', '', code)
    code_clean = re.sub(r'/\*.*?\*/', '', code_clean, flags=re.DOTALL)
    
    def repl_str(m):
        return ' ' * len(m.group(0))
        
    code_clean = re.compile(r"'(.*?)'").sub(repl_str, code_clean)
    code_clean = re.compile(r'"(.*?)"').sub(repl_str, code_clean)
    code_clean = re.compile(r'`(.*?)`', re.DOTALL).sub(repl_str, code_clean)
    
    opens_curly = code_clean.count('{')
    closes_curly = code_clean.count('}')
    opens_paren = code_clean.count('(')
    closes_paren = code_clean.count(')')
    
    print(f"Inside true branch:")
    print(f"  Curly: {{={opens_curly}, }}={closes_curly} (diff={opens_curly - closes_curly})")
    print(f"  Paren: (={opens_paren}, )={closes_paren} (diff={opens_paren - closes_paren})")

count_braces()
