/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Step1Regulatory from './components/Step1Regulatory';
import Step2Relaxation from './components/Step2Relaxation';
import Step3Scenario from './components/Step3Scenario';
import { LandRegulatoryAnalysis, FARRelaxationResult } from './types';
import { MapPin, Building2, HelpCircle, CheckCircle, Sliders, FileText, ChevronRight, Calculator, User, Compass, ServerCrash } from 'lucide-react';

export default function App() {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  
  // App-wide state sharing logic between the steps
  const [regulatoryAnalysis, setRegulatoryAnalysis] = useState<LandRegulatoryAnalysis | null>(null);
  const [relaxationResult, setRelaxationResult] = useState<FARRelaxationResult | null>(null);

  const handleAnalysisComplete = (analysis: LandRegulatoryAnalysis) => {
    setRegulatoryAnalysis(analysis);
    // Autofill an initial relaxation result so Step 3 has reasonable starting conditions immediately
    setRelaxationResult({
      finalFAR: analysis.baselineFAR,
      breakdown: {
        base: analysis.baselineFAR,
        donation: 0,
        openSpace: 0,
        eco: 0,
        rental: 0
      },
      explanation: '기본 용적률 상태 수지표입니다.'
    });
    // Move layout helper
  };

  const handleRelaxationComplete = (result: FARRelaxationResult) => {
    setRelaxationResult(result);
  };

  return (
    <div className="flex min-h-screen bg-[#F7F5F2] text-[#3E362E] font-sans overflow-x-hidden" id="app-root">
      
      {/* LEFT SIDEBAR: Project Control & Step navigation */}
      <aside className="w-80 bg-white border-r border-[#E5E2DD] hidden md:flex flex-col flex-shrink-0" id="sidebar">
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
              onClick={() => setActiveStep(1)}
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
                  <span className="text-xs tracking-wide">규제 법령 검토</span>
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
                // Friendly constraint: hint info but allow switching
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
                  <span className="text-xs tracking-wide">용적률 완화 시뮬</span>
                  <span className="text-[10px] text-gray-400 font-normal">Step 2: 인센티브 완화</span>
                </div>
                {relaxationResult && relaxationResult.finalFAR > (regulatoryAnalysis?.baselineFAR || 200) && (
                  <CheckCircle className="w-4 h-4 text-emerald-600 ml-auto" />
                )}
              </div>
            </button>

            {/* Step 3 button */}
            <button
              onClick={() => setActiveStep(3)}
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
                  <span className="text-xs tracking-wide">공동주택 시나리오</span>
                  <span className="text-[10px] text-gray-400 font-normal">Step 3: 세대배분 & 수지</span>
                </div>
              </div>
            </button>
          </nav>
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
        <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4" id="header-toolbar">
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
                <h1 className="text-2xl sm:text-3xl font-serif text-[#2C251F] font-bold">공동주택 세대 배분 & 예상 사업 수지선</h1>
                <p className="text-sm text-[#8D7B68] mt-1">지정 비율에 맞춘 세대수 배분 산출 및 평당 분양가를 감안한 토지사업 영업이익을 파악합니다.</p>
              </>
            )}
          </div>

          {/* Quick-toggle mobile helper */}
          <div className="flex md:hidden items-center gap-2 bg-white p-1 rounded-xl border border-[#E5E2DD] w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveStep(1)}
              className={`flex-1 sm:flex-initial text-xs px-3.5 py-2 rounded-lg font-medium transition ${
                activeStep === 1 ? 'bg-[#5F7161] text-white' : 'text-[#8D7B68] hover:bg-gray-50'
              }`}
            >
              1. 규제검토
            </button>
            <button
              onClick={() => setActiveStep(2)}
              className={`flex-1 sm:flex-initial text-xs px-3.5 py-2 rounded-lg font-medium transition ${
                activeStep === 2 ? 'bg-[#5F7161] text-white' : 'text-[#8D7B68] hover:bg-gray-50'
              }`}
            >
              2. 용적률완화
            </button>
            <button
              onClick={() => setActiveStep(3)}
              className={`flex-1 sm:flex-initial text-xs px-3.5 py-2 rounded-lg font-medium transition ${
                activeStep === 3 ? 'bg-[#5F7161] text-white' : 'text-[#8D7B68] hover:bg-gray-50'
              }`}
            >
              3. 개발시나리오
            </button>
          </div>
        </header>

        {/* MAIN STEP SCREEN CONDITIONAL ROUTING */}
        <div className="flex-1" id="step-renderer-root">
          {activeStep === 1 && (
            <Step1Regulatory
              onAnalysisComplete={handleAnalysisComplete}
              savedAnalysis={regulatoryAnalysis}
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
            />
          )}
        </div>

        {/* BOTTOM STEP CONTROLS BAR */}
        <footer className="mt-8 pt-6 border-t border-[#E5E2DD] flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xs text-[#8D7B68] flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#5F7161]" />
            <span>건축법규 및 부동산 인허가 사전검토 엔진 v1.4</span>
          </div>

          <div className="flex items-center gap-3">
            {activeStep > 1 && (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => (prev - 1) as any)}
                className="px-5 py-2.5 bg-white border border-[#E5E2DD] hover:bg-gray-50 text-xs font-semibold rounded-xl text-gray-700 transition"
              >
                이전 단계로
              </button>
            )}

            {activeStep < 3 ? (
              <button
                type="button"
                onClick={() => {
                  // Direct transition to next tab
                  setActiveStep((prev) => (prev + 1) as any);
                }}
                className="px-6 py-2.5 bg-[#5F7161] hover:bg-[#4E5E50] text-white text-xs font-semibold rounded-xl tracking-wide transition flex items-center gap-1.5 shadow-sm"
              >
                <span>다음 단계 진행</span>
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
    </div>
  );
}
