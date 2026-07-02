/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { LandRegulatoryAnalysis, FARRelaxationResult } from '../types';
import { Printer, FileText, CheckCircle, AlertTriangle, Info, TrendingUp, Building2, MapPin, Layers, Table, Coins, CircleDollarSign, MessageSquare } from 'lucide-react';

interface Step4ReportProps {
  currentLand: LandRegulatoryAnalysis | null;
  currentRelaxation: FARRelaxationResult | null;
  currentScenario: any | null;
  chatHistory?: Array<{ role: 'user' | 'assistant', content: string }>;
}

export default function Step4Report({ 
  currentLand, 
  currentRelaxation, 
  currentScenario,
  chatHistory = []
}: Step4ReportProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrintPDF = () => {
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      alert("💡 [PDF 출력 꿀팁]\n\n현재 AI Studio 미리보기용 프레임(Iframe) 안에서 작업 중이십니다.\n\n가장 깨끗한 비율로 완벽하게 PDF를 인쇄/저장하시려면, 우측 상단의 'Open in New Tab' (새 탭에서 열기) 아이콘을 클릭하여 새 창으로 여신 후 다시 인쇄 버튼을 눌러주십시오!");
    }
    window.print();
  };

  // If Step 1 is not complete, we can't show a report
  if (!currentLand) {
    return (
      <div className="h-96 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-white shadow-sm">
        <FileText className="w-12 h-12 text-[#A89F94] mb-3 animate-pulse" />
        <h3 className="text-base font-bold text-gray-800">종합 진단 보고서 대기 중</h3>
        <p className="text-xs text-[#8D7B68] mt-2 max-w-md leading-relaxed">
          Step 1 (규제 검토) 및 Step 3 (공동주택 개발 시나리오) 기획이 작성되어야 통합 보고서가 완성됩니다.
          이전 단계로 돌아가 대지 분석과 공급 계획을 완료해 주세요.
        </p>
      </div>
    );
  }

  const { address, zoning, baselineFAR, baselineBCR, areaSize, regulations, developmentPotential, recommendations, heightLimit } = currentLand;
  const finalFAR = currentRelaxation ? currentRelaxation.finalFAR : baselineFAR;
  const breakdown = currentRelaxation ? currentRelaxation.breakdown : null;

  // Scenario figures
  const hasScenario = !!currentScenario && !!currentScenario.result;
  const sInputs = hasScenario ? currentScenario.inputs : null;
  const sResult = hasScenario ? currentScenario.result : null;

  const todayStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-6">
      
      {/* EXPORT CONTROL PANEL (HIDDEN IN PRINT) */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E2DD] shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Printer className="w-4.5 h-4.5 text-[#5F7161]" />
              종합 개발 사업 타당성 평가 보고서 발급
            </h3>
            <p className="text-xs text-[#8D7B68] mt-1">
              대지 규제, 용적률 완화 인센티브, 세대 공급 설계 및 20개년 수지 분석 결과를 PDF로 영구 소장하십시오.
            </p>
          </div>
          <button
            onClick={handlePrintPDF}
            className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>종합 보고서 PDF로 저장 (인쇄)</span>
          </button>
        </div>

        {/* Iframe detection hint */}
        <div className="bg-[#FAF9F5] border border-[#EDDBC7]/60 rounded-xl p-3.5 text-[11px] text-amber-800 flex items-start gap-2.5">
          <Info className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold block mb-0.5">💡 PDF 저장 & 인쇄 성공 가이드</span>
            현재 화면이 AI Studio 개발 프레임(Iframe) 내부에서 미리보기 중인 경우, 브라우저가 출력 대상을 잘못 파악하거나 빈 화면이 나올 수 있습니다. <br />
            100% 깔끔한 비율의 PDF 출력을 위해, 우측 상단의 <strong className="text-amber-900">"새 탭에서 열기 (Open in New Tab)"</strong> 아이콘을 눌러 새 창에서 실행한 뒤 출력해 주시기 바랍니다. (인쇄 대화상자에서 <strong className="text-amber-900">"배경 그래픽 인쇄"</strong>를 체크하시면 차트와 색상이 완벽하게 출력됩니다)
          </div>
        </div>
      </div>

      {/* PRINT AREA CONTAINER WITH STYLISH DESIGN PAIRING */}
      <div 
        ref={printAreaRef}
        className="bg-white p-8 sm:p-12 md:p-16 rounded-3xl border border-[#E5E2DD] shadow-sm print:shadow-none print:border-none print:p-0 font-sans text-slate-800 space-y-10 print:bg-white"
        id="pdf-print-area"
      >
        
        {/* REPORT CSS STYLES FOR PERFECT PRINT FORMATTING */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 15mm 12mm 15mm 12mm !important;
            }
            html, body {
              background-color: white !important;
              color: #1a1a1a !important;
              font-family: 'Inter', sans-serif !important;
              width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #app-root {
              display: block !important;
              background-color: white !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
            }
            aside, header, footer, .print\\:hidden {
              display: none !important;
            }
            main {
              display: block !important;
              padding: 0 !important;
              margin: 0 !important;
              max-width: 100% !important;
              width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
            }
            #pdf-print-area {
              display: block !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
              background: transparent !important;
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              overflow: visible !important;
            }
            .page-break {
              page-break-before: always !important;
              break-inside: avoid !important;
            }
            /* Eliminate all scrollbars and force full visibility */
            .overflow-x-auto, .overflow-auto, [class*="overflow-"] {
              overflow: visible !important;
              overflow-x: visible !important;
              overflow-y: visible !important;
            }
            /* Table wrap adjustments */
            table {
              width: 100% !important;
              table-layout: auto !important;
              border-collapse: collapse !important;
            }
            th, td {
              word-break: keep-all !important;
              overflow-wrap: break-word !important;
              white-space: normal !important;
              font-size: 10px !important;
              padding: 4px 6px !important;
            }
            /* Specific text wraps */
            .font-mono {
              word-break: break-all !important;
              white-space: normal !important;
            }
          }
        `}} />

        {/* PAGE 1: COVER PAGE (EXECUTIVE PORTFOLIO) */}
        <div className="border-b-4 border-[#2C251F] pb-10 space-y-6">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-[#8D7B68] tracking-widest uppercase bg-[#FAF9F5] border border-[#EDDBC7]/60 px-3 py-1.5 rounded">
              ARCHIPLANNER PROFESSIONAL REPORT
            </span>
            <span className="text-xs text-gray-400 font-mono">발급일자: {todayStr}</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-serif text-[#2C251F] font-black leading-tight tracking-tight">
              토지개발 인허가 법률 규제 및<br />
              종합 사업 타당성 분석 평가서
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
              본 감정서형 진단서는 {address} 일대 대지의 기본 국토 계획 이용 법령 규제, 지자체 장려 건축 조례(기부채납/에너지 등)에 따른 용적률 완화 가치, 공동주택 공급 기획안에 근거하여 산정된 종합 현금 수지(IRR 및 손익분기 회수기간) 검토 결과를 기술합니다.
            </p>
          </div>

          {/* BASIC LAND IDENTIFICATION */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-150">
            <div>
              <span className="text-[10px] text-gray-450 uppercase tracking-widest font-bold block">소재지 지번</span>
              <span className="font-bold text-sm text-[#2C251F] block mt-1">{address}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-450 uppercase tracking-widest font-bold block">용도지역 지구</span>
              <span className="font-bold text-sm text-[#2C251F] block mt-1">{zoning}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-450 uppercase tracking-widest font-bold block">대지 실평수 / 면적</span>
              <span className="font-bold text-sm text-[#2C251F] block mt-1">
                {(areaSize * 0.3025).toFixed(1)}평 / {areaSize.toLocaleString()} ㎡
              </span>
            </div>
          </div>
        </div>

        {/* QUICK KEY-METRICS EXECUTIVE DASHBOARD */}
        {hasScenario && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#2C251F] tracking-widest uppercase flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#5F7161]" />
              사업 기획 핵심 타당성 요약 지표 (Executive Summary)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#FAF9F5] p-5 rounded-2xl border border-[#EDDBC7]/60 text-center">
                <span className="text-[10px] text-gray-450 block">장래 내부수익률 (IRR)</span>
                <span className={`text-xl font-extrabold block mt-1 ${sResult.irr >= 8 ? 'text-[#5F7161]' : 'text-rose-600'}`}>
                  {sResult.irr}%
                </span>
                <span className="text-[9px] text-gray-400 block mt-0.5">
                  {sResult.irr >= 15 ? '우수 (S등급)' : sResult.irr >= 8 ? '양호 (A/B등급)' : '미흡/조달 위험'}
                </span>
              </div>
              <div className="bg-[#FAF9F5] p-5 rounded-2xl border border-[#EDDBC7]/60 text-center">
                <span className="text-[10px] text-gray-450 block">손익분기 분양률 (BEP)</span>
                <span className="text-xl font-extrabold text-indigo-650 block mt-1">
                  {sResult.financials.breakEvenRatio}%
                </span>
                <span className="text-[9px] text-gray-400 block mt-0.5">
                  {sResult.financials.breakEvenRatio <= 60 ? '최상 안전' : sResult.financials.breakEvenRatio <= 80 ? '양호' : '미분양 고위험'}
                </span>
              </div>
              <div className="bg-[#FAF9F5] p-5 rounded-2xl border border-[#EDDBC7]/60 text-center">
                <span className="text-[10px] text-gray-450 block">원금 회수 전환년차</span>
                <span className="text-xl font-extrabold text-[#8D7B68] block mt-1">
                  {sResult.bepYear > 0 ? `${sResult.bepYear} 년차` : '미회수'}
                </span>
                <span className="text-[9px] text-gray-400 block mt-0.5">현금흐름 분기 시점</span>
              </div>
              <div className="bg-[#FAF9F5] p-5 rounded-2xl border border-[#EDDBC7]/60 text-center">
                <span className="text-[10px] text-gray-450 block">예상 개발 영업이익</span>
                <span className={`text-xl font-extrabold block mt-1 ${sResult.financials.operatingProfit >= 0 ? 'text-[#5F7161]' : 'text-rose-600'}`}>
                  {sResult.financials.operatingProfit} 억원
                </span>
                <span className="text-[9px] text-gray-400 block mt-0.5">투자대비 ROI: {sResult.financials.roi}%</span>
              </div>
            </div>
          </div>
        )}

        {/* PAGE BREAK AND STEP 1 / 2 INFO */}
        <div className="page-break space-y-8 pt-6">
          <div className="border-b border-[#E5E2DD] pb-3">
            <h2 className="text-lg font-serif font-bold text-[#2C251F] flex items-center gap-2">
              <span className="text-xs bg-[#5F7161] text-white px-2 py-0.5 rounded-full font-mono">STEP 01</span>
              토지이음 연동 국토이용 법정 규제 검토 결과
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">용적률 및 건축 배치 한계치</h4>
              <table className="w-full text-xs text-left">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <th className="py-2.5 text-gray-400 font-medium">기준 용적률 (FAR)</th>
                    <td className="py-2.5 font-bold text-gray-800 text-right">{baselineFAR}%</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <th className="py-2.5 text-gray-400 font-medium">기준 건폐율 (BCR)</th>
                    <td className="py-2.5 font-bold text-gray-800 text-right">{baselineBCR}%</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <th className="py-2.5 text-gray-400 font-medium">높이 한계 규제</th>
                    <td className="py-2.5 text-xs text-gray-600 text-right max-w-xs truncate">{heightLimit}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">AI 종합 개발 잠재성 의견</h4>
              <p className="text-xs leading-relaxed text-gray-600 bg-slate-50 p-4 rounded-2xl border border-gray-100">
                {developmentPotential}
              </p>
            </div>
          </div>

          {/* LAW REGULATORY CHECKLIST */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">8대 법정 규제 저촉 여부 체크리스트</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {regulations.map((reg, idx) => (
                <div key={idx} className="p-3 bg-[#FAF9F5] rounded-xl border border-gray-100 flex items-start gap-2.5">
                  {reg.status === 'safe' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : reg.status === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-gray-800 text-[11px] block">{reg.title}</span>
                    <p className="text-[10px] text-gray-500 mt-1 leading-normal">{reg.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* STEP 2: FAR RELAXATION INCENTIVES */}
        <div className="space-y-6 pt-6">
          <div className="border-b border-[#E5E2DD] pb-3">
            <h2 className="text-lg font-serif font-bold text-[#2C251F] flex items-center gap-2">
              <span className="text-xs bg-[#5F7161] text-white px-2 py-0.5 rounded-full font-mono">STEP 02</span>
              지자체 조례 기반 용적률 완화 가치 수혜 요약
            </h2>
          </div>

          {breakdown ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-150 text-gray-400">
                      <th className="py-2 text-left">완화 유발 항목</th>
                      <th className="py-2 text-right">증가 용적률</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-2.5 text-gray-600">용도지역 기준 기본 용적률</td>
                      <td className="py-2.5 text-right font-semibold text-gray-800">{breakdown.base}%</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2.5 text-gray-600">공공기여 기부채납 인센티브 (합산)</td>
                      <td className="py-2.5 text-right font-semibold text-emerald-650">+{breakdown.donation}%</td>
                    </tr>
                    {breakdown.donationLand !== undefined && breakdown.donationLand > 0 && (
                      <tr className="border-b border-gray-100 text-[11px] bg-slate-50/40">
                        <td className="py-1.5 pl-4 text-gray-500">└ 토지 기부채납 (+{breakdown.donatedLandArea}㎡)</td>
                        <td className="py-1.5 text-right font-medium text-emerald-600">+{breakdown.donationLand}%</td>
                      </tr>
                    )}
                    {breakdown.donationBuilding !== undefined && breakdown.donationBuilding > 0 && (
                      <tr className="border-b border-gray-100 text-[11px] bg-slate-50/40">
                        <td className="py-1.5 pl-4 text-gray-500">└ 건물 기부채납 (+{breakdown.donatedBuildingArea}㎡, {breakdown.facilityType === 'community' ? '주민공동' : breakdown.facilityType === 'childcare' ? '어린이집' : breakdown.facilityType === 'library' ? '도서관' : '청년창업'})</td>
                        <td className="py-1.5 text-right font-medium text-emerald-600">+{breakdown.donationBuilding}%</td>
                      </tr>
                    )}
                    {breakdown.donationCash !== undefined && breakdown.donationCash > 0 && (
                      <tr className="border-b border-gray-100 text-[11px] bg-slate-50/40">
                        <td className="py-1.5 pl-4 text-gray-500">└ 현금 기부채납 (+{breakdown.donatedCashAmount}억원)</td>
                        <td className="py-1.5 text-right font-medium text-emerald-600">+{breakdown.donationCash}%</td>
                      </tr>
                    )}
                    <tr className="border-b border-gray-100">
                      <td className="py-2.5 text-gray-600">공개공지 조경 정원 확보</td>
                      <td className="py-2.5 text-right font-semibold text-emerald-650">+{breakdown.openSpace}%</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2.5 text-gray-600">녹색친환경 및 신재생에너지인증</td>
                      <td className="py-2.5 text-right font-semibold text-emerald-650">+{breakdown.eco}%</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2.5 text-gray-600">청년주택 및 의무임대 기여 지분</td>
                      <td className="py-2.5 text-right font-semibold text-emerald-650">+{breakdown.rental}%</td>
                    </tr>
                    {breakdown.hotel !== undefined && breakdown.hotel > 0 && (
                      <tr className="border-b border-gray-100">
                        <td className="py-2.5 text-gray-600">관광숙박시설 완화 인센티브</td>
                        <td className="py-2.5 text-right font-semibold text-emerald-650">+{breakdown.hotel}%</td>
                      </tr>
                    )}
                    {breakdown.specialArchitecturalZone !== undefined && breakdown.specialArchitecturalZone > 0 && (
                      <tr className="border-b border-gray-100">
                        <td className="py-2.5 text-gray-600">특별건축구역 지정 가점</td>
                        <td className="py-2.5 text-right font-semibold text-emerald-650">+{breakdown.specialArchitecturalZone}%</td>
                      </tr>
                    )}
                    {breakdown.openGreenSpace !== undefined && breakdown.openGreenSpace > 0 && (
                      <tr className="border-b border-gray-100">
                        <td className="py-2.5 text-gray-600">개방형 녹지 생태도심 기여</td>
                        <td className="py-2.5 text-right font-semibold text-emerald-650">+{breakdown.openGreenSpace}%</td>
                      </tr>
                    )}
                    {breakdown.creativeDesign !== undefined && breakdown.creativeDesign > 0 && (
                      <tr className="border-b border-gray-100">
                        <td className="py-2.5 text-gray-600">창의혁신 디자인 설계 가점</td>
                        <td className="py-2.5 text-right font-semibold text-emerald-650">+{breakdown.creativeDesign}%</td>
                      </tr>
                    )}
                    <tr className="font-bold border-t border-gray-200 text-sm">
                      <td className="py-3 text-gray-900">최종 인허가 완화 용적률 (FAR)</td>
                      <td className="py-3 text-right text-indigo-600">{finalFAR}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="bg-[#FAF9F5] p-5 rounded-2xl border border-gray-150 space-y-2 text-xs text-slate-600">
                <span className="font-bold text-[#2C251F] block text-[11px]">인센티브 완화 해석 소견</span>
                <p className="leading-relaxed text-[11px]">
                  {currentRelaxation ? currentRelaxation.explanation : '기준 용적률 상태이며 인센티브 수혜 조치 조건을 적용할 수 있습니다.'}
                </p>
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 mt-2 text-[10px]">
                  <span className="text-gray-450 font-medium">추가 확보 연면적 가치:</span>
                  <span className="font-bold text-[#5F7161]">
                    +{((areaSize * (finalFAR - baselineFAR) / 100) * 0.3025).toFixed(1)} 평
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs italic text-gray-400">Step 2 인센티브 조건이 적용되지 않았습니다. 기본 용적률 {baselineFAR}%가 적용됩니다.</p>
          )}
        </div>

        {/* PAGE 3: HOUSING PRODUCT LAYOUT & FINANCIAL FEASIBILITY */}
        <div className="page-break space-y-8 pt-6">
          <div className="border-b border-[#E5E2DD] pb-3">
            <h2 className="text-lg font-serif font-bold text-[#2C251F] flex items-center gap-2">
              <span className="text-xs bg-[#5F7161] text-white px-2 py-0.5 rounded-full font-mono">STEP 03</span>
              공동주택 세대 구성 설계 및 10개년 영업 수지표
            </h2>
          </div>

          {hasScenario ? (
            <div className="space-y-6">
              
              {/* Product breakdown table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">주거 및 복합 시설별 공급 설계 목록</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-450 font-medium">
                        <th className="py-2">시설 구분</th>
                        <th className="py-2">단위 평형(평)</th>
                        <th className="py-2 text-center">세대/호실수</th>
                        <th className="py-2 text-right">공급 단가(억원)</th>
                        <th className="py-2 text-right">합산 매출액(억원)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sResult.allocatedUnits.map((u: any) => (
                        <tr key={u.id} className="border-b border-gray-100 text-gray-700">
                          <td className="py-2.5 font-semibold text-gray-900">{u.name}</td>
                          <td className="py-2.5">{u.pyung}평 ({(u.sizeM2).toFixed(1)}㎡)</td>
                          <td className="py-2.5 text-center font-bold">{u.count} 세대/실</td>
                          <td className="py-2.5 text-right">{(u.unitSalesPrice).toFixed(2)} 억</td>
                          <td className="py-2.5 text-right font-bold text-slate-900">{(u.totalSalesPrice).toFixed(2)} 억</td>
                        </tr>
                      ))}
                      <tr className="font-bold text-sm bg-slate-50 border-t border-gray-200">
                        <td className="py-3 px-2 text-gray-900" colSpan={2}>기획 합계</td>
                        <td className="py-3 text-center">{sResult.totalAllocatedUnits} 세대/실</td>
                        <td className="py-3"></td>
                        <td className="py-3 text-right text-[#5F7161]">{sResult.financials.totalSalesRevenue.toFixed(2)} 억</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Costs Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">프로젝트 원가 및 투자 사업비 명세</h4>
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">1. 대지 토지비 (실매입가)</td>
                        <td className="py-2 text-right font-bold text-gray-800">{sResult.financials.landCost} 억원</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">2. 설계 및 건축 토목 공사비</td>
                        <td className="py-2 text-right font-bold text-gray-800">{sResult.financials.constructionCost} 억원</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">3. 제세공과금 및 기타 부대비용 ({sInputs.otherCostsRatio}%)</td>
                        <td className="py-2 text-right font-bold text-gray-800">{sResult.financials.otherCosts} 억원</td>
                      </tr>
                      <tr className="font-bold border-t border-gray-200 text-sm bg-gray-50/50">
                        <td className="py-2.5 px-2 text-gray-900">총 투자 비용 (Total Project Cost)</td>
                        <td className="py-2.5 text-right text-rose-600 font-black">{sResult.financials.totalProjectCost} 억원</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">수익 수지 및 마진 계산 (10년 기준)</h4>
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">기본 주거/복합 분양 총매출</td>
                        <td className="py-2 text-right font-bold text-gray-800">{sResult.financials.totalSalesRevenue} 억원</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">임대 보증금(회수 가능) 누적액</td>
                        <td className="py-2 text-right font-bold text-gray-800">{sResult.financials.totalLeaseDeposits} 억원</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">10개년 누적 월세 수익 합산</td>
                        <td className="py-2 text-right font-bold text-[#5F7161]">{(sResult.financials.totalAnnualRent * 10).toFixed(2)} 억원</td>
                      </tr>
                      <tr className="font-bold border-t border-gray-200 text-sm bg-emerald-50/20">
                        <td className="py-2.5 px-2 text-gray-900">수지 총매출가치 (Inflows)</td>
                        <td className="py-2.5 text-right text-[#5F7161] font-black">{sResult.financials.totalRevenues} 억원</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <p className="text-xs italic text-gray-400">공동주택 세배 배분 시뮬레이션 결과가 존재하지 않습니다. 먼저 Step 3에서 세대 배분 수를 입력하십시오.</p>
          )}
        </div>

        {/* CASH FLOW TIMELINE TABLE */}
        {hasScenario && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">연도별 세부 현금 흐름 투영표 (Timeline Cash Flows)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left border border-gray-100">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200 text-gray-400 font-semibold">
                    <th className="p-2">구분</th>
                    <th className="p-2">0년차 (원가)</th>
                    <th className="p-2">1년차 (공사)</th>
                    <th className="p-2">2년차 (완공)</th>
                    <th className="p-2 text-[#5F7161]">3년차 (운영)</th>
                    <th className="p-2">4년차</th>
                    <th className="p-2">5년차</th>
                    <th className="p-2 text-indigo-600">6년~20년 (연간)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 text-gray-700">
                    <td className="p-2 font-medium bg-slate-50 text-gray-900">단년 현금흐름</td>
                    <td className="p-2 font-bold text-rose-600">{sResult.cashFlows[0]} 억</td>
                    <td className="p-2 font-semibold text-rose-500">{sResult.cashFlows[1]} 억</td>
                    <td className="p-2 font-semibold text-emerald-650">+{sResult.cashFlows[2]} 억</td>
                    <td className="p-2 font-bold text-emerald-600">+{sResult.cashFlows[3]} 억</td>
                    <td className="p-2 text-emerald-600">+{sResult.cashFlows[4]} 억</td>
                    <td className="p-2 text-emerald-600">+{sResult.cashFlows[5]} 억</td>
                    <td className="p-2 font-medium text-emerald-600">+{sResult.cashFlows[6]} 억 / 년</td>
                  </tr>
                  <tr className="bg-[#FAF9F5]/30 text-gray-700">
                    <td className="p-2 font-medium bg-slate-50 text-gray-900">누적 현금흐름</td>
                    <td className="p-2 font-bold text-rose-600">{sResult.cumulativeCashFlow[0]} 억</td>
                    <td className="p-2 text-rose-600">{sResult.cumulativeCashFlow[1]} 억</td>
                    <td className="p-2 text-rose-600">{sResult.cumulativeCashFlow[2]} 억</td>
                    <td className="p-2 font-bold text-emerald-600">+{sResult.cumulativeCashFlow[3]} 억</td>
                    <td className="p-2 text-emerald-600">+{sResult.cumulativeCashFlow[4]} 억</td>
                    <td className="p-2 text-emerald-600">+{sResult.cumulativeCashFlow[5]} 억</td>
                    <td className="p-2 font-bold text-emerald-600">+{sResult.cumulativeCashFlow[20]} 억 (최종)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-400 italic">
              * 현실적 현금흐름 반영: 0년차에 대지비가 지출되고, 1~2년차 공사기간 동안 건축비 50% 분할 지출 및 분양 중도금 30%/40%가 회수됩니다. 3년차 완공과 동시에 입주 잔금(30%) 및 임대보증금 전액, 1년차 월세가 회수되며 BEP를 신속히 달성하게 설계되었습니다.
            </p>
          </div>
        )}

        {/* PAGE 4: DETAILED EXPLANATORY DIAGNOSTIC MANUAL */}
        <div className="page-break space-y-6 pt-6">
          <div className="border-b border-[#E5E2DD] pb-3">
            <h2 className="text-lg font-serif font-bold text-[#2C251F] flex items-center gap-2">
              <span className="text-xs bg-[#5F7161] text-white px-2 py-0.5 rounded-full font-mono">STANDARDS</span>
              개발 사업성 전문 진단 가이드라인 및 평가 기준
            </h2>
          </div>

          <div className="bg-[#FAF9F5] p-6 rounded-2xl border border-[#EDDBC7]/60 space-y-5 text-xs text-slate-700 leading-relaxed">
            
            <div className="space-y-2">
              <h4 className="font-bold text-[#2C251F] text-sm flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-[#5F7161] rounded-full inline-block"></span>
                1. 장래 내부수익률 (IRR, Internal Rate of Return) 평가 원리
              </h4>
              <p>
                내부수익률(IRR)은 프로젝트 전체 생애주기 동안 발생하는 지출과 수입 현금흐름의 순현재가치(NPV)를 0으로 만드는 할인율을 뜻합니다. 즉, <strong>매입부터 20년 운영 후 매각 시점까지의 연평균 실질 복리 수익률</strong>입니다.
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-1 text-[11px] text-gray-600">
                <li><strong className="text-emerald-750">15% 이상 (S등급):</strong> 자본 구조가 매우 우수하며, 금융 비용을 크게 상회하여 최상의 PF 자금 조달 메리트 발생.</li>
                <li><strong className="text-amber-650">8% ~ 15% (A/B등급):</strong> 정상적인 도심 부동산 개발 프로젝트의 중위 시세 마진 안전선 확보.</li>
                <li><strong className="text-rose-600">8% 미만 (C등급 이하):</strong> 최근의 높은 PF 대출 금리(6~8%) 감안 시 금리 변동성에 취약하고 적자 전환 부담이 큼.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-[#2C251F] text-sm flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-[#5F7161] rounded-full inline-block"></span>
                2. 손익분기 분양률 (BEP 안전성, Break-Even Sales Ratio) 평가 원리
              </h4>
              <p>
                총 개발 투입 원가(토지비+공사비+기타)를 전액 회수하기 위해 채워야 하는 <strong>최소 누적 분양 매출액의 비중</strong>입니다.
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-1 text-[11px] text-gray-600">
                <li><strong className="text-emerald-750">60% 이하 (안전):</strong> 전체 기획 세대 중 과반만 선분양 완료해도 도산 위험이 없어 안전성 점수가 매우 높음.</li>
                <li><strong className="text-rose-600">80% 이상 (위험):</strong> 80% 이상 고분양을 달성해야만 손익을 면하므로 미분양 발생 시 재앙적인 재무 피해 발생.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-[#2C251F] text-sm flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-[#5F7161] rounded-full inline-block"></span>
                3. 핵심 해명: "BEP 회수 기간은 빠른데, 왜 BEP 안전성 점수가 낮은가요?"
              </h4>
              <p className="text-[#2C251F] bg-white p-4 rounded-xl border border-gray-100 font-medium">
                <strong>"자금 회수 속도(유동성)"와 "미분양 시 견뎌내는 체력(마진폭)"은 서로 다른 재무 차원입니다.</strong>
              </p>
              <p className="text-gray-650 text-[11px] leading-normal">
                현금흐름 시뮬레이션 상 2~3년차 만에 BEP(누적현금흐름 (+)전환)를 완수할 수 있는 이유는 <strong>선분양 제도의 중도금/잔금 회수와 임대 보증금의 대거 조기 유입</strong> 덕분입니다. 그러나 만약 총 원가율이 높아 총 매출의 85% 이상 분양을 성사시켜야 본전을 건진다면(손익분기 분양률 85%), 완판에 성공할 경우에는 돈을 빨리 회수하더라도, <strong>시장 변동으로 70% 분양에 머무를 경우 그대로 적자로 추락하게 됩니다.</strong>
                <br />
                따라서 본 시뮬레이터의 <strong>'BEP 안전성' 지표는 보수적인 개발 안전 장치를 위해 '자금 회수 년차'보다 '손익분기 분양률(원가 마진율)'에 훨씬 더 큰 가중치를 두어 위험을 판정</strong>하므로 안전성 점수가 낮게 책정될 수 있습니다.
              </p>
            </div>
          </div>

          <div className="border-t border-[#E5E2DD] pt-6 flex justify-between items-center text-xs text-gray-400 print:hidden">
            <span>본 보고서는 인공지능 기계학습 엔진을 통해 검토되었으므로 실제 인허가 신청 시 지자체 사전조사 및 현직 건축사 자문이 병행되어야 합니다.</span>
            <span className="font-bold text-[#2C251F]">ArchiPlanner Pro</span>
          </div>
        </div>

        {/* PAGE 5: APPENDIX - ALL DETAILED UNFILTERED RAW ANALYSIS DATA */}
        <div className="page-break space-y-6 pt-6">
          <div className="border-b border-[#E5E2DD] pb-3">
            <h2 className="text-lg font-serif font-bold text-[#2C251F] flex items-center gap-2">
              <span className="text-xs bg-[#5F7161] text-white px-2 py-0.5 rounded-full font-mono">APPENDIX</span>
              부록: 인허가 분석 및 시나리오 기획 원본 데이터 상세 명세 (Appendix)
            </h2>
          </div>

          <div className="space-y-6 text-xs text-slate-700">
            
            {/* APPENDIX A: REGULATORY DETAILS */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-850 text-sm border-b border-gray-150 pb-1.5 flex items-center gap-1.5">
                <Table className="w-4 h-4 text-[#5F7161]" />
                <span>[부록 A] 대지 법적 규제 검토 상세 원본 내역 (토지이음 연동)</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border border-gray-150 text-[11px] leading-relaxed">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 font-semibold">
                      <th className="p-2 w-1/4">법령 저촉 검토명</th>
                      <th className="p-2 w-24">판정</th>
                      <th className="p-2">상세 원본 규정 및 인허가 가치 가이드라인</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regulations.map((reg, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="p-2.5 font-bold text-gray-900 bg-slate-50/50">{reg.title}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            reg.status === 'safe' ? 'bg-emerald-50 text-emerald-700' :
                            reg.status === 'warning' ? 'bg-amber-50 text-amber-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {reg.status === 'safe' ? '통과 (Safe)' :
                             reg.status === 'warning' ? '주의 (Warning)' :
                             '정보 (Info)'}
                          </span>
                        </td>
                        <td className="p-2.5 text-gray-600 font-mono text-[10.5px] leading-relaxed">{reg.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* APPENDIX B: RECOMMENDATIONS */}
            <div className="space-y-3 page-break pt-6">
              <h3 className="font-bold text-gray-850 text-sm border-b border-gray-150 pb-1.5 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#5F7161]" />
                <span>[부록 B] 건축사 사전 심의 조치 제언 (Architecture Recommendations)</span>
              </h3>
              <div className="bg-[#FAF9F5] p-5 rounded-2xl border border-gray-150 space-y-2">
                <p className="font-semibold text-[11px] text-[#2C251F]">
                  분석 대지에 대하여 인공지능 모델 및 유관 조례 데이터를 기반으로 도출된 최종 제언 리스트입니다. (요약 없이 제공)
                </p>
                <ul className="space-y-2 mt-2">
                  {recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-[11px] leading-relaxed">
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-gray-700 font-medium">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* APPENDIX C: FAR RELAXATION CALCULATOR INPUTS */}
            <div className="space-y-3 pt-6">
              <h3 className="font-bold text-gray-850 text-sm border-b border-gray-150 pb-1.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#5F7161]" />
                <span>[부록 C] 용적률 완화 산출 공식 및 조례 수치 상세 (FAR Relaxation Calculations)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-150 rounded-2xl overflow-hidden">
                  <div className="bg-slate-50 p-2.5 border-b border-gray-150 font-bold text-gray-800">조례 인센티브 가중치 내역</div>
                  <table className="w-full text-[11px]">
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <th className="p-2 text-left text-gray-500 font-medium">기준 용적률 (Base FAR)</th>
                        <td className="p-2 text-right font-mono font-bold text-slate-950">{breakdown?.base ?? baselineFAR}%</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <th className="p-2 text-left text-gray-500 font-medium">기부채납 총 공공기여 완화 (Public Contribution Total)</th>
                        <td className="p-2 text-right font-mono text-emerald-700">+{breakdown?.donation ?? 0}%</td>
                      </tr>
                      {breakdown?.donationLand !== undefined && breakdown.donationLand > 0 && (
                        <tr className="border-b border-gray-100 bg-slate-50/30">
                          <th className="p-2 pl-4 text-left text-gray-400 font-normal">└ 토지 기부채납 (Land Contribution)</th>
                          <td className="p-2 text-right font-mono text-emerald-600">+{breakdown.donationLand}%</td>
                        </tr>
                      )}
                      {breakdown?.donationBuilding !== undefined && breakdown.donationBuilding > 0 && (
                        <tr className="border-b border-gray-100 bg-slate-50/30">
                          <th className="p-2 pl-4 text-left text-gray-400 font-normal">└ 건물 기부채납 (Building: {breakdown.donatedBuildingArea}㎡)</th>
                          <td className="p-2 text-right font-mono text-emerald-600">+{breakdown.donationBuilding}%</td>
                        </tr>
                      )}
                      {breakdown?.donationCash !== undefined && breakdown.donationCash > 0 && (
                        <tr className="border-b border-gray-100 bg-slate-50/30">
                          <th className="p-2 pl-4 text-left text-gray-400 font-normal">└ 현금 기부채납 (Cash: {breakdown.donatedCashAmount}억)</th>
                          <td className="p-2 text-right font-mono text-emerald-600">+{breakdown.donationCash}%</td>
                        </tr>
                      )}
                      <tr className="border-b border-gray-100">
                        <th className="p-2 text-left text-gray-500 font-medium">공개공지 확보 완화 (Public Open Space)</th>
                        <td className="p-2 text-right font-mono text-emerald-700">+{breakdown?.openSpace ?? 0}%</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <th className="p-2 text-left text-gray-500 font-medium">친환경 및 에너지 등급 완화 (Eco Certification)</th>
                        <td className="p-2 text-right font-mono text-emerald-700">+{breakdown?.eco ?? 0}%</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <th className="p-2 text-left text-gray-500 font-medium">청년/의무 임대 기여 완화 (Rental Housing)</th>
                        <td className="p-2 text-right font-mono text-emerald-700">+{breakdown?.rental ?? 0}%</td>
                      </tr>
                      {breakdown?.hotel !== undefined && breakdown.hotel > 0 && (
                        <tr className="border-b border-gray-100">
                          <th className="p-2 text-left text-gray-500 font-medium">관광숙박시설 도입 특례 (Tourism Hotel)</th>
                          <td className="p-2 text-right font-mono text-emerald-700">+{breakdown.hotel}%</td>
                        </tr>
                      )}
                      {breakdown?.specialArchitecturalZone !== undefined && breakdown.specialArchitecturalZone > 0 && (
                        <tr className="border-b border-gray-100">
                          <th className="p-2 text-left text-gray-500 font-medium">특별건축구역 지정 가점 (Special Architectural)</th>
                          <td className="p-2 text-right font-mono text-emerald-700">+{breakdown.specialArchitecturalZone}%</td>
                        </tr>
                      )}
                      {breakdown?.openGreenSpace !== undefined && breakdown.openGreenSpace > 0 && (
                        <tr className="border-b border-gray-100">
                          <th className="p-2 text-left text-gray-500 font-medium">개방형 녹지 생태도심 기여 (Open Green Space)</th>
                          <td className="p-2 text-right font-mono text-emerald-700">+{breakdown.openGreenSpace}%</td>
                        </tr>
                      )}
                      {breakdown?.creativeDesign !== undefined && breakdown.creativeDesign > 0 && (
                        <tr className="border-b border-gray-100">
                          <th className="p-2 text-left text-gray-500 font-medium">창의혁신 디자인 설계 가점 (Creative Design)</th>
                          <td className="p-2 text-right font-mono text-emerald-700">+{breakdown.creativeDesign}%</td>
                        </tr>
                      )}
                      <tr className="bg-slate-50 font-bold">
                        <th className="p-2 text-left text-gray-900 text-xs">최종 승인 용적률 (Final FAR)</th>
                        <td className="p-2 text-right font-mono text-indigo-650 text-xs">{finalFAR}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-gray-150 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-[11px] block text-gray-800">지자체 완화 수식 가이드</span>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      완화 용적률 산출은 『국토의 계획 및 이용에 관한 법률 시행령』 및 각 지자체 건축 조례 완화 공식을 따릅니다. 
                      특히 기부채납 계수(1.5x ~ 3.0x), 친환경 녹색등급 가중치, 공공 기여 비율이 정비례하여 적용되었습니다.
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-100 mt-2 text-[10px]">
                    <span className="text-gray-450 block font-medium">용적률 상승에 따른 순 연면적 이득량:</span>
                    <span className="font-bold text-xs text-[#5F7161] block mt-1">
                      {((areaSize * (finalFAR - baselineFAR) / 100) * 0.3025).toFixed(1)} 평 ({(areaSize * (finalFAR - baselineFAR) / 100).toLocaleString()} ㎡)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* APPENDIX D: COMPLEX PRODUCT CONFIG DETAILS */}
            {hasScenario && sInputs && (
              <div className="space-y-4 page-break pt-6">
                <h3 className="font-bold text-gray-850 text-sm border-b border-gray-150 pb-1.5 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-[#5F7161]" />
                  <span>[부록 D] 타당성 분석 기획설계 및 수지 산출 입력값 원본 (Product Spec Inputs)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* D-1: Core Financial Parameters */}
                  <div className="border border-gray-150 rounded-2xl overflow-hidden">
                    <div className="bg-slate-50 p-2.5 border-b border-gray-150 font-bold text-gray-800">개발 기초 사업비 산출 조건</div>
                    <table className="w-full text-[11px]">
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <th className="p-2 text-left text-gray-500 font-medium">대지 면적 (Land Size)</th>
                          <td className="p-2 text-right font-mono">{(sInputs.landArea * 0.3025).toFixed(1)}평 ({sInputs.landArea.toLocaleString()}㎡)</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <th className="p-2 text-left text-gray-500 font-medium">목표 적용 건폐율 (Applied BCR)</th>
                          <td className="p-2 text-right font-mono">{sInputs.appliedBCR}%</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <th className="p-2 text-left text-gray-500 font-medium">목표 적용 용적률 (Applied FAR)</th>
                          <td className="p-2 text-right font-mono">{sInputs.appliedFAR}%</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <th className="p-2 text-left text-gray-500 font-medium">기획 전용률 (Net Area Ratio)</th>
                          <td className="p-2 text-right font-mono">{sInputs.netRatio}%</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <th className="p-2 text-left text-gray-500 font-medium">대지 매입금액 (Land Cost)</th>
                          <td className="p-2 text-right font-mono font-bold text-indigo-700">{sInputs.landPurchasePrice} 억원</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <th className="p-2 text-left text-gray-500 font-medium">평당 건축 토목 표준 공사비</th>
                          <td className="p-2 text-right font-mono font-bold text-rose-700">{(sInputs.constructionCostPerPyung / 10000).toFixed(1)} 천만원 / 평</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <th className="p-2 text-left text-gray-500 font-medium">기타 부대 제비용 간접 요율</th>
                          <td className="p-2 text-right font-mono">{sInputs.otherCostsRatio}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* D-2: Residential Product Distribution */}
                  <div className="border border-gray-150 rounded-2xl overflow-hidden">
                    <div className="bg-slate-50 p-2.5 border-b border-gray-150 font-bold text-gray-800">공동주택 세대 구성 조건</div>
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-gray-150 text-gray-500 font-semibold bg-slate-50/50">
                          <th className="p-2 text-left">주거 타입</th>
                          <th className="p-2 text-center">전용면적</th>
                          <th className="p-2 text-right">평당 분양가</th>
                          <th className="p-2 text-right">배분율</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sInputs.aptConfigs && sInputs.aptConfigs.map((apt: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="p-2 font-bold text-slate-800">{apt.name}</td>
                            <td className="p-2 text-center font-mono">{apt.pyung}평</td>
                            <td className="p-2 text-right font-mono">{(apt.salesPricePerPyung / 10000).toFixed(1)} 천만원</td>
                            <td className="p-2 text-right font-mono font-semibold text-indigo-650">{apt.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>

                {/* D-3: Commercial and Alternative facilities if configured */}
                <div className="border border-gray-150 rounded-2xl overflow-hidden mt-4">
                  <div className="bg-slate-50 p-2.5 border-b border-gray-150 font-bold text-gray-800">복합 시설 및 대체 상품 구성 원본 내역 (오피스텔, 소형쇼핑몰, 호텔, 오피스 등)</div>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-gray-150 text-gray-500 font-semibold bg-slate-50/50">
                        <th className="p-2 text-left">시설 유형</th>
                        <th className="p-2">규모 / 계약 사항</th>
                        <th className="p-2 text-right">기본 분양가 (평당/실당)</th>
                        <th className="p-2 text-right">임대 보증금 / 월세 조건</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Officetels */}
                      {sInputs.officetelConfigs && sInputs.officetelConfigs.map((of: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="p-2 font-bold text-slate-800">오피스텔: {of.name}</td>
                          <td className="p-2 font-mono">전용 {of.pyung}평 / 배분율 {of.percentage}%</td>
                          <td className="p-2 text-right font-mono">{(of.salesPricePerPyung / 10000).toFixed(1)} 천만원</td>
                          <td className="p-2 text-right text-gray-400 font-mono">-</td>
                        </tr>
                      ))}

                      {/* Retail Mall */}
                      {sInputs.retailB1Area > 0 && (
                        <tr className="border-b border-gray-100">
                          <td className="p-2 font-bold text-slate-800">상업시설 (지하1층)</td>
                          <td className="p-2 font-mono">임대 전용률: {sInputs.retailNetRatio}% / 면적: {sInputs.retailB1Area}평</td>
                          <td className="p-2 text-right font-mono">{(sInputs.retailB1Price / 10000).toFixed(1)} 천만원</td>
                          <td className="p-2 text-right font-mono text-[#5F7161]">보증금 {sInputs.retailB1Deposit}억 / 월세 {sInputs.retailB1Rent}만</td>
                        </tr>
                      )}
                      {sInputs.retail1FArea > 0 && (
                        <tr className="border-b border-gray-100">
                          <td className="p-2 font-bold text-slate-800">상업시설 (지상1층)</td>
                          <td className="p-2 font-mono">임대 전용률: {sInputs.retailNetRatio}% / 면적: {sInputs.retail1FArea}평</td>
                          <td className="p-2 text-right font-mono">{(sInputs.retail1FPrice / 10000).toFixed(1)} 천만원</td>
                          <td className="p-2 text-right font-mono text-[#5F7161]">보증금 {sInputs.retail1FDeposit}억 / 월세 {sInputs.retail1FRent}만</td>
                        </tr>
                      )}
                      {sInputs.retail2FArea > 0 && (
                        <tr className="border-b border-gray-100">
                          <td className="p-2 font-bold text-slate-800">상업시설 (지상2층)</td>
                          <td className="p-2 font-mono">임대 전용률: {sInputs.retailNetRatio}% / 면적: {sInputs.retail2FArea}평</td>
                          <td className="p-2 text-right font-mono">{(sInputs.retail2FPrice / 10000).toFixed(1)} 천만원</td>
                          <td className="p-2 text-right font-mono text-[#5F7161]">보증금 {sInputs.retail2FDeposit}억 / 월세 {sInputs.retail2FRent}만</td>
                        </tr>
                      )}
                      {sInputs.retail3FArea > 0 && (
                        <tr className="border-b border-gray-100">
                          <td className="p-2 font-bold text-slate-800">상업시설 (지상3층)</td>
                          <td className="p-2 font-mono">임대 전용률: {sInputs.retailNetRatio}% / 면적: {sInputs.retail3FArea}평</td>
                          <td className="p-2 text-right font-mono">{(sInputs.retail3FPrice / 10000).toFixed(1)} 천만원</td>
                          <td className="p-2 text-right font-mono text-[#5F7161]">보증금 {sInputs.retail3FDeposit}억 / 월세 {sInputs.retail3FRent}만</td>
                        </tr>
                      )}

                      {/* Hotel */}
                      {sInputs.hotelRoomCount > 0 && (
                        <tr className="border-b border-gray-100">
                          <td className="p-2 font-bold text-slate-800">레지던스/호텔 (복합)</td>
                          <td className="p-2 font-mono">규모: {sInputs.hotelRoomCount}개 객실 / 실 면적: {sInputs.hotelRoomSizePyung}평</td>
                          <td className="p-2 text-right font-mono">{(sInputs.hotelPricePerPyung / 10000).toFixed(1)} 천만원</td>
                          <td className="p-2 text-right font-mono text-[#5F7161]">실 보증금 {sInputs.hotelDepositPerRoom}억 / 월세 {sInputs.hotelRentPerRoom}만</td>
                        </tr>
                      )}

                      {/* Office */}
                      {sInputs.officeArea > 0 && (
                        <tr className="border-b border-gray-100">
                          <td className="p-2 font-bold text-slate-800">업무 오피스 시설</td>
                          <td className="p-2 font-mono">임대 면적: {sInputs.officeArea}평 / 전용률: {sInputs.officeNetRatio}%</td>
                          <td className="p-2 text-right font-mono">{(sInputs.officePricePerPyung / 10000).toFixed(1)} 천만원</td>
                          <td className="p-2 text-right font-mono text-[#5F7161]">평 보증금 {sInputs.officeDepositPerPyung}만 / 평 임대료 {sInputs.officeRentPerPyung}만</td>
                        </tr>
                      )}

                      {/* Fallback if no commercial configured */}
                      {(!sInputs.officetelConfigs || sInputs.officetelConfigs.length === 0) &&
                       sInputs.retail1FArea === 0 && sInputs.hotelRoomCount === 0 && sInputs.officeArea === 0 && (
                        <tr>
                          <td className="p-3 text-center italic text-gray-400 font-mono text-[10px]" colSpan={4}>
                            * 설정된 오피스텔/상업/숙박/업무용 하이브리드 대체 시설 구성이 없습니다 (순수 공동주택 중심 기획).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* APPENDIX E: AI Q&A CONSULTATION LOGS */}
          <div className="space-y-4 page-break pt-6 border-t border-dashed border-gray-200">
            <h3 className="font-bold text-gray-850 text-sm border-b border-gray-150 pb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[#5F7161]" />
              <span>[부록 E] 인공지능(AI) 법률 및 인허가 규제 자문/질의응답 전문 기록 (AI Consultation Transcript)</span>
            </h3>

            <div className="bg-[#FAF9F5] p-5 rounded-2xl border border-gray-150 space-y-4">
              <p className="font-semibold text-[11px] text-[#2C251F]">
                인허가 검토 단계에서 사용자가 인공지능 자문 엔진과 질의응답한 원본 대화록 전체 내역입니다. (요약 없이 무수정 전문 수록)
              </p>

              {chatHistory.length <= 1 ? (
                <div className="text-center py-6 text-gray-400 italic text-[11px]">
                  * 기본 안내 메세지 외에 추가 진행된 사용자의 개별 질의응답 기록이 없습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {chatHistory.map((chat, idx) => (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-xl border text-[11px] leading-relaxed ${
                        chat.role === 'user' 
                          ? 'bg-slate-50 border-slate-200 text-slate-800' 
                          : 'bg-white border-gray-200 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2 font-bold text-[11.5px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${chat.role === 'user' ? 'bg-indigo-600' : 'bg-[#5F7161]'}`} />
                        <span>{chat.role === 'user' ? '👤 사용자 질문 (User Query)' : '🤖 인공지능 자문 답변 (AI Legal Consult)'}</span>
                      </div>
                      <div className="space-y-1.5 pl-3.5 border-l-2 border-gray-150 whitespace-pre-wrap font-sans">
                        {chat.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-[#E5E2DD] pt-6 flex justify-between items-center text-xs text-gray-400">
            <span>본 보고서는 인공지능 기계학습 엔진을 통해 검토되었으므로 실제 인허가 신청 시 지자체 사전조사 및 현직 건축사 자문이 병행되어야 합니다.</span>
            <span className="font-bold text-[#2C251F]">ArchiPlanner Pro</span>
          </div>
        </div>

      </div>
    </div>
  );
}
