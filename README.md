# Qwedding Planner

2027.06.05 웨딩 준비를 위한 캘린더 + 월별 할 일 웹앱입니다.

## 구조

```
Qwedding-planner/
├─ index.html            # 진입점 (마크업만 담당)
├─ design/
│  ├─ DESIGN.md          # 디자인 시스템 문서 (컬러/타이포/간격)
│  └─ tokens.css         # 디자인 토큰 (CSS 변수) — 디자인 변경은 여기서
├─ css/
│  └─ style.css          # 컴포넌트 스타일 (토큰만 참조)
└─ src/
   ├─ app.js             # 엔트리: 상태 관리와 모듈 연결
   ├─ store.js           # 데이터 계층 (localStorage CRUD, 구독)
   ├─ calendar.js        # 캘린더 뷰 (렌더링만)
   ├─ todo-panel.js      # 우측 할 일 패널 뷰 (렌더링만)
   └─ utils.js           # 날짜/이스케이프 유틸
```

### 계층 원칙
- **store**는 데이터만 다룹니다. DOM을 건드리지 않습니다.
- **calendar / todo-panel**은 데이터를 받아 HTML을 그리고, 사용자 액션은 콜백으로 app에 전달합니다.
- **app**이 상태(연/월, 선택 날짜, 필터)를 가지고 모든 모듈을 연결합니다.
- 디자인 값은 `design/tokens.css`에만 있으므로 색을 바꿀 때 한 파일만 수정하면 됩니다.

## 실행

- 로컬: `index.html`을 Live Server 등 로컬 서버로 여세요. (ES 모듈은 `file://`에서 막힐 수 있습니다.)
- 배포: GitHub Pages 루트에 이 폴더 내용을 그대로 올리면 `https://<아이디>.github.io/Qwedding-planner/`에서 열립니다.

## 데이터
브라우저 localStorage에 저장됩니다. 여러 기기 공유가 필요하면 `store.js`의 구현만 Firebase 등으로 바꾸면 됩니다.
