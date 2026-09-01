# 115 學年度畢冊班服共編模組

一份 HTML 檔、三個角色檢視，跑在同一份即時共用的資料上。

| 角色 | 網址 | 能做什麼 |
|---|---|---|
| 各班導師 | `banfu.html` | 選班服顏色、上傳班服照片、填款式與人數 |
| 生教組 | `banfu.html?v=check` | 全校色卡、未繳名單、撞色提醒、匯出（**唯讀**） |
| 廠商 | `banfu.html?v=vendor` | 對色、規劃編字拍照排字版位、匯出 |

三個檢視共用同一份 Firestore 資料，任何一邊改動，其他人一兩秒內看得到。
生教組檢視刻意不給編輯能力：要改內容一律回到班級端由導師自己改，責任才清楚。

## 檔案

```
docs/
  banfu.html                 共編模組本體（三個檢視都在這一支）
  banfu-share.html           各班掃描入口頁（大 QR ＋步驟＋色票一覽）
  banfu-check-share.html     生教組入口頁
  banfu-vendor-share.html    廠商入口頁
  banfu-qr.png               三張 QR 圖，可單獨貼到通知單或 LINE
  banfu-check-qr.png
  banfu-vendor-qr.png
assets/
  share-page.html            入口頁模板（build-share.py 用）
scripts/
  build-share.py             從 banfu.html 的 CFG 產生 QR 與三張入口頁
```

入口頁與 QR **不要手改**，一律用腳本重生，否則會出現「表單改了但入口頁還寫舊期限」。

## 上線步驟

### 1. 建 repo 並推上去

```bash
git init && git add -A && git commit -m "115 畢冊班服共編模組"
```

GitHub 建一個叫 **`banfu-115`** 的 repo（QR 已綁定這個名稱），推上去後到
Settings → Pages → Source 選預設分支的 `/docs`。

repo 名稱只能用 ASCII（英數、`-`、`_`、`.`）。中文名會變成百分比編碼的網址，
QR 掃出來與廠商手打都是一長串亂碼 —— 頁面標題是中文沒問題，網址那一段維持 ASCII。

### 2. 改了 repo 名稱就重跑這支

QR 內容綁死網址，名稱一改舊 QR 全部失效：

```bash
python3 scripts/build-share.py --form docs/banfu.html --url https://simon05091004.github.io/<repo>/banfu.html
```

### 3. 確認上線

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://simon05091004.github.io/banfu-115/banfu.html
```

### 4. 開啟即時共用（沒這步各班看不到彼此）

`FIREBASE_CONFIG` 已填入 **chinese-50d0c**（沿用 Chinese／MATH 練習頁那個專案）。
但那支專案原本只用 **Realtime Database**，本模組用的是 **Firestore**，兩者是同一專案下
不同的服務，所以還差一步：

1. **先建立 Firestore 資料庫**。Firebase 主控台 → 選 `chinese-50d0c` → Firestore Database
   → 建立資料庫 → 位置選 `asia-east1`（台灣）或 `asia-southeast1`（新加坡，和現有 RTDB 同區）
   → 模式選「正式版」（規則下一步覆蓋）。
   沒建立之前，Cloud Firestore API 是關閉的，前端會拿到
   `403 SERVICE_DISABLED`，畫面狀態列顯示紅點「連不上雲端」。
   建立 Firestore **不會影響**原本的 Realtime Database，Chinese／MATH 照常運作。
2. Firestore → 規則，把 `banfu.html` 檔案最下方註解裡的**兩段 match 加進**現有規則的
   `match /databases/{database}/documents { … }` 大括號內，既有區塊原封不動保留。
   （這個專案的 Firestore 是新建的，規則會是預設那份，直接貼上即可。）
3. 規則發布後有數秒傳播延遲，剛發布時的寫入可能被擋，重試即可。

不想在 chinese-50d0c 開 Firestore 的話，`family-ledger-e196d`（家庭記帳）已經在跑 Firestore，
換成它的 firebaseConfig 就只剩「加規則」一步。

沒有做這步，模組仍然完全可用，只是資料存在各自的瀏覽器裡。

### 狀態列怎麼看

| 顯示 | 意思 |
|---|---|
| 綠點「即時共用中」 | 真的連上雲端了，別人看得到 |
| 琥珀點「連線中，尚未確認雲端資料…」 | 拿到的是本機快取，還沒跟雲端對上 |
| 紅點「連不上雲端，畫面是本機快取，填寫還沒送出去」 | Firestore 沒啟用、規則沒開、或網路不通 |
| 琥珀點「資料儲存在這台裝置的瀏覽器」 | `FIREBASE_CONFIG` 是 null，本機模式 |

Firestore 連不上時仍會回快取快照，**不能**把「收到快照」當成「連線成功」——
否則導師會以為填的東西大家都看得到，其實只在自己手機裡。程式用
`snapshot.metadata.fromCache` 擋掉這個誤判，6 秒後仍是快取就轉成紅點警告。
SDK 這時丟的錯誤訊息是 `client is offline`，很容易誤導，真正原因通常是上面那兩項設定。

## 資料長怎樣

主文件 `yearbookShirt/115-1`：

```json
{
  "classes": {
    "601": {"hex":"#1F3864","name":"丈青","style":"滿版印花","count":26,
            "note":"背面白色印花","by":"601","updated":"…","photoAt":"…"}
  },
  "layout": {"text":"115 永福","slots":{"0":["601","602"],"1":["603"]},"note":"…"},
  "updated": "…", "v": 1
}
```

照片不放主文件，放子集合 `yearbookShirt/115-1/photos/{班級}`，
主文件只留 `photoAt` 時間戳。這樣主文件維持在幾 KB，改一次顏色不會重寫幾百 KB 的照片；
班級端只抓自己那張，生教組與廠商才抓全部。

照片在瀏覽器端就壓好再上傳：長邊 1000px、JPEG，先降畫質再降尺寸，
直到小於 560KB（Firestore 單一文件上限 1MB）。實測 11.8MB 的手機照壓到 242KB，約 0.5 秒。
另存一張 320px 縮圖給色卡牆與表格用，捲動時不會拖垮頁面。

## 常見修改

**改班級／期限／承辦** — 改 `CFG` 就好，標頭、頁尾、入口頁全部跟著推導。改完重跑 `build-share.py`。

**加減色票** — 改 `CFG.palette`。腳本會擋掉重複色碼。導師仍可自訂 HEX，色票只是捷徑。

**撞色門檻** — `CFG.nearThreshold`，預設 12（CIE76 色差）。數字調大＝更嚴格，會抓出更多「太像」的配對。

**換下一屆** — 把 `FIRE_ID` 換成 `116-1`，Firestore 規則裡的文件 id 跟著改，
舊資料留在 `115-1` 不會被覆蓋，需要時還查得到。

**排字內容改字** — 廠商在頁面上改即可。字數變少時，超出的版位指派會自動清掉（其餘保留）。

## 內建能力（不要重寫）

| 功能 | 實作 |
|---|---|
| Excel | 自寫 ZIP（store）＋ inlineStr 的 xlsx，三個工作表：班服總表、色卡對照、排字版位 |
| PDF | canvas 畫 A4 橫式 → Flate → 最小 PDF 骨架；含色塊與班服照片縮圖 |
| CSV | 帶 BOM，Excel 開中文不亂碼 |
| 撞色檢查 | hex → Lab → CIE76 色差，兩兩比對 |
| 即時共用 | Firestore `runTransaction`，三段降級 Artifact → Firestore → localStorage |

零外部相依（只用 Google Fonts）。不要為了省事引入 SheetJS／jsPDF，
那會讓它在校內受限網路下反而不能用。PDF 走點陣是刻意的：
向量中文得嵌 CJK 字型（好幾 MB）或賭閱讀器自備字型（macOS 預覽程式就沒有）。

## 驗證清單

- [ ] 線上網址回 200，且 `curl | grep` 得到新的期限字串
- [ ] 狀態列顯示綠點與「即時共用中」
- [ ] 兩個分頁各開一個班，一邊送出，另一邊**不重新整理**應在一兩秒內看到
- [ ] 手機掃 QR 進得去，拍照上傳後色卡牆出現縮圖
- [ ] 匯出 Excel 用 `openpyxl` 開得起來；PDF 用 `qlmanage -t` 算得出縮圖
- [ ] 兩班選相近顏色時，班級端與生教組端都要跳撞色提醒

## 已知限制

- **Claude Artifact 裡不能用 Firestore**（CSP 擋 gstatic），會降級成 artifact runtime，
  且該模式不支援照片上傳，畫面會說明。正式使用請走 GitHub Pages。
- **規則刻意不允許刪除照片**。清除某班填寫時主文件紀錄會消失，子集合舊照片仍在，
  但畫面只走主文件，孤兒照片不會顯示，該班重新上傳會直接覆蓋。
- **檢視靠網址參數區分，不是權限控管**。校內工具夠用，但把廠商連結給誰就等於給了排字編輯權。
- QR 卡片在深色模式仍維持白底黑碼，這是刻意的 —— 反白 QR 有些掃描器讀不到。
