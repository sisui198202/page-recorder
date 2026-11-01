#!/usr/bin/env node
/**
 * set-test-times.js
 * scheduled-watch-sites.json の baselineTime と schedules を
 * 現在時刻から計算して自動設定するスクリプト
 *
 * Usage:
 *   node scripts/set-test-times.js              # 全サイトの時間を設定
 *   node scripts/set-test-times.js --site aeon-pokemon  # 特定サイトのみ
 *   node scripts/set-test-times.js --baseline-only      # baselineTimeのみ設定
 *   node scripts/set-test-times.js --schedules-only     # schedulesのみ設定
 *   node scripts/set-test-times.js --baseline-only --site aeon-pokemon  # 特定サイトのbaselineTimeのみ
 *   node scripts/set-test-times.js --schedules-only --site aeon-pokemon # 特定サイトのschedulesのみ
 *   node scripts/set-test-times.js --backup     # 設定をバックアップ
 *   node scripts/set-test-times.js --restore    # バックアップから復元
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../src/config/scheduled-watch-sites.json');
const BACKUP_PATH = CONFIG_PATH + '.backup';

// 時刻フォーマット (HH:MM)
function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// 分を加算
function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

// バックアップ
function backup() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('設定ファイルが見つかりません:', CONFIG_PATH);
    process.exit(1);
  }
  fs.copyFileSync(CONFIG_PATH, BACKUP_PATH);
  console.log('バックアップ完了:', BACKUP_PATH);
}

// 復元
function restore() {
  if (!fs.existsSync(BACKUP_PATH)) {
    console.error('バックアップファイルが見つかりません:', BACKUP_PATH);
    process.exit(1);
  }
  fs.copyFileSync(BACKUP_PATH, CONFIG_PATH);
  console.log('復元完了:', CONFIG_PATH);
}

// サイト絞り込み（指定サイトのみ有効化）
function isolateSite(targetSiteId) {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('設定ファイルが見つかりません:', CONFIG_PATH);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  let found = false;

  console.log('サイト絞り込み実行\n');

  config.sites.forEach(site => {
    if (site.id === targetSiteId) {
      site.enabled = true;
      found = true;
      console.log(`${site.id}: enabled = true (テスト対象)`);
    } else {
      site.enabled = false;
      console.log(`${site.id}: enabled = false (無効化)`);
    }
  });

  if (!found) {
    console.error(`\nサイトが見つかりません: ${targetSiteId}`);
    process.exit(1);
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log('\nサイト絞り込み完了');
  console.log('Chrome拡張をリロードしてください');
}

// 全サイト有効化
function enableAllSites() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('設定ファイルが見つかりません:', CONFIG_PATH);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  console.log('全サイト有効化実行\n');

  config.sites.forEach(site => {
    site.enabled = true;
    console.log(`${site.id}: enabled = true`);
  });

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log('\n全サイト有効化完了');
  console.log('Chrome拡張をリロードしてください');
}

// 時間設定
function setTimes(targetSiteId = null, baselineOnly = false, schedulesOnly = false) {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('設定ファイルが見つかりません:', CONFIG_PATH);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const now = new Date();

  let modeLabel = 'テスト時間';
  if (baselineOnly) {
    modeLabel = 'baselineTimeのみ';
  } else if (schedulesOnly) {
    modeLabel = 'schedulesのみ';
  }
  console.log(`${modeLabel}を設定しました\n`);

  config.sites.forEach(site => {
    // --site オプションが指定された場合、対象サイトのみ処理
    if (targetSiteId && site.id !== targetSiteId) {
      return;
    }

    console.log(`${site.id}:`);

    // --schedules-only でない場合のみ baselineTime を設定
    if (!schedulesOnly) {
      site.baselineTime = formatTime(addMinutes(now, 1));
      console.log(`   baselineTime: ${site.baselineTime}`);
    } else {
      console.log(`   baselineTime: 変更なし`);
    }

    // --baseline-only でない場合のみ schedules も設定
    if (!baselineOnly) {
      site.schedules = [
        {
          startTime: formatTime(addMinutes(now, 2)),
          endTime: formatTime(addMinutes(now, 3)),
          intervalSeconds: 30
        },
        {
          startTime: formatTime(addMinutes(now, 4)),
          endTime: formatTime(addMinutes(now, 6)),
          intervalSeconds: 60
        }
      ];
      console.log(`   schedule 1: ${site.schedules[0].startTime} - ${site.schedules[0].endTime} (30秒間隔)`);
      console.log(`   schedule 2: ${site.schedules[1].startTime} - ${site.schedules[1].endTime} (60秒間隔)`);
    } else {
      console.log(`   schedules: 変更なし`);
    }
    console.log('');
  });

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

  console.log('Chrome拡張をリロードしてください');
  if (!schedulesOnly) {
    console.log(`   baseline開始まで: 約1分`);
  }
}

// メイン処理
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--backup')) {
    backup();
    return;
  }

  if (args.includes('--restore')) {
    restore();
    return;
  }

  // --isolate オプションの処理
  const isolateIndex = args.indexOf('--isolate');
  if (isolateIndex !== -1) {
    const targetSiteId = args[isolateIndex + 1];
    if (!targetSiteId) {
      console.error('--isolate にはサイトIDが必要です');
      console.error('Usage: node set-test-times.js --isolate <siteId>');
      process.exit(1);
    }
    isolateSite(targetSiteId);
    return;
  }

  // --enable-all オプションの処理
  if (args.includes('--enable-all')) {
    enableAllSites();
    return;
  }

  // --site オプションの処理
  const siteIndex = args.indexOf('--site');
  const targetSiteId = siteIndex !== -1 ? args[siteIndex + 1] : null;

  // --baseline-only オプションの処理
  const baselineOnly = args.includes('--baseline-only');

  // --schedules-only オプションの処理
  const schedulesOnly = args.includes('--schedules-only');

  setTimes(targetSiteId, baselineOnly, schedulesOnly);
}

main();
