/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SampleLand } from './types.js';

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
