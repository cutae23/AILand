/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Step1Regulatory from './components/Step1Regulatory';
import Step2Relaxation from './components/Step2Relaxation';
import Step3Scenario from './components/Step3Scenario';
import Step4Report from './components/Step4Report';
import { LandRegulatoryAnalysis, FARRelaxationResult, HistoryRecord } from './types';
import { MapPin, Building2, HelpCircle, CheckCircle, Sliders, FileText, ChevronRight, Calculator, User, Compass, ServerCrash, History, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Scroll to top when activeStep changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  }, [activeStep]);
  
  // App-wide state sharing logic between the steps - starting fresh
  const [regulatoryAnalysis, setRegulatoryAnalysis] = useState<LandRegulatoryAnalysis | null>(null);

  const [relaxationResult, setRelaxationResult] = useState<FARRelaxationResult | null>(null);

  const [scenarioResult, setScenarioResult] = useState<any | null>(null);

  // Step 1 inputs state - empty start
  const [step1Inputs, setStep1Inputs] = useState<{
    selectedSampleId: string;
    customerLink: string;
    imagePreview: string | null;
    usageScaleList: any[];
  } | null>({
    selectedSampleId: '',
    customerLink: '',
    imagePreview: null,
    usageScaleList: [
      { id: '1', usage: '공동주택 (다세대 / 아파트)', scale: '지상 5층, 연면적 약 1,500㎡ 규모' }
    ]
  });

  // History states with persistence
  const [historyList, setHistoryList] = useState<HistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem('archi_planner_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load history', e);
      return [];
    }
  });

  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  // Save history to localstorage
  useEffect(() => {
    try {
      localStorage.setItem('archi_planner_history', JSON.stringify(historyList));
    } catch (e) {
      console.error('Failed to save history', e);
    }
  }, [historyList]);

  // Synchronize active history record changes
  useEffect(() => {
    if (!activeHistoryId) return;
    setHistoryList(prev => prev.map(rec => {
      if (rec.id === activeHistoryId) {
        return {
          ...rec,
          regulatoryAnalysis: regulatoryAnalysis || rec.regulatoryAnalysis,
          relaxationResult: relaxationResult,
          scenarioResult: scenarioResult,
          step1Inputs: step1Inputs
        };
      }
      return rec;
    }));
  }, [regulatoryAnalysis, relaxationResult, scenarioResult, step1Inputs, activeHistoryId]);

  const [showSaveToast, setShowSaveToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowSaveToast(true);
    setTimeout(() => {
      setShowSaveToast(false);
    }, 2500);
  };

  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([
    {
      role: 'assistant',
      content: '반갑습니다! 분석하고자 하시는 토지의 정보를 입력해 주세요. 토지이음 링크를 연동하거나 필지 지번 주소를 입력해주시면 신속하게 8대 법정 규제 검토 조서 및 사업성 분석을 진행해 드리겠습니다.'
    }
  ]);

  const handleAnalysisComplete = (analysis: LandRegulatoryAnalysis) => {
    setRegulatoryAnalysis(analysis);
    const initialRelaxation: FARRelaxationResult = {
      finalFAR: analysis.baselineFAR,
      breakdown: {
        base: analysis.baselineFAR,
        donation: 0,
        openSpace: 0,
        eco: 0,
        rental: 0
      },
      explanation: '기본 용적률 상태 수지표입니다.'
    };
    setRelaxationResult(initialRelaxation);
    setScenarioResult(null);

    // Auto add to history list
    const newId = Date.now().toString();
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const nowStr = formatter.format(new Date());

    const newRecord: HistoryRecord = {
      id: newId,
      timestamp: nowStr,
      address: analysis.address,
      zoning: analysis.zoning,
      regulatoryAnalysis: analysis,
      relaxationResult: initialRelaxation,
      scenarioResult: null,
      step1Inputs: step1Inputs
    };

    setHistoryList(prev => [newRecord, ...prev]);
    setActiveHistoryId(newId);
    triggerToast('새로운 검토 내역이 이력에 자동 등록되었습니다.');
  };

  const loadHistoryRecord = (record: HistoryRecord) => {
    setRegulatoryAnalysis(record.regulatoryAnalysis);
    setRelaxationResult(record.relaxationResult);
    setScenarioResult(record.scenarioResult);
    setStep1Inputs(record.step1Inputs);
    setActiveHistoryId(record.id);
    setActiveStep(1); // Return to step 1 to view details
    triggerToast(`"${record.address.split(' ').slice(1, 4).join(' ')}" 분석 내역을 불러왔습니다.`);
  };

  const deleteHistoryRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('이 검토 내역을 삭제하시겠습니까?')) {
      setHistoryList(prev => prev.filter(rec => rec.id !== id));
      if (activeHistoryId === id) {
        setActiveHistoryId(null);
      }
      triggerToast('검토 내역이 삭제되었습니다.');
    }
  };

  const handleRelaxationComplete = (result: FARRelaxationResult) => {
    setRelaxationResult(result);
  };

  return (
    <div className="flex min-h-screen bg-[#F7F5F2] text-[#3E362E] font-sans overflow-x-hidden" id="app-root">
      
      {/* LEFT SIDEBAR: Project Control & Step navigation */}
      <aside className="w-80 bg-white border-r border-[#E5E2DD] hidden md:flex flex-col flex-shrink-0 print:hidden" id="sidebar">
        <div className="p-8">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 bg-[#5F7161] rounded-lg flex items-center justify-center text-white font-bold font-serif shadow-sm">
              T
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-[#2C251F]" id="branding-title">토지개발 시뮬레이터</h1>
              <p className="text-[10px] text-[#A89F94] uppercase tracking-wider font-medium">ArchiPlanner Pro</p>
            </div>
          </div>
          
          <nav className="space-y-6">
            {/* Step 1 button */}
            <button
              onClick={() => {
                triggerToast('Step 1 규제 검토 데이터가 실시간 저장되었습니다.');
                setActiveStep(1);
              }}
              className="w-full text-left focus:outline-none group"
            >
              <div className={`flex items-center gap-4 transition duration-200 ${
                activeStep === 1 ? 'text-[#5F7161] font-semibold' : 'text-[#A89F94] hover:text-[#3E362E]'
              }`}>
                <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs transition font-serif ${
                  activeStep === 1 ? 'border-[#5F7161] bg-[#5F7161]/5 font-bold' : 'border-[#D1CEC8]'
                }`}>
                  01
                </span>
                <div className="flex flex-col">
                  <span className="text-xs tracking-wide font-bold">해당필지 규제검토</span>
                  <span className="text-[10px] text-gray-400 font-normal">Step 1: 토지이음 연동</span>
                </div>
                {regulatoryAnalysis && (
                  <CheckCircle className="w-4 h-4 text-emerald-600 ml-auto" />
                )}
              </div>
            </button>

            {/* Step 2 button */}
            <button
              onClick={() => {
                triggerToast('Step 2 인센티브 완화 수치가 실시간 저장되었습니다.');
                setActiveStep(2);
              }}
              className="w-full text-left focus:outline-none group"
            >
              <div className={`flex items-center gap-4 transition duration-200 ${
                activeStep === 2 ? 'text-[#5F7161] font-semibold' : 'text-[#A89F94] hover:text-[#3E362E]'
              }`}>
                <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs transition font-serif ${
                  activeStep === 2 ? 'border-[#5F7161] bg-[#5F7161]/5 font-bold' : 'border-[#D1CEC8]'
                }`}>
                  02
                </span>
                <div className="flex flex-col">
                  <span className="text-xs tracking-wide font-bold">인센티브 가능여부</span>
                  <span className="text-[10px] text-gray-400 font-normal">Step 2: 인센티브 완화</span>
                </div>
                {relaxationResult && relaxationResult.finalFAR > (regulatoryAnalysis?.baselineFAR || 200) && (
                  <CheckCircle className="w-4 h-4 text-emerald-600 ml-auto" />
                )}
              </div>
            </button>

            {/* Step 3 button */}
            <button
              onClick={() => {
                triggerToast('Step 3 상품 기획 구성 배치가 실시간 저장되었습니다.');
                setActiveStep(3);
              }}
              className="w-full text-left focus:outline-none group"
            >
              <div className={`flex items-center gap-4 transition duration-200 ${
                activeStep === 3 ? 'text-[#5F7161] font-semibold' : 'text-[#A89F94] hover:text-[#3E362E]'
              }`}>
                <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs transition font-serif ${
                  activeStep === 3 ? 'border-[#5F7161] bg-[#5F7161]/5 font-bold' : 'border-[#D1CEC8]'
                }`}>
                  03
                </span>
                <div className="flex flex-col">
                  <span className="text-xs tracking-wide font-bold">계획안 개요</span>
                  <span className="text-[10px] text-gray-400 font-normal">Step 3: 상품 기획 및 배치</span>
                </div>
              </div>
            </button>

            {/* Step 4 button */}
            <button
              onClick={() => {
                triggerToast('Step 4 재무 수지 수치표가 실시간 저장되었습니다.');
                setActiveStep(4);
              }}
              className="w-full text-left focus:outline-none group"
            >
              <div className={`flex items-center gap-4 transition duration-200 ${
                activeStep === 4 ? 'text-[#5F7161] font-semibold' : 'text-[#A89F94] hover:text-[#3E362E]'
              }`}>
                <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs transition font-serif ${
                  activeStep === 4 ? 'border-[#5F7161] bg-[#5F7161]/5 font-bold' : 'border-[#D1CEC8]'
                }`}>
                  04
                </span>
                <div className="flex flex-col">
                  <span className="text-xs tracking-wide font-bold">사업성분석</span>
                  <span className="text-[10px] text-gray-400 font-normal">Step 4: 재무 시뮬레이션</span>
                </div>
              </div>
            </button>

            {/* Step 5 button */}
            <button
              onClick={() => {
                triggerToast('종합 개발 분석 보고서 발급 단계로 이동했습니다.');
                setActiveStep(5);
              }}
              className="w-full text-left focus:outline-none group"
            >
              <div className={`flex items-center gap-4 transition duration-200 ${
                activeStep === 5 ? 'text-[#5F7161] font-semibold' : 'text-[#A89F94] hover:text-[#3E362E]'
              }`}>
                <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs transition font-serif ${
                  activeStep === 5 ? 'border-[#5F7161] bg-[#5F7161]/5 font-bold' : 'border-[#D1CEC8]'
                }`}>
                  05
                </span>
                <div className="flex flex-col">
                  <span className="text-xs tracking-wide font-bold">종합보고서</span>
                  <span className="text-[10px] text-gray-400 font-normal">Step 5: PDF 발급 및 평가</span>
                </div>
                {scenarioResult && (
                  <CheckCircle className="w-4 h-4 text-emerald-600 ml-auto" />
                )}
              </div>
            </button>
          </nav>
        </div>

        {/* Review History Panel */}
        <div className="flex-1 overflow-y-auto px-8 py-4 border-t border-b border-gray-150/60 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-widest text-[#A89F94] font-bold flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[#5F7161]" />
              검토 이력 ({historyList.length})
            </h3>
            {historyList.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('모든 검토 이력을 삭제하시겠습니까?')) {
                    setHistoryList([]);
                    setActiveHistoryId(null);
                    triggerToast('모든 검토 이력이 삭제되었습니다.');
                  }
                }}
                className="text-[9px] text-red-500 hover:text-red-700 font-semibold cursor-pointer"
              >
                전체 삭제
              </button>
            )}
          </div>

          {historyList.length === 0 ? (
            <div className="text-[11px] text-[#A89F94] italic leading-relaxed py-2">
              최근 분석한 토지 검토 이력이 없습니다. Step 1에서 분석을 완료하면 이력에 자동 저장됩니다.
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {historyList.map(rec => {
                const isActive = rec.id === activeHistoryId;
                return (
                  <div
                    key={rec.id}
                    onClick={() => loadHistoryRecord(rec)}
                    className={`group p-2.5 rounded-xl border text-left transition cursor-pointer relative ${
                      isActive
                        ? 'bg-emerald-50/55 border-emerald-200 shadow-xs'
                        : 'bg-[#FCFAF7] border-gray-150 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                        isActive ? 'bg-[#5F7161] text-white' : 'bg-gray-200/80 text-gray-600'
                      }`}>
                        {rec.regulatoryAnalysis.baselineFAR}%
                      </span>
                      <span className="text-[9px] text-[#A89F94] font-medium font-mono">
                        {rec.timestamp.split(' ').slice(1).join(' ')}
                      </span>
                    </div>
                    <p className={`text-[11.5px] font-bold mt-1.5 truncate ${
                      isActive ? 'text-emerald-950' : 'text-gray-800'
                    }`} title={rec.address}>
                      {rec.address.replace('서울특별시', '서울').replace('경기도', '경기')}
                    </p>
                    <p className="text-[10px] text-[#8D7B68] truncate mt-0.5">
                      {rec.zoning}
                    </p>
                    
                    <button
                      onClick={(e) => deleteHistoryRecord(rec.id, e)}
                      className="absolute right-2.5 bottom-2 opacity-0 group-hover:opacity-100 hover:text-red-650 text-gray-400 hover:bg-red-50 p-1 rounded transition duration-150 cursor-pointer bg-white border border-gray-100"
                      title="이력 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dynamic Project Quick Status Footer inside Sidebar */}
        <div className="mt-auto p-6 border-t border-[#F2F0ED] bg-[#FCFAF7]">
          <h3 className="text-[10px] uppercase tracking-widest text-[#A89F94] font-bold mb-3 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-[#5F7161]" />
            활성 필지 요약
          </h3>
          {regulatoryAnalysis ? (
            <div className="space-y-1.5 text-xs">
              <p className="font-semibold text-gray-900 truncate" title={regulatoryAnalysis.address}>
                {regulatoryAnalysis.address.split(' ').slice(1, 4).join(' ')}
              </p>
              <p className="text-[11px] text-[#8D7B68] truncate">{regulatoryAnalysis.zoning}</p>
              <div className="flex justify-between text-[11px] text-gray-450 pt-1">
                <span>대지 면적:</span>
                <span className="font-semibold text-gray-800">{regulatoryAnalysis.areaSize.toLocaleString()}㎡</span>
              </div>
              <div className="flex justify-between text-[11px] text-gray-450">
                <span>기준 용적률:</span>
                <span className="font-semibold text-gray-800">{regulatoryAnalysis.baselineFAR}%</span>
              </div>
              {relaxationResult && (
                <div className="flex justify-between text-[11px] text-indigo-650 font-semibold pt-1 border-t border-dashed border-gray-200 mt-1">
                  <span>적용 완화 용적률:</span>
                  <span>{relaxationResult.finalFAR}%</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-[#A89F94] leading-relaxed italic">
              임의의 토지 데이터가 아직 로드되지 않았습니다. Step 1에서 가상 대지나 이미지 증명을 등록해 보세요.
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        
        {/* Header toolbar */}
        <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 print:hidden" id="header-toolbar">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-widest uppercase text-[#8D7B68]">
                ArchiPlanner Step 0{activeStep}
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                실시간 연산 가동 중
              </span>
            </div>
            
            {activeStep === 1 && (
              <>
                <h1 className="text-2xl sm:text-3xl font-serif text-[#2C251F] font-bold">대지 지번 및 기본 법규 검토</h1>
                <p className="text-sm text-[#8D7B68] mt-1">토지이음 플랫폼 링크 또는 고도 규제 도안 캡쳐본을 인공지능에 전임 분석시킵니다.</p>
              </>
            )}

            {activeStep === 2 && (
              <>
                <h1 className="text-2xl sm:text-3xl font-serif text-[#2C251F] font-bold">지자체 인센티브 기반 용적률 조정</h1>
                <p className="text-sm text-[#8D7B68] mt-1">공개공지 정원 식재 확보, 친환경 신재생 등급, 청년/장기전세 임대공여 지분을 추가 검토합니다.</p>
              </>
            )}

            {activeStep === 3 && (
              <>
                <h1 className="text-2xl sm:text-3xl font-serif text-[#2C251F] font-bold">계획안 개요 (건축 기획 및 상품 구성)</h1>
                <p className="text-sm text-[#8D7B68] mt-1">공동주택/오피스텔 등 용도별 기획 면적과 세대수를 배분하고 공용 면적 및 법정 주차대수 정합성을 설계합니다.</p>
              </>
            )}

            {activeStep === 4 && (
              <>
                <h1 className="text-2xl sm:text-3xl font-serif text-[#2C251F] font-bold">사업성 분석 (재무 수지 및 시뮬레이션)</h1>
                <p className="text-sm text-[#8D7B68] mt-1">토지 매입비와 건축 예산, 실거래 기준 AI 추천 분양/임대가를 바탕으로 영업이익과 ROI/IRR/BEP를 분석합니다.</p>
              </>
            )}

            {activeStep === 5 && (
              <>
                <h1 className="text-2xl sm:text-3xl font-serif text-[#2C251F] font-bold">종합 개발 사업 타당성 평가서</h1>
                <p className="text-sm text-[#8D7B68] mt-1">대지 규제 및 완화 조례, 상품 구성과 20개년 현금 수지 시뮬레이션 결과를 합산한 최종 보고서입니다.</p>
              </>
            )}
          </div>

          {/* Quick-toggle mobile helper */}
          <div className="flex md:hidden items-center gap-2 bg-white p-1 rounded-xl border border-[#E5E2DD] w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => {
                triggerToast('Step 1 규제 검토 데이터가 실시간 저장되었습니다.');
                setActiveStep(1);
              }}
              className={`flex-1 sm:flex-initial text-xs px-3.5 py-2 rounded-lg font-medium transition ${
                activeStep === 1 ? 'bg-[#5F7161] text-white' : 'text-[#8D7B68] hover:bg-gray-50'
              }`}
            >
              1. 규제검토
            </button>
            <button
              onClick={() => {
                triggerToast('Step 2 인센티브 완화 수치가 실시간 저장되었습니다.');
                setActiveStep(2);
              }}
              className={`flex-1 sm:flex-initial text-xs px-3.5 py-2 rounded-lg font-medium transition ${
                activeStep === 2 ? 'bg-[#5F7161] text-white' : 'text-[#8D7B68] hover:bg-gray-50'
              }`}
            >
              2. 인센티브완화
            </button>
            <button
              onClick={() => {
                triggerToast('Step 3 상품 기획 구성 배치가 실시간 저장되었습니다.');
                setActiveStep(3);
              }}
              className={`flex-1 sm:flex-initial text-xs px-3.5 py-2 rounded-lg font-medium transition ${
                activeStep === 3 ? 'bg-[#5F7161] text-white' : 'text-[#8D7B68] hover:bg-gray-50'
              }`}
            >
              3. 계획안개요
            </button>
            <button
              onClick={() => {
                triggerToast('Step 4 재무 수지 수치표가 실시간 저장되었습니다.');
                setActiveStep(4);
              }}
              className={`flex-1 sm:flex-initial text-xs px-3.5 py-2 rounded-lg font-medium transition ${
                activeStep === 4 ? 'bg-[#5F7161] text-white' : 'text-[#8D7B68] hover:bg-gray-50'
              }`}
            >
              4. 사업성분석
            </button>
            <button
              onClick={() => {
                triggerToast('종합 개발 분석 보고서 발급 단계로 이동했습니다.');
                setActiveStep(5);
              }}
              className={`flex-1 sm:flex-initial text-xs px-3.5 py-2 rounded-lg font-medium transition ${
                activeStep === 5 ? 'bg-[#5F7161] text-white' : 'text-[#8D7B68] hover:bg-gray-50'
              }`}
            >
              5. 종합보고서
            </button>
          </div>
        </header>

        {/* MAIN STEP SCREEN CONDITIONAL ROUTING */}
        <div className="flex-1" id="step-renderer-root">
          {activeStep === 1 && (
            <Step1Regulatory
              onAnalysisComplete={handleAnalysisComplete}
              savedAnalysis={regulatoryAnalysis}
              chatHistory={chatHistory}
              setChatHistory={setChatHistory}
              savedInputs={step1Inputs}
              onSaveInputs={setStep1Inputs}
              historyList={historyList}
              onLoadHistory={loadHistoryRecord}
              onDeleteHistory={deleteHistoryRecord}
            />
          )}

          {activeStep === 2 && (
            <Step2Relaxation
              currentLand={regulatoryAnalysis}
              onCalculationComplete={handleRelaxationComplete}
              savedResult={relaxationResult}
            />
          )}

          {activeStep === 3 && (
            <Step3Scenario
              currentLand={regulatoryAnalysis}
              currentRelaxation={relaxationResult}
              onScenarioChange={setScenarioResult}
              activeStep={3}
              savedScenario={scenarioResult}
            />
          )}

          {activeStep === 4 && (
            <Step3Scenario
              currentLand={regulatoryAnalysis}
              currentRelaxation={relaxationResult}
              onScenarioChange={setScenarioResult}
              activeStep={4}
              savedScenario={scenarioResult}
            />
          )}

          {activeStep === 5 && (
            <Step4Report
              currentLand={regulatoryAnalysis}
              currentRelaxation={relaxationResult}
              currentScenario={scenarioResult}
              chatHistory={chatHistory}
            />
          )}
        </div>

        {/* BOTTOM STEP CONTROLS BAR */}
        <footer className="mt-8 pt-6 border-t border-[#E5E2DD] flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
          <div className="text-xs text-[#8D7B68] flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#5F7161]" />
            <span>건축법규 및 부동산 인허가 사전검토 엔진 v1.4</span>
          </div>

          <div className="flex items-center gap-3">
            {activeStep > 1 && (
              <button
                type="button"
                onClick={() => {
                  triggerToast('이전 단계로 이동하며 변경사항이 안전하게 저장되었습니다.');
                  setActiveStep((prev) => (prev - 1) as any);
                }}
                className="px-5 py-2.5 bg-white border border-[#E5E2DD] hover:bg-gray-50 text-xs font-semibold rounded-xl text-gray-700 transition"
              >
                이전 단계로
              </button>
            )}

            {/* Manual Save Button */}
            <button
              type="button"
              onClick={() => {
                triggerToast(`현재 Step ${activeStep}의 기획안 상태가 성공적으로 임시 저장되었습니다.`);
              }}
              className="px-4 py-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle className="w-4 h-4" />
              <span>현재 단계 저장</span>
            </button>

            {activeStep < 5 ? (
              <button
                type="button"
                onClick={() => {
                  triggerToast(`Step ${activeStep}의 데이터가 안전하게 저장되어 다음 단계를 진행합니다.`);
                  setActiveStep((prev) => (prev + 1) as any);
                }}
                className="px-6 py-2.5 bg-[#5F7161] hover:bg-[#4E5E50] text-white text-xs font-semibold rounded-xl tracking-wide transition flex items-center gap-1.5 shadow-sm"
              >
                <span>저장 후 다음 단계 진행</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  // Reset scenario helper
                  if (confirm('모든 입력치를 초기화하고 Step 1부터 다시 규제를 재검토하시겠습니까?')) {
                    setRegulatoryAnalysis(null);
                    setRelaxationResult(null);
                    setScenarioResult(null);
                    setStep1Inputs({
                      selectedSampleId: '',
                      customerLink: '',
                      imagePreview: null,
                      usageScaleList: [
                        { id: '1', usage: '공동주택 (다세대 / 아파트)', scale: '지상 5층, 연면적 약 1,500㎡ 규모' }
                      ]
                    });
                    setChatHistory([
                      {
                        role: 'assistant',
                        content: '반갑습니다! 이 부지의 8대 법정 규제 검토 조서 작성을 완료했습니다. 도시계획 조례, 지구단위계획 의무 준수 한계, 지상 용도별 가용 분석(근생활/오피스텔 등 복합개발성), 주차장 대수 산정 등 추가로 궁금하신 구체적인 법적 사항을 무엇이든 질문해 주세요!'
                      }
                    ]);
                    setActiveStep(1);
                  }
                }}
                className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl tracking-wide transition shadow-sm"
              >
                새로운 부지 검토하기
              </button>
            )}
          </div>
        </footer>

      </main>

      {/* Toast Notification */}
      <AnimatePresence>
        {showSaveToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-xl border border-gray-800"
          >
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 animate-bounce" />
            <div className="flex flex-col">
              <span className="text-xs font-bold">기획 데이터 안전하게 저장됨</span>
              <span className="text-[10px] text-gray-400">{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
