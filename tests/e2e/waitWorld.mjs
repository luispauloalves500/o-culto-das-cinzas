/** espera o Game terminar de montar o capítulo (code-split / tela de loading) e o Elias GLB (ou o fallback) */
export async function waitWorld(page, timeout = 30000) {
  await page.waitForFunction(() => window.__ocdc && !window.__ocdc.loading, { timeout });
  await page.waitForFunction(() => {
    const m = window.__ocdc?.player?.model;
    return !m || m.ready || m.failed;
  }, { timeout: Math.min(8000, timeout) }).catch(() => {});
}
