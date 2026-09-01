#!/usr/bin/env python3
"""從 banfu.html 產生三個角色的 QR 圖與掃描入口頁。

banfu.html 裡的 CFG 是唯一真實來源：班級、期限、承辦單位改了，
重跑這支腳本，三張入口頁就會跟著對齊，不會出現「表單改了但入口頁還寫舊期限」。

用法：
    python3 build-share.py --form docs/banfu.html \
        --url https://<user>.github.io/<repo>/banfu.html
選用：
    --out-dir DIR   輸出目錄（預設同表單所在目錄）
    --roles a,b,c   只產生指定角色（class,check,vendor）
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
    ap.add_argument("--roles", default="class,check,vendor")
    ap.add_argument("--assets", default=os.path.join(HERE, "..", "assets"))
    a = ap.parse_args()

    cfg = read_cfg(a.form)
    out_dir = a.out_dir or os.path.dirname(os.path.abspath(a.form))
    stem = os.path.splitext(os.path.basename(a.form))[0]
    base = a.url.split("?")[0]
    tpl = open(os.path.join(a.assets, "share-page.html"), encoding="utf-8").read()

    made = []
    for key in [r.strip() for r in a.roles.split(",") if r.strip()]:
        if key not in ROLES:
            sys.exit("不認識的角色：" + key)
        role = ROLES[key]
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
    print("  色票 %d 色，款式 %d 種" % (len(cfg["palette"]), len(cfg["styles"])))
    print("  繳交期限 %s，承辦 %s" % (cfg["deadline"], cfg["contact"]))
    dup = [p["hex"] for p in cfg["palette"]]
    if len(set(dup)) != len(dup):
        sys.exit("\n色票有重複的色碼，請檢查 CFG.palette。")


if __name__ == "__main__":
    main()
