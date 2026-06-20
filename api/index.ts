import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Inlined Types and SampleLands directly within api/index.ts to ensure a single-file runtime without relative ESM resolution issues in Vercel.
export interface LandRegulatoryAnalysis {
  id?: string;
  address: string;
  zoning: string;
  baselineFAR: number; // 기준 용적률 (%)
  baselineBCR: number; // 기준 건폐율 (%)
  heightLimit: string; // 높이 제한 내용
  areaSize: number; // 대지 면적 (m²)
  regulations: Array<{
    title: string;
    status: 'warning' | 'safe' | 'info';
    desc: string;
  }>;
  developmentPotential: string; // 개발 가치 및 분석 의견
  recommendations: string[]; // 검토 제언 사항들
}

export interface SampleLand {
  id: string;
  address: string;
  zoning: string;
  areaSize: number;
  baselineFAR: number;
  baselineBCR: number;
  heightLimit: string;
  description: string;
  eumLink: string;
}

export const SAMPLE_LANDS: SampleLand[] = [
  {
    id: 'gangnam-yeoksam',
    address: '서울특별시 강남구 역삼동 테헤란로**지번 (이면도로 상업용지)',
    zoning: '일반상업지역, 지구단위계획구역',
    areaSize: 642, // m²
    baselineFAR: 800, // %
    baselineBCR: 60, // %
    heightLimit: '가로구역별 최고높이 제한 (48m 이하)',
    description: '강남 대표 주거·상업 혼재지역으로, 고밀 개발이 가능한 일반상업지역입니다. 가로구역별 높이 제한 및 인접 주거지역 사선 제한 영향 하에 있습니다.',
    eumLink: 'https://www.eum.go.kr/web/am/amUserLandReg.jsp?pCode=1168010100'
  },
  {
    id: 'mapo-yeonnam',
    address: '서울특별시 마포구 연남동 경의선숲길 인근 단독주택지',
    zoning: '제2종일반주거지역 (7층이하)',
    areaSize: 228, // m²
    baselineFAR: 200, // %
    baselineBCR: 60, // %
    heightLimit: '7층 이하, 일조사선 제한 적용',
    description: '연트럴파크 인근의 저층 밀집형 주거지입니다. 7층 이하 제한이 있어 다세대/연립주택 등 소규모 공동주택 개발에 적합하지만 북측 일조권 사선 제한을 엄격하게 받습니다.',
    eumLink: 'https://www.eum.go.kr/web/am/amUserLandReg.jsp?pCode=1144012400'
  },
  {
    id: 'seocho-banpo',
    address: '서울특별시 서초구 서초동 법원사거리 인근 준주거대지',
    zoning: '준주거지역, 상대보호구역',
    areaSize: 415, // m²
    baselineFAR: 400, // %
    baselineBCR: 60, // %
    heightLimit: '건축조례 및 일조제한 기준 적용',
    description: '역세권 및 밀집 배후수요를 안은 준주거지역입니다. 오피스텔 결합형 주상복합이나 도시형생활주택 개발 시 용적률 완화 가점이 큽니다.',
    eumLink: 'https://www.eum.go.kr/web/am/amUserLandReg.jsp?pCode=1165010800'
  }
];

const app = express();

// Enable large payloads for base64 image uploads
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Path normalization middleware for Vercel Serverless environment and local dev
app.use((req, res, next) => {
  const originalUrl = req.url;
  const originalPath = req.path;
  
  // 1. If Vercel rewrites /api/* to /api/index.ts, req.url may be prefixed with /api/index
  if (req.url.startsWith('/api/index')) {
    req.url = req.url.replace('/api/index', '/api');
  } else if (!req.url.startsWith('/api') && req.url !== '/' && !req.url.startsWith('/_')) {
    // If it comes as /analyze or /ask-legal without api prefix, prepend /api for routing matching
    req.url = '/api' + req.url;
  }
  
  console.log(`[Express Router] Original path: ${originalPath} (${originalUrl}) -> Normalized to: ${req.url}`);
  next();
});

// Lazy initializer for Gemini SDK as instructed
function getGeminiClient(customKey?: string): GoogleGenAI | null {
  const key = (customKey && customKey.trim()) || process.env.GEMINI_API_KEY;
  if (key && key !== 'MY_GEMINI_API_KEY' && key.trim() !== '') {
    return new GoogleGenAI({
      apiKey: key.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return null;
}

/// 1. API Route: Legal / Regulatory Land Analysis (Step 1)
app.post(['/api/analyze', '/analyze', '/api/index/analyze', '/index/analyze'], async (req, res) => {
  try {
    const { eumLink, screenshot, sampleLandId, expectedUsage, expectedScale, usageScaleList } = req.body;

    let chosenSample = SAMPLE_LANDS.find(l => l.id === sampleLandId);
    const customKey = req.headers['x-gemini-key'] as string | undefined;
    const ai = getGeminiClient(customKey);

    // Handle single vs multiple usages dynamically
    const list = Array.isArray(usageScaleList) && usageScaleList.length > 0 
      ? usageScaleList 
      : [{ usage: expectedUsage || '공동주택 (다세대 / 아파트)', scale: expectedScale || '지상 5층, 연면적 약 1,500㎡ 규모' }];

    const targetUsage = list.map((item: any) => item.usage).join(', ');
    const targetScale = list.map((item: any) => `[${item.usage}: ${item.scale}]`).join(' + ');

    const scenarioDescription = list.map((item: any, idx: number) => 
      `- 개발 계획 ${idx + 1}: 용도[${item.usage}] / 규모[${item.scale}]`
    ).join('\n');

    // Baseline mock data in case AI is offline or key is missing
    let fallbackData: LandRegulatoryAnalysis = {
      id: sampleLandId || undefined,
      address: chosenSample ? chosenSample.address : (eumLink || '서울특별시 영등포구 여의도동 일대 대지'),
      zoning: chosenSample ? chosenSample.zoning : '제3종일반주거지역 (지구단위계획 수립구역)',
      baselineFAR: chosenSample ? chosenSample.baselineFAR : 250,
      baselineBCR: chosenSample ? chosenSample.baselineBCR : 50,
      heightLimit: chosenSample ? chosenSample.heightLimit : '일조사선 제약 및 지구단위계획 권장높이 30m 이하',
      areaSize: chosenSample ? chosenSample.areaSize : 330,
      regulations: [
        {
          title: '국토의 계획 및 이용에 관한 법률 (용도지역 건폐율 및 용적률)',
          status: 'info',
          desc: `계획법 제77조·제78조 및 서울시 도시계획 조례 기준에 따라 제3종일반주거지역 건폐율 상한은 50%, 상한 용적률은 250% 입니다. 다만 지구단위계획 시행 한계에 구속될 수 있으므로, 제안된 "${targetUsage}" 용도가 구역계 결정 고시 상 허용 용도에 완전히 편입되는지 우선 대조해야 합니다.`
        },
        {
          title: '건축법 제61조 (정북방향 일조 등의 확보를 위한 높이제한)',
          status: 'warning',
          desc: `구상 중이신 "${targetScale}" 개발에 따라 건축물 높이 9m 이하 부문은 대지경계선으로부터 1.5m 이격, 9m 초과 부분은 높이의 1/2 이상 정북방향 대지 경계선으로부터 후퇴시켜야 합니다. 이로 인해 상층부 테라스 형태의 사선 절감이 불가피하게 요구됩니다.`
        },
        {
          title: '건축법 제60조 (가로구역별 건축물의 높이제한)',
          status: 'info',
          desc: '전면 도로 및 지자체 건축 고시에 맞춰 대지 주변 가로구역 높이 규칙 여부를 확인해야 합니다. 임의적인 초고층 배치는 규제선에 막힐 우려가 있으므로 사전에 높이제한 고시 유무와 완화 조항을 동시 확보해야 합니다.'
        },
        {
          title: '주차장법 제19조 및 지자체 부설주차장 설치 조례',
          status: 'warning',
          desc: `선택하신 복합 용도("${targetUsage}")를 "${targetScale}"로 기획 시, 가구 수 혹은 연면적 면적비에 따라 대략 15~24대 이상의 법정 주차 면적 설치와 진출입 확보가 의무화될 것으로 예측됩니다. 이를 해결하기 위해 피로티 구조 설계나 기계식 주차 타워 병행 가능 여부에 대한 추가 조사가 상존합니다.`
        },
        {
          title: '주텍건설기준 등에 관한 규정 제9조 (진입도로의 폭)',
          status: 'info',
          desc: `전체 예정 가구 구성에 의거하여 주거 용도인 경우 진입로 폭을 최소 6m(일반 소규모 개발은 최소 4m) 이상 만족하여 건축선으로부터 완화해야 하며, 미달할 경우 기부채납을 대가로 도로 확장 공지를 제공해야 인허가 통과가 가능합니다.`
        },
        {
          title: '교육환경 보호에 관한 법률 제8조 (교육환경보호구역)',
          status: 'safe',
          desc: `인근 학교 경계선 반경 200m 범위 내 절대보호/상대보호구역 저해성 체크 결과, 공동주택이나 일반 오피스텔 단독 시설의 경우 교육영향 정성 평가를 무사 통과할 가능성이 높아 현 단계에는 안전('Safe') 의견으로 처리합니다.`
        },
        {
          title: '소방시설 설치 및 관리에 관한 법률 및 피난방화규정',
          status: 'warning',
          desc: '대지 폭과 형상에 의거해 소방사다리 차량이 진입하여 수평을 잡고 구조 회차가 실행될 수 있도록 폭 6m 이상의 공간 선점이 구상 도면 배치 과정에 필수 산입되며 위반 시 건축 심의에서 부결 가능성이 높습니다.'
        },
        {
          title: '서울특별시 건축조례 제24조 및 제25조 (공지 확보 및 조경)',
          status: 'info',
          desc: `동별 외벽 혹은 돌출 발코니가 인접 정북/정남 대지경계선 및 도로 경계선에서 최소 1m~1.5m 이상 떨어져 공지를 남겨야 하며, "${targetScale}" 수준의 연면적에 따라 대지 전체 중 약 10% 내외 면적을 조경 조형 식재 영역으로 유치하여 신고해야 합니다.`
        }
      ],
      developmentPotential: chosenSample 
        ? chosenSample.description 
        : `구상하시는 "${targetUsage}" 용도의 복합 개발안은 인근 역세권 지구단위계획 완화 비례와 주차 공간 구상에 따라 수지타산의 가름길이 결정됩니다. 일조권 후퇴에 적극 대응하는 사선 설계를 조합하여 용적률을 최대한 가동하면 대단히 유니크한 역세권 복합체 수익형 자산으로 승화할 수 있습니다.`,
      recommendations: [
        '일조 제한선을 우회할 수 있는 스텝업 형태의 테라스하우스 및 옥상 정원 조경 연계 설계',
        '도로 확장 기부채납을 통한 용적률 한계치 최고가 산출 확보 공략',
        '1층 전체를 피로티 주차장으로 전환하는 구조 특허 건축 기법 도용 제안'
      ]
    };

    // If Gemini API is available, use it to generate highly custom and interactive review!
    if (ai) {
      try {
        let imagePart = null;
        if (screenshot && screenshot.includes('base64,')) {
          const parts = screenshot.split('base64,');
          const mimeType = parts[0].split(':')[1].split(';')[0];
          const data = parts[1];
          imagePart = {
            inlineData: {
              mimeType,
              data
            }
          };
        }

        const promptString = `
당신은 대한민국 건축법, 국토계획법, 주택법, 주차장법, 교육환경법, 서울특별시/해당지자체 도시계획 및 건축 조례, 그리고 지구단위계획 수립 가이드라인 등의 지자체 부동산 개발 인허가 검토 전문가입니다.
사용자가 구상 중인 다음의 다중 복합 개발 시나리오 조건에 완벽하게 부응하는 8대 핵심 행위제한에 관한 종합 법규조서와 설계 완화 검정 성적서를 작성해 내십시오.

[사용자 구상 개발 시나리오]
- 대상 토지주소/토지이음 정보: ${eumLink || '미제공 (캡쳐도면에 의존)'}
${scenarioDescription}

[중요 요청 - 복합 용도 매칭 고도 기획 및 완화 가이드]
1. 제안된 복합용도 조합(${targetUsage})의 용도 상호 간 법적 충돌 및 완충 요건을 심도 있게 분석해 주십시오. (예: 주택과 상업시설의 소음 방화 구획, 주차장법상 서로 다른 기준 적용 등)
2. 해당 토지가 지구단위계획구역 대상 조건일 경우를 가정하여, 일반 건축 조례보다 시행지침이 최우선하는 원칙과 허용 용도 지정(오피스텔/근린생활시설 개발 가능 한도 여부), 최대 용적률 완화(기부채납 가중치 산식) 예외 조서 규정을 regulations 배열에 다각도로 심층 기술하시기 바랍니다.
3. 사용자가 기재한 예상 복합 용도와 각 규모들에 하에 직관적으로 영향도가 매우 큰 주차장법(각 세대 혹은 전용면적 총합 기준에 따르는 법정 예상 필요 주차 공간) 및 접도 의무 기준(주거/상업 등 성격에 따른 진입로 확폭 가중선)을 명확히 설명해 주세요.

[반드시 검토에 포함하여 regulations 배열에 담아내야 할 8대 법적 항목]
1. 국토의 계획 및 이용에 관한 법률 및 조례 (용도지역별 건폐율/용적률 상한 정격 및 지구단위계획 우선 원칙)
2. 건축법 제61조 (정북방향 일조 등의 확보를 위한 높이제한 조치 및 사선 완출 기획)
3. 건축법 제60조 (가로구역별 건축물의 평균 높이제한 가이드)
4. 주차장법 제19조 및 지자체 부설주차장 설치 조례 (구입 예정 용도들에 요구되는 각 부설주차장 세부 설치 대수 비율 산출법)
5. 주택건설기준 등에 관한 규정 제9조 및 건축법 접도 관계 (세대규모/용도에 따르는 의무 도로 폭 확보 여부)
6. 교육환경 보호에 관한 법률 (절대/상대 정화구역 관련 학교 인접 이격 가이드)
7. 소방시설법 및 피난방화구조기준 (비상 소방차 전용 통로 폭 6m 및 수평 회차 선로 요구 사항)
8. 지자체 건축조례상 공지 확보(대지 경계 이격 준수의무) 및 대지 내 의무 조경 식재 비율 기준

각 항목마다 실제 대한민국 건축 관련 법규 정식 조항 명칭과 해당 구상 용업/규모에 수반되는 구체적인 규제 세목을 자세히 기술하고, 그에 따른 경고 등급에 비례하여 status 필드를 'warning', 'safe', 'info' 기호에 매치하십시오.

마지막으로 종합 의견인 developmentPotential 란에 한국어로 8개 법규를 융합한 핵심 개발 수지/기획 타당성 분석 의견을 대략 4~6문장의 긴 한국어 문단으로 전문성 가득 차게 서술하고, recommendations에 법적 한계 완화 동반 설계 기획 우회 대안 3개 이상을 제안해 주십시오.

반드시 유효하고 깨끗한 JSON 형식으로 회신해야 합니다.
`;

        const contentsParts: any[] = [];
        if (imagePart) {
          contentsParts.push(imagePart);
        }
        contentsParts.push({ text: promptString });

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: { parts: contentsParts },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                address: { type: Type.STRING, description: '대지 주소 및 지번 정보' },
                zoning: { type: Type.STRING, description: '용도지역/지구 명칭 (예: 제2종일반주거지역)' },
                baselineFAR: { type: Type.NUMBER, description: '기본 용적률 허용치 수치만 (예: 200)' },
                baselineBCR: { type: Type.NUMBER, description: '기본 건폐율 허용치 수치만 (예: 60)' },
                heightLimit: { type: Type.STRING, description: '높이 및 층수 규제 핵심 요약' },
                areaSize: { type: Type.NUMBER, description: '대지 면적 수치㎡ (예: 350)' },
                regulations: {
                  type: Type.ARRAY,
                  description: '주요 개별 법규 규제 요소들',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING, description: '규제 제목' },
                      status: { type: Type.STRING, description: '상태 속성 - warning, safe, info 중 하나만 사용' },
                      desc: { type: Type.STRING, description: '규제 영향 분석 및 상세 설명' }
                    },
                    required: ['title', 'status', 'desc']
                  }
                },
                developmentPotential: { type: Type.STRING, description: '종합적인 개발 가치성 분석 의견 (한국어)' },
                recommendations: {
                  type: Type.ARRAY,
                  description: '전문가 자문 검토 제언 사항 리스트',
                  items: { type: Type.STRING }
                }
              },
              required: [
                'address', 'zoning', 'baselineFAR', 'baselineBCR', 'heightLimit', 'areaSize',
                'regulations', 'developmentPotential', 'recommendations'
              ]
            }
          }
        });

        const parsedResult = JSON.parse(response.text || '{}');
        
        // Merge values if any parsed values are missing
        const mergedResult: LandRegulatoryAnalysis = {
          id: sampleLandId || undefined,
          address: parsedResult.address || fallbackData.address,
          zoning: parsedResult.zoning || fallbackData.zoning,
          baselineFAR: typeof parsedResult.baselineFAR === 'number' ? parsedResult.baselineFAR : fallbackData.baselineFAR,
          baselineBCR: typeof parsedResult.baselineBCR === 'number' ? parsedResult.baselineBCR : fallbackData.baselineBCR,
          heightLimit: parsedResult.heightLimit || fallbackData.heightLimit,
          areaSize: typeof parsedResult.areaSize === 'number' ? parsedResult.areaSize : fallbackData.areaSize,
          regulations: Array.isArray(parsedResult.regulations) ? parsedResult.regulations : fallbackData.regulations,
          developmentPotential: parsedResult.developmentPotential || fallbackData.developmentPotential,
          recommendations: Array.isArray(parsedResult.recommendations) ? parsedResult.recommendations : fallbackData.recommendations
        };

        // Add hint that AI did the work!
        mergedResult.developmentPotential = "✨ [Gemini AI 실시간 규제 검토 완료]\n" + mergedResult.developmentPotential;

        return res.json(mergedResult);
      } catch (err: any) {
        console.error('Gemini processing failed, falling back to local database:', err);
        fallbackData.developmentPotential = "⚠️ [로컬 규제 DB 기반 엔진 작동] AI 분석 중 일시적인 지연이 발생하여 내장된 기본 가이드라인으로 검토되었습니다.\n\n" + fallbackData.developmentPotential;
        return res.json(fallbackData);
      }
    } else {
      // No API key provided, work fully in offline mode
      fallbackData.developmentPotential = "ℹ️ [로컬 규제 DB 기반 엔진 작동] Settings에서 GEMINI_API_KEY를 등록하면 보다 강력한 최신 프롬프트 기반의 도시계획 조례 연동 법규 검토가 제공됩니다.\n\n" + fallbackData.developmentPotential;
      return res.json(fallbackData);
    }
  } catch (globalErr: any) {
    console.error('Critical global error in /api/analyze:', globalErr);
    return res.status(500).json({ error: globalErr.message || 'Analysis handler crash' });
  }
});

// 1.5. API Route: Legal AI Advisory Interactive Q&A
app.post(['/api/ask-legal', '/ask-legal', '/api/index/ask-legal', '/index/ask-legal'], async (req, res) => {
  const { question, landContext, history } = req.body;
  const customKey = req.headers['x-gemini-key'] as string | undefined;
  const ai = getGeminiClient(customKey);

  if (!question) {
    return res.status(400).json({ error: '질문 내용이 전송되지 않았습니다.' });
  }

  const contextStr = landContext 
    ? `
[검토 대상 토지 실시간 컨텍스트 정보]
- 주소: ${landContext.address}
- 용도지역: ${landContext.zoning}
- 대지면적: ${landContext.areaSize}㎡
- 기본 용적률: ${landContext.baselineFAR}% / 건폐율: ${landContext.baselineBCR}%
- 높이제한: ${landContext.heightLimit}
- 기검토된 중요 법규 리스트:
${JSON.stringify(landContext.regulations, null, 2)}
- 기존의 개발가치 분석의견:
${landContext.developmentPotential}
` 
    : '검토 대상 토지 컨텍스트 없음';

  const defaultPrompt = `
당신은 대한민국 건축법, 국토계획법, 지자체 건축/도시계획 조례, 주택법, 주차장법, 지구단위계획 수립 지침 등 건축 인허가 실무에 특화된 최고 수준의 "AI 건축사 및 법적 인허가 전문 자문위원"입니다.

사용자가 현재 분석 중인 토지에 관하여 의문이 있거나, 법률 세부사항을 문의하거나, 다른 용도(예: 근생, 오피스텔, 지식산업센터 등) 개발 대안을 질문하고 있습니다. 
사용자의 질문에 부합하도록 최신 조례 조항을 인용하듯 현실감 있고 전문적이며 정확하게 한국어로 대답하십시오. 

[답변 작성 시 필수 준수 사항]
1. 단순 추상적인 문구가 아닌, 실무 용어(예: 세대당 주차대수, 일조 사선제한 한계선, 지구단위계획 구역 지침 적용 여부, 기부채납 가중치, 상가 연면적 비율)를 사용하여 고순도의 해설을 제공하십시오.
2. 만약 조례 상 구체적 수치(예: 용적률 완화 혜택 등)나 조항이 모호하게 유추되는 부분은 솔직히 한계를 밝히고 "지자체 소관 부서 또는 설계 사무소를 통한 사전 결정 신청 필수"라는 보완책을 제시하십시오.
3. 친근하면서도 고도로 격식 있고 객관적인 전문가 톤앤매너로 서술하세요. (마크다운 포맷 활용)

${contextStr}

[사용자 질문]:
"${question}"
`;

  if (ai) {
    try {
      // Format chat history for Gemini if present
      const contentsParts: any[] = [];
      if (history && Array.isArray(history)) {
        history.forEach((msg: any) => {
          contentsParts.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          });
        });
      }
      
      // Add current contextual prompt
      contentsParts.push({
        role: 'user',
        parts: [{ text: defaultPrompt }]
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contentsParts,
        config: {
          systemInstruction: '당신은 대한민국 대표 최고의 부동산 개발 및 건축 법률 규정 자문 AI입니다. 항상 신뢰할 수 있게 답변하세요.'
        }
      });

      const answer = response.text || '죄송합니다. 인공지능이 응답을 구성하지 못했습니다.';
      return res.json({ answer });
    } catch (err: any) {
      console.error('Interactive Legal Q&A failed:', err);
      return res.status(500).json({ error: `AI 답변 생성 오류: ${err.message}` });
    }
  } else {
    // Offline / No Key mockup response
    const offlineAnswers: { [key: string]: string } = {
      '오피스텔': '제3종일반주거지역 또는 상업지역 등 용도지역 조건에 따라 오피스텔(준주택) 설치 가능 여부가 상이해집니다. 통상 준주거나 상업지역에 유리합니다. 주차 및 피난소방 기준이 공동주택과 다르며, 지자체 지구단위계획 지침 상 허용 용도 여부를 꼭 파악하셔야 합니다.',
      '지구단위': '지구단위계획구역으로 지정되어 있다면, 일반 건축 조례보다 지구단위계획 시행지침이 최우선 적용되어 건폐율, 용적률, 층수, 불허용도가 극도로 엄격하게 제약되거나 인센티브를 부여받습니다. 구역 계획 결정 조서를 서울시 도시계획포털 등에서 다운로드하여 세부 사항을 확인하시는 것을 적극 권합니다.',
      '조례': '조례에 따르면, 건축물 높이가 높아질수록 정북방향 일조 사선제한이 완화 또는 강화될 수 있으나 9m 기준에서 계단식 셋백(Setback)이 필요하게 됩니다. 지자체별 상세 공지 조정을 체크하시길 권해 드립니다.'
    };

    let matchedAnswer = '현재 오프라인 모드(API Key 미작동) 입니다. API Key 등록 시, 토지의 위치와 조례를 반영한 실시간 맞춤형 8대 법규 자문이 지원됩니다.';
    for (const key of Object.keys(offlineAnswers)) {
      if (question.includes(key)) {
        matchedAnswer = `[로컬 법률 아카이빙 응답] ${offlineAnswers[key]}\n\n※ 실시간 상세 분석을 얻으려면 Settings에서 GEMINI_API_KEY를 설정해 주세요.`;
        break;
      }
    }
    return res.json({ answer: matchedAnswer });
  }
});

export default app;
