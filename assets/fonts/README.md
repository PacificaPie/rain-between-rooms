# 繁體手寫字型

本作使用 [LXGW WenKai TC / 霞鶩文楷繁體版](https://github.com/lxgw/LxgwWenkaiTC) Regular 的本作用字子集。來源為作者官方倉庫，固定版本 `a689a17490f509abb5d7dd434f6aaf1473a13724`；詳細出處見 `source.json`，完整授權見 `OFL.txt`。

- 原始檔：`source-regular.ttf`，15,341,148 bytes。SHA-256：`6662480a3f95b4a90c80b189c679617a48adce3a505118a6af63ce5a482b83fa`。
- 本作子集：`rain-hand.woff2`；最新大小、漢字與映射字元數、缺字檢查以 `subset-report.json` 為準。
- 為尊重原作者對衍生字型命名的要求，子集內部名稱改為 `Rain Between Rooms Hand`；CSS 別名為 `Rain Hand`。
- 紙頁、信紙、鏡中便條、字幕、題字與結局正文採用手寫字；較小的導覽與控制標籤維持系統繁體黑體，頻率和時間數字保留清晰的襯線字。
- `build.mjs` 將 WOFF2 與完整 OFL 授權內嵌至單一 HTML，遊戲不會向字型服務發出請求。

文案已轉為繁體並人工修正「鐘／鍾」「乾／幹」「帳簿」「天線插孔」等語意；`localization-map.json` 提供原簡體文字到繁體文字的 QA 對照。測試仍應優先使用不受語言影響的元素 id 或 `data-control`。

## 新增文字後重建子集

安裝 `fonttools` 與 `brotli` 後，於遊戲原始碼目錄執行：

```sh
python3 assets/fonts/subset-font.py
node build.mjs
```

子集程式讀取 `game.js`、`objects.js` 與 `template.html`，涵蓋目前全部用字。只改遊戲文字時須重新執行一次，才能讓新增漢字也使用本作手寫字。

本字型及其子集依 SIL Open Font License 1.1 提供；原作者並未替本遊戲背書。
