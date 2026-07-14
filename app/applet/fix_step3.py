import sys

target_file = 'src/components/Step3Scenario.tsx'

# Read the file
with open(target_file, 'rb') as f:
    content = f.read()

# Target bytes to find
target_pat = b'          { category: \'\\xec\\x8a\\xa4\\xed\\x84\\xb0\\xeb\\x94\\x94 \\xeb\\xb0\\x8f \\xec\\x86\\x8c\\xed\\x86                    <tbody className="divide-y divide-gray-150 text-gray-750">\\n\'\n'

# Wait, let's look at the byte sequence print output:
# b'          { category: \'\xec\x8a\xa4\xed\x84\xb0\xeb\x94\x94 \xeb\xb0\x8f \xec\x86\x8c\xed\x86                    <tbody className="divide-y divide-gray-150 text-gray-750">\n'
# Let's match it using the raw bytes representation in python:
target_pat = b"          { category: '" + b"\xec\x8a\xa4\xed\x84\xb0\xeb\x94\x94 \xeb\xb0\x8f \xec\x86\x8c\xed\x86" + b'                    <tbody className="divide-y divide-gray-150 text-gray-750">\n'

replacement = """          { category: '스터디 및 소셜 오피스 카페', yield: '4.5%', description: '학군지 및 은퇴층 근린 커뮤니티 성격 공유 오피스룸' }
        ],
        risksText: '학령인구 감소 및 온라인 소매 강화로 오프라인 점포 회전율이 둔화될 수 있으며, 임대 단가 인상에 대한 심리적 저항이 강해 리모델링 시 관리 효율 관건.'
      };
    }
  };

  return (
    <div className="space-y-6">
      {currentLand && (
        <div className="space-y-4">
          {showAiPopulationEditor && (
            <div className="bg-amber-50/10 p-5 rounded-2xl border border-amber-200/40 space-y-4 shadow-xs">
              <div className="flex justify-between items-center border-b border-amber-200/20 pb-3">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
                    AI 기반 수지분석 모집단 분석 및 보정 엔진
                  </h3>
                  <p className="text-[10px] text-amber-700 font-medium">실거래가 및 표준건축비 분석 데이터</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAiPopulationEditor(false)}
                  className="text-[10px] font-bold text-amber-800 hover:text-amber-900 cursor-pointer"
                >
                  접기 ▲
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200/50 text-gray-500 font-bold text-[10.5px]">
                      <th className="p-2.5 text-left">분석 항목</th>
                      <th className="p-2.5 text-left">AI 분석 근거 및 주변 모집단 실거래 가이드라인</th>
                      <th className="p-2.5 text-right">수지분석 적용 수치</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 text-gray-750">
""".encode('utf-8')

if target_pat in content:
    new_content = content.replace(target_pat, replacement)
    with open(target_file, 'wb') as f:
        f.write(new_content)
    print("SUCCESS: Replacement completed successfully.")
else:
    print("ERROR: Target pattern not found in file.")
    # Let's print out what is around that line to help debug
    idx = content.find(b'<tbody className="divide-y divide-gray-150 text-gray-750">')
    if idx != -1:
        print("Found tbody tag, surrounding context:")
        print(content[max(0, idx-100):idx+100])
    sys.exit(1)
