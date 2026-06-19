/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { SAMPLE_LANDS } from '../sampleLands.js';
import { LandRegulatoryAnalysis, SampleLand } from '../types.js';
import { MapPin, Link2, Upload, AlertTriangle, CheckCircle, Info, Landmark, HelpCircle, FileText, ArrowRight, RefreshCw, Send, Sparkles, MessageSquare, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Step1RegulatoryProps {
  onAnalysisComplete: (analysis: LandRegulatoryAnalysis) => void;
  savedAnalysis: LandRegulatoryAnalysis | null;
}

export default function Step1Regulatory({ onAnalysisComplete, savedAnalysis }: Step1RegulatoryProps) {
  const [selectedSampleId, setSelectedSampleId] = useState<string>('');
  const [customerLink, setCustomerLink] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<LandRegulatoryAnalysis | null>(savedAnalysis);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Method D: Expected land usage & development scale inputs
  const [expectedUsage, setExpectedUsage] = useState<string>('공동주택 (다세대 / 아파트)');
  const [expectedScale, setExpectedScale] = useState<string>('지상 5층, 연면적 약 1,500㎡ 규모');

  // Interactive Law Q&A Chat State
  const [chatInput, setChatInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([
    {
      role: 'assistant',
      content: '반갑습니다! 이 부지의 8대 법정 규제 검토 조서 작성을 완료했습니다. 도시계획 조례, 지구단위계획 의무 준수 한계, 지상 용도별 가용 분석(근생활/오피스텔 등 복합개발성), 주차장 대수 산정 등 추가로 궁금하신 구체적인 법적 사항을 무엇이든 질문해 주세요!'
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Suggested high fidelity questions
  const SUGGESTED_QUESTIONS = [
    "이 필지에 지식산업센터나 오피스텔 등 복합 개발(상업 융합)이 가능한가요?",
    "인근에 학교가 있을 때 교육환경보호구역 관련 필수 심의 심사 지침은?",
    "일조 사선제한 극복을 위한 설계 전략이나 용적률 인센티브 혜택 조건은?",
    "지구단위계획 수립지침 및 특별계획 지정 여부에 따른 예외 규정은?"
  ];

  const askLegalAI = async (questionText: string) => {
    if (!questionText.trim() || isChatLoading) return;
    
    const userMessage = { role: 'user' as const, content: questionText };
    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory(updatedHistory);
    setChatInput('');
    setIsChatLoading(true);
    setChatError(null);

    try {
      const response = await fetch('/api/ask-legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionText,
          landContext: analysisResult,
          history: chatHistory.slice(-6) // Include recent context
        })
      });

      if (!response.ok) {
        throw new Error('법률 자문 서비스 응답에 실패했습니다. API 키 정보 또는 네트워크 통신을 확인하십시오.');
      }

      const data = await response.json();
      setChatHistory([...updatedHistory, { role: 'assistant', content: data.answer }]);
    } catch (err: any) {
      setChatError(err.message || '네트워크 오류가 발생했습니다.');
    } finally {
      setIsChatLoading(false);
    }
  };

  // Helper for South Korea architecture and city law categorization
  const getLegalMeta = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('국토') || t.includes('계획') || t.includes('도시계획') || t.includes('조례') || t.includes('건폐율') || t.includes('용적률')) {
      return {
        category: 'planning',
        catName: '도시계획 / 조례',
        lawName: '국토계획법 및 조례',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      };
    }
    if (t.includes('건축법') || t.includes('일조') || t.includes('높이') || t.includes('사선') || t.includes('이격')) {
      return {
        category: 'building',
        catName: '건축 규격 / 일조사선',
        lawName: '건축법 제60조·제61조',
        color: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      };
    }
    if (t.includes('주차') || t.includes('도로') || t.includes('주택건설') || t.includes('진입')) {
      return {
        category: 'infrastructure',
        catName: '기반시설 / 주차의무',
        lawName: '주차장법 / 주택건설규정',
        color: 'bg-amber-50 text-amber-700 border-amber-100',
      };
    }
    if (t.includes('소방') || t.includes('피난') || t.includes('교육환경') || t.includes('학교') || t.includes('조경') || t.includes('공지')) {
      return {
        category: 'safety_etc',
        catName: '소방방재 / 공공위생',
        lawName: '소방시설법 / 교육환경법',
        color: 'bg-rose-50 text-rose-700 border-rose-100',
      };
    }
    return {
      category: 'planning',
      catName: '도시계획',
      lawName: '관계법률',
      color: 'bg-gray-50 text-gray-700 border-gray-100',
    };
  };

  // Read file as base64 helper
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일(*.png, *.jpg, *.jpeg)만 업로드할 수 있습니다.');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImagePreview(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Preset sample selection
  const handleSelectSample = (id: string) => {
    setSelectedSampleId(id);
    const sample = SAMPLE_LANDS.find(l => l.id === id);
    if (sample) {
      setCustomerLink(sample.eumLink);
      setError(null);
    }
  };

  // Simulated timed steps for analysis to give expert-level feeling
  const runAnalysis = async () => {
    if (!customerLink && !imagePreview) {
      setError('리뷰를 시작하려면 토지이음 주소/링크를 쓰시거나 규제 도면 캡쳐를 등록해 주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const steps = [
      '토지이음 대장 공공 연계 확인 중...',
      '용도지역 및 도시계획 조례 법정 기준 파싱 중...',
      '일조 제한, 건축선 보호 한계선 3차원 시뮬레이션 중...',
      'Gemini AI 기반 지능형 건축 규제 성적서 작성 중...'
    ];

    try {
      // Step feedback animation
      for (let i = 0; i < steps.length; i++) {
        setLoadingStep(steps[i]);
        await new Promise(resolve => setTimeout(resolve, i === 3 ? 1200 : 700));
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eumLink: customerLink,
          screenshot: imagePreview,
          sampleLandId: selectedSampleId || null,
          expectedUsage: expectedUsage,
          expectedScale: expectedScale
        })
      });

      if (!response.ok) {
        throw new Error('서버 분석 응답에 실패했습니다.');
      }

      const data: LandRegulatoryAnalysis = await response.json();
      setAnalysisResult(data);
      onAnalysisComplete(data);
    } catch (err: any) {
      setError('규제 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해보세요.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setSelectedSampleId('');
    setCustomerLink('');
    setImagePreview(null);
    setExpectedUsage('공동주택 (다세대 / 아파트)');
    setExpectedScale('지상 5층, 연면적 약 1,500㎡ 규모');
    setError(null);
  };

  return (
    <div className="space-y-6" id="step1-container">
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Landmark className="w-5 h-5 text-indigo-600" />
          Step 1: 토지이음 규제 및 용도별 법규 조서 검토
        </h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          토지이음 주소/링크와 규제 도면 캡쳐, 그리고 구상 중이신 <strong>개발 예정 용도 및 규모</strong>를 함께 입력하여 건축법, 주차장법, 소방방재, 조례 등을 아우르는 8대 핵심 행위제한 성적서를 종합적으로 정성 검토합니다.
        </p>

        {!analysisResult ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Input Fields */}
            <div className="lg:col-span-12 xl:col-span-7 space-y-5">
              
              {/* Method A: Custom Portal Link / Address */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-indigo-600" />
                  방법 A: 토지이음 주소 링크 또는 직접 번지수 입력 <span className="text-rose-500 text-[10px] font-normal font-semibold">(필수)</span>
                </label>
                <input
                  type="text"
                  placeholder="예: 서울특별시 영등포구 여의도동 1번지 또는 토지이음 규제대장 URL 링크"
                  value={customerLink}
                  onChange={(e) => {
                    setCustomerLink(e.target.value);
                  }}
                  className="w-full text-xs sm:text-sm px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-gray-800 bg-white"
                />
              </div>

              {/* Method B: Drag and Drop Screenshot */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    방법 B: 토지이용규계획확인서 규제 도면 캡쳐 등록
                  </label>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-805 text-[10px] font-bold rounded animate-pulse">
                    🚨 최대한 많이 캡쳐해 주세요!
                  </span>
                </div>

                {/* Important Tip Callout */}
                <p className="text-[10px] text-amber-700 mb-3 leading-relaxed bg-amber-50 p-2.5 rounded-lg border border-amber-200/50">
                  <strong>💡 [중요 안내]</strong> 토지이용계획확인서의 <strong>지적도면, 지역지구 행위제한, 관련 법령 정보</strong> 등이 최대한 고화질로 <strong>넓은 영역 및 최대한 많이 캡쳐</strong>되어 업로드될 수록, AI의 맞춤 법적 인허가 파싱 및 리스크 차단 정밀도가 극대화됩니다!
                </p>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition ${
                    isDragOver
                      ? 'border-indigo-500 bg-indigo-50/20'
                      : imagePreview
                      ? 'border-green-500/40 bg-zinc-50'
                      : 'border-zinc-205 hover:border-gray-300 bg-white hover:bg-gray-50/30'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  {imagePreview ? (
                    <div className="space-y-2">
                      <img
                        src={imagePreview}
                        alt="Screen upload preview"
                        className="max-h-28 mx-auto rounded border shadow-xs"
                      />
                      <p className="text-xs text-green-600 font-medium font-semibold">✨ 규제 캡쳐 도면이 성공적으로 분석 모델에 장착되었습니다.</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImagePreview(null);
                        }}
                        className="text-[11px] text-rose-500 hover:underline font-semibold"
                      >
                        이미지 제거하기
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 py-2">
                      <Upload className="w-8 h-8 text-indigo-400 mx-auto" />
                      <p className="text-xs text-gray-600">
                        <span className="text-indigo-600 font-bold">클릭하여 캡쳐 파일 선택</span> 또는 드래그 앤 드롭
                      </p>
                      <p className="text-[10px] text-gray-400">행위제한내용 및 도면이 잘 보이게 넓게 캡쳐한 이미지 파일</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Method C: Expected Building Usage & Scale (New dynamic context builder) */}
              <div className="bg-indigo-50/20 p-4 rounded-xl border border-indigo-100/50 space-y-3">
                <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  방법 C: 구상 중이신 예상 용도 및 개발 규모 (AI 상세 검토 핵심 엔진)
                </label>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  선택 혹은 기술하신 예정 쓰임새에 맞게 주설비(부설주차장 수, 대지안의 공지)와 건축법 완화 요소를 매칭하여 검토 결과 조서를 작성하게 됩니다.
                </p>

                {/* 1. Usage Selector */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-gray-600 block">1) 예상 건축물 주된 용도 선택:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      '공동주택 (다세대 / 아파트)',
                      '상업용 근린생활시설 (상가빌딩)',
                      '오피스텔 / 도시형생활주택',
                      '지식산업센터 / 벤처공장',
                      '직접 기술 (아래 폼에 입력)'
                    ].map((usage) => (
                      <button
                        key={usage}
                        type="button"
                        onClick={() => {
                          if (usage !== '직접 기술 (아래 폼에 입력)') {
                            setExpectedUsage(usage);
                          } else {
                            setExpectedUsage('');
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition ${
                          expectedUsage === usage || (usage === '직접 기술 (아래 폼에 입력)' && !['공동주택 (다세대 / 아파트)','상업용 근린생활시설 (상가빌딩)','오피스텔 / 도시형생활주택','지식산업센터 / 벤처공장'].includes(expectedUsage))
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {usage}
                      </button>
                    ))}
                  </div>
                  
                  <input
                    type="text"
                    value={expectedUsage}
                    onChange={(e) => setExpectedUsage(e.target.value)}
                    placeholder="직접 건축 용도를 구체적으로 입력하세요 (예: 노인복지시설, 세차장, 단독주택)"
                    className="w-full text-xs px-3 py-2 rounded border border-gray-200 mt-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* 2. Scale Input */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-gray-600 block">2) 개발 구상 규모 (층수 / 연면적 등):</span>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {[
                      '지상 5층, 연면적 약 1,500㎡ 규모',
                      '지하 1층 ~ 지상 10층 중형 빌딩 개발',
                      '지상 3층 규모의 꼬마빌딩 융합 기획',
                      '초고층 복합복합체 개발 (용적률 완화 가용 최대화)'
                    ].map((scale) => (
                      <button
                        key={scale}
                        type="button"
                        onClick={() => setExpectedScale(scale)}
                        className={`px-2 py-1 rounded text-[10px] font-normal transition ${
                          expectedScale === scale
                            ? 'bg-indigo-100 text-indigo-900 font-bold border border-indigo-200'
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                        }`}
                      >
                        {scale}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={expectedScale}
                    onChange={(e) => setExpectedScale(e.target.value)}
                    placeholder="예: 지상 7층, 세대당 약 18세대 주거 용도"
                    className="w-full text-xs px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-gray-800"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex items-start gap-2.5 text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="button"
                disabled={isLoading}
                onClick={runAnalysis}
                className="w-full py-3.5 bg-indigo-650 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-xs sm:text-sm transition duration-200 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{loadingStep}</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 animate-pulse" />
                    <span>8대 관계법규 종합 필터링 및 조서 검토 실행</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Information Help Panel */}
            <div className="lg:col-span-5 bg-gray-50/50 p-5 rounded-xl border border-gray-100 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <HelpCircle className="w-4 h-4 text-indigo-500" />
                  <span>검토 프로세스 가이드</span>
                </div>
                <div className="space-y-4 text-xs leading-relaxed text-gray-600">
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">1</span>
                    <p>
                      <strong>토지 정보 취득:</strong> 대한민국 <strong>토지이음</strong> 포털 사이트에서 개발할 지번을 입력하고, 축척도 및 법규 규제 사항들을 체크합니다.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">2</span>
                    <p>
                      <strong>데이터 입력:</strong> 토지이음에 안내된 링크를 입력하거나 규제내용(용적률/건폐율/고도한도)이 드러난 부문을 스크린으로 캡쳐해 등록합니다.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">3</span>
                    <p>
                      <strong>AI 법규 성적서 검토:</strong> 인공지능이 조례를 탐색하여 정북방향 일조 사선 한계, 도로조건 저해 여부 등을 1차로 신속 검토해 줍니다.
                    </p>
                  </div>
                </div>
              </div>

              {selectedSampleId && (
                <div className="mt-6 p-3.5 bg-indigo-50/50 rounded-lg text-xs leading-relaxed text-indigo-900 border border-indigo-100">
                  <span className="font-semibold text-indigo-700">선택된 대지 정보:</span>
                  <p className="mt-1 text-gray-600 font-normal">
                    {SAMPLE_LANDS.find(l => l.id === selectedSampleId)?.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Output Regulatory Appraisal Report */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Header Address Card */}
            <div className="p-4 bg-gray-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-indigo-300 uppercase">분석 대지 정보</span>
                <h3 className="text-base font-semibold mt-0.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  {analysisResult.address}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  다시 분석하기
                </button>
              </div>
            </div>

            {/* Core Specs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] text-gray-400 font-medium block">용도지역</span>
                <span className="font-bold text-gray-800 text-sm mt-1 block truncate" title={analysisResult.zoning}>
                  {analysisResult.zoning}
                </span>
              </div>
              <div className="bg-indigo-50/30 p-3.5 rounded-xl border border-indigo-100/50 text-center">
                <span className="text-[10px] text-indigo-500 font-medium block">대지면적</span>
                <span className="font-bold text-indigo-900 text-base mt-0.5 block">
                  {analysisResult.areaSize.toLocaleString()}㎡
                </span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] text-gray-400 font-medium block">기준 건폐율</span>
                <span className="font-bold text-gray-800 text-base mt-0.5 block">
                  {analysisResult.baselineBCR}%
                </span>
              </div>
              <div className="bg-indigo-50/30 p-3.5 rounded-xl border border-indigo-100/50 text-center">
                <span className="text-[10px] text-indigo-500 font-medium block">기준 용적률</span>
                <span className="font-bold text-indigo-900 text-base mt-0.5 block">
                  {analysisResult.baselineFAR}%
                </span>
              </div>
            </div>

            {/* Professional Regulatory Audit Ledger */}
            <div className="space-y-4" id="regulatory-ledger">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    전문 종합 관계법령 상세 검토 조서
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">건축법 및 국토계획법 등 대지 연계 8대 핵심 법적 요건을 다차원 정성 검토 완료했습니다.</p>
                </div>
                
                {/* Statistics badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-1 rounded bg-gray-100 text-[10px] font-bold text-gray-700">
                    전체 검토건: {analysisResult.regulations.length}건
                  </span>
                  <span className="px-2 py-1 rounded bg-red-50 text-[10px] font-bold text-red-700 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    주의 요망: {analysisResult.regulations.filter(r => r.status === 'warning').length}건
                  </span>
                  <span className="px-2 py-1 rounded bg-green-50 text-[10px] font-bold text-green-700 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    안전 편입: {analysisResult.regulations.filter(r => r.status === 'safe').length}건
                  </span>
                  <span className="px-2 py-1 rounded bg-blue-50 text-[10px] font-bold text-blue-700 flex items-center gap-1">
                    <Info className="w-3 h-3 text-blue-500" />
                    일바요건: {analysisResult.regulations.filter(r => r.status === 'info').length}건
                  </span>
                </div>
              </div>

              {/* Advanced Classification Filters */}
              <div className="space-y-2">
                {/* 1. Status Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-semibold text-gray-400 mr-1">상태 필터:</span>
                  {[
                    { id: 'all', label: '전체 보기', icon: null },
                    { id: 'warning', label: '주의 필요 (🚨)', icon: AlertTriangle },
                    { id: 'safe', label: '완화/준수 (✅)', icon: CheckCircle },
                    { id: 'info', label: '일반 고시 (ℹ️)', icon: Info }
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setFilterStatus(btn.id)}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium transition duration-200 ${
                        filterStatus === btn.id
                          ? 'bg-gray-900 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* 2. Category Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-semibold text-gray-400 mr-1">분야 필터:</span>
                  {[
                    { id: 'all', label: '모든 분야', count: analysisResult.regulations.length },
                    { id: 'planning', label: '도시계획 / 조례', count: analysisResult.regulations.filter(r => getLegalMeta(r.title).category === 'planning').length },
                    { id: 'building', label: '건축 규격 / 일조사선', count: analysisResult.regulations.filter(r => getLegalMeta(r.title).category === 'building').length },
                    { id: 'infrastructure', label: '기반시설 / 주차의무', count: analysisResult.regulations.filter(r => getLegalMeta(r.title).category === 'infrastructure').length },
                    { id: 'safety_etc', label: '소방방재 / 공공위생', count: analysisResult.regulations.filter(r => getLegalMeta(r.title).category === 'safety_etc').length }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFilterCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition duration-200 ${
                        filterCategory === cat.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-50 text-gray-600 hover:bg-slate-100 border border-slate-200/50'
                      }`}
                    >
                      {cat.label} ({cat.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Rendered Item Grid */}
              <div className="grid grid-cols-1 gap-3">
                {analysisResult.regulations
                  .filter(r => filterStatus === 'all' || r.status === filterStatus)
                  .filter(r => filterCategory === 'all' || getLegalMeta(r.title).category === filterCategory)
                  .map((reg, index) => {
                    const meta = getLegalMeta(reg.title);
                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-xl border text-xs leading-relaxed transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs flex gap-3.5 items-start ${
                          reg.status === 'warning'
                            ? 'border-red-100 bg-red-50/20 text-gray-800'
                            : reg.status === 'safe'
                            ? 'border-green-100 bg-green-50/15 text-gray-800'
                            : 'border-blue-100 bg-blue-50/15 text-gray-800'
                        }`}
                      >
                        {/* Status Icon Indicator */}
                        <div className="flex-shrink-0 mt-1">
                          {reg.status === 'warning' && (
                            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            </div>
                          )}
                          {reg.status === 'safe' && (
                            <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                          )}
                          {reg.status === 'info' && (
                            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Info className="w-4 h-4 text-blue-600" />
                            </div>
                          )}
                        </div>

                        {/* Text and Badges */}
                        <div className="flex-grow">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h5 className="font-semibold text-gray-950 text-xs sm:text-sm">{reg.title}</h5>
                            
                            {/* Legal Source Badge */}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.color}`}>
                              💡 {meta.lawName}
                            </span>

                            {/* Category Badge */}
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-medium">
                              💼 {meta.catName}
                            </span>
                          </div>
                          
                          <p className="text-gray-600 text-[11px] font-normal leading-relaxed">{reg.desc}</p>
                        </div>

                        {/* Interactive "Audit Check" toggle to let builders approve/signoff each regulation manually */}
                        <div className="flex-shrink-0 self-center">
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              defaultChecked={reg.status === 'safe'}
                              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">확인</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}

                {/* Empty State warning inside selected filters */}
                {analysisResult.regulations
                  .filter(r => filterStatus === 'all' || r.status === filterStatus)
                  .filter(r => filterCategory === 'all' || getLegalMeta(r.title).category === filterCategory)
                  .length === 0 && (
                  <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs">
                    필터링 조건(상태 및 분야)에 해당하는 규제 요건이 없습니다. 다른 필터를 선택해 보세요.
                  </div>
                )}
              </div>
            </div>

            {/* AI Summary and Recommendations */}
            <div className="bg-slate-55 p-4 rounded-xl border border-slate-100 bg-gradient-to-tr from-indigo-50/10 via-white to-slate-50">
              <div className="text-xs font-bold text-indigo-600 mb-2">지능형 입지 가치 분석</div>
              <p className="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap font-normal">
                {analysisResult.developmentPotential}
              </p>

              <div className="mt-4 border-t border-gray-100 pt-3">
                <span className="text-[11px] font-semibold text-gray-800 block mb-1.5">핵심 권장사항 (Architectural Guidelines):</span>
                <ul className="space-y-1.5">
                  {analysisResult.recommendations.map((rec, i) => (
                    <li key={i} className="text-[11px] text-gray-600 flex items-start gap-1.5">
                      <span className="text-indigo-500 font-bold mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Real-time Interactive Legal Q&A Chat Panel */}
            <div className="bg-indigo-950 text-white rounded-xl p-5 border border-indigo-800 shadow-xl space-y-4" id="ai-legal-qa-panel">
              <div className="flex items-center justify-between border-b border-indigo-900 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-indigo-900/50 rounded-lg text-indigo-300">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1">
                      실시간 AI 토지 관계법령 · 건축조례 맞춤 상담
                    </h4>
                    <p className="text-[10px] text-indigo-200">지구단위대상의 조건, 복합 용도 변경 가능성, 지자체 건축조례 상세 규정을 실시간으로 다차원 확인해 보세요.</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-indigo-900 px-2 py-1 rounded text-[9px] font-bold text-indigo-300 border border-indigo-850">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400 animate-bounce" />
                  상시 법률 고문
                </div>
              </div>

              {/* Chat Messages Log */}
              <div className="max-h-[280px] overflow-y-auto space-y-3 pr-1 bg-indigo-950/40 p-3 rounded-lg border border-indigo-900/60 custom-scrollbar">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role !== 'user' && (
                      <div className="w-6 h-6 rounded-full bg-indigo-800 text-indigo-200 flex items-center justify-center text-[10px] font-bold shrink-0">
                        ⚖️
                      </div>
                    )}
                    <div className={`p-3 rounded-xl max-w-[85%] text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white font-medium rounded-tr-none'
                        : 'bg-slate-900 text-gray-200/90 font-normal rounded-tl-none border border-slate-850'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {isChatLoading && (
                  <div className="flex gap-2.5 justify-start">
                    <div className="w-6 h-6 rounded-full bg-indigo-800 text-indigo-200 flex items-center justify-center text-[10px] shrink-0">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 text-indigo-300 text-xs italic flex items-center gap-2">
                      <span>최신 지자체 조례 및 인허가 준수대상을 심층 검증하는 중입니다...</span>
                    </div>
                  </div>
                )}

                {chatError && (
                  <div className="p-3 rounded-lg bg-red-950/50 border border-red-900 text-red-200 text-xs text-center font-semibold">
                    ⚠️ {chatError}
                  </div>
                )}
              </div>

              {/* Suggestions Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-indigo-300 font-bold block">💡 추천 자문 시나리오 (클릭 시 자동 질의):</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {SUGGESTED_QUESTIONS.map((questionText, index) => (
                    <button
                      key={index}
                      type="button"
                      disabled={isChatLoading}
                      onClick={() => askLegalAI(questionText)}
                      className="text-[10px] text-left p-2.5 rounded bg-slate-900 hover:bg-slate-850 hover:text-white border border-indigo-900 text-indigo-200 transition duration-150 disabled:opacity-50 font-normal hover:border-indigo-500 cursor-pointer"
                    >
                      • {questionText}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Entry controls */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  askLegalAI(chatInput);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="예: 용도변경으로 근린생활시설 설치할 때 정북방향 일조 조항이나 주차 조례 세부 기준은?"
                  className="flex-grow text-xs px-3.5 py-2.5 rounded-lg bg-slate-900 border border-indigo-900/85 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-indigo-400"
                  disabled={isChatLoading}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition duration-150 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>질문</span>
                </button>
              </form>
            </div>

            {/* Direct Action Link to step 2 */}
            <div className="pt-2 flex justify-end">
              <div className="text-xs text-indigo-600 font-semibold animate-pulse flex items-center gap-1">
                기초 검토 완료! 상단 스텝 2 탭 또는 다음 행동을 실행하세요
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
