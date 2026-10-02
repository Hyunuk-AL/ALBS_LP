"""LP を claude.ai Artifact 用の単一 HTML にまとめる。
使い方: python3 artifact/build.py <出力パス>"""
import re, sys, pathlib, base64
root = pathlib.Path(__file__).resolve().parent.parent
here = root / "artifact"
html = (root / "index.html").read_text()
css = (root / "assets/css/style.css").read_text() + "\n" + (here / "results.css").read_text()
js = (root / "assets/js/main.js").read_text()
adapter = (here / "adapter.js").read_text()

body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
body = body.replace('<script src="assets/js/main.js"></script>', "")
# 画像は data URI として埋め込む
body = re.sub(r'src="(assets/img/[^"]+\.jpg)"',
              lambda m: 'src="data:image/jpeg;base64,' + base64.b64encode((root / m.group(1)).read_bytes()).decode() + '"', body)
fonts = re.search(r'<link href="https://fonts.googleapis.com[^>]+>', html).group(0)

# Artifact 内では mailto が届かない閲覧者がいるため、宛先はテキストとして見せる
body = body.replace('<a href="mailto:support@arch-log.com">お問い合わせ：support@arch-log.com</a>',
                    '<span>お問い合わせ：<span class="selectable">support@arch-log.com</span></span>')
body = body.replace('<a href="mailto:support@arch-log.com">support@arch-log.com</a>', "support@arch-log.com")

results = """
<section class="results" id="results" hidden>
  <div class="container">
    <p class="section-label">編集者のみ表示</p>
    <h2>アンケート集計</h2>
    <p class="r-note">このパネルは編集権限のある方にだけ表示されます。回答はリアルタイムに更新されます。</p>
    <div class="r-body"></div>
  </div>
</section>
"""
body = body.replace("<footer", results + "\n<footer", 1)

# Artifact 用の微調整（ライトテーマ固定・セーフエリア）
css += """
:root { color-scheme: light; }
body { background: var(--bg); color: var(--text); }
.site-header { top: env(safe-area-inset-top, 0px); }
.float-cta { bottom: calc(16px + env(safe-area-inset-bottom, 0px)); }
.selectable { user-select: all; color: #C5CCD8; }
/* 静止状態では組み上がった姿を見せ、再生時に分解位置から組み立て直す */
.js .asm .part { opacity: 1; transform: none; }
.js .asm .dim { opacity: 1; }
.js .asm .tag { opacity: .35; }
.js .product-copy .result-chip { opacity: 1; transform: none; }
.asm.is-play .part { animation: assembleIn var(--dur, .9s) cubic-bezier(.2, .9, .25, 1.05) var(--d, 0s) both; }
.asm.is-play .dim { animation: dimIn .6s ease var(--d, 0s) both; }
.asm.is-play .tag { animation: tagFlash 1.6s ease var(--d, 0s) both; }
.product-copy.is-play .result-chip { animation: chipFrom .6s ease var(--d, 0s) both; }
@keyframes assembleIn { from { opacity: 0; transform: translate(var(--dx, 0px), var(--dy, 0px)) rotate(var(--r, 0deg)) scale(var(--s, 1)); } to { opacity: 1; transform: none; } }
@keyframes dimIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes chipFrom { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
"""

out = f"""<title>Arch-LINC タイプ生成</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{fonts}
<style>
{css}
</style>
<script>document.documentElement.classList.add('js');window.LP_CONFIG={{SURVEY_ENDPOINT:"",GA_MEASUREMENT_ID:"",TRACK_VISITS:true}};</script>
{body}
<script>
{adapter}
</script>
<script>
{js}
</script>
"""
pathlib.Path(sys.argv[1]).write_text(out)
print("wrote", sys.argv[1], len(out), "bytes")
