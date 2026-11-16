# 版本維護與 Funtrack 交付

## v0.1.0 · 2026-11-16

這是《隔窗有雨》沉浸版的第一個 GitHub 版本，包含粗明體電影式標題、兩個結局、繁體手寫字、可撤回的藍線、滾動信箱轉輪、物件音效與局部搖動暖光。

- 遊戲：`dist/隔窗有雨.html`，2,258,639 bytes。
- SHA-256：`bb9403bf8f3616e5662e5f15e6540d693d342fd476e18979786479c82b003fc5`。
- 封面：`dist/cover.jpg`。
- 驗證：18 組邏輯回歸及獨立音效測試通過；本機瀏覽器已實際完成流程並測過藍線撤回、拖動/滾輪與小屏標題。詳細邊界見 `qa/`。
- Funtrack：此版尚未上傳；不能把早期版本的平台驗收記錄當作本版結果。

## 修改與重建

在本倉庫根目錄修改原始檔，不直接修改 `dist/`：

```sh
node build.mjs
node qa/logic.mjs
node qa/audio-fx.mjs
python3 -m http.server 8779 --bind 127.0.0.1 --directory dist
```

`http://127.0.0.1:8779/` 用於本機預覽。HTML 已內嵌圖片、字型、程式與音樂；上傳遊戲時不必帶上 `assets/`。

增加文字時，先依 `assets/fonts/README.md` 重建手寫字子集；增加大標題用字時，同時依 `assets/fonts/display/README.md` 重建顯示字型並更新 template 中相應的字型 data URI。保留字型授權。一般程式建置只需要 Node，字庫工具另需 Python 的 fonttools 與 brotli。

## 保持版本可追溯

1. 修改源碼、重建並完成相應檢查，再提交源碼與 `dist/`。
2. 每個交付版本建立唯一 Git 標籤與 GitHub Release，把同一提交產生的 HTML、封面作為附件。
3. 在 Funtrack 選擇更新既有作品版本（若平台已提供此功能），上傳該 Release 的 HTML；需要封面時使用同版 cover.jpg。
4. 實際開啟 Funtrack 作品驗證載入與互動，再記錄作品 URL、Git 標籤、提交 SHA 和平台版本 ID。

GitHub 和 Funtrack 是兩份獨立的發布狀態。推送 GitHub 本身不會替換已上傳的遊戲；不要用相同版本名悄悄替換附件，下一輪使用新版本號。

## 存檔

目前使用 `rain-before-ends-immersive-v1`，本輪保留此鍵以兼容已有進度。瀏覽器依 origin 管理 localStorage；本機、平台或不同 sandbox 條件之間不保證共用存檔。更改狀態結構時應保留遷移處理並測試舊存檔恢復。
