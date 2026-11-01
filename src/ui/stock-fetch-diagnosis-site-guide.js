const guideContent = document.getElementById('guideContent');

async function loadStockFetchDiagnosisSiteGuide() {
    try {
        const response = await fetch('../../docs/在庫Fetch診断_サイト追加手順.md');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        guideContent.textContent = await response.text();
    } catch (error) {
        guideContent.classList.add('error');
        guideContent.textContent = `手順書を読み込めませんでした: ${error.message}`;
    }
}

loadStockFetchDiagnosisSiteGuide();
