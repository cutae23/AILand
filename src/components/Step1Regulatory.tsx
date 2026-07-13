/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { SAMPLE_LANDS } from '../sampleLands';
import { LandRegulatoryAnalysis, SampleLand, HistoryRecord } from '../types';
import { MapPin, Link2, Upload, AlertTriangle, CheckCircle, Info, Landmark, HelpCircle, FileText, ArrowRight, RefreshCw, Send, Sparkles, MessageSquare, Loader2, History, Trash2, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Step1RegulatoryProps {
  onAnalysisComplete: (analysis: LandRegulatoryAnalysis) => void;
  savedAnalysis: LandRegulatoryAnalysis | null;
  chatHistory: Array<{ role: 'user' | 'assistant', content: string }>;
  setChatHistory: React.Dispatch<React.SetStateAction<Array<{ role: 'user' | 'assistant', content: string }>>>;
  savedInputs?: {
    selectedSampleId: string;
    customerLink: string;
    imagePreview: string | null;
    usageScaleList: any[];
  } | null;
  onSaveInputs?: (inputs: {
    selectedSampleId: string;
    customerLink: string;
    imagePreview: string | null;
    usageScaleList: any[];
  }) => void;
  historyList?: HistoryRecord[];
  onLoadHistory?: (record: HistoryRecord) => void;
  onDeleteHistory?: (id: string, e: React.MouseEvent) => void;
}

export default function Step1Regulatory({ 
  onAnalysisComplete, 
  savedAnalysis,
  chatHistory,
  setChatHistory,
  savedInputs,
  onSaveInputs,
  historyList = [],
  onLoadHistory,
  onDeleteHistory
}: Step1RegulatoryProps) {
  const [selectedSampleId, setSelectedSampleId] = useState<string>(() => savedInputs?.selectedSampleId ?? '');
  const [customerLink, setCustomerLink] = useState<string>(() => savedInputs?.customerLink ?? '');
  const [imagePreview, setImagePreview] = useState<string | null>(() => savedInputs?.imagePreview ?? null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<LandRegulatoryAnalysis | null>(savedAnalysis);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Custom Gemini API Key State & Storage
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem('user_gemini_api_key') || '';
  });
  const [isApiKeySaved, setIsApiKeySaved] = useState<boolean>(() => {
    return !!localStorage.getItem('user_gemini_api_key');
  });
  const [showKeyInstructions, setShowKeyInstructions] = useState<boolean>(false);

  const handleSaveApiKey = (key: string) => {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem('user_gemini_api_key', trimmed);
      setIsApiKeySaved(true);
    } else {
      localStorage.removeItem('user_gemini_api_key');
      setIsApiKeySaved(false);
    }
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('user_gemini_api_key');
    setCustomApiKey('');
    setIsApiKeySaved(false);
  };

  // Method C: Expected land usage & development scale inputs (Multi-usage list)
  interface UsageScaleItem {
    id: string;
    usage: string;
    scale: string;
  }

  const [usageScaleList, setUsageScaleList] = useState<UsageScaleItem[]>(() => savedInputs?.usageScaleList ?? [
    { id: '1', usage: '공동주택 (다세대 / 아파트)', scale: '지상 5층, 연면적 약 1,500㎡ 규모' }
  ]);

  // Sync inputs to parent
  useEffect(() => {
    if (onSaveInputs) {
      onSaveInputs({
        selectedSampleId,
        customerLink,
        imagePreview,
        usageScaleList
      });
    }
  }, [selectedSampleId, customerLink, imagePreview, usageScaleList, onSaveInputs]);

  const handleAddUsageScale = () => {
    setUsageScaleList([
      ...usageScaleList,
      {
        id: Date.now().toString(),
        usage: '상업용 근린생활시설 (종합상가)',
        scale: '지상 1~2층, 연면적 약 500㎡ 규모'
      }
    ]);
  };

  const handleRemoveUsageScale = (id: string) => {
    setUsageScaleList(usageScaleList.filter(item => item.id !== id));
  };

  const handleUpdateUsageScale = (id: string, field: 'usage' | "scale", value: string) => {
    setUsageScaleList(
      usageScaleList.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Interactive Law Q&A Chat State
  const [chatInput, setChatInput] = useState<string>('');
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
      // Auto-save and register api key if typed but not explicitly registered
      let finalApiKey = localStorage.getItem('user_gemini_api_key') || '';
      if (customApiKey.trim() && customApiKey.trim() !== finalApiKey) {
        handleSaveApiKey(customApiKey);
        finalApiKey = customApiKey.trim();
      }

      const response = await fetch('/api/ask-legal', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(finalApiKey ? { 'x-gemini-key': finalApiKey } : {})
        },
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

  // Read file as base64 with client-side downscaling/compression helper to prevent huge payload fetch failures
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일(*.png, *.jpg, *.jpeg)만 업로드할 수 있습니다.');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const rawDataUrl = e.target.result as string;
        
        // Optimize image size (downscale if larger than 1400px and compress as JPEG)
        const img = new Image();
        img.onload = () => {
          const maxDim = 1400; // Optimal max dimension for clear OCR and extremely light size
          let width = img.width;
          let height = img.height;
          
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Draw white background to handle transparent PNGs correctly in JPEG format
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to JPEG with 80% quality for optimal balance of sharp text and tiny payload size
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setImagePreview(compressedDataUrl);
          } else {
            setImagePreview(rawDataUrl); // Fallback to raw if canvas context is unavailable
          }
        };
        img.onerror = () => {
          setImagePreview(rawDataUrl); // Fallback to raw if image fails to load
        };
        img.src = rawDataUrl;
        
        setSelectedSampleId(''); // Clear selected sample ID when custom image is uploaded
        setCustomerLink(''); // Clear previous sample link so AI analyzes only custom uploaded image
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
    if (usageScaleList.length === 0) {
      setError('리뷰를 시작하려면 최소 하나 이상의 개발 예정 용도 및 규모를 방법 B에 등록해 주세요.');
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

      // Auto-save and register api key if typed but not explicitly registered
      let finalApiKey = localStorage.getItem('user_gemini_api_key') || '';
      if (customApiKey.trim() && customApiKey.trim() !== finalApiKey) {
        handleSaveApiKey(customApiKey);
        finalApiKey = customApiKey.trim();
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(finalApiKey ? { 'x-gemini-key': finalApiKey } : {})
        },
        body: JSON.stringify({
          eumLink: customerLink,
          screenshot: imagePreview,
          sampleLandId: selectedSampleId || null,
          usageScaleList: usageScaleList
        })
      });

      if (!response.ok) {
        let errMsg = '서버 분석 응답에 실패했습니다.';
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data: LandRegulatoryAnalysis = await response.json();
      setAnalysisResult(data);
      onAnalysisComplete(data);
    } catch (err: any) {
      setError(err.message || '규제 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해보세요.');
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
    setUsageScaleList([
      { id: '1', usage: '공동주택 (다세대 / 아파트)', scale: '지상 5층, 연면적 약 1,500㎡ 규모' }
    ]);
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
          <div className="flex flex-col gap-6">
            {/* Left Input Fields */}
            <div className="w-full space-y-5">
              
              {/* Gemini API Key Registration & Settings block */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    실시간 AI 분석 소스: Gemini API 개인 키 등록 <span className="text-gray-400 text-[10px] font-normal">(선택)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKeyInstructions(!showKeyInstructions)}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showKeyInstructions ? '가이드 닫기' : 'API 키 발급/설정법 안내'}</span>
                    <Info className="w-3 h-3" />
                  </button>
                </div>

                {/* Guide Container */}
                <AnimatePresence>
                  {showKeyInstructions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-3 text-xs text-gray-600 bg-indigo-50/50 p-3.5 rounded-lg border border-indigo-100/50 space-y-1.5 leading-relaxed font-sans"
                    >
                      <h4 className="font-bold text-gray-900 flex items-center gap-1 text-[11px]">
                        🔑 Gemini API 키 발급 및 서비스 고정 설정법:
                      </h4>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-600">
                        <li>
                          <strong>무료 발급:</strong> 공식 사이트인{' '}
                          <a
                            href="https://aistudio.google.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-650 hover:underline inline-flex items-center gap-0.5 font-bold"
                          >
                            Google AI Studio (aistudio.google.com)
                          </a>
                          에 방문하여 Google 계정으로 로그인 후 [Get API key] 버튼을 눌러 즉시 키를 생성할 수 있습니다.
                        </li>
                        <li>
                          <strong>개인키 직접 등록:</strong> 아래 입력란에 발급받은 키를 등록하여 브라우저에 저장하면, 서버의 공용 일일 트래픽 한계에 영향받지 않고 회원 고유의 속도로 무제한 분석이 실행됩니다. (브라우저 로컬 저장소에만 안전 보관됨)
                        </li>
                        <li>
                          <strong>영구 고정 방법 (서버 기본값):</strong> 프로젝트 루트 디렉토리의{' '}
                          <code className="bg-gray-100 px-1 py-0.5 rounded text-rose-600 font-mono text-[10px]">.env</code>{' '}
                          또는{' '}
                          <code className="bg-gray-100 px-1 py-0.5 rounded text-rose-600 font-mono text-[10px]">.env.example</code>{' '}
                          파일 내에 <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[10px]">GEMINI_API_KEY=내_발급_키</code> 형식으로 환경변수를 지정하면 수동 입력 없이 전 사용자에게도 항시 고성능 AI 모드가 가동됩니다.
                        </li>
                      </ol>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="password"
                      placeholder={
                        isApiKeySaved
                          ? '••••••••••••••••••••••••••••••••••••'
                          : 'Gemini API Key를 입력하세요 (AI_Studio에서 발급받은 AIzaSy...)'
                      }
                      value={customApiKey}
                      onChange={(e) => {
                        setCustomApiKey(e.target.value);
                        if (isApiKeySaved) setIsApiKeySaved(false);
                      }}
                      className="w-full text-xs sm:text-sm pl-8 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-gray-800 bg-white font-mono"
                    />
                    <div className="absolute left-2.5 top-3.5 text-indigo-500">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    </div>
                  </div>
                  {isApiKeySaved ? (
                    <button
                      type="button"
                      onClick={handleClearApiKey}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 hover:border-rose-300 transition shrink-0 cursor-pointer"
                    >
                      지우기
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSaveApiKey(customApiKey)}
                      className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shrink-0 shadow-xs cursor-pointer"
                    >
                      키 등록
                    </button>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px]">
                  <span className="text-gray-500 font-semibold flex items-center gap-1">
                    상태:{' '}
                    {isApiKeySaved ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                        ● 개인 API 키 등록완료 (우선 적용)
                      </span>
                    ) : (
                      <span className="text-indigo-600 font-bold flex items-center gap-0.5">
                        ● 공용 서버 API 키 또는 에뮬레이터 가동 (기본값)
                      </span>
                    )}
                  </span>
                  <span className="text-gray-400 font-normal">웹 브라우저 내부 보관됨</span>
                </div>
              </div>

              {/* Method A: Eum Link or Address Direct Input */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-indigo-600" />
                    토지이음 주소 또는 고유 링크 입력 <span className="text-gray-400 text-[10px] font-normal">(필수)</span>
                  </label>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded">
                    🗺️ 실시간 이음 파싱
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="예: 서울특별시 강남구 역삼동 700-1 또는 토지이음 복사 링크"
                  value={customerLink}
                  onChange={(e) => {
                    setCustomerLink(e.target.value);
                    if (selectedSampleId) setSelectedSampleId('');
                  }}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-gray-800 bg-white"
                />
              </div>

              {/* Method B: Drag and Drop Screenshot */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/80">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    토지이용계획확인서 규제도면 캡쳐 등록 <span className="text-gray-400 text-[10px] font-normal">(선택)</span>
                  </label>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => setImagePreview(null)}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold"
                    >
                      도면 제거
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />

                {!imagePreview ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                      isDragOver
                        ? 'border-indigo-500 bg-indigo-50/20'
                        : 'border-gray-200 hover:border-indigo-500/50 bg-white'
                    }`}
                  >
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-bounce" />
                    <p className="text-xs text-gray-700 font-medium">이곳에 규제지적도 캡쳐 이미지를 드래그하거나 클릭하여 업로드</p>
                    <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, JPEG 형식 지원 (자동 압축 및 최적화 판독 지원)</p>
                  </div>
                ) : (
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-white p-2">
                    <img
                      src={imagePreview}
                      alt="Uploaded land regulation"
                      className="max-h-40 mx-auto object-contain rounded"
                    />
                    <div className="text-center text-[10px] text-emerald-600 font-bold mt-1.5 flex items-center justify-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      도면 이미지 등록 완료 (AI 시각 판독 활성화)
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex items-start gap-2.5 text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="whitespace-pre-wrap leading-relaxed">{error}</p>
                </div>
              )}

              {/* High-visibility colored Regulatory Review Trigger Button */}
              <button
                type="button"
                disabled={isLoading}
                onClick={runAnalysis}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:bg-gray-300 text-white font-bold rounded-xl text-xs sm:text-sm transition duration-150 flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-500/10 cursor-pointer text-center"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span className="font-semibold text-white">{loadingStep}</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>8대 관계법규 종합 필터링 및 조서 검토 실행</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Information Help Panel (Full Width for mobile & sequential flow) */}
            <div className="w-full bg-slate-50/40 p-5 rounded-xl border border-slate-100 flex flex-col justify-between gap-5">
              <div className="space-y-4">
                {/* 1. Predefined Sample Lands */}
                <div>
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    🚀 원클릭 시뮬레이션용 샘플 필지
                  </h3>
                  <div className="space-y-2">
                    {SAMPLE_LANDS.map((land) => {
                      const isSelected = selectedSampleId === land.id;
                      return (
                        <div
                          key={land.id}
                          onClick={() => handleSelectSample(land.id)}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer relative ${
                            isSelected
                              ? 'bg-indigo-50/60 border-indigo-300 shadow-xs'
                              : 'bg-white border-gray-250/60 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                              isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {land.baselineFAR}%
                            </span>
                            <span className="text-[10px] text-[#8D7B68] font-semibold">{land.areaSize}㎡</span>
                          </div>
                          <p className="text-[11.5px] font-bold text-gray-800 mt-1 truncate">
                            {land.address}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                            {land.zoning}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Recent Analysis History */}
                <div className="pt-2 border-t border-gray-150/50">
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-[#5F7161]" />
                      📂 최근 검토 이력 ({historyList.length})
                    </h3>
                  </div>

                  {historyList.length === 0 ? (
                    <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                      <p className="text-[11px] text-gray-400 italic">검토 완료한 필지가 아직 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {historyList.map((rec) => (
                        <div
                          key={rec.id}
                          onClick={() => onLoadHistory?.(rec)}
                          className="group p-2.5 rounded-xl border border-gray-250/60 bg-white text-left transition hover:bg-gray-50 hover:border-gray-300 cursor-pointer relative"
                        >
                          <div className="flex justify-between items-center gap-1">
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {rec.regulatoryAnalysis.baselineFAR}%
                            </span>
                            <span className="text-[9px] text-[#A89F94] font-medium font-mono">{rec.timestamp.split(' ').slice(1).join(' ')}</span>
                          </div>
                          <p className="text-[11px] font-bold text-gray-800 mt-1 truncate" title={rec.address}>
                            {rec.address}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                            {rec.zoning}
                          </p>

                          <button
                            onClick={(e) => onDeleteHistory?.(rec.id, e)}
                            className="absolute right-2.5 bottom-2 opacity-0 group-hover:opacity-100 hover:text-red-650 text-gray-400 hover:bg-red-50 p-1 rounded transition duration-150 cursor-pointer bg-white border border-gray-100"
                            title="이력 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Standard Process Info */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-[11px] text-gray-500 leading-relaxed space-y-1">
                <span className="font-bold text-gray-700 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  신속 검토 및 법정 주차 비율 규제 안내
                </span>
                <p>
                  인허가 및 사업성 검토 이력은 로컬에 안전하게 저장됩니다. 주차대수 산정 기준 및 지하층/포디움 주차 비율 설정은 <strong>Step 3: 계획안 개요</strong>에서 직접 변경하실 수 있습니다.
                </p>
              </div>
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
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAnalysisResult(null)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold text-white transition flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  기획안 수정 및 재검토
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-1 border border-gray-700"
                >
                  <RefreshCw className="w-3 h-3" />
                  새 대지 (전체 초기화)
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
