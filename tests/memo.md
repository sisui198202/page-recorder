## Discord チャンネルID

aeon:https://discord.com/channels/1476859250478153829/1512256504668094514
toysrus:https://discord.com/channels/1476859250478153829/1512256548897030234

---
## main_discord_post_url_monitor のID

ID:ibmbjnemcpminbmenepldhockemdpomc

---
## イオン:PageRecorder拡張機能からmain_discord_post_url_monitor拡張機能側へ、送る

chrome.runtime.sendMessage('ibmbjnemcpminbmenepldhockemdpomc', {
    type: 'PAGE_RECORDER_STOCK_DETECTED',
    source: 'PageRecorder',
    siteId: 'aeon',
    discordChannelId: '1512256504668094514',
    urls:
  ['https://aeonretail.com/product/0/P-2319294424002/P-231929442400201/'],
    targetUrl:
  'https://aeonretail.com/Form/Product/ProductList.aspx?gspsk=%e3%83%9d%e3%82%b1%e3%83%a2%e3%83%b3%e3%82%ab%e3%83%bc%e3%83%89&psc=0',
    title: 'manual test aeon',
    count: 1
  }).then(console.log).catch(console.error)

---
## トイザラス:PageRecorder拡張機能からmain_discord_post_url_monitor拡張機能側へ、送る

chrome.runtime.sendMessage('ibmbjnemcpminbmenepldhockemdpomc', {
    type: 'PAGE_RECORDER_STOCK_DETECTED',
    source: 'PageRecorder',
    siteId: 'toysrus',
    discordChannelId: '1512256548897030234',
    urls:
  ['https://www.toysrus.co.jp/ja-jp/8298467-10143753.html'],
    targetUrl:
  'https://www.toysrus.co.jp/ja-jp/pokemoncardgame/',
    title: 'manual test toysrus',
    count: 1
  }).then(console.log).catch(console.error)

---