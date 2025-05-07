import { connect } from "cloudflare:sockets";

let cachedProxyList = [];
let proxyIP = "";

const DEFAULT_PROXY_BANK_URL = "https://raw.githubusercontent.com/InconigtoVPN/ProxyIP/refs/heads/main/proxyList.txt";
const TELEGRAM_BOT_TOKEN = '7944516307:AAE2Mk7djM1v2dTStWvxwLXI1zGdVdVgE8c';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const apiCheck = 'https://proxyip.biz.id/';
const ChatID = '';
const Chanell = '';
const Group = '';
const Owner = '';

const FAKE_HOSTNAME = '';

const pathinfo = "Inconigto-Mode";
const watermark = "Inconigto-Mode";


async function handleActive(request) {
  const host = request.headers.get('Host');
  const webhookUrl = `https://${host}/webhook`;

  const response = await fetch(`${TELEGRAM_API_URL}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
  });

  if (response.ok) {
    return new Response('Webhook set successfully', { status: 200 });
  }
  return new Response('Failed to set webhook', { status: 500 });
}

// Fungsi untuk menangani `/delete` (menghapus webhook)
async function handleDelete(request) {
  const response = await fetch(`${TELEGRAM_API_URL}/deleteWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.ok) {
    return new Response('Webhook deleted successfully', { status: 200 });
  }
  return new Response('Failed to delete webhook', { status: 500 });
}

// Fungsi untuk menangani `/info` (mendapatkan info webhook)
async function handleInfo(request) {
  const response = await fetch(`${TELEGRAM_API_URL}/getWebhookInfo`);

  if (response.ok) {
    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200 });
  }
  return new Response('Failed to retrieve webhook info', { status: 500 });
}

// Fungsi untuk menangani `/webhook`
async function handleWebhook(request) {
  const update = await request.json();

  if (update.callback_query) {
    return await handleCallbackQuery(update.callback_query);
  } else if (update.message) {
    return await handleMessage(update.message);
  }

  return new Response('OK', { status: 200 });
}

// Fungsi untuk menangani `/sendMessage`
async function handleSendMessage(request) {
  const { chat_id, text } = await request.json();
  const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text }),
  });

  if (response.ok) {
    return new Response('Message sent successfully', { status: 200 });
  }
  return new Response('Failed to send message', { status: 500 });
}

// Fungsi untuk menangani `/getUpdates`
async function handleGetUpdates(request) {
  const response = await fetch(`${TELEGRAM_API_URL}/getUpdates`);

  if (response.ok) {
    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200 });
  }
  return new Response('Failed to get updates', { status: 500 });
}

// Fungsi untuk menangani `/deletePending` - menarik pembaruan yang tertunda
async function handleDeletePending(request) {
  // Hapus webhook untuk menghindari pembaruan tertunda
  const deleteResponse = await fetch(`${TELEGRAM_API_URL}/deleteWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (deleteResponse.ok) {
    // Setelah menghapus webhook, atur webhook kembali
    const host = request.headers.get('Host');
    const webhookUrl = `https://${host}/webhook`;

    const setResponse = await fetch(`${TELEGRAM_API_URL}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });

    if (setResponse.ok) {
      return new Response('Pending updates deleted by resetting webhook', { status: 200 });
    }
    return new Response('Failed to set webhook after deletion', { status: 500 });
  }

  return new Response('Failed to delete webhook', { status: 500 });
}


// Routing utama sebelum mencapai handler default
async function routeRequest(request) {
  const url = new URL(request.url);

  if (url.pathname === '/active') {
    return await handleActive(request);
  }

  if (url.pathname === '/delete') {
    return await handleDelete(request);
  }

  if (url.pathname === '/info') {
    return await handleInfo(request);
  }

  if (url.pathname === '/webhook' && request.method === 'POST') {
    return await handleWebhook(request);
  }

  if (url.pathname === '/sendMessage') {
    return await handleSendMessage(request);
  }

  if (url.pathname === '/getUpdates') {
    return await handleGetUpdates(request);
  }

  if (url.pathname === '/deletePending') {
    return await handleDeletePending(request);
  }


  return null;
}

const getEmojiFlag = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return ''; // Validasi input
  return String.fromCodePoint(
    ...[...countryCode.toUpperCase()].map(char => 0x1F1E6 + char.charCodeAt(0) - 65)
  );
};

async function handleCallbackQuery(callbackQuery) {
  const callbackData = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;

  const HostBot = FAKE_HOSTNAME; // Ganti dengan host default yang benar

  try {
    if (callbackData.startsWith('create_vless')) {
      const [_, ip, port, isp] = callbackData.split('|');
      await handleVlessCreation(chatId, ip, port, isp, HostBot);
    } else if (callbackData.startsWith('create_trojan')) {
      const [_, ip, port, isp] = callbackData.split('|');
      await handleTrojanCreation(chatId, ip, port, isp, HostBot);
    } else if (callbackData.startsWith('create_ss')) {
      const [_, ip, port, isp] = callbackData.split('|');
      await handleShadowSocksCreation(chatId, ip, port, isp, HostBot);
    }

    // Konfirmasi callback query ke Telegram
    await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQuery.id,
      }),
    });
  } catch (error) {
    console.error('Error handling callback query:', error);
  }

  return new Response('OK', { status: 200 });
}


let userChatIds = [];

// Function to handle incoming messages
async function handleMessage(message) {
  const text = message.text;
  const chatId = message.chat.id;

  try {
    // Menangani perintah /start
    if (text === '/start') {
      await handleStartCommand(chatId);

      // Menambahkan pengguna ke daftar jika belum ada
      if (!userChatIds.includes(chatId)) {
        userChatIds.push(chatId);
      }

    // Menangani perintah /info
    } else if (text === '/info') {
      await handleGetInfo(chatId);

    // Menangani perintah /listwildcard
    } else if (text === '/listwildcard') {
      await handleListWildcard(chatId);

    // Menangani perintah /getrandomip
    } else if (text === '/getrandomip') {
      await handleGetRandomIPCommand(chatId);

    // Menangani perintah /getrandom <CountryCode>
    } else if (text.startsWith('/getrandom')) {
      const countryId = text.split(' ')[1]; // Mengambil kode negara setelah "/getrandom"
      if (countryId) {
        await handleGetRandomCountryCommand(chatId, countryId);
      } else {
        await sendTelegramMessage(chatId, '⚠️ Harap tentukan kode negara setelah `/getrandom` (contoh: `/getrandom ID`, `/getrandom US`).');
      }

    // Menangani perintah /broadcast
    } else if (text.startsWith('/broadcast')) {
      await handleBroadcastCommand(message);

    // Menangani format IP:Port
    } else if (isValidIPPortFormat(text)) {
      // Jika input adalah satu pasangan IP:Port, langsung periksa
      await handleIPPortCheck(text, chatId);
    } else {
      // Cek jika input mengandung beberapa pasangan IP:Port yang dipisahkan oleh koma atau baris baru
      const ipPortList = text.split(/[\n,]+/).map(item => item.trim()); // Split berdasarkan koma atau baris baru
    
      let isValid = true;
    
      for (let ipPortText of ipPortList) {
        // Periksa format setiap pasangan IP:Port
        if (!isValidIPPortFormat(ipPortText)) {
          isValid = false;
          break; // Jika ada yang tidak valid, berhenti memeriksa dan kirimkan pesan kesalahan
        }
      }
    
      if (isValid) {
        // Jika semua format IP:Port valid, lakukan pengecekan untuk setiap pasangan
        for (let ipPortText of ipPortList) {
          await handleIPPortCheck(ipPortText, chatId);
        }
      } else {
        // Jika format salah, beri pesan kesalahan
        await sendTelegramMessage(chatId, '⚠️ Format tidak valid. Gunakan format IP:Port yang benar (contoh: 192.168.1.1:80).');
      }
    }
    

    return new Response('OK', { status: 200 });

  } catch (error) {
    // Log the error and send an error message to the user
    console.error('Error processing message:', error);
    await sendTelegramMessage(chatId, '⚠️ Terjadi kesalahan dalam memproses perintah. Silakan coba lagi nanti.');
    return new Response('Error', { status: 500 });
  }
}


// Fungsi untuk menangani perintah /broadcast
async function handleBroadcastCommand(message) {
  const chatId = message.chat.id;
  const text = message.text;

  // Memeriksa apakah pengirim adalah pemilik bot
  if (chatId !== ChatID) {
    await sendTelegramMessage(chatId, '⚠️ Anda bukan pemilik bot ini.');
    return;
  }

  // Mengambil pesan setelah perintah /broadcast
  const broadcastMessage = text.replace('/broadcast', '').trim();
  if (!broadcastMessage) {
    await sendTelegramMessage(chatId, '⚠️ Harap masukkan pesan setelah perintah /broadcast.');
    return;
  }

  // Mengirim pesan ke semua pengguna yang terdaftar
  if (userChatIds.length === 0) {
    await sendTelegramMessage(chatId, '⚠️ Tidak ada pengguna untuk menerima pesan broadcast.');
    return;
  }

  for (const userChatId of userChatIds) {
    try {
      await sendTelegramMessage(userChatId, broadcastMessage);
    } catch (error) {
      console.error(`Error mengirim pesan ke ${userChatId}:`, error);
    }
  }

  await sendTelegramMessage(chatId, `✅ Pesan telah disebarkan ke ${userChatIds.length} pengguna.`);
}

// Fungsi untuk mengirim pesan ke pengguna melalui Telegram API
async function sendTelegramMessage(chatId, message) {
  const url = `${TELEGRAM_API_URL}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: message,
    parse_mode: 'Markdown', // Untuk memformat teks
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!result.ok) {
      console.error('Gagal mengirim pesan:', result);
    }
  } catch (error) {
    console.error('Error saat mengirim pesan:', error);
  }
}

// Function to handle the /start command
async function handleStartCommand(chatId) {
  const welcomeMessage = `
🎉 Selamat datang di Inconigto Mode || YūshaBot ! 🎉

💡 Cara Penggunaan:
1️⃣ Kirimkan Proxy IP:Port dalam format yang benar.
       Contoh: \`192.168.1.1:8080\`
2️⃣ Bot akan mengecek status Proxy untuk Anda.

✨ Anda bisa memilih opsi untuk membuat VPN Tunnel CloudFlare Gratis Menggunakan ProxyIP yang sudah di Cek dengan format:
- 🌐 VLESS
- 🔐 TROJAN
- 🛡️ Shadowsocks

🚀 Mulai sekarang dengan mengirimkan Proxy IP:Port Anda!

📌 Daftar Commands : /info
👨‍💻 ME : [Incognito Mode](${Owner})
📺 CHANNEL : [Inconigto Mode || Seishin](${Chanell})
👥 GROUP : [Incognito Mode || Kuragari](${Group})
  `;
  await sendTelegramMessage(chatId, welcomeMessage);
}

async function handleGetInfo(chatId) {
  const InfoMessage = `
🎉 Commands di Incognito Bot! 🎉

1️⃣ \`/getrandomip\`
2️⃣ \`/getrandom <Country>\`
3️⃣ \`/listwildcard\`

📌 Daftar Commands : /info
👨‍💻 ME : [Incognito Mode](${Owner})
📺 CHANNEL : [Inconigto Mode || Seishin](${Chanell})
👥 GROUP : [Incognito Mode || Kuragari](${Group})
  `;
  await sendTelegramMessage(chatId, InfoMessage);
}
 

async function handleListWildcard(chatId) {
  const HostBot = `${FAKE_HOSTNAME}`;
  const infoMessage = `
🎉 List Wildcard VPN Tunnel Incognito Bot! 🎉

1️⃣ \`graph.instagram.com.${HostBot}\`
2️⃣ \`ava.game.naver.com.${HostBot}\`
3️⃣ \`support.zoom.us.${HostBot}\`
4️⃣ \`cache.netflix.com.${HostBot}\`
5️⃣ \`zaintest.vuclip.com.${HostBot}\`
6️⃣ \`cdn.appsflayer.com.${HostBot}\`
7️⃣ 
8️⃣ 
9️⃣ 
🔟 

📌 Daftar Commands : /info
👨‍💻 ME : [Incognito Mode](${Owner})
📺 CHANNEL : [Inconigto Mode || Seishin](${Chanell})
👥 GROUP : [Incognito Mode || Kuragari](${Group})

  `;
  await sendTelegramMessage(chatId, infoMessage);
}


// Function to handle the /getrandomip command
async function handleGetRandomIPCommand(chatId) {
  try {
    // Fetching the Proxy IP list from the GitHub raw URL
    const proxyBankUrl = DEFAULT_PROXY_BANK_URL;
    const response = await fetch(proxyBankUrl);
    const data = await response.text();

    // Split the data into an array of Proxy IPs
    const proxyList = data.split('\n').filter(line => line.trim() !== '');

    // Randomly select 10 Proxy IPs
    const randomIPs = [];
    for (let i = 0; i < 20 && proxyList.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * proxyList.length);
      randomIPs.push(proxyList[randomIndex]);
      proxyList.splice(randomIndex, 1); // Remove the selected item from the list
    }

    // Format the random IPs into a message
    const message = `🔑 **Here are 20 random Proxy IPs:**\n\n` +
      randomIPs.map(ip => {
        const [ipAddress, port, country, provider] = ip.split(',');
        // Replace dots with spaces in the provider name
        const formattedProvider = provider.replace(/\./g, ' ');
        return `📍**IP:PORT : **\`${ipAddress}:${port}\`**\n🌍 **Country :** ${country}\n💻 **ISP :** ${formattedProvider}\n`;
      }).join('\n');

    await sendTelegramMessage(chatId, message);
  } catch (error) {
    console.error('Error fetching proxy list:', error);
    await sendTelegramMessage(chatId, '⚠️ There was an error fetching the Proxy list. Please try again later.');
  }
}

// Function to handle the /getrandom <Country> command
async function handleGetRandomCountryCommand(chatId, countryId) {
  try {
    const proxyBankUrl = DEFAULT_PROXY_BANK_URL;
    const response = await fetch(proxyBankUrl);
    const data = await response.text();
    const proxyList = data.split('\n').filter(line => line.trim() !== '');
    const filteredProxies = proxyList.filter(ip => {
      const [ipAddress, port, country, provider] = ip.split(',');
      return country.toUpperCase() === countryId.toUpperCase(); // Country case-insensitive comparison
    });
    const randomIPs = [];
    for (let i = 0; i < 20 && filteredProxies.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * filteredProxies.length);
      randomIPs.push(filteredProxies[randomIndex]);
      filteredProxies.splice(randomIndex, 1); // Remove the selected item from the list
    }
    if (randomIPs.length === 0) {
      await sendTelegramMessage(chatId, `⚠️ No proxies found for country code **${countryId}**.`);
      return;
    }
    const message = `🔑 **Here are 20 random Proxy IPs for country ${countryId}:**\n\n` +
      randomIPs.map(ip => {
        const [ipAddress, port, country, provider] = ip.split(',');
        // Replace dots with spaces in the provider name
        const formattedProvider = provider.replace(/\./g, ' ');
        return `📍**IP:PORT : **\`${ipAddress}:${port}\`**\n🌍 **Country :** ${country}\n💻 **ISP :** ${formattedProvider}\n`;
      }).join('\n');

    await sendTelegramMessage(chatId, message);
  } catch (error) {
    console.error('Error fetching proxy list:', error);
    await sendTelegramMessage(chatId, '⚠️ There was an error fetching the Proxy list. Please try again later.');
  }
}

async function handleIPPortCheck(ipPortText, chatId) {
  // Mengganti semua karakter baris baru (\n) dengan koma (,) untuk mempermudah pemrosesan
  const normalizedText = ipPortText.replace(/\n/g, ',').replace(/\s+/g, '');

  // Pisahkan input berdasarkan koma
  const ipPortList = normalizedText.split(',');

  // Periksa setiap pasangan ip:port
  for (let ipPortText of ipPortList) {
    const [ip, port] = ipPortText.trim().split(':');
    
    // Validasi format ip:port
    if (isValidIPPortFormat(ipPortText.trim())) {
      const result = await checkIPPort(ip, port, chatId);
      await sendTelegramMessage(chatId, result); // Kirim hasil ke Telegram
    } else {
      await sendTelegramMessage(chatId, `⚠️ Format ip:port tidak valid: ${ipPortText.trim()}`);
    }
  }
}

function isValidIPPortFormat(input) {
  const regex = /^(\d{1,3}\.){3}\d{1,3}:\d{1,5}$/;
  return regex.test(input);
}

async function checkIPPort(ip, port, chatId) {
  try {
    const response = await fetch(`${apiCheck}${ip}:${port}`);
    if (!response.ok) throw new Error(`Error: ${response.statusText}`);

    const data = await response.json();

    // Ekstrak informasi dari respon API
    const { proxy, port: p, org, asn, country = "Unknown", flag = "🏳️", latitude, longitude, timezone } = data;
    const status = data.proxyip ? "✅ Active" : "❌ Inactive";

    // Format pesan hasil pengecekan
    const resultMessage = `
🌍 **IP & Port Check Result**:
━━━━━━━━━━━━━━━━━━━━━━━
📡 **IP**: ${proxy}
🔌 **Port**: ${p}
💻 **ISP**: ${org}
🏢 **ASN**: ${asn}
🌏 **Country**: ${country} ${flag}
🚦 **Status**: ${status}
📍 **Coordinates**: ${latitude}, ${longitude}
🕰️ **Timezone**: ${timezone}
━━━━━━━━━━━━━━━━━━━━━━━

[Incognito Mode](${Owner})
    `;

    await sendTelegramMessage(chatId, resultMessage);

    // Send an inline keyboard with the details
    await sendInlineKeyboard(chatId, proxy, p, org, flag );

  } catch (error) {
    // Error handling
    await sendTelegramMessage(chatId, `⚠️ Error: ${error.message}`);
  }
}




async function handleShadowSocksCreation(chatId, ip, port,isp, HostBot) {
  const path = `/${pathinfo}/${ip}/${port}`;
  const ssname = `${isp}-[Tls]-[SS]-[${watermark}]`
  const ssname2 = `${isp}-[NTls]-[SS]-[${watermark}]`
  const ssTls = `ss://${btoa(`none:${crypto.randomUUID()}`)}@${HostBot}:443?encryption=none&type=ws&host=${HostBot}&path=${encodeURIComponent(path)}&security=tls&sni=${HostBot}#${encodeURIComponent(ssname)}`;
  const ssNTls = `ss://${btoa(`none:${crypto.randomUUID()}`)}@${HostBot}:80?encryption=none&type=ws&host=${HostBot}&path=${encodeURIComponent(path)}&security=none&sni=${HostBot}#${encodeURIComponent(ssname2)}`;

  const proxies = `
proxies:

  - name: ${ssname}
    server: ${HostBot}
    port: 443
    type: ss
    cipher: none
    password: ${crypto.randomUUID()}
    plugin: v2ray-plugin
    client-fingerprint: chrome
    udp: true
    plugin-opts:
      mode: websocket
      host: ${HostBot}
      path: ${path}
      tls: true
      mux: false
      skip-cert-verify: true
    headers:
      custom: value
      ip-version: dual
      v2ray-http-upgrade: false
      v2ray-http-upgrade-fast-open: false
`;

  const message = `
⚜️ Success Create ShadowSocks ⚜️

Type : ShadowSocks 
ISP : \`${isp}\`
ProxyIP : \`${ip}:${port}\` 

🔗 **Links Vless** :\n
1️⃣ **TLS** : \`${ssTls}\`\n
2️⃣ **Non-TLS** : \`${ssNTls}\`

📄 **Proxies Config**:
\`\`\`
${proxies}
\`\`\`
[Incognito Mode](${Owner})
  `;

  // Kirim pesan melalui Telegram
  await sendTelegramMessage(chatId, message);
}

async function handleVlessCreation(chatId, ip, port, isp, HostBot) {
  const path = `/${pathinfo}/${ip}/${port}`;
  const vlname = `${isp}-[Tls]-[VL]-[${watermark}]`
  const vlname2 = `${isp}-[NTls]-[VL]-[${watermark}]`
  const vlessTLS = `vless://${crypto.randomUUID()}@${HostBot}:443?path=${encodeURIComponent(path)}&security=tls&host=${HostBot}&type=ws&sni=${HostBot}#${encodeURIComponent(vlname)}`;
  const vlessNTLS = `vless://${crypto.randomUUID()}@${HostBot}:80?path=${encodeURIComponent(path)}&security=none&host=${HostBot}&type=ws&sni=${HostBot}#${encodeURIComponent(vlname2)}`;
  
  const message = `
⚜️ Success Create VLESS ⚜️

Type : VLESS 
ISP : \`${isp}\`
ProxyIP : \`${ip}:${port}\` 


🔗 **Links Vless** :\n
1️⃣ **TLS** : \`${vlessTLS}\`\n
2️⃣ **Non-TLS** : \`${vlessNTLS}\`


📄 **Proxies Config** :
\`\`\`
proxies:
          
  - name: ${vlname}
    server: ${HostBot}
    port: 443
    type: vless
    uuid: ${crypto.randomUUID()}
    cipher: auto
    tls: true
    client-fingerprint: chrome
    udp: true
    skip-cert-verify: true
    network: ws
    servername: ${HostBot}
    alpn:
       - h2
       - h3
       - http/1.1
    ws-opts:
      path: ${path}
      headers:
        Host: ${HostBot}
      max-early-data: 0
      early-data-header-name: Sec-WebSocket-Protocol
      ip-version: dual
      v2ray-http-upgrade: false
      v2ray-http-upgrade-fast-open: false
\`\`\`
[Incognito Mode](${Owner})
  `;

  await sendTelegramMessage(chatId, message);
}

async function handleTrojanCreation(chatId, ip, port, isp, HostBot) {
  const path = `/${pathinfo}/${ip}/${port}`;;
  const trname = `${isp}-[Tls]-[TR]-[${watermark}]`
  const trname2 = `${isp}-[NTls]-[TR]-[${watermark}]`
  const trojanTLS = `trojan://${crypto.randomUUID()}@${HostBot}:443?path=${encodeURIComponent(path)}&security=tls&host=${HostBot}&type=ws&sni=${HostBot}#${encodeURIComponent(trname)}`;
  const trojanNTLS = `trojan://${crypto.randomUUID()}@${HostBot}:80?path=${encodeURIComponent(path)}&security=none&host=${HostBot}&type=ws&sni=${HostBot}${encodeURIComponent(trname2)}`;

  const message = `
⚜️ Success Create Trojan ⚜️

Type : Trojan 
ISP : \`${isp}\`
ProxyIP : \`${ip}:${port}\` 

🔗 **Links Trojan** :\n
1️⃣ **TLS** : \`${trojanTLS}\`\n
2️⃣ **Non-TLS** : \`${trojanNTLS}\`

📄 **Proxies Config** :
\`\`\`
proxies:
       
  - name: ${trname}
    server: ${HostBot}
    port: 443
    type: trojan
    password: ${crypto.randomUUID()}
    tls: true
    client-fingerprint: chrome
    udp: true
    skip-cert-verify: true
    network: ws
    sni: ${HostBot}
    alpn:
       - h2
       - h3
       - http/1.1
    ws-opts:
      path: ${path}
      headers:
        Host: ${HostBot}
      max-early-data: 0
      early-data-header-name: Sec-WebSocket-Protocol
      ip-version: dual
      v2ray-http-upgrade: false
      v2ray-http-upgrade-fast-open: false
\`\`\`
[Incognito Mode](${Owner})
`;

  await sendTelegramMessage(chatId, message);
}

async function sendInlineKeyboard(chatId, ip, port, isp, flag) {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: 'Pilih opsi berikut untuk membuat VPN Tunnel:',
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Create VLESS', callback_data: `create_vless|${ip}|${port}|${isp}|${flag}` },
              { text: 'Create Trojan', callback_data: `create_trojan|${ip}|${port}|${isp}|${flag}` },
            ],
            [
              { text: 'Create ShadowSocks', callback_data: `create_ss|${ip}|${port}|${isp}|${flag}` },
            ],
          ],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send inline keyboard:', errorText);
    } else {
      console.log('Inline keyboard sent successfully.');
    }
  } catch (error) {
    console.error('Error sending inline keyboard:', error);
  }
}

// Konstanta WebSocket
const WS_READY_STATE_OPEN = 1;
const WS_READY_STATE_CLOSING = 2;

async function getProxyList(env, forceReload = false) {
  try {
    // Cek apakah cache kosong atau ada permintaan untuk memuat ulang
    if (!cachedProxyList.length || forceReload) {
      const proxyBankUrl = env.PROXY_BANK_URL || DEFAULT_PROXY_BANK_URL;
      const response = await fetch(proxyBankUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch proxy list: ${response.status}`);
      }

      // Parsing daftar proxy
      const proxyLines = (await response.text()).split("\n").filter(Boolean);
      cachedProxyList = proxyLines.map((line) => {
        const [proxyIP, proxyPort, country, org] = line.split(",");
        return { proxyIP, proxyPort, country, org };
      });
    }

    return cachedProxyList;
  } catch (error) {
    console.error("Error fetching proxy list:", error);
    return []; // Mengembalikan array kosong jika terjadi error
  }
}

export default {
  async fetch(request, env, ctx) {
    try {

      const routeResponse = await routeRequest(request);
      if (routeResponse) {
        return routeResponse;
      }

      const url = new URL(request.url);
      const upgradeHeader = request.headers.get("Upgrade");

      const inconigto = url.hostname;
      const type = url.searchParams.get("type") || "mix";
      const tls = url.searchParams.get("tls") !== "false";
      const wildcard = url.searchParams.get("wildcard") === "true";
      const bugs = url.searchParams.get("bug") || inconigto;
      const bugwildcard = wildcard ? `${bugs}.${inconigto}` : inconigto;
      const country = url.searchParams.get("country");
      const limit = parseInt(url.searchParams.get("limit"), 10);
      let configs;

      // Map untuk menyimpan proxy per kode negara
      const proxyState = new Map();

      // Fungsi untuk memperbarui proxy setiap menit
      async function updateProxies() {
        const proxies = await getProxyList(env);
        const groupedProxies = groupBy(proxies, "country");

        for (const [countryCode, proxies] of Object.entries(groupedProxies)) {
          const randomIndex = Math.floor(Math.random() * proxies.length);
          proxyState.set(countryCode, proxies[randomIndex]);
        }
      }

      // Jalankan pembaruan proxy setiap menit
      ctx.waitUntil(
        (async function periodicUpdate() {
          await updateProxies();
          setInterval(updateProxies, 60000);
        })()
      );

      // Penanganan WebSocket
      if (upgradeHeader === "websocket") {
        if (!url.pathname.startsWith(`/${pathinfo}/`)) {
          console.log(`Blocked request (Invalid Path): ${url.pathname}`);
          return new Response(null, { status: 403 });
        }

        const cleanPath = url.pathname.replace(`/${pathinfo}/`, "");
        const pathMatch = cleanPath.match(/^([A-Z]{2})(\d+)?$/);

        if (pathMatch) {
          const countryCode = pathMatch[1];
          const index = pathMatch[2] ? parseInt(pathMatch[2], 10) - 1 : null;
          const proxies = await getProxyList(env);
          const filteredProxies = proxies.filter((proxy) => proxy.country === countryCode);
          if (filteredProxies.length === 0) {
            return new Response(null, { status: 403 });
          }
          let selectedProxy =
            index === null ? proxyState.get(countryCode) || filteredProxies[0] : filteredProxies[index];
          proxyIP = `${selectedProxy.proxyIP}:${selectedProxy.proxyPort}`;
          return await websockerHandler(request);
        }
        const ipPortMatch = cleanPath.match(/^(.+[^.\d\w]\d+)$/);
        
        if (ipPortMatch) {
          proxyIP = ipPortMatch[1].replace(/[^.\d\w]+/g, ":");
          return await websockerHandler(request);
        }
        return new Response(null, { status: 403 });
      }
      const ping = await getLatency(url.href);

      async function getLatency(url) {
        const start = Date.now(); // waktu mulai
        await fetch(url); // kirim permintaan ke server
        const end = Date.now(); // waktu selesai
        return end - start; // latency dalam milidetik
      }
      async function getIpInfo(ip) {
        const apiUrl = `https://ipinfo.io/${ip}/json`; // API endpoint untuk ipinfo.io
        try {
          const response = await fetch(apiUrl);
          if (!response.ok) {
            throw new Error('Failed to fetch IP information');
          }
          const data = await response.json();
          return data;
        } catch (error) {
          return { error: 'Unable to fetch IP information' };
        }
      }
      
      
      const myIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'IP tidak ditemukan';
      const ipInfo = await getIpInfo(myIp);

      // Routing untuk subscription generator
      switch (url.pathname) {
        case "/sub/clash":
          configs = await generateClashSub(type, bugs, bugwildcard, tls, country, limit);
          break;
        case "/sub/v2rayng":
          configs = await generateV2rayngSub(type, bugs, bugwildcard, tls, country, limit);
          break;
        case "/sub/v2ray":
          configs = await generateV2raySub(type, bugs, bugwildcard, tls, country, limit);
          break;
        default:
          const inconigto = url.hostname;
          return new Response(
            `Hostname: ${inconigto}\nPath Info: ${pathinfo}\nPing: ${ping}ms\nMy IP: ${myIp}\n\n` +
            `IP Info: \n` +
            `IP: ${ipInfo.ip || 'N/A'}\n` +
            `City: ${ipInfo.city || 'N/A'}\n` +
            `Region: ${ipInfo.region || 'N/A'}\n` +
            `Country: ${ipInfo.country || 'N/A'}\n` +
            `ISP: ${ipInfo.org || 'N/A'}\n\n` +
            `====================\n` +
            `Cara Penggunaan Bot Telegram:\n` +
            `====================\n` +
            `1. /active\n` +
            `   - Tujuan: Mengaktifkan bot atau webhook. Misalnya, menghubungkan bot dengan webhook.\n` +
            `   - Contoh: https://${inconigto}/active\n\n` +
            `2. /delete\n` +
            `   - Tujuan: Menghapus data atau entitas tertentu. Biasanya digunakan untuk menghapus pesan atau pengaturan.\n` +
            `   - Contoh: https://${inconigto}/delete\n\n` +
            `3. /info\n` +
            `   - Tujuan: Mendapatkan informasi tentang status bot atau webhook.\n` +
            `   - Contoh: https://${inconigto}/info\n\n` +
            `4. /deletePending\n` +
            `   - Tujuan: Menghapus data atau entitas yang masih dalam status "pending".\n` +
            `   - Contoh: https://${inconigto}/deletePending\n\n` +
            `====================\n` +
            `Cara Penggunaan Url Subs API:\n` +
            `====================\n` +
            `API ini menyediakan tiga jenis sub-endpoint yang dapat digunakan untuk mengakses konfigurasi yang berbeda: /sub/clash, /sub/v2ray, dan /sub/v2rayng.\n` +

            `Penjelasan parameter URL:\n` +
            `- sub/clash: Endpoint yang digunakan, bisa diganti dengan /sub/v2ray atau /sub/v2rayng.\n` +
            `- type: Pilih protokol, tersedia vless, trojan, shadowshocks dan mix.\n` +
            `- bug: Alamat bug report yang digunakan, misalnya google.com.\n` +
            `- tls: Aktifkan TLS, pilih true untuk aktif dan false untuk nonaktif.\n` +
            `- wildcard: Aktifkan atau nonaktifkan wildcard, pilih true atau false.\n` +
            `- limit: Jumlah konfigurasi yang ingin diambil, antara 1 hingga 20.\n` +
            `- country: Pilih negara dengan kode negara yang sesuai, misalnya id untuk Indonesia, sg untuk Singapura.\n\n` +
            `Contoh URL Lengkap:\n\n` +
            `- Clash Vless : https://${inconigto}/sub/clash?type=vless&bug=google.com&tls=true&wildcard=false&limit=10&country=id\n` +
            `- V2Ray Trojan : https://${inconigto}/sub/v2ray?type=trojan&bug=google.com&tls=true&wildcard=false&limit=10&country=id\n` +
            `- V2rayNG Shadowsocks : https://${inconigto}/sub/v2rayng?type=shadowsocks&bug=google.com&tls=true&wildcard=false&limit=10&country=id\n` +
            `====================\n`,
            {
              status: 200,
              headers: { "Content-Type": "text/plain;charset=utf-8" },
            }
          );
                       
      }
      return new Response(configs);
    } catch (err) {
      return new Response(`An error occurred: ${err.toString()}`, {
        status: 500,
      });
    }
  },
};


// Helper function: Group proxies by country
function groupBy(array, key) {
  return array.reduce((result, item) => {
    if (!result[item[key]]) {
      result[item[key]] = [];
    }
    result[item[key]].push(item);
    return result;
  }, {});
}

async function websockerHandler(request) {
  const webSocketPair = new WebSocketPair();
  const [client, webSocket] = Object.values(webSocketPair);

  webSocket.accept();

  let addressLog = "";
  let portLog = "";
  const log = (info, event) => {
    console.log(`[${addressLog}:${portLog}] ${info}`, event || "");
  };
  const earlyDataHeader = request.headers.get("sec-websocket-protocol") || "";

  const readableWebSocketStream = makeReadableWebSocketStream(webSocket, earlyDataHeader, log);

  let remoteSocketWrapper = {
    value: null,
  };
  let udpStreamWrite = null;
  let isDNS = false;

  readableWebSocketStream
    .pipeTo(
      new WritableStream({
        async write(chunk, controller) {
          if (isDNS && udpStreamWrite) {
            return udpStreamWrite(chunk);
          }
          if (remoteSocketWrapper.value) {
            const writer = remoteSocketWrapper.value.writable.getWriter();
            await writer.write(chunk);
            writer.releaseLock();
            return;
          }

          const protocol = await protocolSniffer(chunk);
          let protocolHeader;

          if (protocol === "Trojan") {
            protocolHeader = parseTrojanHeader(chunk);
          } else if (protocol === "VLESS") {
            protocolHeader = parseVlessHeader(chunk);
          } else if (protocol === "Shadowsocks") {
            protocolHeader = parseShadowsocksHeader(chunk);
          } else {
            parseVmessHeader(chunk);
            throw new Error("Unknown Protocol!");
          }

          addressLog = protocolHeader.addressRemote;
          portLog = `${protocolHeader.portRemote} -> ${protocolHeader.isUDP ? "UDP" : "TCP"}`;

          if (protocolHeader.hasError) {
            throw new Error(protocolHeader.message);
          }

          if (protocolHeader.isUDP) {
            if (protocolHeader.portRemote === 53) {
              isDNS = true;
            } else {
              throw new Error("UDP only support for DNS port 53");
            }
          }

          if (isDNS) {
            const { write } = await handleUDPOutbound(webSocket, protocolHeader.version, log);
            udpStreamWrite = write;
            udpStreamWrite(protocolHeader.rawClientData);
            return;
          }

          handleTCPOutBound(
            remoteSocketWrapper,
            protocolHeader.addressRemote,
            protocolHeader.portRemote,
            protocolHeader.rawClientData,
            webSocket,
            protocolHeader.version,
            log
          );
        },
        close() {
          log(`readableWebSocketStream is close`);
        },
        abort(reason) {
          log(`readableWebSocketStream is abort`, JSON.stringify(reason));
        },
      })
    )
    .catch((err) => {
      log("readableWebSocketStream pipeTo error", err);
    });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

async function protocolSniffer(buffer) {
  if (buffer.byteLength >= 62) {
    const trojanDelimiter = new Uint8Array(buffer.slice(56, 60));
    if (trojanDelimiter[0] === 0x0d && trojanDelimiter[1] === 0x0a) {
      if (trojanDelimiter[2] === 0x01 || trojanDelimiter[2] === 0x03 || trojanDelimiter[2] === 0x7f) {
        if (trojanDelimiter[3] === 0x01 || trojanDelimiter[3] === 0x03 || trojanDelimiter[3] === 0x04) {
          return "Trojan";
        }
      }
    }
  }

  const vlessDelimiter = new Uint8Array(buffer.slice(1, 17));
  // Hanya mendukung UUID v4
  if (arrayBufferToHex(vlessDelimiter).match(/^\w{8}\w{4}4\w{3}[89ab]\w{3}\w{12}$/)) {
    return "VLESS";
  }

  return "Shadowsocks"; // default
}

async function handleTCPOutBound(
  remoteSocket,
  addressRemote,
  portRemote,
  rawClientData,
  webSocket,
  responseHeader,
  log
) {
  async function connectAndWrite(address, port) {
    const tcpSocket = connect({
      hostname: address,
      port: port,
    });
    remoteSocket.value = tcpSocket;
    log(`connected to ${address}:${port}`);
    const writer = tcpSocket.writable.getWriter();
    await writer.write(rawClientData);
    writer.releaseLock();
    return tcpSocket;
  }

  async function retry() {
    const tcpSocket = await connectAndWrite(
      proxyIP.split(/[:=-]/)[0] || addressRemote,
      proxyIP.split(/[:=-]/)[1] || portRemote
    );
    tcpSocket.closed
      .catch((error) => {
        console.log("retry tcpSocket closed error", error);
      })
      .finally(() => {
        safeCloseWebSocket(webSocket);
      });
    remoteSocketToWS(tcpSocket, webSocket, responseHeader, null, log);
  }

  const tcpSocket = await connectAndWrite(addressRemote, portRemote);

  remoteSocketToWS(tcpSocket, webSocket, responseHeader, retry, log);
}

function makeReadableWebSocketStream(webSocketServer, earlyDataHeader, log) {
  let readableStreamCancel = false;
  const stream = new ReadableStream({
    start(controller) {
      webSocketServer.addEventListener("message", (event) => {
        if (readableStreamCancel) {
          return;
        }
        const message = event.data;
        controller.enqueue(message);
      });
      webSocketServer.addEventListener("close", () => {
        safeCloseWebSocket(webSocketServer);
        if (readableStreamCancel) {
          return;
        }
        controller.close();
      });
      webSocketServer.addEventListener("error", (err) => {
        log("webSocketServer has error");
        controller.error(err);
      });
      const { earlyData, error } = base64ToArrayBuffer(earlyDataHeader);
      if (error) {
        controller.error(error);
      } else if (earlyData) {
        controller.enqueue(earlyData);
      }
    },

    pull(controller) {},
    cancel(reason) {
      if (readableStreamCancel) {
        return;
      }
      log(`ReadableStream was canceled, due to ${reason}`);
      readableStreamCancel = true;
      safeCloseWebSocket(webSocketServer);
    },
  });

  return stream;
}

function parseVmessHeader(vmessBuffer) {
  // https://xtls.github.io/development/protocols/vmess.html#%E6%8C%87%E4%BB%A4%E9%83%A8%E5%88%86
}

function parseShadowsocksHeader(ssBuffer) {
  const view = new DataView(ssBuffer);

  const addressType = view.getUint8(0);
  let addressLength = 0;
  let addressValueIndex = 1;
  let addressValue = "";

  switch (addressType) {
    case 1:
      addressLength = 4;
      addressValue = new Uint8Array(ssBuffer.slice(addressValueIndex, addressValueIndex + addressLength)).join(".");
      break;
    case 3:
      addressLength = new Uint8Array(ssBuffer.slice(addressValueIndex, addressValueIndex + 1))[0];
      addressValueIndex += 1;
      addressValue = new TextDecoder().decode(ssBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
      break;
    case 4:
      addressLength = 16;
      const dataView = new DataView(ssBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
      const ipv6 = [];
      for (let i = 0; i < 8; i++) {
        ipv6.push(dataView.getUint16(i * 2).toString(16));
      }
      addressValue = ipv6.join(":");
      break;
    default:
      return {
        hasError: true,
        message: `Invalid addressType for Shadowsocks: ${addressType}`,
      };
  }

  if (!addressValue) {
    return {
      hasError: true,
      message: `Destination address empty, address type is: ${addressType}`,
    };
  }

  const portIndex = addressValueIndex + addressLength;
  const portBuffer = ssBuffer.slice(portIndex, portIndex + 2);
  const portRemote = new DataView(portBuffer).getUint16(0);
  return {
    hasError: false,
    addressRemote: addressValue,
    addressType: addressType,
    portRemote: portRemote,
    rawDataIndex: portIndex + 2,
    rawClientData: ssBuffer.slice(portIndex + 2),
    version: null,
    isUDP: portRemote == 53,
  };
}

function parseVlessHeader(vlessBuffer) {
  const version = new Uint8Array(vlessBuffer.slice(0, 1));
  let isUDP = false;

  const optLength = new Uint8Array(vlessBuffer.slice(17, 18))[0];

  const cmd = new Uint8Array(vlessBuffer.slice(18 + optLength, 18 + optLength + 1))[0];
  if (cmd === 1) {
  } else if (cmd === 2) {
    isUDP = true;
  } else {
    return {
      hasError: true,
      message: `command ${cmd} is not support, command 01-tcp,02-udp,03-mux`,
    };
  }
  const portIndex = 18 + optLength + 1;
  const portBuffer = vlessBuffer.slice(portIndex, portIndex + 2);
  const portRemote = new DataView(portBuffer).getUint16(0);

  let addressIndex = portIndex + 2;
  const addressBuffer = new Uint8Array(vlessBuffer.slice(addressIndex, addressIndex + 1));

  const addressType = addressBuffer[0];
  let addressLength = 0;
  let addressValueIndex = addressIndex + 1;
  let addressValue = "";
  switch (addressType) {
    case 1: // For IPv4
      addressLength = 4;
      addressValue = new Uint8Array(vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)).join(".");
      break;
    case 2: // For Domain
      addressLength = new Uint8Array(vlessBuffer.slice(addressValueIndex, addressValueIndex + 1))[0];
      addressValueIndex += 1;
      addressValue = new TextDecoder().decode(vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
      break;
    case 3: // For IPv6
      addressLength = 16;
      const dataView = new DataView(vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
      const ipv6 = [];
      for (let i = 0; i < 8; i++) {
        ipv6.push(dataView.getUint16(i * 2).toString(16));
      }
      addressValue = ipv6.join(":");
      break;
    default:
      return {
        hasError: true,
        message: `invild  addressType is ${addressType}`,
      };
  }
  if (!addressValue) {
    return {
      hasError: true,
      message: `addressValue is empty, addressType is ${addressType}`,
    };
  }

  return {
    hasError: false,
    addressRemote: addressValue,
    addressType: addressType,
    portRemote: portRemote,
    rawDataIndex: addressValueIndex + addressLength,
    rawClientData: vlessBuffer.slice(addressValueIndex + addressLength),
    version: new Uint8Array([version[0], 0]),
    isUDP: isUDP,
  };
}

function parseTrojanHeader(buffer) {
  const socks5DataBuffer = buffer.slice(58);
  if (socks5DataBuffer.byteLength < 6) {
    return {
      hasError: true,
      message: "invalid SOCKS5 request data",
    };
  }

  let isUDP = false;
  const view = new DataView(socks5DataBuffer);
  const cmd = view.getUint8(0);
  if (cmd == 3) {
    isUDP = true;
  } else if (cmd != 1) {
    throw new Error("Unsupported command type!");
  }

  let addressType = view.getUint8(1);
  let addressLength = 0;
  let addressValueIndex = 2;
  let addressValue = "";
  switch (addressType) {
    case 1: // For IPv4
      addressLength = 4;
      addressValue = new Uint8Array(socks5DataBuffer.slice(addressValueIndex, addressValueIndex + addressLength)).join(
        "."
      );
      break;
    case 3: // For Domain
      addressLength = new Uint8Array(socks5DataBuffer.slice(addressValueIndex, addressValueIndex + 1))[0];
      addressValueIndex += 1;
      addressValue = new TextDecoder().decode(
        socks5DataBuffer.slice(addressValueIndex, addressValueIndex + addressLength)
      );
      break;
    case 4: // For IPv6
      addressLength = 16;
      const dataView = new DataView(socks5DataBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
      const ipv6 = [];
      for (let i = 0; i < 8; i++) {
        ipv6.push(dataView.getUint16(i * 2).toString(16));
      }
      addressValue = ipv6.join(":");
      break;
    default:
      return {
        hasError: true,
        message: `invalid addressType is ${addressType}`,
      };
  }

  if (!addressValue) {
    return {
      hasError: true,
      message: `address is empty, addressType is ${addressType}`,
    };
  }

  const portIndex = addressValueIndex + addressLength;
  const portBuffer = socks5DataBuffer.slice(portIndex, portIndex + 2);
  const portRemote = new DataView(portBuffer).getUint16(0);
  return {
    hasError: false,
    addressRemote: addressValue,
    addressType: addressType,
    portRemote: portRemote,
    rawDataIndex: portIndex + 4,
    rawClientData: socks5DataBuffer.slice(portIndex + 4),
    version: null,
    isUDP: isUDP,
  };
}

async function remoteSocketToWS(remoteSocket, webSocket, responseHeader, retry, log) {
  let header = responseHeader;
  let hasIncomingData = false;
  await remoteSocket.readable
    .pipeTo(
      new WritableStream({
        start() {},
        async write(chunk, controller) {
          hasIncomingData = true;
          if (webSocket.readyState !== WS_READY_STATE_OPEN) {
            controller.error("webSocket.readyState is not open, maybe close");
          }
          if (header) {
            webSocket.send(await new Blob([header, chunk]).arrayBuffer());
            header = null;
          } else {
            webSocket.send(chunk);
          }
        },
        close() {
          log(`remoteConnection!.readable is close with hasIncomingData is ${hasIncomingData}`);
        },
        abort(reason) {
          console.error(`remoteConnection!.readable abort`, reason);
        },
      })
    )
    .catch((error) => {
      console.error(`remoteSocketToWS has exception `, error.stack || error);
      safeCloseWebSocket(webSocket);
    });
  if (hasIncomingData === false && retry) {
    log(`retry`);
    retry();
  }
}

function base64ToArrayBuffer(base64Str) {
  if (!base64Str) {
    return { error: null };
  }
  try {
    base64Str = base64Str.replace(/-/g, "+").replace(/_/g, "/");
    const decode = atob(base64Str);
    const arryBuffer = Uint8Array.from(decode, (c) => c.charCodeAt(0));
    return { earlyData: arryBuffer.buffer, error: null };
  } catch (error) {
    return { error };
  }
}

function arrayBufferToHex(buffer) {
  return [...new Uint8Array(buffer)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function handleUDPOutbound(webSocket, responseHeader, log) {
  let isVlessHeaderSent = false;
  const transformStream = new TransformStream({
    start(controller) {},
    transform(chunk, controller) {
      for (let index = 0; index < chunk.byteLength; ) {
        const lengthBuffer = chunk.slice(index, index + 2);
        const udpPakcetLength = new DataView(lengthBuffer).getUint16(0);
        const udpData = new Uint8Array(chunk.slice(index + 2, index + 2 + udpPakcetLength));
        index = index + 2 + udpPakcetLength;
        controller.enqueue(udpData);
      }
    },
    flush(controller) {},
  });
  transformStream.readable
    .pipeTo(
      new WritableStream({
        async write(chunk) {
          const resp = await fetch("https://1.1.1.1/dns-query", {
            method: "POST",
            headers: {
              "content-type": "application/dns-message",
            },
            body: chunk,
          });
          const dnsQueryResult = await resp.arrayBuffer();
          const udpSize = dnsQueryResult.byteLength;
          const udpSizeBuffer = new Uint8Array([(udpSize >> 8) & 0xff, udpSize & 0xff]);
          if (webSocket.readyState === WS_READY_STATE_OPEN) {
            log(`doh success and dns message length is ${udpSize}`);
            if (isVlessHeaderSent) {
              webSocket.send(await new Blob([udpSizeBuffer, dnsQueryResult]).arrayBuffer());
            } else {
              webSocket.send(await new Blob([responseHeader, udpSizeBuffer, dnsQueryResult]).arrayBuffer());
              isVlessHeaderSent = true;
            }
          }
        },
      })
    )
    .catch((error) => {
      log("dns udp has error" + error);
    });

  const writer = transformStream.writable.getWriter();

  return {
    write(chunk) {
      writer.write(chunk);
    },
  };
}

function safeCloseWebSocket(socket) {
  try {
    if (socket.readyState === WS_READY_STATE_OPEN || socket.readyState === WS_READY_STATE_CLOSING) {
      socket.close();
    }
  } catch (error) {
    console.error("safeCloseWebSocket error", error);
  }
}
// Fungsi untuk mengonversi countryCode menjadi emoji bendera


async function generateClashSub(type, bug, bugwildcard, tls, country = null, limit = null) {
  const proxyListResponse = await fetch(DEFAULT_PROXY_BANK_URL);
  const proxyList = await proxyListResponse.text();
  let ips = proxyList
    .split('\n')
    .filter(Boolean)
  if (country && country.toLowerCase() === 'random') {
    // Pilih data secara acak jika country=random
    ips = ips.sort(() => Math.random() - 0.5); // Acak daftar proxy
  } else if (country) {
    // Filter berdasarkan country jika bukan "random"
    ips = ips.filter(line => {
      const parts = line.split(',');
      if (parts.length > 1) {
        const lineCountry = parts[2].toUpperCase();
        return lineCountry === country.toUpperCase();
      }
      return false;
    });
  }
  
  if (limit && !isNaN(limit)) {
    ips = ips.slice(0, limit); // Batasi jumlah proxy berdasarkan limit
  }
  
  let conf = '';
  let bex = '';
  let count = 1;
  
  for (let line of ips) {
    const parts = line.split(',');
    const proxyHost = parts[0];
    const proxyPort = parts[1] || 443;
    const emojiFlag = getEmojiFlag(line.split(',')[2]); // Konversi ke emoji bendera
    const sanitize = (text) => text.replace(/[\n\r]+/g, "").trim(); // Hapus newline dan spasi ekstra
    let ispName = sanitize(`${emojiFlag} [${line.split(',')[2]}] ${line.split(',')[3]} ${count ++}`);
    const UUIDS = `${generateUUIDv4()}`;
    const ports = tls ? '443' : '80';
    const snio = tls ? `\n  servername: ${bugwildcard}` : '';
    const snioo = tls ? `\n  cipher: auto` : '';
    if (type === 'vless') {
      bex += `  - ${ispName}\n`
      conf += `
- name: ${ispName}-[VL]-[${watermark}]
  server: ${bug}
  port: ${ports}
  type: vless
  uuid: ${UUIDS}${snioo}
  tls: ${tls}
  udp: false
  skip-cert-verify: true
  client-fingerprint: chrome
  network: ws${snio}
  alpn:
    - h2
    - h3
    - http/1.1
  ws-opts:
    path: /${pathinfo}/${proxyHost}/${proxyPort}
    headers:
      Host: ${bugwildcard}
    max-early-data: 0
    early-data-header-name: Sec-WebSocket-Protocol
    ip-version: dual
    v2ray-http-upgrade: false
    v2ray-http-upgrade-fast-open: false
    `;
    } else if (type === 'trojan') {
      bex += `  - ${ispName}\n`
      conf += `
- name: ${ispName}-[TR]-[${watermark}]
  server: ${bug}
  port: 443
  type: trojan
  password: ${UUIDS}
  tls: true
  client-fingerprint: chrome
  udp: false
  skip-cert-verify: true
  network: ws
  sni: ${bugwildcard}
  alpn:
    - h2
    - h3
    - http/1.1
  ws-opts:
    path: /${pathinfo}/${proxyHost}/${proxyPort}
    headers:
      Host: ${bugwildcard}
    max-early-data: 0
    early-data-header-name: Sec-WebSocket-Protocol
    ip-version: dual
    v2ray-http-upgrade: false
    v2ray-http-upgrade-fast-open: false
    `;
    } else if (type === 'shadowsocks') {
      bex += `  - ${ispName}\n`
      conf += `
- name: ${ispName}-[SS]-[${watermark}]
  type: ss
  server: ${bug}
  port: ${ports}
  cipher: none
  password: ${UUIDS}
  udp: false
  plugin: v2ray-plugin
  client-fingerprint: chrome
  plugin-opts:
    mode: websocket
    tls: ${tls}
    skip-cert-verify: true
    host: ${bugwildcard}
    path: /${pathinfo}/${proxyHost}/${proxyPort}
    mux: false
  headers:
    custom: value
    ip-version: dual
    v2ray-http-upgrade: false
    v2ray-http-upgrade-fast-open: false
    `;
    } else if (type === 'mix') {
      bex += `  - ${ispName}-[VL]-[${watermark}]\n  - ${ispName}-[TR]-[${watermark}]\n  - ${ispName}-[SS]-[${watermark}]\n`;
      conf += `
- name: ${ispName}-[VL]-[${watermark}]
  server: ${bug}
  port: ${ports}
  type: vless
  uuid: ${UUIDS}
  cipher: auto
  tls: ${tls}
  udp: false
  skip-cert-verify: true
  network: ws${snio}
  ws-opts:
    path: /${pathinfo}/${proxyHost}/${proxyPort}
    headers:
      Host: ${bugwildcard}
- name: ${ispName}-[TR]-[${watermark}]
  server: ${bug}
  port: 443
  type: trojan
  password: ${UUIDS}
  udp: false
  skip-cert-verify: true
  network: ws
  sni: ${bugwildcard}
  ws-opts:
    path: /${pathinfo}/${proxyHost}/${proxyPort}
    headers:
      Host: ${bugwildcard}
- name: ${ispName}-[SS]-[${watermark}]
  type: ss
  server: ${bug}
  port: ${ports}
  cipher: none
  password: ${UUIDS}
  udp: false
  plugin: v2ray-plugin
  plugin-opts:
    mode: websocket
    tls: ${tls}
    skip-cert-verify: true
    host: ${bugwildcard}
    path: /${pathinfo}/${proxyHost}/${proxyPort}
    mux: false
    headers:
      custom: ${bugwildcard}`;
    }
  }
  return `
proxies:
${conf}`;
}

async function generateV2rayngSub(type, bug, bugwildcard, tls, country = null, limit = null) {
  const proxyListResponse = await fetch(DEFAULT_PROXY_BANK_URL);
  const proxyList = await proxyListResponse.text();
  
  let ips = proxyList.split('\n').filter(Boolean);

  if (country) {
    if (country.toLowerCase() === 'random') {
      ips = ips.sort(() => 0.5 - Math.random()); // Acak daftar proxy
    } else {
      ips = ips.filter(line => {
        const parts = line.split(',');
        return parts.length > 1 && parts[2].toUpperCase() === country.toUpperCase();
      });
    }
  }

  if (limit && !isNaN(limit)) {
    ips = ips.slice(0, limit); // Batasi jumlah proxy berdasarkan limit
  }

  // Fungsi untuk membuat format konfigurasi berdasarkan jenis
  function generateConfig(protocol, UUIDS, proxyHost, proxyPort, ispInfo) {
    const secure = tls ? "tls" : "none";
    const port = tls ? 443 : 80;
    const sni = tls ? `&sni=${bugwildcard}` : "";
    const security = tls ? "&security=tls" : "&security=none";

    const basePath = `%2F${pathinfo}%2F${proxyHost}%2F${proxyPort}`;
    const commonParams = `?encryption=none&type=ws&host=${bugwildcard}&path=${basePath}${security}${sni}`;

    const configs = {
      vless: `vless://${UUIDS}@${bug}:${port}${commonParams}&fp=randomized#${ispInfo}-[VL]-[${watermark}]`,
      trojan: `trojan://${UUIDS}@${bug}:${port}${commonParams}&fp=randomized#${ispInfo}-[TR]-[${watermark}]`,
      shadowsocks: `ss://${btoa(`none:${UUIDS}`)}%3D@${bug}:${port}${commonParams}#${ispInfo}-[SS]-[${watermark}]`
    };

    return configs[protocol] || "";
  }

  const conf = ips.map(line => {
    const parts = line.split(',');
    const [proxyHost, proxyPort = 443, countryCode, isp] = parts;
    const UUIDS = generateUUIDv4();
    const ispInfo = `[${countryCode}] ${isp}`;

    if (type === "mix") {
      return ["vless", "trojan", "shadowsocks"].map(proto =>
        generateConfig(proto, UUIDS, proxyHost, proxyPort, ispInfo)
      ).join("\n");
    }
    return generateConfig(type, UUIDS, proxyHost, proxyPort, ispInfo);
  }).join("\n");

  return btoa(conf.replace(/ /g, '%20'));
}


async function generateV2raySub(type, bug, bugwildcard, tls, country = null, limit = null) {
  const proxyList = (await (await fetch(DEFAULT_PROXY_BANK_URL)).text()).split('\n').filter(Boolean);
  let ips = country ? (country.toLowerCase() === 'random' ? proxyList.sort(() => Math.random() - 0.5) : proxyList.filter(line => line.split(',')[2]?.toUpperCase() === country.toUpperCase())) : proxyList;
  if (limit && !isNaN(limit)) ips = ips.slice(0, limit);
  
  return ips.map(line => {
    const [proxyHost, proxyPort = 443, countryCode, isp] = line.split(',');
    const UUIDS = generateUUIDv4();
    const information = encodeURIComponent(`${getEmojiFlag(countryCode)} (${countryCode}) ${isp}`);
    const baseConfig = `${UUIDS}@${bug}:${tls ? 443 : 80}?${tls ? 'security=tls&sni' : 'security=none&sni'}=${bugwildcard}&fp=randomized&type=ws&host=${bugwildcard}&path=%2F${pathinfo}%2F${proxyHost}%2F${proxyPort}`;
    
    switch (type) {
      case 'vless': return `vless://${baseConfig}#${information}-[VL]-[${watermark}]`;
      case 'trojan': return `trojan://${baseConfig}#${information}-[TR]-[${watermark}]`;
      case 'shadowsocks': return `ss://${btoa(`none:${UUIDS}`)}%3D@${bug}:${tls ? 443 : 80}?encryption=none&type=ws&host=${bugwildcard}&path=%2F${pathinfo}%2F${proxyHost}%2F${proxyPort}&${tls ? 'security=tls' : 'security=none'}&sni=${bugwildcard}#${information}-[SS]-[${watermark}]`;
      case 'mix': return [
        `vless://${baseConfig}#${information}-[VL]-[${watermark}]`,
        `trojan://${baseConfig}#${information}-[TR]-[${watermark}]`,
        `ss://${btoa(`none:${UUIDS}`)}%3D@${bug}:${tls ? 443 : 80}?encryption=none&type=ws&host=${bugwildcard}&path=%2F${pathinfo}%2F${proxyHost}%2F${proxyPort}&${tls ? 'security=tls' : 'security=none'}&sni=${bugwildcard}#${information}-[SS]-[${watermark}]`
      ].join('\n');
    }
  }).join('\n');
}


function generateUUIDv4() {
  const randomValues = crypto.getRandomValues(new Uint8Array(16));
  randomValues[6] = (randomValues[6] & 0x0f) | 0x40;
  randomValues[8] = (randomValues[8] & 0x3f) | 0x80;
  return [
    randomValues[0].toString(16).padStart(2, '0'),
    randomValues[1].toString(16).padStart(2, '0'),
    randomValues[2].toString(16).padStart(2, '0'),
    randomValues[3].toString(16).padStart(2, '0'),
    randomValues[4].toString(16).padStart(2, '0'),
    randomValues[5].toString(16).padStart(2, '0'),
    randomValues[6].toString(16).padStart(2, '0'),
    randomValues[7].toString(16).padStart(2, '0'),
    randomValues[8].toString(16).padStart(2, '0'),
    randomValues[9].toString(16).padStart(2, '0'),
    randomValues[10].toString(16).padStart(2, '0'),
    randomValues[11].toString(16).padStart(2, '0'),
    randomValues[12].toString(16).padStart(2, '0'),
    randomValues[13].toString(16).padStart(2, '0'),
    randomValues[14].toString(16).padStart(2, '0'),
    randomValues[15].toString(16).padStart(2, '0'),
  ].join('').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
}
