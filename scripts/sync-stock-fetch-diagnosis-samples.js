#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const TARGET_ROOT = "~/Work/buy/Target";
const OUTPUT_PATH = path.resolve(
  __dirname,
  "../src/config/stock-fetch-diagnosis-sites.json",
);
const INITIAL_SITE_IDS = new Set(["nissan", "aeon", "sevennet"]);

function readUrlEntries(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const entries = [];
  let title = "";
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const titleMatch = line.match(/^title\s*:\s*(.+)$/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
      continue;
    }
    const urlMatch = line.match(/^url\s*:\s*(.+)$/i);
    const value = urlMatch
      ? urlMatch[1].trim()
      : /^https?:\/\//i.test(line)
        ? line
        : "";
    if (!value) continue;
    try {
      entries.push({ url: new URL(value).toString(), title });
    } catch (_) {
      // 手動キャプチャ内の不正な行は設定へ取り込まない。
    }
  }
  return entries;
}

function findEcSiteForUrl(url, sites) {
  const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  const matched = sites.filter((site) =>
    (site.patterns || []).some((pattern) => {
      const normalized = String(pattern)
        .toLowerCase()
        .replace(/^www\./, "");
      return hostname === normalized || hostname.endsWith(`.${normalized}`);
    }),
  );
  return matched.length === 1 ? matched[0] : null;
}

function collectSamples(
  targetRoot,
  ecSites,
  allowedSiteIds = INITIAL_SITE_IDS,
) {
  const bySite = new Map();
  for (const directory of fs.readdirSync(targetRoot, { withFileTypes: true })) {
    if (!directory.isDirectory()) continue;
    for (const [state, folder] of Object.entries({
      in_stock: "02_product_in_stock",
      out_of_stock: "03_product_out_of_stock",
    })) {
      const urlFile = path.join(
        targetRoot,
        directory.name,
        "site_capture",
        folder,
        "url.txt",
      );
      if (!fs.existsSync(urlFile)) continue;
      for (const entry of readUrlEntries(urlFile)) {
        const site = findEcSiteForUrl(entry.url, ecSites);
        if (!site || !allowedSiteIds.has(site.id)) continue;
        if (!bySite.has(site.id))
          bySite.set(site.id, { id: site.id, name: site.name, samples: [] });
        const record = {
          state,
          url: entry.url,
          ...(entry.title ? { title: entry.title } : {}),
        };
        const current = bySite.get(site.id).samples;
        if (
          !current.some(
            (sample) =>
              sample.state === record.state && sample.url === record.url,
          )
        )
          current.push(record);
      }
    }
  }
  return [...bySite.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function buildConfig({
  targetRoot = TARGET_ROOT,
  ecSitesPath = path.resolve(__dirname, "../src/config/ec-sites.json"),
} = {}) {
  const ecSites = JSON.parse(fs.readFileSync(ecSitesPath, "utf8")).sites || [];
  return {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    sites: collectSamples(targetRoot, ecSites),
  };
}

function mergeGeneratedSites(existingSites = [], generatedSites = [], replaceSiteIds = INITIAL_SITE_IDS) {
  const retainedSites = (Array.isArray(existingSites) ? existingSites : [])
    .filter((site) => !replaceSiteIds.has(site?.id));
  return [...retainedSites, ...(Array.isArray(generatedSites) ? generatedSites : [])]
    .sort((left, right) => String(left.id).localeCompare(String(right.id)));
}

function main() {
  const config = buildConfig();
  const existingConfig = fs.existsSync(OUTPUT_PATH)
    ? JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"))
    : {};
  config.sites = mergeGeneratedSites(existingConfig.sites, config.sites);
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(config, null, 2)}\n`);
  process.stdout.write(
    `同期完了: ${config.sites.length}サイト、${config.sites.reduce((count, site) => count + site.samples.length, 0)}件\n`,
  );
}

if (require.main === module) main();

module.exports = {
  readUrlEntries,
  findEcSiteForUrl,
  collectSamples,
  buildConfig,
  mergeGeneratedSites,
};
