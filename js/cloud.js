// 跟清心安神（thai-review）共用連續天數。
// 清心安神的每日紀錄表 thai_days 是「每台裝置一列、讀取時加總」，當天任一列有紀錄就算有來。
// 這裡把 thai-letters 當成一台裝置：做完一輪的日子寫一列 games = 1（一天最多算一局，
// 不寫 reviewed，免得灌進清心安神的複習張數統計），清心安神那邊不用改就會算進連續天數。
// 沒登入時完全不連網，登入套件（100KB）也不載入。
// SUPABASE_KEY 是 publishable key，本來就跟前端一起公開；防護在資料表的 RLS（只能讀寫自己的列）。
const SUPABASE_URL = "https://ntxqnvgpvshqwodagupt.supabase.co";
const SUPABASE_KEY = "sb_publishable__WK4UaYwJ6vBrPsx6gmL0g_U6D3blA0";
const DAYS = SUPABASE_URL + "/rest/v1/thai_days";
const AUTH_KEY = "thai-letters-auth-v1";
const SYNC_KEY = "thai-letters-sync-v1";   // { deviceId, pushed: [已經寫上去的日期] }

let clientPromise = null;
function getClient() {
  clientPromise ||= import("./vendor/supabase-auth.js").then(({ GoTrueClient }) => new GoTrueClient({
    url: SUPABASE_URL + "/auth/v1",
    headers: { apikey: SUPABASE_KEY },
    storageKey: AUTH_KEY,
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce"
  }));
  return clientPromise;
}

const returning = () => location.search.includes("code=");
export function signedIn() {
  try { return !!localStorage.getItem(AUTH_KEY) || returning(); } catch { return false; }
}

async function getSession() {
  const { data, error } = await (await getClient()).getSession();
  if (error) throw error;
  // Google 登入導回來時網址帶 ?code=，換完 session 就清掉，重新整理才不會再換一次
  if (returning()) history.replaceState(null, "", location.pathname + location.hash);
  return data.session;
}

export async function login() {
  // Supabase 的 Redirect URLs 白名單要有這個網址，否則登入後轉不回來
  const { error } = await (await getClient()).signInWithOAuth({
    provider: "google",
    options: { redirectTo: location.origin + location.pathname }
  });
  if (error) throw error;
}

export async function logout() {
  try { await (await getClient()).signOut(); } catch {}
  try { localStorage.removeItem(AUTH_KEY); localStorage.removeItem(SYNC_KEY); } catch {}
}

function loadSync() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; } catch {}
  s.deviceId ||= "letters-" + crypto.randomUUID();
  s.pushed ||= [];
  return s;
}

// 把還沒寫上去的日子寫上雲端，再讀回所有裝置「有來」的日期。
// 沒登入回 null；網路或登入出問題會丟錯，呼叫端顯示「待同步」。
export async function syncDays(doneDates) {
  if (!signedIn()) return null;
  const session = await getSession();
  if (!session) return null;
  const headers = { apikey: SUPABASE_KEY, Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" };
  const sync = loadSync();
  const rows = doneDates.filter(d => !sync.pushed.includes(d))
    .map(date => ({ user_id: session.user.id, date, device_id: sync.deviceId, games: 1, game_ids: ["letters"] }));
  if (rows.length) {
    const res = await fetch(DAYS, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows)
    });
    if (!res.ok) throw new Error("thai_days push " + res.status);
    sync.pushed.push(...rows.map(r => r.date));
  }
  localStorage.setItem(SYNC_KEY, JSON.stringify(sync));
  // 「有來」的定義照清心安神 today.js 的 cameOnDay()：複習過、玩過一局，或被安神保護蓋章
  const res = await fetch(DAYS + "?select=date&or=(reviewed.gt.0,games.gt.0,bridged.is.true)&order=date.desc&limit=1000", { headers });
  if (!res.ok) throw new Error("thai_days pull " + res.status);
  return [...new Set((await res.json()).map(r => r.date))];
}
