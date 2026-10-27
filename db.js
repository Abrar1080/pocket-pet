/* Pocket Pet — data layer.
 *
 * TWO MODES, never faked:
 * - ONLINE: config.js holds real Supabase values and the Supabase JS
 *   client loaded from CDN. Auth, tables, and Realtime are real.
 * - LOCAL: placeholders in config.js (or no network for the CDN).
 *   Single-player only, progress in localStorage. Social features show
 *   an honest "connect Supabase" notice; no fake players are invented.
 *
 * SECURITY NOTE (free tier): coin and stat changes are saved by the
 * player's own client under own-row RLS policies (see schema.sql).
 * That is fine for a friendly game. For a production game with real
 * money, move coin grants into Postgres SECURITY DEFINER functions
 * (the schema has a comment showing where) so clients cannot mint
 * coins by editing requests.
 */
window.PPDB = (function () {
  var cfg = window.PP_CONFIG || {};
  var hasValues = cfg.SUPABASE_URL && cfg.SUPABASE_URL.indexOf("YOUR_") !== 0 &&
    cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_ANON_KEY.indexOf("YOUR_") !== 0;
  var client = null;
  if (hasValues && typeof window.supabase !== "undefined") {
    try { client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); } catch (e) { client = null; }
  }
  var mode = client ? "online" : "local";
  var LS_KEY = "pocketpet_local_v1";

  function defaultState(displayName) {
    return {
      profile: { display_name: displayName || "Guest", coins: 100, streak: 0, last_care_date: null,
        care_coins_date: null, care_coins_today: 0, games_coins_date: null, games_coins_today: 0,
        games_played_date: null, games_played_today: 0 },
      pet: { species: "cat", name: "Milo", stage: "egg", xp: 0, sporty: 0, cozy: 0,
        hunger: 80, happiness: 80, energy: 80, health: 90, outfit: "none",
        unlocked: ["cat"], last_tick: Date.now() },
      inventory: [],
      furniture: [],
      logs: [],
      claims: {}
    };
  }

  function loadLocal() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }
  function saveLocal(state) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
  }

  // ---------- online helpers ----------
  async function onlineLoadGame(user) {
    var profRes = await client.from("profiles").select("*").eq("id", user.id).maybeSingle();
    var profile = profRes.data;
    if (!profile) {
      var meta = (user.user_metadata || {});
      var ins = await client.from("profiles").insert({
        id: user.id, display_name: meta.display_name || (user.email || "Player").split("@")[0], coins: 100
      }).select().single();
      if (ins.error) throw ins.error;
      profile = ins.data;
      await client.from("pets").insert({ owner_id: user.id, species: "cat", name: "Milo", stage: "egg", is_active: true });
    }
    var petRes = await client.from("pets").select("*").eq("owner_id", user.id).eq("is_active", true).maybeSingle();
    var pet = petRes.data;
    if (!pet) {
      var p2 = await client.from("pets").insert({ owner_id: user.id, species: "cat", name: "Milo", stage: "egg", is_active: true }).select().single();
      pet = p2.data;
    }
    var invRes = await client.from("inventory").select("*").eq("owner_id", user.id);
    var allPetsRes = await client.from("pets").select("species").eq("owner_id", user.id);
    var logRes = await client.from("care_logs").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(200);
    var claimRes = await client.from("quest_claims").select("*").eq("owner_id", user.id).order("claim_date", { ascending: false }).limit(30);
    var invList = [];
    (invRes.data || []).forEach(function (r) {
      var qty = r.qty || 1;
      for (var i = 0; i < qty; i++) invList.push(r.item_id);
    });
    return {
      profile: profile, pet: pet,
      inventory: invList,
      ownedSpecies: (allPetsRes.data || []).map(function (r) { return r.species; }),
      furniture: invList.filter(function (id) { return id.indexOf("furn_") === 0; }),
      logs: (logRes.data || []).map(function (r) { return { action: r.action, at: new Date(r.created_at).getTime() }; }),
      claims: (claimRes.data || []).reduce(function (acc, r) { acc[r.claim_date + ":" + r.quest_key] = true; return acc; }, {})
    };
  }

  async function onlineSaveProfile(p) {
    await client.from("profiles").update({
      display_name: p.display_name, coins: p.coins, streak: p.streak, last_care_date: p.last_care_date,
      care_coins_date: p.care_coins_date, care_coins_today: p.care_coins_today,
      games_coins_date: p.games_coins_date, games_coins_today: p.games_coins_today,
      games_played_date: p.games_played_date, games_played_today: p.games_played_today
    }).eq("id", p.id);
  }

  async function onlineSavePet(p) {
    await client.from("pets").update({
      species: p.species, name: p.name, stage: p.stage, xp: p.xp, sporty: p.sporty, cozy: p.cozy,
      hunger: p.hunger, happiness: p.happiness, energy: p.energy, health: p.health, outfit: p.outfit
    }).eq("id", p.id);
  }

  return {
    mode: mode,
    client: client,
    localKey: LS_KEY,
    defaultState: defaultState,
    loadLocal: loadLocal,
    saveLocal: saveLocal,

    async getSession() {
      if (!client) return null;
      var res = await client.auth.getSession();
      return res.data.session;
    },
    onAuthChange: function (cb) {
      if (!client) return;
      client.auth.onAuthStateChange(function (_event, session) { cb(session); });
    },
    async signUp(email, password, displayName) {
      var res = await client.auth.signUp({ email: email, password: password,
        options: { data: { display_name: displayName } } });
      if (res.error) throw res.error;
      return res.data;
    },
    async signIn(email, password) {
      var res = await client.auth.signInWithPassword({ email: email, password: password });
      if (res.error) throw res.error;
      return res.data;
    },
    async signInGoogle() {
      var res = await client.auth.signInWithOAuth({ provider: "google" });
      if (res.error) throw res.error;
      return res.data;
    },
    async signOut() { if (client) await client.auth.signOut(); },

    async loadGame(user) { return onlineLoadGame(user); },
    async saveProfile(p) { if (mode === "online") await onlineSaveProfile(p); },
    async savePet(p) { if (mode === "online") await onlineSavePet(p); },
    async addInventory(userId, itemId) {
      if (mode !== "online") return;
      var ex = await client.from("inventory").select("*").eq("owner_id", userId).eq("item_id", itemId).maybeSingle();
      if (ex.data) await client.from("inventory").update({ qty: (ex.data.qty || 1) + 1 }).eq("id", ex.data.id);
      else await client.from("inventory").insert({ owner_id: userId, item_id: itemId, qty: 1 });
    },
    async removeInventory(userId, itemId) {
      if (mode !== "online") return;
      var ex = await client.from("inventory").select("*").eq("owner_id", userId).eq("item_id", itemId).maybeSingle();
      if (!ex.data) return;
      if ((ex.data.qty || 1) > 1) await client.from("inventory").update({ qty: ex.data.qty - 1 }).eq("id", ex.data.id);
      else await client.from("inventory").delete().eq("id", ex.data.id);
    },
    async findPetBySpecies(userId, species) {
      if (mode !== "online") return null;
      var res = await client.from("pets").select("*").eq("owner_id", userId).eq("species", species).maybeSingle();
      return res.data;
    },
    async logCare(userId, action) {
      if (mode !== "online") return;
      await client.from("care_logs").insert({ owner_id: userId, action: action });
    },
    async claimQuest(userId, questKey, dateStr) {
      if (mode !== "online") return;
      await client.from("quest_claims").insert({ owner_id: userId, quest_key: questKey, claim_date: dateStr });
    },
    async switchPet(userId, petRowId) {
      if (mode !== "online") return;
      await client.from("pets").update({ is_active: false }).eq("owner_id", userId);
      await client.from("pets").update({ is_active: true }).eq("id", petRowId);
    },
    async adoptPet(userId, species) {
      if (mode !== "online") return null;
      var res = await client.from("pets").insert({ owner_id: userId, species: species, name: species[0].toUpperCase() + species.slice(1), stage: "egg", is_active: false }).select().single();
      return res.data;
    },

    // ---- rooms / chat / races (online only) ----
    async createRoom(userId) {
      var code = "";
      var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      for (var i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
      var res = await client.from("rooms").insert({ code: code, created_by: userId }).select().single();
      if (res.error) throw res.error;
      await client.from("room_members").insert({ room_id: res.data.id, user_id: userId });
      return res.data;
    },
    async joinRoom(userId, code) {
      var room = await client.from("rooms").select("*").eq("code", code.trim().toUpperCase()).maybeSingle();
      if (!room.data) throw new Error("No room with that code.");
      var members = await client.from("room_members").select("*").eq("room_id", room.data.id);
      if ((members.data || []).length >= 3) throw new Error("This room is full (max 3 friends).");
      var already = (members.data || []).some(function (m) { return m.user_id === userId; });
      if (!already) await client.from("room_members").insert({ room_id: room.data.id, user_id: userId });
      return room.data;
    },
    async roomMembers(roomId) {
      var m = await client.from("room_members").select("*").eq("room_id", roomId);
      var ids = (m.data || []).map(function (x) { return x.user_id; });
      if (!ids.length) return [];
      var profs = await client.from("profiles").select("id,display_name").in("id", ids);
      var pets = await client.from("pets").select("*").in("owner_id", ids).eq("is_active", true);
      var pmap = {};
      (profs.data || []).forEach(function (p) { pmap[p.id] = p.display_name; });
      var petmap = {};
      (pets.data || []).forEach(function (p) { petmap[p.owner_id] = p; });
      return (m.data || []).map(function (x) { return { user_id: x.user_id, name: pmap[x.user_id] || "Friend", pet: petmap[x.user_id] || null }; });
    },
    async sendMessage(roomId, userId, displayName, body) {
      await client.from("messages").insert({ room_id: roomId, user_id: userId, display_name: displayName, body: body });
    },
    async roomMessages(roomId) {
      var res = await client.from("messages").select("*").eq("room_id", roomId).order("created_at", { ascending: true }).limit(100);
      return res.data || [];
    },
    subscribeRoom(roomId, onEvent) {
      var ch = client.channel("room-" + roomId);
      ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "room_id=eq." + roomId }, function (p) { onEvent("message", p.new); });
      ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "room_members", filter: "room_id=eq." + roomId }, function () { onEvent("members"); });
      ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "races", filter: "room_id=eq." + roomId }, function (p) { onEvent("race", p.new); });
      ch.subscribe();
      return ch;
    },
    async recordRace(roomId, startedBy, results, winnerId) {
      await client.from("races").insert({ room_id: roomId, started_by: startedBy, results: results, winner_id: winnerId });
    }
  };
})();
