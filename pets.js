/* Pocket Pet — original SVG pets, drawn in code.
 * No copied characters, no image files. Every pet is parameterized by
 * species, growth stage, care style, outfit, and mood.
 *
 * Species: cat (starter), dog, fox, dragon, parrot.
 * Stages:  egg -> baby -> teen -> adult  (XP thresholds in app.js).
 * Styles:  classic, sporty (headband), cozy (scarf).
 * Outfits: none, dress, hoodie, crown, sunglasses, bow.
 * Moods:   happy, sad, sleepy, hungry.
 */
window.PetArt = (function () {
  var SPECIES = {
    cat:    { body: "#ffb35c", belly: "#fff3dd", ear: "#ff9a3d", name: "Cat",    price: 0 },
    dog:    { body: "#d9a066", belly: "#fbeed3", ear: "#a9713f", name: "Dog",    price: 300 },
    fox:    { body: "#ff8a4c", belly: "#fff6e8", ear: "#e56b2f", name: "Fox",    price: 500 },
    dragon: { body: "#7ddb8a", belly: "#eaffea", ear: "#4caf50", name: "Dragon", price: 1000 },
    parrot: { body: "#5ec8f2", belly: "#fff9d6", ear: "#3aa8d8", name: "Parrot", price: 400 }
  };

  var STAGE_SCALE = { egg: 0.85, baby: 0.82, teen: 0.96, adult: 1.1 };

  function eyes(mood) {
    if (mood === "sleepy") {
      return '<path d="M72 92 q10 -8 20 0 M108 92 q10 -8 20 0" stroke="#3a2a22" stroke-width="4" fill="none" stroke-linecap="round"/>';
    }
    if (mood === "sad") {
      return '<circle cx="82" cy="94" r="7" fill="#3a2a22"/><circle cx="118" cy="94" r="7" fill="#3a2a22"/>' +
        '<path d="M74 82 q8 -4 16 0 M110 82 q8 -4 16 0" stroke="#3a2a22" stroke-width="3" fill="none" stroke-linecap="round"/>';
    }
    if (mood === "hungry") {
      return '<circle cx="82" cy="92" r="9" fill="#3a2a22"/><circle cx="84" cy="89" r="3" fill="#fff"/>' +
        '<circle cx="118" cy="92" r="9" fill="#3a2a22"/><circle cx="120" cy="89" r="3" fill="#fff"/>';
    }
    // happy
    return '<path d="M72 96 q10 -12 20 0 M108 96 q10 -12 20 0" stroke="#3a2a22" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="82" cy="100" r="3" fill="#3a2a22"/><circle cx="118" cy="100" r="3" fill="#3a2a22"/>';
  }

  function mouth(mood) {
    if (mood === "sad") return '<path d="M90 118 q10 -8 20 0" stroke="#3a2a22" stroke-width="3" fill="none" stroke-linecap="round"/>';
    if (mood === "sleepy") return '<circle cx="100" cy="118" r="4" fill="#3a2a22"/>';
    if (mood === "hungry") return '<ellipse cx="100" cy="120" rx="8" ry="10" fill="#7a3b2e"/>';
    return '<path d="M88 114 q12 12 24 0" stroke="#3a2a22" stroke-width="3" fill="none" stroke-linecap="round"/>';
  }

  function speciesExtras(species, c) {
    if (species === "cat") {
      return '<path d="M62 52 L54 18 L84 34 Z" fill="' + c.body + '" stroke="#3a2a22" stroke-width="2"/>' +
        '<path d="M138 52 L146 18 L116 34 Z" fill="' + c.body + '" stroke="#3a2a22" stroke-width="2"/>' +
        '<path d="M64 44 L60 26 L78 36 Z" fill="#ffb3c6"/>' +
        '<path d="M136 44 L140 26 L122 36 Z" fill="#ffb3c6"/>' +
        '<path d="M40 108 L14 104 M40 116 L16 120 M160 108 L186 104 M160 116 L184 120" stroke="#3a2a22" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="M150 150 q30 4 26 -22 q-24 2 -26 22" fill="' + c.body + '" stroke="#3a2a22" stroke-width="2"/>';
    }
    if (species === "dog") {
      return '<ellipse cx="56" cy="72" rx="14" ry="26" fill="' + c.ear + '" stroke="#3a2a22" stroke-width="2" transform="rotate(12 56 72)"/>' +
        '<ellipse cx="144" cy="72" rx="14" ry="26" fill="' + c.ear + '" stroke="#3a2a22" stroke-width="2" transform="rotate(-12 144 72)"/>' +
        '<ellipse cx="100" cy="118" rx="18" ry="13" fill="' + c.belly + '" stroke="#3a2a22" stroke-width="2"/>' +
        '<ellipse cx="100" cy="112" rx="7" ry="5" fill="#3a2a22"/>' +
        '<path d="M152 148 q28 6 22 -24 q-22 4 -22 24" fill="' + c.body + '" stroke="#3a2a22" stroke-width="2"/>';
    }
    if (species === "fox") {
      return '<path d="M60 54 L50 14 L88 32 Z" fill="' + c.body + '" stroke="#3a2a22" stroke-width="2"/>' +
        '<path d="M140 54 L150 14 L112 32 Z" fill="' + c.body + '" stroke="#3a2a22" stroke-width="2"/>' +
        '<path d="M62 44 L58 26 L78 36 Z" fill="#fff6e8"/>' +
        '<path d="M138 44 L142 26 L122 36 Z" fill="#fff6e8"/>' +
        '<ellipse cx="100" cy="140" rx="26" ry="16" fill="#fff6e8"/>' +
        '<path d="M150 148 q32 10 26 -26 q-26 2 -26 26" fill="' + c.body + '" stroke="#3a2a22" stroke-width="2"/>' +
        '<path d="M168 122 q8 4 8 12 q-10 -2 -8 -12" fill="#fff6e8"/>';
    }
    if (species === "dragon") {
      return '<path d="M72 50 q-6 -22 8 -30 q4 18 -8 30 M128 50 q6 -22 -8 -30 q-4 18 8 30" fill="#ffd94d" stroke="#3a2a22" stroke-width="2"/>' +
        '<path d="M52 96 q-26 -18 -34 6 q22 16 34 -6 M148 96 q26 -18 34 6 q-22 16 -34 -6" fill="#a5e8a0" stroke="#3a2a22" stroke-width="2"/>' +
        '<ellipse cx="100" cy="140" rx="24" ry="15" fill="' + c.belly + '"/>' +
        '<ellipse cx="100" cy="112" rx="8" ry="6" fill="#3a2a22"/>' +
        '<path d="M152 148 q28 6 22 -24 q-22 4 -22 24" fill="' + c.body + '" stroke="#3a2a22" stroke-width="2"/>';
    }
    // parrot
    return '<path d="M82 44 q-4 -22 14 -26 q2 16 -14 26 M118 44 q4 -22 -14 -26 q-2 16 14 26" fill="#ff6b81" stroke="#3a2a22" stroke-width="2"/>' +
      '<path d="M100 108 q14 2 16 10 q-14 8 -16 -10" fill="#ffb020" stroke="#3a2a22" stroke-width="2"/>' +
      '<ellipse cx="100" cy="142" rx="26" ry="14" fill="' + c.belly + '"/>' +
      '<path d="M52 96 q-24 -8 -30 14 q22 10 30 -14 M148 96 q24 -8 30 14 q-22 10 -30 -14" fill="' + c.ear + '" stroke="#3a2a22" stroke-width="2"/>' +
      '<path d="M148 152 q30 14 22 -10 q-20 -2 -22 10" fill="#ff6b81" stroke="#3a2a22" stroke-width="2"/>';
  }

  function styleOverlay(style) {
    if (style === "sporty") return '<rect x="68" y="52" width="64" height="10" rx="5" fill="#ff4757"/>';
    if (style === "cozy") return '<path d="M74 128 q26 14 52 0 l0 12 q-26 12 -52 0 Z" fill="#ff6b81"/>';
    return "";
  }

  function outfitOverlay(outfit) {
    if (outfit === "dress") return '<path d="M72 126 L62 162 L138 162 L128 126 Q100 138 72 126 Z" fill="#ff7eb6" stroke="#d94f8c" stroke-width="2"/>';
    if (outfit === "hoodie") return '<path d="M70 124 L64 160 L136 160 L130 124 Q100 136 70 124 Z" fill="#5b8def" stroke="#3a6bc4" stroke-width="2"/>';
    if (outfit === "crown") return '<path d="M82 40 L88 20 L100 34 L112 20 L118 40 Z" fill="#ffd94d" stroke="#d4a017" stroke-width="2"/>';
    if (outfit === "sunglasses") return '<rect x="66" y="84" width="30" height="18" rx="6" fill="#222"/><rect x="104" y="84" width="30" height="18" rx="6" fill="#222"/><rect x="96" y="90" width="8" height="4" fill="#222"/>';
    if (outfit === "bow") return '<path d="M132 42 L150 32 L148 52 Z M132 42 L114 32 L116 52 Z" fill="#ff4757"/><circle cx="132" cy="42" r="5" fill="#d63031"/>';
    return "";
  }

  function render(species, stage, style, outfit, mood) {
    var c = SPECIES[species] || SPECIES.cat;
    var s = STAGE_SCALE[stage] || 1;
    if (stage === "egg") {
      return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pet egg">' +
        '<ellipse cx="100" cy="150" rx="42" ry="10" fill="#e8dcc8"/>' +
        '<ellipse cx="100" cy="108" rx="52" ry="62" fill="#fff6e8" stroke="#3a2a22" stroke-width="2"/>' +
        '<circle cx="82" cy="96" r="7" fill="' + c.body + '"/><circle cx="118" cy="112" r="6" fill="' + c.body + '"/>' +
        '<circle cx="104" cy="84" r="5" fill="' + c.body + '"/>' +
        '<path d="M78 150 q22 12 44 0" stroke="#3a2a22" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '</svg>';
    }
    var tx = 100 - 100 * s, ty = 108 - 108 * s;
    var body = '<ellipse cx="100" cy="150" rx="46" ry="10" fill="#e8dcc8"/>' +
      '<ellipse cx="100" cy="118" rx="52" ry="46" fill="' + c.body + '" stroke="#3a2a22" stroke-width="2"/>' +
      '<ellipse cx="100" cy="136" rx="26" ry="18" fill="' + c.belly + '"/>';
    var inner = '<g transform="translate(' + tx.toFixed(1) + ' ' + ty.toFixed(1) + ') scale(' + s + ')">' +
      speciesExtras(species, c) +
      '<circle cx="100" cy="96" r="44" fill="' + c.body + '" stroke="#3a2a22" stroke-width="2"/>' +
      eyes(mood) + mouth(mood) +
      styleOverlay(style) + outfitOverlay(outfit) +
      '</g>';
    var zzz = mood === "sleepy" ? '<text x="148" y="48" font-size="26" fill="#5b8def" font-weight="bold">Z</text><text x="162" y="30" font-size="20" fill="#5b8def" font-weight="bold">z</text>' : "";
    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + c.name + ' pet">' +
      body + inner + zzz + '</svg>';
  }

  return { SPECIES: SPECIES, render: render };
})();
