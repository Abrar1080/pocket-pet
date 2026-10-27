/* Pocket Pet — game logic. Plain script (works from file:// too).
 * Modes: LOCAL (localStorage, single player) or ONLINE (Supabase).
 * The pet NEVER dies: stats have floors, and a sad pet always recovers.
 */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  function todayStr(d) { d = d || new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function yesterdayStr() { var d = new Date(); d.setDate(d.getDate() - 1); return todayStr(d); }

  var XP_STAGES = [
    { max: 20, stage: "egg" }, { max: 100, stage: "baby" },
    { max: 250, stage: "teen" }, { max: Infinity, stage: "adult" }
  ];
  function stageOf(xp) { for (var i = 0; i < XP_STAGES.length; i++) if (xp < XP_STAGES[i].max) return XP_STAGES[i].stage; return "adult"; }
  function styleOf(pet) {
    if (pet.sporty >= pet.cozy + 5) return "sporty";
    if (pet.cozy >= pet.sporty + 5) return "cozy";
    return "classic";
  }

  var ACTIONS = {
    water: { label: "💧 Drink water", dh: 6, dhp: 4, de: 2, xp: 5, coins: 2, quest: "water" },
    meal: { label: "🍽 Eat a meal", dh: 18, dhp: 6, de: 0, xp: 8, coins: 3, quest: null },
    walk: { label: "🚶 Go for a walk", dh: -2, dhp: 10, de: -8, xp: 10, coins: 3, quest: "walk", sporty: 1 },
    play: { label: "🎾 Play with pet", dh: -2, dhp: 12, de: -6, xp: 8, coins: 2, quest: "play" },
    sleep: { label: "😴 Sleep / rest", dh: 0, dhp: 2, de: 30, xp: 5, coins: 1, quest: null, cozy: 1 },
    cuddle: { label: "🤗 Cuddle pet", dh: 0, dhp: 8, de: -2, xp: 5, coins: 1, quest: null, cozy: 1 },
    brush: { label: "🪥 Brush fur", dh: 0, dhp: 8, de: -2, xp: 6, coins: 2, quest: "brush", cozy: 1, dhealth: 4 },
    dance: { label: "💃 Dance together", dh: 0, dhp: 12, de: -6, xp: 8, coins: 2, quest: null, sporty: 1 },
    sing: { label: "🎤 Sing together", dh: 0, dhp: 10, de: -2, xp: 6, coins: 2, quest: null, cozy: 1 }
  };
  var QUESTS = [
    { key: "water", label: "Drink water 6 times", target: 6, action: "water", reward: 30 },
    { key: "play", label: "Play with your pet 3 times", target: 3, action: "play", reward: 30 },
    { key: "walk", label: "Go for a walk 2 times", target: 2, action: "walk", reward: 30 },
    { key: "brush", label: "Brush your pet 2 times", target: 2, action: "brush", reward: 30 },
    { key: "game", label: "Play 2 games", target: 2, action: "game", reward: 30 }
  ];
  var SHOP = [
    { id: "food_treat", kind: "food", name: "Tasty Treat", price: 10, desc: "+15 hunger", dh: 15 },
    { id: "food_fish", kind: "food", name: "Fresh Fish", price: 20, desc: "+25 hunger", dh: 25 },
    { id: "food_cake", kind: "food", name: "Berry Cake", price: 35, desc: "+35 hunger, +10 happy", dh: 35, dhp: 10 },
    { id: "food_milk", kind: "food", name: "Fresh Milk", price: 15, desc: "+12 hunger", dh: 12 },
    { id: "food_tuna", kind: "food", name: "Tuna Feast", price: 45, desc: "+40 hunger, +5 happy", dh: 40, dhp: 5 },
    { id: "toy_ball", kind: "toy", name: "Bouncy Ball", price: 40, desc: "+15 happiness when used", dhp: 15 },
    { id: "toy_squeak", kind: "toy", name: "Squeaky Toy", price: 60, desc: "+20 happiness when used", dhp: 20 },
    { id: "toy_feather", kind: "toy", name: "Feather Wand", price: 55, desc: "+18 happiness when used", dhp: 18 },
    { id: "toy_mouse", kind: "toy", name: "Catnip Mouse", price: 75, desc: "+25 happiness when used", dhp: 25 },
    { id: "out_dress", kind: "outfit", name: "Pink Dress", price: 80, outfit: "dress", desc: "A pretty pink dress" },
    { id: "out_hoodie", kind: "outfit", name: "Blue Hoodie", price: 90, outfit: "hoodie", desc: "A cozy blue hoodie" },
    { id: "out_crown", kind: "outfit", name: "Golden Crown", price: 150, outfit: "crown", desc: "For a royal pet" },
    { id: "out_shades", kind: "outfit", name: "Cool Sunglasses", price: 70, outfit: "sunglasses", desc: "Very cool" },
    { id: "out_bow", kind: "outfit", name: "Red Bow", price: 50, outfit: "bow", desc: "A cute red bow" },
    { id: "furn_bed", kind: "furniture", name: "Cozy Bed", price: 100, desc: "For the pet room" },
    { id: "furn_plant", kind: "furniture", name: "Green Plant", price: 60, desc: "For the pet room" },
    { id: "furn_rug", kind: "furniture", name: "Soft Rug", price: 50, desc: "For the pet room" },
    { id: "furn_lamp", kind: "furniture", name: "Warm Lamp", price: 70, desc: "For the pet room" },
    { id: "furn_post", kind: "furniture", name: "Scratching Post", price: 90, desc: "For the pet room" },
    { id: "furn_perch", kind: "furniture", name: "Window Perch", price: 85, desc: "For the pet room" },
    { id: "furn_box", kind: "furniture", name: "Toy Box", price: 65, desc: "For the pet room" }
  ];
  var TRICKS = [
    { key: "sit", label: "Sit", cost: 20 },
    { key: "wave", label: "Wave", cost: 25 },
    { key: "jump", label: "Jump", cost: 30 },
    { key: "roll", label: "Roll over", cost: 40 }
  ];
  var ACH = [
    { key: "first_steps", label: "First Steps", desc: "Do your first care action", reward: 20, check: function () { return S.logs.length > 0; } },
    { key: "streak7", label: "7-Day Streak", desc: "Care 7 days in a row", reward: 50, check: function () { return S.profile.streak >= 7; } },
    { key: "shop3", label: "Shopaholic", desc: "Buy 3 shop items", reward: 30, check: function () { return S.stats.shopBuys >= 3; } },
    { key: "trickstar", label: "Trick Star", desc: "Teach your pet 2 tricks", reward: 40, check: function () { return (S.pet.tricks || []).length >= 2; } },
    { key: "saver500", label: "Coin Saver", desc: "Hold 500 coins at once", reward: 50, check: function () { return S.profile.coins >= 500; } },
    { key: "gamenight", label: "Game Night", desc: "Finish 10 games", reward: 40, check: function () { return S.stats.gamesTotal >= 10; } }
  ];
  function levelOf(xp) { return Math.floor(xp / 50) + 1; }
  var PET_TALK = [
    "I love spending the day with you!", "Can we play fetch later?",
    "You are my favorite human!", "Purr... I mean, hello!",
    "Did you drink water today? Let's do it together!",
    "I had a dream we raced and I won!", "Your room looks nicer every day!"
  ];

  var S = {
    mode: "local", user: null, profile: null, pet: null, petBook: {},
    inventory: [], furniture: [], logs: [], claims: {},
    room: null, members: [], channel: null, renderedMsgIds: {},
    lastAction: null, stats: { shopBuys: 0, gamesTotal: 0 }, achClaims: {}, shopCat: "all"
  };

  function loadStats() {
    try {
      var raw = localStorage.getItem("pp_stats_v1");
      if (raw) { var s = JSON.parse(raw); if (s) return s; }
    } catch (e) {}
    return { shopBuys: 0, gamesTotal: 0 };
  }
  function saveStats() {
    try { localStorage.setItem("pp_stats_v1", JSON.stringify(S.stats)); } catch (e) {}
  }

  function isOnline() { return S.mode === "online" && !!S.user; }

  function moodOf() {
    var p = S.pet;
    if (!p) return "happy";
    var t = todayStr();
    if (p.energy < 25) return "sleepy";
    if (p.hunger < 30) return "hungry";
    if (p.happiness < 35) return "sad";
    if (S.profile && S.profile.last_care_date && S.profile.last_care_date < yesterdayStr() && S.profile.last_care_date !== t) return "sad";
    return "happy";
  }

  function speechLine() {
    var p = S.pet, m = moodOf();
    if (p.stage === "egg") return "Tap care actions to help me hatch!";
    if (m === "hungry") return "I'm so hungry... can we eat something?";
    if (m === "sleepy") return "Yawwwn... I need a rest.";
    if (m === "sad") return "I missed you... let's play and cheer me up!";
    if (p.hunger > 85 && p.happiness > 85) return "I feel amazing today! Best human ever!";
    return PET_TALK[Math.floor(Math.random() * PET_TALK.length)];
  }

  function persist() {
    saveStats();
    if (S.mode === "local") {
      PPDB.saveLocal({ profile: S.profile, pet: S.pet, petBook: S.petBook, inventory: S.inventory, furniture: S.furniture, logs: S.logs, claims: S.claims, achClaims: S.achClaims });
    } else if (S.user) {
      PPDB.saveProfile(S.profile);
      PPDB.savePet(S.pet);
    }
  }

  // Where the pet stands in its house scene, by what it is doing.
  function petPosClass() {
    if (moodOf() === "sleepy" || S.lastAction === "sleep") return "pos-bed";
    if (S.lastAction === "play" || S.lastAction === "walk") return "pos-play";
    if (S.lastAction === "meal" || S.lastAction === "water") return "pos-bowl";
    return "pos-center";
  }

  function resetDailyBuckets() {
    var t = todayStr(), p = S.profile;
    if (p.care_coins_date !== t) { p.care_coins_date = t; p.care_coins_today = 0; }
    if (p.games_coins_date !== t) { p.games_coins_date = t; p.games_coins_today = 0; }
    if (p.games_played_date !== t) { p.games_played_date = t; p.games_played_today = 0; }
  }

  function grantCoins(n, bucket) {
    resetDailyBuckets();
    var p = S.profile;
    if (bucket === "care") {
      var room = 30 - p.care_coins_today;
      n = Math.max(0, Math.min(n, room));
      p.care_coins_today += n;
    } else if (bucket === "game") {
      var roomG = 100 - p.games_coins_today;
      n = Math.max(0, Math.min(n, roomG));
      p.games_coins_today += n;
    }
    p.coins += n;
    return n;
  }

  function applyDecay() {
    var p = S.pet; if (!p) return;
    var hours = (Date.now() - (p.last_tick || Date.now())) / 3600000;
    if (hours < 0.25) return;
    p.hunger = clamp(Math.round(p.hunger - 2 * hours), 10, 100);
    p.happiness = clamp(Math.round(p.happiness - 1.5 * hours), 10, 100);
    p.energy = clamp(Math.round(p.energy - 1 * hours), 10, 100);
    var low = Math.min(p.hunger, p.happiness, p.energy);
    p.health = clamp(Math.round(p.health + (low < 30 ? -1 : 0.5) * hours), 20, 100);
    p.last_tick = Date.now();
  }

  function todayLogs() {
    var t = todayStr();
    return S.logs.filter(function (l) { return todayStr(new Date(l.at)) === t; });
  }
  function countAction(action) {
    return todayLogs().filter(function (l) { return l.action === action; }).length;
  }

  function renderPet() {
    if (!S.pet) return;
    S.pet.stage = stageOf(S.pet.xp);
    var mood = moodOf();
    $("petArt").innerHTML = PetArt.render(S.pet.species, S.pet.stage, styleOf(S.pet), S.pet.outfit, mood);
    $("petArt").className = "petart " + petPosClass();
    $("petNameLabel").textContent = S.pet.name;
    $("petSpeciesLabel").textContent = PetArt.SPECIES[S.pet.species].name + " · " + S.pet.stage + " · " + styleOf(S.pet) + " style";
    $("speechBubble").textContent = speechLine();
    var stats = [["Hunger", S.pet.hunger, "statHunger", "valHunger"], ["Happiness", S.pet.happiness, "statHappy", "valHappy"],
      ["Energy", S.pet.energy, "statEnergy", "valEnergy"], ["Health", S.pet.health, "statHealth", "valHealth"]];
    stats.forEach(function (s) {
      $(s[2]).style.width = s[1] + "%";
      $(s[3]).textContent = s[1];
    });
    $("coinCount").textContent = S.profile.coins;
    $("streakBadge").textContent = "🔥 " + S.profile.streak;
    $("profileName").textContent = S.profile.display_name;
    $("levelLabel").textContent = "Level " + levelOf(S.pet.xp) + " · " + (S.pet.xp % 50) + "/50 XP to next level";
    $("dailyBonusBtn").disabled = !!S.claims[todayStr() + ":dailybonus"];
    renderQuests();
    renderAdopt();
  }

  function claimDailyBonus() {
    var key = todayStr() + ":dailybonus";
    if (S.claims[key]) { $("dailyBonusMsg").textContent = "Already claimed today — come back tomorrow!"; return; }
    S.claims[key] = true;
    S.profile.coins += 25;
    S.pet.happiness = clamp(S.pet.happiness + 10, 10, 100);
    if (isOnline()) PPDB.claimQuest(S.user.id, "dailybonus", todayStr());
    persist(); renderPet();
    $("dailyBonusMsg").textContent = "Daily bonus! +25 coins and a happier pet! 🎁";
  }

  // ---------- tricks ----------
  function renderTricks() {
    if (!S.pet) return;
    var learned = S.pet.tricks || [];
    $("trickList").innerHTML = TRICKS.map(function (t) {
      var has = learned.indexOf(t.key) >= 0;
      var btn = has ? '<button class="btn small" data-perform="' + t.key + '">Perform</button>'
        : '<button class="btn small" data-learn="' + t.key + '">Train · 🪙 ' + t.cost + "</button>";
      return '<div class="quest"><span>' + t.label + (has ? " (learned)" : "") + "</span>" + btn + "</div>";
    }).join("");
    document.querySelectorAll("[data-learn]").forEach(function (b) { b.onclick = function () { learnTrick(b.getAttribute("data-learn")); }; });
    document.querySelectorAll("[data-perform]").forEach(function (b) { b.onclick = function () { performTrick(b.getAttribute("data-perform")); }; });
  }

  function learnTrick(key) {
    var t = TRICKS.filter(function (x) { return x.key === key; })[0];
    if (!t || (S.pet.tricks || []).indexOf(key) >= 0) return;
    if (S.profile.coins < t.cost) { alert("Not enough coins to train " + t.label + " yet!"); return; }
    S.profile.coins -= t.cost;
    S.pet.tricks.push(key);
    persist(); renderTricks(); renderPet();
    $("speechBubble").textContent = S.pet.name + " learned " + t.label + "! 🎩";
  }

  function performTrick(key) {
    var t = TRICKS.filter(function (x) { return x.key === key; })[0];
    if (!t || (S.pet.tricks || []).indexOf(key) < 0) return;
    S.pet.happiness = clamp(S.pet.happiness + 5, 10, 100);
    S.lastAction = "play";
    persist(); renderPet();
    $("speechBubble").textContent = S.pet.name + " does " + t.label + "! So clever! 🎉";
  }

  // ---------- achievements ----------
  function renderAchievements() {
    if (!S.pet) return;
    $("achList").innerHTML = ACH.map(function (a) {
      var claimed = !!S.achClaims[a.key];
      var btn = claimed ? '<span class="done">Claimed ✓</span>'
        : (a.check() ? '<button class="btn small" data-ach="' + a.key + '">Claim +' + a.reward + "</button>"
        : '<span class="muted">Locked</span>');
      return '<div class="quest"><span><b>' + a.label + "</b> — " + a.desc + "</span>" + btn + "</div>";
    }).join("");
    document.querySelectorAll("[data-ach]").forEach(function (b) { b.onclick = function () { claimAchievement(b.getAttribute("data-ach")); }; });
  }

  function claimAchievement(key) {
    var a = ACH.filter(function (x) { return x.key === key; })[0];
    if (!a || S.achClaims[key] || !a.check()) return;
    S.achClaims[key] = true;
    S.profile.coins += a.reward;
    if (isOnline()) PPDB.claimAchievement(S.user.id, key);
    persist(); renderAchievements(); renderPet();
    alert("Achievement unlocked: " + a.label + "! +" + a.reward + " coins 🏆");
  }

  function renderQuests() {
    var t = todayStr();
    $("questList").innerHTML = QUESTS.map(function (q) {
      var done = countAction(q.action);
      var claimed = !!S.claims[t + ":" + q.key];
      var btn = claimed ? '<span class="done">Claimed ✓</span>'
        : (done >= q.target ? '<button class="btn small" data-claim="' + q.key + '">Claim +' + q.reward + '</button>'
        : '<span class="muted">' + done + "/" + q.target + "</span>");
      return '<div class="quest"><span>' + q.label + '</span>' + btn + "</div>";
    }).join("");
    document.querySelectorAll("[data-claim]").forEach(function (b) {
      b.onclick = function () { claimQuest(b.getAttribute("data-claim")); };
    });
  }

  function claimQuest(key) {
    var q = QUESTS.filter(function (x) { return x.key === key; })[0];
    var t = todayStr();
    if (countAction(q.action) < q.target || S.claims[t + ":" + key]) return;
    S.claims[t + ":" + key] = true;
    S.profile.coins += q.reward;
    if (isOnline()) PPDB.claimQuest(S.user.id, key, t);
    persist(); renderPet();
    alert("Quest complete! +" + q.reward + " coins 🪙");
  }

  function doAction(key) {
    var a = ACTIONS[key], p = S.pet;
    if (!a || !p) return;
    var oldStage = p.stage;
    p.hunger = clamp(p.hunger + (a.dh || 0), 10, 100);
    p.happiness = clamp(p.happiness + (a.dhp || 0), 10, 100);
    p.energy = clamp(p.energy + (a.de || 0), 10, 100);
    if (a.dhealth) p.health = clamp(p.health + a.dhealth, 20, 100);
    S.lastAction = key;
    p.xp += a.xp;
    if (a.sporty) p.sporty += a.sporty;
    if (a.cozy) p.cozy += a.cozy;
    p.stage = stageOf(p.xp);
    var got = grantCoins(a.coins, "care");
    S.logs.unshift({ action: key, at: Date.now() });
    S.logs = S.logs.slice(0, 300);
    // streak
    var t = todayStr(), prof = S.profile;
    if (prof.last_care_date !== t) {
      prof.streak = (prof.last_care_date === yesterdayStr()) ? prof.streak + 1 : 1;
      prof.last_care_date = t;
    }
    if (isOnline()) PPDB.logCare(S.user.id, key);
    persist(); renderPet();
    if (p.stage !== oldStage) {
      setTimeout(function () { alert("Your pet grew into a " + p.stage + "! 🎉"); }, 150);
    }
    $("speechBubble").textContent = got > 0 ? "Yay! +" + got + " coins!" : "Nice!";
  }

  var SHOP_CATS = [
    { key: "all", label: "All" }, { key: "food", label: "🍽 Food" },
    { key: "toy", label: "🧸 Toys" }, { key: "outfit", label: "👗 Outfits" },
    { key: "furniture", label: "🪑 Furniture" }
  ];
  function renderShop() {
    $("shopCats").innerHTML = SHOP_CATS.map(function (c) {
      return '<button class="chip chipbtn' + (S.shopCat === c.key ? " active" : "") + '" data-cat="' + c.key + '">' + c.label + "</button>";
    }).join("");
    document.querySelectorAll("[data-cat]").forEach(function (b) {
      b.onclick = function () { S.shopCat = b.getAttribute("data-cat"); renderShop(); };
    });
    var items = SHOP.filter(function (it) { return S.shopCat === "all" || it.kind === S.shopCat; });
    $("shopList").innerHTML = items.map(function (it) {
      var owned = S.inventory.filter(function (x) { return x === it.id; }).length;
      var btn = "";
      if (it.kind === "outfit" && owned > 0) {
        btn = '<button class="btn small" data-equip="' + it.id + '">Wear</button>';
      } else if (it.kind === "furniture" && owned > 0) {
        btn = '<button class="btn small" data-place="' + it.id + '">Place</button>';
      } else if ((it.kind === "food" || it.kind === "toy") && owned > 0) {
        btn = '<button class="btn small" data-use="' + it.id + '">Use (' + owned + ")</button>";
      }
      return '<div class="shop-item"><b>' + it.name + '</b><span class="muted">' + it.desc + "</span>" +
        '<span class="price">🪙 ' + it.price + "</span>" +
        '<button class="btn small" data-buy="' + it.id + '">Buy</button>' + btn + "</div>";
    }).join("");
    document.querySelectorAll("[data-buy]").forEach(function (b) { b.onclick = function () { buyItem(b.getAttribute("data-buy")); }; });
    document.querySelectorAll("[data-use]").forEach(function (b) { b.onclick = function () { useItem(b.getAttribute("data-use")); }; });
    document.querySelectorAll("[data-equip]").forEach(function (b) { b.onclick = function () { equipOutfit(b.getAttribute("data-equip")); }; });
    document.querySelectorAll("[data-place]").forEach(function (b) { b.onclick = function () { placeFurniture(b.getAttribute("data-place")); }; });
    renderInventory();
    renderRoomPreview();
  }

  function buyItem(id) {
    var it = SHOP.filter(function (x) { return x.id === id; })[0];
    if (!it) return;
    if (S.profile.coins < it.price) { alert("Not enough coins yet — play, care, and finish quests to earn more!"); return; }
    S.profile.coins -= it.price;
    S.stats.shopBuys++;
    S.inventory.push(id);
    if (it.kind === "furniture") S.furniture.push(id);
    if (isOnline()) PPDB.addInventory(S.user.id, id);
    persist(); renderShop(); renderPet();
  }

  function useItem(id) {
    var it = SHOP.filter(function (x) { return x.id === id; })[0];
    var idx = S.inventory.indexOf(id);
    if (idx < 0) return;
    S.inventory.splice(idx, 1);
    if (it.dh) S.pet.hunger = clamp(S.pet.hunger + it.dh, 10, 100);
    if (it.dhp) S.pet.happiness = clamp(S.pet.happiness + it.dhp, 10, 100);
    if (it.kind === "food") S.lastAction = "meal";
    if (isOnline()) PPDB.removeInventory(S.user.id, id);
    persist(); renderShop(); renderPet();
  }

  function equipOutfit(id) {
    var it = SHOP.filter(function (x) { return x.id === id; })[0];
    if (!it || !it.outfit) return;
    S.pet.outfit = (S.pet.outfit === it.outfit) ? "none" : it.outfit;
    persist(); renderShop(); renderPet();
  }

  function placeFurniture(id) {
    if (S.furniture.indexOf(id) < 0) S.furniture.push(id);
    persist(); renderRoomPreview();
  }

  function renderInventory() {
    var counts = {};
    S.inventory.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
    var keys = Object.keys(counts);
    $("invList").innerHTML = keys.length ? keys.map(function (id) {
      var it = SHOP.filter(function (x) { return x.id === id; })[0];
      return "<span class='chip'>" + (it ? it.name : id) + " ×" + counts[id] + "</span>";
    }).join("") : '<span class="muted">Nothing yet — buy something from the shop!</span>';
    $("roomPreview").innerHTML = S.furniture.length ? S.furniture.map(function (id) {
      var it = SHOP.filter(function (x) { return x.id === id; })[0];
      return "<span class='chip'>" + (it ? it.name : id) + "</span>";
    }).join("") : '<span class="muted">Your pet room is empty — buy furniture to decorate it!</span>';
  }

  function renderRoomPreview() { renderInventory(); }

  function renderAdopt() {
    var list = Object.keys(PetArt.SPECIES).filter(function (sp) { return sp !== S.pet.species; });
    $("adoptList").innerHTML = list.map(function (sp) {
      var c = PetArt.SPECIES[sp];
      var owned = S.pet.unlocked.indexOf(sp) >= 0;
      var active = false;
      var btn = owned ? '<button class="btn small" data-switch="' + sp + '">Play with ' + c.name + "</button>"
        : '<button class="btn small" data-adopt="' + sp + '">Adopt · 🪙 ' + c.price + "</button>";
      return '<div class="adopt"><span>' + c.name + (owned ? " (owned)" : "") + "</span>" + btn + "</div>";
    }).join("");
    document.querySelectorAll("[data-adopt]").forEach(function (b) { b.onclick = function () { adoptPet(b.getAttribute("data-adopt")); }; });
    document.querySelectorAll("[data-switch]").forEach(function (b) { b.onclick = function () { switchPet(b.getAttribute("data-switch")); }; });
  }

  function adoptPet(sp) {
    var c = PetArt.SPECIES[sp];
    if (S.profile.coins < c.price) { alert("Not enough coins for the " + c.name + " yet!"); return; }
    S.profile.coins -= c.price;
    S.pet.unlocked.push(sp);
    if (isOnline()) PPDB.adoptPet(S.user.id, sp).then(function () { persist(); renderPet(); });
    else { persist(); renderPet(); }
    alert("You adopted a " + c.name + "! Find it in the pet list below.");
  }

  function switchPet(sp) {
    if (S.pet.unlocked.indexOf(sp) < 0) return;
    if (isOnline()) {
      PPDB.findPetBySpecies(S.user.id, sp).then(function (row) {
        if (row) PPDB.switchPet(S.user.id, row.id).then(function () { location.reload(); });
      });
      return;
    }
    // local: keep each species' progress in the pet book
    S.petBook[S.pet.species] = S.pet;
    if (S.petBook[sp]) { S.pet = S.petBook[sp]; }
    else {
      var unlocked = S.pet.unlocked.slice();
      S.pet = { species: sp, name: PetArt.SPECIES[sp].name, stage: "egg", xp: 0, sporty: 0, cozy: 0,
        hunger: 80, happiness: 80, energy: 80, health: 90, outfit: "none", unlocked: unlocked, last_tick: Date.now() };
      S.petBook[sp] = S.pet;
    }
    persist(); renderPet();
  }

  // ---------- mini-games ----------
  var fetchTimer = null;
  function startFetch() {
    resetDailyBuckets();
    if (S.profile.games_played_today >= 10 && S.profile.games_played_date === todayStr()) {
      $("fetchMsg").textContent = "Daily play limit reached (10 plays). Come back tomorrow!";
      return;
    }
    var score = 0, left = 20;
    $("fetchScore").textContent = "Score: 0";
    $("fetchTime").textContent = "Time: 20s";
    $("fetchMsg").textContent = "Tap the ball as fast as you can!";
    var area = $("fetchArea");
    area.innerHTML = "";
    var target = document.createElement("button");
    target.className = "fetch-target";
    target.textContent = "🎾";
    target.onclick = function () { score++; $("fetchScore").textContent = "Score: " + score; moveTarget(); };
    area.appendChild(target);
    function moveTarget() {
      var w = area.clientWidth - 60, h = area.clientHeight - 60;
      target.style.left = Math.floor(Math.random() * Math.max(w, 10)) + "px";
      target.style.top = Math.floor(Math.random() * Math.max(h, 10)) + "px";
    }
    moveTarget();
    var mover = setInterval(moveTarget, 900);
    var tick = setInterval(function () {
      left--;
      $("fetchTime").textContent = "Time: " + left + "s";
      if (left <= 0) {
        clearInterval(tick); clearInterval(mover);
        area.innerHTML = "";
        var coins = 0;
        if (S.profile.games_played_date === todayStr()) {
          S.profile.games_played_today++;
          S.stats.gamesTotal++;
          S.logs.unshift({ action: "game", at: Date.now() });
          S.logs = S.logs.slice(0, 300);
          coins = grantCoins(Math.min(score, 20), "game");
        }
        S.pet.happiness = clamp(S.pet.happiness + 10, 10, 100);
        persist(); renderPet();
        $("fetchMsg").textContent = "Fetch done! Score " + score + " · +" + coins + " coins · pet is happier!";
      }
    }, 1000);
    fetchTimer = tick;
  }

  var memFirst = null, memLock = false, memPairs = 0, memFlips = 0;
  function startMemory() {
    resetDailyBuckets();
    if (S.profile.games_played_today >= 10 && S.profile.games_played_date === todayStr()) {
      $("memMsg").textContent = "Daily play limit reached (10 plays). Come back tomorrow!";
      return;
    }
    var syms = ["★", "♥", "♪", "✿", "☀", "☘"];
    var deck = syms.concat(syms).sort(function () { return Math.random() - 0.5; });
    memFirst = null; memLock = false; memPairs = 0; memFlips = 0;
    $("memBoard").innerHTML = deck.map(function (s, i) {
      return '<button class="mem-card" data-i="' + i + '" data-s="' + s + '">?</button>';
    }).join("");
    $("memMsg").textContent = "Find all 6 pairs!";
    document.querySelectorAll(".mem-card").forEach(function (card) {
      card.onclick = function () {
        if (memLock || card.classList.contains("open")) return;
        card.classList.add("open");
        card.textContent = card.getAttribute("data-s");
        memFlips++;
        if (!memFirst) { memFirst = card; return; }
        var a = memFirst, b = card;
        memFirst = null;
        if (a.getAttribute("data-s") === b.getAttribute("data-s")) {
          memPairs++;
          if (memPairs === 6) {
            var coins = 0;
            if (S.profile.games_played_date === todayStr()) {
              S.profile.games_played_today++;
              S.stats.gamesTotal++;
              S.logs.unshift({ action: "game", at: Date.now() });
              S.logs = S.logs.slice(0, 300);
              coins = grantCoins(20, "game");
            }
            S.pet.happiness = clamp(S.pet.happiness + 10, 10, 100);
            persist(); renderPet();
            $("memMsg").textContent = "You matched them all in " + memFlips + " flips! +" + coins + " coins!";
          }
        } else {
          memLock = true;
          setTimeout(function () {
            a.classList.remove("open"); a.textContent = "?";
            b.classList.remove("open"); b.textContent = "?";
            memLock = false;
          }, 700);
        }
      };
    });
  }

  // ---------- catch the fish (third mini-game, same caps as fetch) ----------
  function startFish() {
    resetDailyBuckets();
    if (S.profile.games_played_today >= 10 && S.profile.games_played_date === todayStr()) {
      $("fishMsg").textContent = "Daily play limit reached (10 plays). Come back tomorrow!";
      return;
    }
    var score = 0, left = 20;
    $("fishScore").textContent = "Score: 0";
    $("fishTime").textContent = "Time: 20s";
    $("fishMsg").textContent = "Tap the fish as fast as you can!";
    var area = $("fishArea");
    area.innerHTML = "";
    var target = document.createElement("button");
    target.className = "fetch-target";
    target.textContent = "🐟";
    target.onclick = function () { score++; $("fishScore").textContent = "Score: " + score; moveTarget(); };
    area.appendChild(target);
    function moveTarget() {
      var w = area.clientWidth - 60, h = area.clientHeight - 60;
      target.style.left = Math.floor(Math.random() * Math.max(w, 10)) + "px";
      target.style.top = Math.floor(Math.random() * Math.max(h, 10)) + "px";
    }
    moveTarget();
    var mover = setInterval(moveTarget, 800);
    var tick = setInterval(function () {
      left--;
      $("fishTime").textContent = "Time: " + left + "s";
      if (left <= 0) {
        clearInterval(tick); clearInterval(mover);
        area.innerHTML = "";
        var coins = 0;
        if (S.profile.games_played_date === todayStr()) {
          S.profile.games_played_today++;
          S.stats.gamesTotal++;
          S.logs.unshift({ action: "game", at: Date.now() });
          S.logs = S.logs.slice(0, 300);
          coins = grantCoins(Math.min(score, 20), "game");
        }
        S.pet.happiness = clamp(S.pet.happiness + 10, 10, 100);
        persist(); renderPet();
        $("fishMsg").textContent = "Fishing done! Score " + score + " · +" + coins + " coins · pet is happier!";
      }
    }, 1000);
  }

  // ---------- diary ----------
  function renderDiary() {
    var weekAgo = Date.now() - 7 * 86400000;
    var week = S.logs.filter(function (l) { return l.at >= weekAgo; });
    var counts = {};
    week.forEach(function (l) { counts[l.action] = (counts[l.action] || 0) + 1; });
    var claimCount = Object.keys(S.claims).filter(function (k) {
      var d = k.split(":")[0];
      return d >= todayStr(new Date(weekAgo));
    }).length;
    $("diaryCard").innerHTML =
      "<h3>📖 My week with " + S.pet.name + "</h3>" +
      "<p>Care actions this week: <b>" + week.length + "</b> · Quests claimed: <b>" + claimCount + "</b></p>" +
      "<p>Streak: <b>🔥 " + S.profile.streak + " days</b> · Coins: <b>🪙 " + S.profile.coins + "</b></p>" +
      "<p>Pet stage: <b>" + S.pet.stage + "</b> · XP: <b>" + S.pet.xp + "</b></p>" +
      "<p>Water: " + (counts.water || 0) + " · Meals: " + (counts.meal || 0) + " · Walks: " + (counts.walk || 0) +
      " · Plays: " + (counts.play || 0) + " · Rests: " + (counts.sleep || 0) + " · Cuddles: " + (counts.cuddle || 0) + "</p>" +
      "<p class='muted'>Keep caring every day and " + S.pet.name + " will keep growing!</p>";
    var recent = S.logs.slice(0, 8).map(function (l) {
      var d = new Date(l.at);
      return "<div class='logline'>" + d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " — " + l.action + "</div>";
    }).join("");
    $("diaryLog").innerHTML = recent || '<span class="muted">No care actions yet.</span>';
  }

  // ---------- rooms / chat / races ----------
  function showRoomView(code) {
    $("roomView").style.display = "block";
    $("roomCodeLabel").textContent = "Room code: " + code + " (share it with 1–2 friends)";
    loadMembers();
    if (isOnline()) {
      PPDB.roomMessages(S.room.id).then(function (msgs) {
        $("chatBox").innerHTML = "";
        msgs.forEach(function (m) { addChatLine(m, false); });
      });
      if (S.channel) { try { PPDB.client.removeChannel(S.channel); } catch (e) {} }
      S.channel = PPDB.subscribeRoom(S.room.id, function (type, data) {
        if (type === "message") addChatLine(data, true);
        else if (type === "members") loadMembers();
        else if (type === "race") showRaceResults(data.results, data.winner_id);
      });
    }
  }

  function addChatLine(m, live) {
    if (m.id && S.renderedMsgIds[m.id]) return;
    if (m.id) S.renderedMsgIds[m.id] = true;
    var div = document.createElement("div");
    div.className = "chatline";
    div.innerHTML = "<b>" + escapeHtml(m.display_name || "Friend") + ":</b> " + escapeHtml(m.body);
    $("chatBox").appendChild(div);
    $("chatBox").scrollTop = $("chatBox").scrollHeight;
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function loadMembers() {
    if (!isOnline() || !S.room) return;
    PPDB.roomMembers(S.room.id).then(function (members) {
      S.members = members;
      $("memberList").innerHTML = members.map(function (m) {
        var art = m.pet ? PetArt.render(m.pet.species, m.pet.stage, styleOf(m.pet), m.pet.outfit || "none", "happy") : "";
        return "<div class='member'><div class='mini-pet'>" + art + "</div><span>" + escapeHtml(m.name) + (m.pet ? " · " + m.pet.name : "") + "</span></div>";
      }).join("");
      var names = members.map(function (m) { return m.name; });
      $("petTalk").textContent = members.length > 1
        ? "🐾 " + names.join(" and ") + "'s pets are playing together! \"" + PET_TALK[Math.floor(Math.random() * PET_TALK.length)] + "\""
        : "Waiting for friends to join... share your room code!";
    });
  }

  function animateRace(entrants, areaEl, onDone) {
    // entrants: [{label, speed}] -> durations from speed (higher speed = faster)
    var area = areaEl;
    area.innerHTML = entrants.map(function (e, i) {
      return "<div class='racer' id='racer-" + i + "'><span class='rname'>" + escapeHtml(e.label) + "</span><div class='track'><div class='fill'></div><span class='dot'>🏁</span></div></div>";
    }).join("");
    var durations = entrants.map(function (e) { return 9000 - e.speed * 55; });
    var start = performance.now();
    function frame(now) {
      var done = true;
      entrants.forEach(function (e, i) {
        var p = Math.min(1, (now - start) / durations[i]);
        var fill = document.querySelector("#racer-" + i + " .fill");
        var dot = document.querySelector("#racer-" + i + " .dot");
        if (fill) fill.style.width = (p * 92) + "%";
        if (dot) dot.style.left = (p * 92) + "%";
        if (p < 1) done = false;
      });
      if (!done) requestAnimationFrame(frame);
      else {
        var order = entrants.map(function (e, i) { return { e: e, d: durations[i] }; })
          .sort(function (a, b) { return a.d - b.d; });
        onDone(order);
      }
    }
    requestAnimationFrame(frame);
  }

  function startOnlineRace() {
    if (!isOnline() || !S.room) return;
    if (S.members.length < 2) { $("raceMsg").textContent = "Need at least 2 friends in the room to race!"; return; }
    var entrants = S.members.filter(function (m) { return m.pet; }).map(function (m) {
      return { user_id: m.user_id, label: m.pet.name + " (" + m.name + ")",
        speed: 40 + (m.pet.energy || 50) * 0.4 + Math.random() * 40 };
    });
    if (entrants.length < 2) { $("raceMsg").textContent = "Friends need an active pet to race!"; return; }
    $("raceMsg").textContent = "Race on! 🏁";
    animateRace(entrants, $("raceArea"), function (order) {
      var winner = order[0].e;
      var results = {};
      order.forEach(function (o, i) { results[o.e.user_id] = i + 1; });
      PPDB.recordRace(S.room.id, S.user.id, results, winner.user_id);
      showRaceResults(results, winner.user_id);
      if (winner.user_id === S.user.id) {
        S.profile.coins += 25;
        persist(); renderPet();
      }
    });
  }

  function showRaceResults(results, winnerId) {
    var winner = S.members.filter(function (m) { return m.user_id === winnerId; })[0];
    $("raceMsg").textContent = winner
      ? "🏆 Winner: " + winner.name + "'s pet! " + (winnerId === (S.user && S.user.id) ? "+25 coins!" : "")
      : "🏆 Race finished! Winner gets +25 coins.";
  }

  function startPracticeRace() {
    var entrants = [
      { label: S.pet.name + " (you)", speed: 40 + S.pet.energy * 0.4 + Math.random() * 40 },
      { label: "Robo (computer)", speed: 40 + Math.random() * 50 }
    ];
    $("practiceRaceMsg").textContent = "Practice race! (This is a computer pet, not a real friend.)";
    animateRace(entrants, $("practiceRaceArea"), function (order) {
      var w = order[0].e.label;
      S.pet.happiness = clamp(S.pet.happiness + 5, 10, 100);
      persist(); renderPet();
      $("practiceRaceMsg").textContent = "Practice winner: " + w + "! No coins for practice — connect Supabase to race real friends for +25 coins.";
    });
  }

  // ---------- tabs / auth (bottom nav pages) ----------
  function showTab(name) {
    document.querySelectorAll("[data-section]").forEach(function (s) {
      s.style.display = (s.getAttribute("data-section") === name) ? "block" : "none";
    });
    document.querySelectorAll("[data-tab]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === name);
    });
    if (name === "home") renderPet();
    if (name === "care") { renderQuests(); renderTricks(); }
    if (name === "diary") { renderDiary(); renderAchievements(); }
    if (name === "shop") { renderShop(); renderAdopt(); }
    if (name === "friends") {
      if (S.mode === "local") {
        $("friendsLocalNotice").style.display = "block";
        $("friendsOnline").style.display = "none";
      } else {
        $("friendsLocalNotice").style.display = "none";
        $("friendsOnline").style.display = "block";
      }
    }
  }

  function showMain() {
    $("authView").style.display = "none";
    $("mainView").style.display = "block";
    $("bottomNav").style.display = "flex";
    $("modeBadge").textContent = S.mode === "online" ? "Online · Supabase" : "Local mode · progress on this device";
    $("modeNote").textContent = S.mode === "online"
      ? "Online mode: accounts, friend rooms, chat, and races are live."
      : "Local mode: add your Supabase keys in config.js to unlock accounts and friend rooms. No fake players here.";
    renderPet(); renderShop(); showTab("home");
  }

  function showAuth() {
    $("authView").style.display = "block";
    $("mainView").style.display = "none";
    $("bottomNav").style.display = "none";
    if (PPDB.mode === "online") {
      $("onlineAuthBox").style.display = "block";
      $("localNote").textContent = "Online mode detected (Supabase configured). Log in or sign up — your pets and friends live in the cloud.";
    } else {
      $("onlineAuthBox").style.display = "none";
      $("localNote").textContent = "Local mode: Supabase keys are not set in config.js yet. Play as a guest on this device — add the free keys later to unlock friends.";
    }
  }

  async function boot() {
    S.mode = PPDB.mode;
    if (PPDB.mode === "online") {
      var session = await PPDB.getSession();
      PPDB.onAuthChange(function (sess) {
        if (sess && sess.user && !S.user) { S.user = sess.user; PPDB.loadGame(sess.user).then(applyState); }
      });
      if (session && session.user) {
        S.user = session.user;
        var g = await PPDB.loadGame(session.user);
        applyState(g);
        return;
      }
      showAuth();
    } else {
      var local = PPDB.loadLocal();
      if (local && local.profile) { applyState(local); return; }
      showAuth();
    }
  }

  function applyState(g) {
    S.profile = g.profile;
    S.pet = g.pet;
    S.petBook = g.petBook || {};
    S.inventory = g.inventory || [];
    S.furniture = g.furniture || [];
    S.logs = g.logs || [];
    S.claims = g.claims || {};
    S.achClaims = g.achClaims || {};
    S.stats = loadStats();
    // normalize local pet fields
    if (!S.pet.unlocked) S.pet.unlocked = ["cat"];
    if (typeof S.pet.sporty === "undefined") S.pet.sporty = 0;
    if (typeof S.pet.cozy === "undefined") S.pet.cozy = 0;
    if (typeof S.pet.outfit === "undefined") S.pet.outfit = "none";
    if (typeof S.pet.tricks === "undefined") S.pet.tricks = [];
    if (typeof S.pet.last_tick === "undefined") S.pet.last_tick = Date.now();
    if (!S.petBook[S.pet.species]) S.petBook[S.pet.species] = S.pet;
    if (S.mode === "online") {
      // normalize online pet row field names to app fields
      S.pet = {
        id: g.pet.id, species: g.pet.species, name: g.pet.name, stage: g.pet.stage, xp: g.pet.xp,
        sporty: g.pet.sporty || 0, cozy: g.pet.cozy || 0, hunger: g.pet.hunger, happiness: g.pet.happiness,
        energy: g.pet.energy, health: g.pet.health, outfit: g.pet.outfit || "none",
        tricks: g.pet.tricks || [],
        unlocked: (g.ownedSpecies && g.ownedSpecies.length) ? g.ownedSpecies : ["cat"], last_tick: Date.now()
      };
      S.profile = {
        id: g.profile.id, display_name: g.profile.display_name, coins: g.profile.coins, streak: g.profile.streak || 0,
        last_care_date: g.profile.last_care_date, care_coins_date: g.profile.care_coins_date, care_coins_today: g.profile.care_coins_today || 0,
        games_coins_date: g.profile.games_coins_date, games_coins_today: g.profile.games_coins_today || 0,
        games_played_date: g.profile.games_played_date, games_played_today: g.profile.games_played_today || 0
      };
    }
    applyDecay();
    resetDailyBuckets();
    persist();
    showMain();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-tab]").forEach(function (b) {
      b.onclick = function () { showTab(b.getAttribute("data-tab")); };
    });
    document.querySelectorAll("[data-action]").forEach(function (b) {
      b.onclick = function () { doAction(b.getAttribute("data-action")); };
    });
    $("guestBtn").onclick = function () {
      var name = ($("guestName").value || "").trim() || "Guest";
      var state = PPDB.defaultState(name);
      PPDB.saveLocal(state);
      S.mode = "local";
      applyState(state);
    };
    $("signupBtn").onclick = async function () {
      var email = $("emailInput").value.trim(), pass = $("passInput").value, name = $("displayNameInput").value.trim();
      if (!email || !pass || !name) { $("authMsg").textContent = "Fill in name, email, and password."; return; }
      try {
        var res = await PPDB.signUp(email, pass, name);
        if (!res.session) { $("authMsg").textContent = "Account created! Check your email to confirm, then log in."; return; }
        S.user = res.session.user;
        var g = await PPDB.loadGame(res.session.user);
        applyState(g);
      } catch (e) { $("authMsg").textContent = "Sign-up failed: " + e.message; }
    };
    $("loginBtn").onclick = async function () {
      var email = $("emailInput").value.trim(), pass = $("passInput").value;
      if (!email || !pass) { $("authMsg").textContent = "Enter your email and password."; return; }
      try {
        var res = await PPDB.signIn(email, pass);
        S.user = res.user;
        var g = await PPDB.loadGame(res.user);
        applyState(g);
      } catch (e) { $("authMsg").textContent = "Login failed: " + e.message; }
    };
    $("googleBtn").onclick = async function () {
      try { await PPDB.signInGoogle(); }
      catch (e) { $("authMsg").textContent = "Google sign-in needs the Google provider enabled in Supabase (see README-SETUP.md). " + e.message; }
    };
    $("logoutBtn").onclick = async function () {
      if (S.mode === "online") await PPDB.signOut();
      S.user = null; S.room = null;
      showAuth();
    };
    $("fetchStart").onclick = startFetch;
    $("memStart").onclick = startMemory;
    $("fishStart").onclick = startFish;
    $("dailyBonusBtn").onclick = claimDailyBonus;
    $("createRoomBtn").onclick = async function () {
      try {
        S.room = await PPDB.createRoom(S.user.id);
        $("friendsMsg").textContent = "Room created! Share the code with 1–2 friends.";
        showRoomView(S.room.code);
      } catch (e) { $("friendsMsg").textContent = "Could not create room: " + e.message; }
    };
    $("joinRoomBtn").onclick = async function () {
      var code = $("joinCodeInput").value.trim();
      if (!code) return;
      try {
        S.room = await PPDB.joinRoom(S.user.id, code);
        $("friendsMsg").textContent = "Joined room " + S.room.code + "!";
        showRoomView(S.room.code);
      } catch (e) { $("friendsMsg").textContent = "Could not join: " + e.message; }
    };
    $("leaveRoomBtn").onclick = function () {
      if (S.channel) { try { PPDB.client.removeChannel(S.channel); } catch (e) {} }
      S.channel = null; S.room = null; S.members = [];
      $("roomView").style.display = "none";
      $("friendsMsg").textContent = "Left the room.";
    };
    $("chatSend").onclick = async function () {
      var body = $("chatInput").value.trim();
      if (!body || !S.room) return;
      $("chatInput").value = "";
      await PPDB.sendMessage(S.room.id, S.user.id, S.profile.display_name, body);
    };
    $("chatInput").addEventListener("keydown", function (e) { if (e.key === "Enter") $("chatSend").click(); });
    $("raceStartBtn").onclick = startOnlineRace;
    $("practiceRaceBtn").onclick = startPracticeRace;
    $("adBtn").onclick = function () {
      $("adNote").textContent = "Ads are not connected yet — no ad will play and no coins are granted from this button. Earn coins free from quests, games, and care instead!";
    };
    setInterval(function () { if (S.pet) { applyDecay(); renderPet(); persist(); } }, 60000);
    boot();
  });
})();
