# MindConnect - Context thay doi va bo sung tinh nang

File nay tom tat lai nhung gi da duoc trao doi va thuc hien trong qua trinh lam viec voi Codex, de dong doi co the nam bat context khi review tren GitHub.

## 1. Boi canh ban dau

Project MindConnect ban dau la mot prototype web gom:

- Frontend tinh o root: `index.html`, `student.html`, `school.html`, `student.js`, `style.css`.
- Backend Node.js/Express trong thu muc `backend`.
- Backend ban dau co auth JWT, MongoDB user model, login/register, forgot/reset password.
- Frontend ban dau chu yeu la UI demo, nhieu phan dung mock data hoac local logic.

Sau khi doc project, cac diem dang chu y ban dau la:

- `index.html` co UI dang nhap va chon role Student/School, nhung chi redirect thang sang `student.html` hoac `school.html`, chua goi backend auth.
- `student.js` co Home, Diary, Resources, Stats, Chat, Booking modal, nhung du lieu chu yeu nam trong bien JS.
- `school.html` co Dashboard Admin, heatmap, top topics, consultation cases, nhung phan lon la du lieu tinh.
- `style.css` co loi comment CSS o phan School Dashboard va thieu dau dong `}` o block `#breath-text`, lam stylesheet de bi loi parse.
- Backend dung `nodemailer` trong `email.js` nhung `package.json` chua khai bao dependency nay.
- Backend `User.password` de `select: false`, nhung `findByEmail()` khong select password, nen login backend co nguy co khong verify duoc password.

## 2. Yeu cau cua nguoi dung

Nguoi dung dua Use Case Diagram va yeu cau:

- Doi chieu web hien tai voi Use Case Diagram.
- Bo sung cac chuc nang web chua co.
- Them Groq API vao khung Chat AI ho tro tam ly cho sinh vien.
- Chat AI phai dung dung muc dich ban dau: sinh vien tam su voi AI, AI dua loi khuyen phu hop va goi y tai nguyen/video/podcast/bai tap tho.
- Kiem tra xem web da du cac chuc nang trong Use Case Diagram chua.
- Voi nhung gi chua co hoac moi mock, hay lam tiep de prototype co the chay end-to-end.

## 3. Doi chieu Use Case Diagram

### Student use cases


| Use case                          | Trang thai sau thay doi                                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Login                             | Da noi UI login voi backend auth. Neu tai khoan chua co, tu tao tai khoan demo theo role.                       |
| Home / Feed bai viet              | Co UI va da co API `/api/feed` de load diary feed tu backend. Van co fallback mock khi backend khong chay.      |
| Viet nhat ky                      | Co UI va da luu qua `POST /api/diaries`.                                                                        |
| AI Tag Suggest                    | Da them endpoint `POST /api/diaries/tags`, co goi Groq neu co API key, fallback rule-based neu khong co.      |
| Resource Library                  | Co san danh sach Video, Blog, Book, Podcast, Cong cu tho.                                                       |
| Breathing Exercise                | Co trong frontend.                                                                                              |
| Emotion Stats                     | Co UI, van con mot phan mock, nhung da lien ket voi risk alerts local/backend de hien thi risk gan nhat.        |
| Chat AI                           | Da noi Groq qua backend `POST /chat/support`; frontend khong goi Groq truc tiep de tranh lo API key.        |
| Phat hien rui ro / canh bao tu tu | Da co logic detect keyword tu Chat, Diary, Quick Test; luu localStorage va sync len backend `/api/risk-alerts`. |
| Book Consult                      | Da co modal dat lich va goi backend `POST /api/bookings`.                                                       |
| Logout                            | Co redirect ve `index.html`.                                                                                    |


### Admin use cases


| Use case                | Trang thai sau thay doi                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Admin Login             | Da dung chung UI login role School va backend auth.                                             |
| Dashboard Metrics       | Da them endpoint `/api/dashboard`; frontend doc metrics tu backend khi co.                      |
| High Risk Alerts        | Da hien thi risk alerts tu backend + localStorage fallback.                                     |
| Heatmap by Department   | Van chu yeu la UI/static demo, backend co tra heatmap data co ban.                              |
| Trending Topics         | Da cap nhat tu tags cua diaries trong `/api/dashboard`, fallback data neu chua co diary.        |
| Consultation Management | Da nhan risk alerts va booking requests, co action completed/rescheduled.                       |
| Intervention Effect     | Van la chi so demo, backend tra gia tri prototype.                                              |
| Filter by Time          | Da dung `range` khi goi `/api/dashboard?range=...`; local alerts cung co filter theo thoi gian. |


## 4. Cac thay doi frontend

### `index.html`

Da thay doi luong dang nhap:

- Them `API_BASE_URL = 'http://localhost:3000'`.
- Login form lay email/MSSV va password bang id rieng.
- Neu nguoi dung nhap MSSV khong co email, he thong normalize thanh email demo dang `mssv@mindconnect.local`.
- Goi `/auth/login`.
- Neu backend tra 401, tu goi `/auth/register` de tao tai khoan demo theo role hien tai.
- Luu session vao `localStorage` key `mindconnect:auth`.
- Luu role vao `localStorage` key `mindconnect:role`.
- Neu backend chua chay, van redirect vao trang tuong ung sau khi bao loi demo mode.

### `student.js`

Da them cac nhom logic moi:

- API helper:
  - `API_BASE_URL`
  - `CHAT_API_URL`
  - `getAuthSession()`
  - `getAuthHeaders()`
  - `apiRequest()`
- Feed:
  - `loadFeedFromBackend()` goi `/api/feed`.
  - Feed van giu mock fallback neu backend khong chay.
- Diary:
  - `analyzeDiary()` nay goi `/api/diaries/tags` de lay AI tags.
  - Neu Groq/backend loi, fallback ve rule-based tags.
  - `confirmAndPost()` goi `/api/diaries` de luu diary.
- Risk detection:
  - `detectRiskSignal()`
  - `createRiskAlert()`
  - `syncRiskAlert()`
  - Luu localStorage key `mindconnect:risk-alerts`.
  - Sync len backend `/api/risk-alerts`.
- Chat AI:
  - `callChatBotAPI()` goi `POST /chat/support`.
  - Gui lich su chat gan nhat.
  - Tin nhan critical risk khong dua sang Groq truoc; dung fallback safety reply de uu tien an toan.
  - `buildFallbackChatReply()` goi y tai nguyen neu backend/Groq loi.
  - `formatChatMessage()` escape HTML va auto-link URL tu AI.
- Booking:
  - Modal co id `booking-time` va `booking-note`.
  - `handleConfirmBooking()` goi `/api/bookings`.
  - Neu backend loi, tao fallback alert local de Admin demo van thay duoc request.

Ngoai ra Home co nut `Tam su voi AI` de nguoi dung vao Chat nhanh sau khi dang nhap.

### `school.html`

Da bo sung:

- API helper tuong tu frontend Student.
- `fetchDashboardData()` goi `/api/dashboard?range=...`.
- Metrics cards co id rieng:
  - `metric-sentiment`
  - `metric-risk-rate`
  - `metric-engagement`
  - `metric-intervention`
- Top topics list co id `top-topic-list` de render data tu backend.
- `renderRiskDashboard()` gop alerts tu backend va localStorage fallback.
- Consultation table hien:
  - Dynamic risk alert cases.
  - Dynamic booking request cases.
  - Default static rows cu de giu demo UI.
- `markRiskAlert()` patch `/api/risk-alerts/:id`.
- Booking status update patch `/api/bookings/:id`.

### `style.css`

Da sua va them:

- Sua comment CSS loi o phan School Dashboard.
- Dong block `#breath-text` bi thieu `}`.
- Them style cho:
  - `risk-alert-panel`
  - `risk-alert-item`
  - `crisis-support-card`

## 5. Cac thay doi backend

### Auth

Files lien quan:

- `backend/src/models/User.js`
- `backend/src/repositories/UserRepository.js`
- `backend/src/services/AuthService.js`
- `backend/src/controllers/AuthController.js`
- `backend/src/middlewares/authenticate.js`
- `backend/src/middlewares/optionalAuthenticate.js`

Thay doi:

- Them field `role` cho User: `student`, `school`, `admin`.
- Sua `findByEmail()` de `.select('+password')`, giup login verify password dung.
- JWT payload them `role`.
- Auth response tra `role`.
- Them `optionalAuthenticate` de route prototype co the nhan user neu co token, nhung khong bat buoc.
- Them fallback in-memory auth neu MongoDB chua ket noi, phuc vu demo nhanh.
- `index.js` khong bat buoc `JWT_SECRET` trong development; neu thieu thi dung fallback dev secret va warning.

### Groq Chat

Files moi:

- `backend/src/services/OpenAIChatService.js`
- `backend/src/controllers/ChatController.js`
- `backend/src/routes/chatRoutes.js`
- `backend/src/models/ChatMessage.js`

Chuc nang:

- `POST /chat/support`
- Goi Groq Chat Completions API qua backend.
- API key chi nam trong backend env `GROQ_API_KEY`, khong lo ra frontend.
- Prompt duoc thiet ke cho AI ho tro tam ly sinh vien:
  - Lang nghe.
  - Khong chan doan.
  - Khong ke thuoc.
  - Khong thay the chuyen gia.
  - Neu co dau hieu tu hai/tu tu thi uu tien safety, khuyen goi hotline/nguoi tin cay/dich vu khan cap.
- Groq duoc cung cap danh sach tai nguyen MindConnect de goi y dung:
  - Video thien 5 phut giam lo au.
  - Blog vuot qua burnout mua thi.
  - Book Hieu ve trai tim.
  - Podcast Radio Cam Xuc.
  - Bai tap tho giam stress.
- Chat message duoc luu vao MongoDB neu DB dang chay.

### App Data APIs

Files moi:

- `backend/src/models/Diary.js`
- `backend/src/models/RiskAlert.js`
- `backend/src/models/Booking.js`
- `backend/src/controllers/AppController.js`
- `backend/src/routes/appRoutes.js`

Routes moi duoi prefix `/api`:

- `GET /api/feed`
- `POST /api/diaries`
- `POST /api/diaries/tags`
- `GET /api/risk-alerts`
- `POST /api/risk-alerts`
- `PATCH /api/risk-alerts/:id`
- `POST /api/bookings`
- `PATCH /api/bookings/:id`
- `GET /api/dashboard?range=7`

Co che du lieu:

- Neu MongoDB connected: luu doc vao MongoDB.
- Neu MongoDB khong connected: dung in-memory store trong server process de prototype van chay duoc trong luc demo.

### Dashboard API

`GET /api/dashboard` tra:

- `metrics`
- `alerts`
- `bookings`
- `top_topics`
- `heatmap`

Metrics hien tai van o muc prototype, duoc tinh mot phan tu diaries/alerts/bookings va mot phan fallback demo. Day chua phai analytics production.

## 6. File moi da tao

Trong qua trinh lam viec da tao cac file moi sau:

- `PROJECT_CHANGE_CONTEXT.md`
- `backend/src/controllers/AppController.js`
- `backend/src/controllers/ChatController.js`
- `backend/src/middlewares/optionalAuthenticate.js`
- `backend/src/models/Booking.js`
- `backend/src/models/ChatMessage.js`
- `backend/src/models/Diary.js`
- `backend/src/models/RiskAlert.js`
- `backend/src/routes/appRoutes.js`
- `backend/src/routes/chatRoutes.js`
- `backend/src/services/OpenAIChatService.js`

Luu y: co file `.agent.md` dang untracked trong git status tu truoc, Codex khong chinh sua file do.

## 7. Cach chay de test

### Backend

Tao file `backend/.env` tu `backend/.env.example`.

Neu chi muon demo nhanh khong can MongoDB:

```env
PORT=3000
SKIP_DB_CONNECT=true
REQUIRE_MONGODB=false
JWT_SECRET=dev-secret
GROQ_API_KEY=gsk-your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile
CORS_ORIGIN=http://localhost:5500,http://127.0.0.1:5500
```

Chay backend:

```powershell
cd backend
npm install
npm run dev
```

### Frontend

Mo `index.html` bang Live Server.

Luong test khuyen nghi:

1. Dang nhap role Sinh vien.
2. Vao Chat, nhap tam su. Neu co `GROQ_API_KEY`, AI tra loi tu Groq. Neu Groq/backend loi, frontend bao ro chua ket noi Groq API thay vi gia lap cau tra loi AI.
3. Vao Diary, viet nhat ky va bam Phan tich AI. Tags se lay tu `/api/diaries/tags` hoac fallback rule-based.
4. Dang nhat ky. Diary duoc luu backend va hien tren Home feed.
5. Dat lich tham van. Booking duoc tao trong backend.
6. Dang xuat, chon role Nha truong.
7. Admin Dashboard doc `/api/dashboard`, hien alerts/bookings/topics/metrics.

## 8. Nhung viec van con la prototype/chua production-ready

Cac phan da lam nham hoan thien use case demo, chua phai production:

- Auth demo co auto-register khi login fail 401. Nen tach register/login that neu len production.
- In-memory fallback mat data khi restart server.
- AI risk detection frontend van dua tren keyword; nen chuyen sang backend/service rieng neu can chuan hon.
- Dashboard metrics/heatmap/intervention effect van con cong thuc demo.
- Consultation workflow chua co calendar/email notification thuc.
- Chua co phan quyen nghiem ngat cho admin routes.
- Chua co test tu dong.
- Chua verify duoc `node --check` vi moi lan chay `node.exe` trong moi truong hien tai bi Windows chan voi loi `Access is denied`.
- `nodemailer` dang duoc require trong `email.js`, nhung `backend/package.json` chua co dependency `nodemailer`. Neu dung forgot password that, can them dependency nay.

## 9. Kiem tra da thuc hien

- Da chay `git diff --check`: pass, chi co warning LF se duoc Git chuyen CRLF khi Git cham file.
- Da thu `node --check` nhieu lan voi `student.js` va cac file backend moi, nhung moi truong WindowsApps chan `node.exe` bang loi `Access is denied`, nen chua verify cu phap bang Node duoc.

## 10. Tom tat ngan gon cho Pull Request

Thay doi nay bien MindConnect tu prototype UI tinh thanh prototype end-to-end:

- Login frontend da noi backend auth.
- Student Diary, AI Tag Suggest, Chat AI Groq, Risk Alert, Booking da co API backend.
- Admin Dashboard doc du lieu tong hop tu backend thay vi chi mock/localStorage.
- Groq API duoc goi an toan tu backend, khong expose key tren browser.
- Van giu fallback local/mock de demo khong bi vo khi backend, MongoDB hoac Groq API chua san sang.

