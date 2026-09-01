#!/usr/bin/env python3
"""從共編表產生三個角色的 QR 圖與掃描入口頁。

表單裡的 CFG 是唯一真實來源：班級、期限、承辦單位改了，
重跑這支腳本，三張入口頁就會跟著對齊，不會出現「表單改了但入口頁還寫舊期限」。

兩個模組各有一組角色文案，用檔名自動判斷（banfu→畢冊班服、banfu5→五年級班服），
也可以用 --set 指定。

用法：
    python3 build-share.py --form docs/banfu.html \
        --url https://<user>.github.io/<repo>/banfu.html
    python3 build-share.py --form docs/banfu5.html \
        --url https://<user>.github.io/<repo>/banfu5.html
選用：
    --out-dir DIR   輸出目錄（預設同表單所在目錄）
    --roles a,b,c   只產生指定角色
    --set NAME      角色文案組（banfu／banfu5，預設依檔名判斷）
"""
import argparse, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))

ROLES = {
    "class": {
        "suffix": "",
        "query": "",
        "title": "各班上傳班服顏色",
        "who": "六年級各班導師",
        "lede": "用手機掃描下方 QR code，上傳班服顏色",
        "tone": "p2",
        "steps": [
            ("點選自己的班級", "{first} 到 {last}，點一下就成為目前身分"),
            ("選一個班服顏色", "點色票或自訂色碼，畫面會即時提醒和哪一班撞色"),
            ("拍一張班服照片", "拍實體班服平放即可，系統自動壓縮，不吃流量"),
            ("按送出 / 更新", "{n} 個班看到同一份，誰填了什麼會即時顯示"),
        ],
        "note": "填錯可以重填，按「送出 / 更新」直接覆蓋。<br>"
                "顏色請盡量和其他班分得開，遠拍編字才不會糊成一片。",
        "foot": "生教組可在檢視頁看到全校總表<br>並匯出 Excel 與 PDF",
    },
    "check": {
        "suffix": "-check",
        "query": "?v=check",
        "title": "生教組檢視",
        "who": "生教組",
        "lede": "全校班服顏色一覽、未繳名單與撞色提醒",
        "tone": "p1",
        "steps": [
            ("看繳交狀況", "哪些班還沒交、哪些班沒附照片，一眼看完"),
            ("看撞色提醒", "系統兩兩比對顏色色差，太接近會標紅"),
            ("匯出存查", "Excel 三個工作表，PDF 一頁含色塊與班服照片"),
        ],
        "note": "此檢視為唯讀，不會更動各班填寫的內容。<br>"
                "需要改內容請通知該班導師自行更新。",
        "foot": "資料與各班填寫頁即時同步",
    },
    "vendor": {
        "suffix": "-vendor",
        "query": "?v=vendor",
        "title": "廠商 · 編字拍照",
        "who": "畢冊廠商",
        "lede": "各班班服顏色與實體照片，並規劃排字版位",
        "tone": "p4",
        "steps": [
            ("對色", "每班色卡有色碼與班服實照，點照片可放大"),
            ("排版位", "輸入排字內容，把班級指派到每個字，會顯示該字的色帶與人數"),
            ("帶走資料", "匯出 Excel 或 PDF，含色卡對照與排字版位表"),
        ],
        "note": "排字版位會存回同一份資料，學校端同步看得到。<br>"
                "顏色請以班服實照與實體為準，螢幕色僅供參考。",
        "foot": "有疑問請聯絡學校承辦單位",
    },
}


ROLES5 = {
    "class": {
        "suffix": "",
        "query": "",
        "title": "各班填寫班服",
        "who": "五年級各班導師",
        "lede": "用手機掃描下方 QR code，選顏色、上傳圖案、填件數",
        "tone": "p2",
        "steps": [
            ("點選自己的班級", "{first} 到 {last}，點一下就成為目前身分"),
            ("登記一個班服顏色", "一個顏色只留一個班；色塊下方會顯示幾個班登記了，已定案的點不下去"),
            ("上傳圖案、看試衣間", "去背 PNG 會保留透明背景，位置和大小可以直接拉"),
            ("填各尺寸件數再送出", "XS 到 XXL 分開填，系統自動加總，{n} 個班看到同一份"),
        ],
        "note": "一個顏色最後只有一個班能用。兩個班以上想要同一個顏色，就抽籤決定留哪一班。<br>"
                "先送出不會比較有利 —— 抽籤時所有登記的班一起抽，沒抽中的班要改選，畫面會直接提醒。",
        "foot": "承辦與廠商看到同一份<br>件數改了，廠商報價會即時跟著算",
    },
    "admin": {
        "suffix": "-admin",
        "query": "?v=admin",
        "title": "承辦檢視",
        "who": "學務處承辦",
        "lede": "選色狀況、撞色抽籤、尺寸總表與廠商比價",
        "tone": "p1",
        "steps": [
            ("看選色與繳交狀況", "誰還沒填、誰要改選、哪些顏色撞在一起，一頁看完"),
            ("主持撞色抽籤", "同一顏色有兩個班以上登記時抽籤，種子與順序留紀錄可公開查驗"),
            ("匯出與比價", "Excel 四個工作表、PDF 一頁；多家廠商報價自動排序"),
        ],
        "note": "除了主持抽籤，此檢視不會更動各班填的內容。<br>"
                "要改內容請通知該班導師自己改，責任才清楚。",
        "foot": "資料與各班填寫頁即時同步",
    },
    "vendor": {
        "suffix": "-vendor",
        "query": "?v=vendor",
        "title": "廠商 · 線上報價",
        "who": "班服廠商",
        "lede": "各班顏色、款式、圖案與件數，直接線上報價",
        "tone": "p4",
        "steps": [
            ("看款式與圖案", "每班的顏色、袖長領型、正反面試衣圖，點圖可放大"),
            ("填單價與版費", "可先填共同單價一鍵帶入，再逐班調整；小計即時算"),
            ("下載報價單", "一頁 PDF 可直接回傳學校，Excel 另有完整明細"),
        ],
        "note": "報價會存回同一份資料，學校端同步看得到。<br>"
                "螢幕顏色僅供參考，實際請以布料色卡與打樣為準。",
        "foot": "件數由各班自行填報，決標前請再確認",
    },
}

ROLE_SETS = {"banfu": ROLES, "banfu5": ROLES5}


def pick_set(name, stem):
    """--set 沒指定時依檔名判斷，避免拿畢冊的文案去產五年級的入口頁。"""
    if name and name != "auto":
        if name not in ROLE_SETS:
            sys.exit("不認識的角色文案組：" + name + "（可用：" + "、".join(ROLE_SETS) + "）")
        return ROLE_SETS[name]
    return ROLE_SETS.get(stem, ROLES)


def read_cfg(form_path):
    """用 node 求值 CFG，避免自己寫半套 JS 解析器。"""
    js = r"""
      const fs = require('fs');
      const html = fs.readFileSync(process.argv[1], 'utf8');
      const m = html.match(/const CFG = (\{[\s\S]*?\n\});/);
      if (!m) { console.error('找不到 const CFG = {...};'); process.exit(2); }
      console.log(JSON.stringify(eval('(' + m[1] + ')')));
    """
    out = subprocess.run(["node", "-e", js, form_path], capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit("讀取 CFG 失敗：" + (out.stderr.strip() or "未知錯誤"))
    return json.loads(out.stdout)


def qr_parts(url):
    """回傳 (模組數, SVG path, segno 物件)。容錯等級 Q，印出來被遮到一角仍可掃。"""
    try:
        import segno
    except ImportError:
        sys.exit("需要 segno：pip install segno")
    qr = segno.make(url, error="q")
    m = [list(r) for r in qr.matrix]
    n = len(m)
    d = []
    for y, row in enumerate(m):
        x = 0
        while x < n:
            if row[x]:
                run = 1
                while x + run < n and row[x + run]:
                    run += 1
                d.append("M%d %dh%dv1h-%dz" % (x, y, run, run))
                x += run
            else:
                x += 1
    return n, "".join(d), qr


def steps_html(role, cfg):
    out = []
    for title, desc in role["steps"]:
        desc = desc.format(first=cfg["classes"][0], last=cfg["classes"][-1], n=len(cfg["classes"]))
        out.append('    <li><div><b>%s</b><span>%s</span></div></li>' % (title, desc))
    return "\n".join(out)


def palette_html(cfg):
    """入口頁順便把色票列出來，導師掃進來前就知道有哪些選擇。"""
    cells = []
    for p in cfg["palette"]:
        cells.append('<span class="sw"><i style="background:%s"></i>%s</span>' % (p["hex"], p["name"]))
    return "".join(cells)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--form", required=True)
    ap.add_argument("--url", required=True, help="banfu.html 的線上網址，不含 ?v=")
    ap.add_argument("--out-dir")
    ap.add_argument("--roles")
    ap.add_argument("--set", default="auto")
    ap.add_argument("--assets", default=os.path.join(HERE, "..", "assets"))
    a = ap.parse_args()

    cfg = read_cfg(a.form)
    out_dir = a.out_dir or os.path.dirname(os.path.abspath(a.form))
    stem = os.path.splitext(os.path.basename(a.form))[0]
    roles_of = pick_set(a.set, stem)
    wanted = a.roles or ",".join(roles_of)
    base = a.url.split("?")[0]
    tpl = open(os.path.join(a.assets, "share-page.html"), encoding="utf-8").read()

    made = []
    for key in [r.strip() for r in wanted.split(",") if r.strip()]:
        if key not in roles_of:
            sys.exit("不認識的角色：" + key + "（這組可用：" + "、".join(roles_of) + "）")
        role = roles_of[key]
        url = base + role["query"]
        n, path, qr = qr_parts(url)
        png = os.path.join(out_dir, stem + role["suffix"] + "-qr.png")
        scale = max(1, round(600 / (n + 8)))
        qr.save(png, scale=scale, border=4, dark="#1e1c19", light="#ffffff")

        page = tpl
        repl = {
            "__TITLE__": cfg["title"] + "　" + role["title"],
            "__DESC__": "掃描 QR code 進入" + cfg["title"] + "（" + role["title"] + "）",
            "__EYEBROW__": cfg["school"] + " · " + cfg["term"] + " · " + cfg["grade"],
            "__H1__": role["title"],
            "__LEDE__": role["lede"],
            "__TONE__": role["tone"],
            "__WHO__": role["who"],
            "__QRSIZE__": str(n + 8),
            "__QRPATH__": path,
            "__URL__": url,
            "__STEPS__": steps_html(role, cfg),
            "__DEADLINE__": cfg["deadline"],
            "__CONTACT__": cfg["contact"],
            "__NCLASSES__": str(len(cfg["classes"])),
            "__CLASSRANGE__": "%s–%s" % (cfg["classes"][0], cfg["classes"][-1]),
            "__PALETTE__": palette_html(cfg) if key == "class" else "",
            "__PALETTEHIDE__": "" if key == "class" else ' hidden',
            "__NOTE__": role["note"],
            "__FOOTER__": role["foot"],
        }
        for k, v in repl.items():
            page = page.replace(k, v)
        left = sorted(set(re.findall(r"__[A-Z]+__", page)))
        if left:
            sys.exit("模板還有未填的佔位符：" + ", ".join(left))
        share = os.path.join(out_dir, stem + role["suffix"] + "-share.html")
        open(share, "w", encoding="utf-8").write(page)
        made.append((role["title"], url, png, share))

    print("已產生")
    for title, url, png, share in made:
        print("  %-14s %s" % (title, url))
        print("                 %s" % os.path.basename(png))
        print("                 %s" % os.path.basename(share))
    print("\n設定檢查")
    print("  班級 %d 班：%s" % (len(cfg["classes"]), "、".join(cfg["classes"])))
    print("  色票 %d 色" % len(cfg["palette"]))
    if "perColor" in cfg:
        per, n = cfg["perColor"], len(cfg["classes"])
        print("  一個顏色最多 %d 班，超過就抽籤（先選先得 %d 席）" % (per, cfg["freeSeats"]))
        seats = len(cfg["palette"]) * per
        print("  色票可容納 %d 班 / 全校 %d 班　%s" % (seats, n, "夠分" if seats >= n else "不夠分，請加色票！"))
        print("  尺寸 %s" % "、".join(cfg.get("sizes", [])))
    if "styles" in cfg:
        print("  款式 %d 種" % len(cfg["styles"]))
    print("  繳交期限 %s，承辦 %s" % (cfg["deadline"], cfg["contact"]))
    dup = [p["hex"] for p in cfg["palette"]]
    if len(set(dup)) != len(dup):
        sys.exit("\n色票有重複的色碼，請檢查 CFG.palette。")


if __name__ == "__main__":
    main()
