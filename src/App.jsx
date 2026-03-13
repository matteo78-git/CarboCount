import React, { useState, useEffect, useRef, useMemo, forwardRef, createContext, useContext } from "react";

// ── Storage helpers ─────────────────────────────────────────────────────────────
function loadFoods() {
  try {
    const arr = JSON.parse(localStorage.getItem("carb_foods") || "[]");
    const seen = new Set();
    return arr.map((f, i) => {
      let id = String(f.id ?? i);
      while (seen.has(id)) id = id + "_" + i;
      seen.add(id);
      return { ...f, id, nome: f.nome ?? "" };
    }).filter(f => f.nome);
  } catch { return []; }
}
function saveFoods(foods) {
  try { localStorage.setItem("carb_foods", JSON.stringify(foods)); } catch {}
}
function loadThemePref() {
  return localStorage.getItem("carb_theme") || "auto";
}
function saveThemePref(v) {
  try { localStorage.setItem("carb_theme", v); } catch {}
}

// ── Theme palettes ──────────────────────────────────────────────────────────────
const DARK = {
  bg: "#0f1923", surface: "#162030", card: "#1c2d3f",
  accent: "#00d4aa", warn: "#ff6b6b", text: "#e8f4f0",
  muted: "#7a9eab", border: "#243547", overlay: "rgba(0,0,0,.6)", isDark: true,
};
const LIGHT = {
  bg: "#f0f5f3", surface: "#ffffff", card: "#ffffff",
  accent: "#009e7a", warn: "#e05252", text: "#1a2e28",
  muted: "#6b8e85", border: "#d0e2dc", overlay: "rgba(0,0,0,.28)", isDark: false,
};

const ThemeCtx = createContext(DARK);
const useTheme = () => useContext(ThemeCtx);

// ── Search helper ─────────────────────────────────────────────────────────────
// Normalizza una stringa: minuscolo, rimuove accenti, comprime spazi
const norm = s => s.toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

// Restituisce true se ogni token della query è presente come prefisso
// in almeno una parola del nome (es. "zucc" trova "Zucchine", "zucc pad" trova
// "Zucchine cotte in padella")
const matchSearch = (nome, query) => {
  if (!query) return true;
  const nameTokens = norm(nome).split(" ");
  const queryTokens = norm(query).split(" ").filter(Boolean);
  return queryTokens.every(qt =>
    nameTokens.some(nt => nt.startsWith(qt) || nt.includes(qt))
  );
};

// ── SVG Icon library ────────────────────────────────────────────────────────────
// All icons are inline SVG — no emoji dependency, crisp on any display
const Icon = ({ name, size = 20, color }) => {
  const C = useTheme();
  const col = color || C.accent;
  const icons = {
    // App logo: drop + glucose marker
    logo: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 2 C12 2 5 10 5 15 a7 7 0 0 0 14 0 C19 10 12 2 12 2z" fill="#e05252" opacity=".9"/>
        <text x="12" y="17.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#fff" fontFamily="sans-serif">+c</text>
      </svg>
    ),
    // Gear / settings
    gear: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke={col} strokeWidth="2"/>
        <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke={col} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    // Fork + knife = meal/pasto
    meal: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M3 2v7c0 1.66 1.34 3 3 3h1v10h2V12h1c1.66 0 3-1.34 3-3V2h-2v5H9V2H7v5H5V2H3z" fill={col} opacity=".85"/>
        <path d="M19 2c-1.66 0-3 2-3 5v5h2v10h2V2h-1z" fill={col}/>
      </svg>
    ),
    // List + checkmark = alimenti
    list: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="2" height="2" rx="1" fill={col}/>
        <rect x="3" y="11" width="2" height="2" rx="1" fill={col}/>
        <rect x="3" y="17" width="2" height="2" rx="1" fill={col}/>
        <line x1="8" y1="6" x2="21" y2="6" stroke={col} strokeWidth="2" strokeLinecap="round"/>
        <line x1="8" y1="12" x2="21" y2="12" stroke={col} strokeWidth="2" strokeLinecap="round"/>
        <line x1="8" y1="18" x2="21" y2="18" stroke={col} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    // Plus circle — add food
    // Plus — croce senza cerchio (il cerchio lo fa il Btn variant=add)
    plus: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="10.9" y="4" width="2.2" height="16" rx="1.1"
          fill={color || (C.isDark ? "#0f1923" : "#fff")}/>
        <rect x="4" y="10.9" width="16" height="2.2" rx="1.1"
          fill={color || (C.isDark ? "#0f1923" : "#fff")}/>
      </svg>
    ),
    // Pencil — edit (stilizzata)
    edit: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 15.5 L15.5 5 C16.3 4.2 17.6 4.2 18.4 5 L19 5.6 C19.8 6.4 19.8 7.7 19 8.5 L8.5 19 Z"
          fill={col} opacity=".35" stroke={col} strokeWidth="2" strokeLinejoin="round"/>
        <path d="M4 20 L5 15.5 L8.5 19 Z"
          fill={col} stroke={col} strokeWidth="2" strokeLinejoin="round"/>
        <line x1="14" y1="6.5" x2="17.5" y2="10"
          stroke={col} strokeWidth="1.8" strokeLinecap="round" opacity=".8"/>
      </svg>
    ),
    // Trash — delete
    trash: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10 11v6M14 11v6" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    // X circle — cancel/close
    close: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill={C.border}/>
        <path d="M8 8l8 8M16 8l-8 8" stroke={C.muted} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    // Search magnifier
    search: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="7" stroke={C.muted} strokeWidth="2"/>
        <path d="M16.5 16.5l4 4" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
    // Checkmark — confirm add
    check: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 13l4 4L19 7" stroke={col} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    // Sun — light mode
    sun: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4" fill="#fbbf24"/>
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    // Moon — dark mode
    moon: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#818cf8" stroke="#818cf8" strokeWidth=".5"/>
      </svg>
    ),
    // Phone — auto mode
    phone: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="5" y="2" width="14" height="20" rx="3" stroke="#34d399" strokeWidth="2"/>
        <circle cx="12" cy="18" r="1" fill="#34d399"/>
      </svg>
    ),
    // Broom — svuota pasto
    broom: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 14l-4 6h14l-4-6H7z" fill="#ff6b6b" opacity=".8"/>
        <path d="M9 14V4h6v10" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  };
  return icons[name] || null;
};

// ── Global CSS ──────────────────────────────────────────────────────────────────
const BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { font-family: 'DM Sans', sans-serif; -webkit-tap-highlight-color: transparent; }
  input, button { font-family: inherit; }
  ::-webkit-scrollbar { width: 4px; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(0,212,170,.3); } 50% { box-shadow: 0 0 0 10px transparent; } }
  .fade-up { animation: fadeUp .22s ease both; }
  /* Frecce sempre visibili sull'input porzione */
  .porzione-input::-webkit-inner-spin-button,
  .porzione-input::-webkit-outer-spin-button {
    opacity: 1 !important;
    height: 36px;
    cursor: pointer;
  }
  .porzione-input { -moz-appearance: textfield; }
  .porzione-input::-moz-number-spin-box { display: block; }
`;

// ── Micro components ────────────────────────────────────────────────────────────
function Label({ children }) {
  const C = useTheme();
  return <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.muted, marginBottom: 4 }}>{children}</div>;
}

const Input = forwardRef(function Input({ style, ...props }, ref) {
  const C = useTheme();
  return (
    <input ref={ref}
      style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`,
        borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 15,
        outline: "none", transition: "border .2s", ...style }}
      onFocus={e => e.target.style.borderColor = C.accent}
      onBlur={e => e.target.style.borderColor = C.border}
      {...props}
    />
  );
});

function Btn({ children, variant = "primary", style, ...props }) {
  const C = useTheme();
  const base = { border: "none", borderRadius: 10, padding: "11px 20px",
    fontWeight: 600, fontSize: 14, cursor: "pointer",
    transition: "opacity .15s, transform .1s", display: "flex",
    alignItems: "center", justifyContent: "center", gap: 6, ...style };
  const variants = {
    primary: { background: C.accent, color: C.isDark ? "#0f1923" : "#fff" },
    danger:  { background: "#ff6b6b22", color: "#ff6b6b", border: "1px solid #ff6b6b44" },
    ghost:   { background: C.border, color: C.text },
    add:     { background: C.accent, color: C.isDark ? "#0f1923" : "#fff",
               borderRadius: "50%", width: 44, height: 44, padding: 0,
               animation: "pulse 2s infinite", flexShrink: 0 },
    icon:    { background: C.border, borderRadius: 8, padding: "7px 9px",
               color: C.text, minWidth: "auto" },
  };
  return (
    <button style={{ ...base, ...variants[variant] }}
      onMouseDown={e => e.currentTarget.style.transform = "scale(.95)"}
      onMouseUp={e => e.currentTarget.style.transform = ""}
      onMouseLeave={e => e.currentTarget.style.transform = ""}
      {...props}>{children}</button>
  );
}

function Card({ children, style }) {
  const C = useTheme();
  return (
    <div style={{ background: C.card, borderRadius: 14, padding: 16,
      border: `1px solid ${C.border}`,
      boxShadow: C.isDark ? "none" : "0 2px 8px rgba(0,0,0,.06)",
      ...style }}>
      {children}
    </div>
  );
}

// ── Settings modal ──────────────────────────────────────────────────────────────
function SettingsModal({ themePref, setThemePref, foods, setFoods, onClose }) {
  const C = useTheme();
  const importRef = useRef();
  const [importMsg, setImportMsg] = useState(null); // {type: "ok"|"err", text}

  const opts = [
    { id: "auto",  label: "Automatica", desc: "Segue il tema del sistema", iconName: "phone" },
    { id: "dark",  label: "Scura",      desc: "Dark mode sempre attiva",   iconName: "moon"  },
    { id: "light", label: "Chiara",     desc: "Light mode sempre attiva",  iconName: "sun"   },
  ];

  const handleExport = () => {
    const payload = JSON.stringify({ version: 1, alimenti: foods }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carbocount-alimenti-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const list = parsed.alimenti ?? parsed; // compatibile con array diretto
        if (!Array.isArray(list)) throw new Error("Formato non valido");
        const valid = list.filter(x => x.nome && x.choPer100 != null && x.porzione != null);
        if (valid.length === 0) throw new Error("Nessun alimento valido trovato");
        // merge: mantieni esistenti, aggiungi nuovi per nome
        setFoods(prev => {
          const nomiEsistenti = new Set(prev.map(f => f.nome.toLowerCase()));
          const nuovi = valid.filter(f => !nomiEsistenti.has(f.nome.toLowerCase()))
            .map(f => ({ ...f, id: Date.now() + Math.random() }));
          const merged = [...prev, ...nuovi].sort((a,b) => a.nome.toLowerCase().localeCompare(b.nome.toLowerCase()));
          saveFoods(merged);
          setImportMsg({ type: "ok", text: `${nuovi.length} aliment${nuovi.length === 1 ? "o importato" : "i importati"} (${valid.length - nuovi.length} già presenti ignorati)` });
          return merged;
        });
      } catch (err) {
        setImportMsg({ type: "err", text: "File non valido: " + err.message });
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset input
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: C.overlay,
      zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: C.surface, borderRadius: "20px 20px 0 0",
          padding: "24px 20px 44px", width: "100%", maxWidth: 480,
          border: `1px solid ${C.border}`, borderBottom: "none",
          animation: "fadeUp .2s ease both", maxHeight: "85vh", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="gear" size={22} color={C.accent} />
            <span style={{ fontFamily: "Outfit", fontWeight: 800, fontSize: 18, color: C.text }}>Impostazioni</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
            <Icon name="close" size={26} />
          </button>
        </div>

        {/* Tema */}
        <Label>TEMA DELL'APP</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, marginBottom: 24 }}>
          {opts.map(o => {
            const active = themePref === o.id;
            return (
              <div key={o.id} onClick={() => { setThemePref(o.id); saveThemePref(o.id); }}
                style={{ display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                  border: `2px solid ${active ? C.accent : C.border}`,
                  background: active ? C.accent + (C.isDark ? "18" : "12") : C.card,
                  transition: "all .18s" }}>
                <Icon name={o.iconName} size={26} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: C.text }}>{o.label}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{o.desc}</div>
                </div>
                <div style={{ width: 22, height: 22, borderRadius: "50%",
                  border: `2px solid ${active ? C.accent : C.border}`,
                  background: active ? C.accent : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "all .18s" }}>
                  {active && <div style={{ width: 9, height: 9, borderRadius: "50%",
                    background: C.isDark ? "#0f1923" : "#fff" }} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Esporta / Importa */}
        <Label>ALIMENTI — BACKUP E CONDIVISIONE</Label>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Export */}
          <div style={{ display: "flex", alignItems: "center", gap: 14,
            padding: "14px 16px", borderRadius: 12,
            border: `1px solid ${C.border}`, background: C.card }}>
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
              <path d="M12 3v13M7 11l5 5 5-5" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 19h16" stroke={C.accent} strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: C.text }}>Esporta alimenti</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                Scarica un file .json con tutti i tuoi {foods.length} aliment{foods.length === 1 ? "o" : "i"}
              </div>
            </div>
            <button onClick={handleExport} disabled={foods.length === 0}
              style={{ background: foods.length === 0 ? C.border : C.accent,
                color: foods.length === 0 ? C.muted : (C.isDark ? "#0f1923" : "#fff"),
                border: "none", borderRadius: 9, padding: "8px 14px",
                fontWeight: 700, fontSize: 13, cursor: foods.length === 0 ? "default" : "pointer",
                transition: "all .15s", whiteSpace: "nowrap" }}>
              Scarica
            </button>
          </div>

          {/* Import */}
          <div style={{ display: "flex", alignItems: "center", gap: 14,
            padding: "14px 16px", borderRadius: 12,
            border: `1px solid ${C.border}`, background: C.card }}>
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
              <path d="M12 21V8M7 13l5-5 5 5" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 5h16" stroke={C.accent} strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: C.text }}>Importa alimenti</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                Carica un file .json — gli alimenti già presenti vengono ignorati
              </div>
            </div>
            <input ref={importRef} type="file" accept=".json" style={{ display: "none" }}
              onChange={handleImport} />
            <button onClick={() => { setImportMsg(null); importRef.current?.click(); }}
              style={{ background: C.border, color: C.text,
                border: "none", borderRadius: 9, padding: "8px 14px",
                fontWeight: 700, fontSize: 13, cursor: "pointer",
                transition: "all .15s", whiteSpace: "nowrap" }}>
              Carica
            </button>
          </div>

          {/* Feedback import */}
          {importMsg && (
            <div style={{ padding: "10px 14px", borderRadius: 10, fontSize: 13,
              background: importMsg.type === "ok" ? C.accent + "22" : "#ff6b6b22",
              color: importMsg.type === "ok" ? C.accent : "#ff6b6b",
              border: `1px solid ${importMsg.type === "ok" ? C.accent + "44" : "#ff6b6b44"}` }}>
              {importMsg.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section: Alimenti ───────────────────────────────────────────────────────────
function AlimentiSection({ foods, setFoods, autoFocusTrigger }) {
  const C = useTheme();
  const empty = { nome: "", choPerPorzione: "", porzione: "" };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const nomeRef = useRef();

  useEffect(() => {
    const t = setTimeout(() => nomeRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [autoFocusTrigger]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // CHO per porzione calcolato in tempo reale mentre si digitano i valori
  const choPreview = (parseFloat(form.choPerPorzione) > 0 && parseFloat(form.porzione) > 0)
    ? (parseFloat(form.choPerPorzione) / parseFloat(form.porzione) * 100).toFixed(1)
    : null;

  const [dupError, setDupError] = useState(null);

  const save = () => {
    if (!form.nome.trim() || !form.choPerPorzione || !form.porzione) return;
    const nomeTrim = form.nome.trim();
    const nomeNorm = nomeTrim.toLowerCase();
    // Controlla duplicati (escludi l'elemento in modifica)
    const dup = foods.find(f => f.nome.toLowerCase() === nomeNorm && f.id !== editId);
    if (dup) { setDupError(`"${nomeTrim}" esiste già nella lista.`); return; }
    setDupError(null);
    const porzione = +form.porzione;
    const choPer100 = +(parseFloat(form.choPerPorzione) / porzione * 100).toFixed(2);
    const entry = { id: editId ?? Date.now(), nome: nomeTrim, choPer100, porzione };
    const next = editId !== null ? foods.map(f => f.id === editId ? entry : f) : [...foods, entry];
    const sorted = [...next].sort((a,b) => a.nome.toLowerCase().localeCompare(b.nome.toLowerCase()));
    setForm(empty); setEditId(null); setFoods(sorted); saveFoods(sorted);
    setTimeout(() => nomeRef.current?.focus(), 50);
  };

  const del = (id) => { const next = foods.filter(f => f.id !== id); setFoods(next); saveFoods(next); }; // già ordinato
  const edit = (f) => {
    // Riconverti choPer100 → choPerPorzione per mostrare il valore originale
    const choPerPorzione = +(f.choPer100 * f.porzione / 100).toFixed(1);
    setForm({ nome: f.nome, choPerPorzione: String(choPerPorzione), porzione: String(f.porzione) });
    setEditId(f.id);
    setTimeout(() => nomeRef.current?.focus(), 50);
  };

  const MAX_SHOWN = 100;

  // Lista ordinata alfabeticamente, sempre
  const sortedFoods = useMemo(
    () => [...foods].sort((a,b) => a.nome.toLowerCase().localeCompare(b.nome.toLowerCase())),
    [foods]
  );

  // Filtro diretto su search (no debounce — useMemo è già economico)
  const allFiltered = useMemo(() => {
    const q = search.trim();
    if (!q) return sortedFoods;
    return sortedFoods.filter(f => matchSearch(f.nome, q));
  }, [sortedFoods, search]);

  const filtered = allFiltered.slice(0, MAX_SHOWN);
  const totalFiltered = allFiltered.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          {editId !== null ? <Icon name="edit" size={18} /> : <Icon name="plus" size={18} />}
          <span style={{ fontFamily: "Outfit", fontSize: 13, color: C.accent, letterSpacing: 1 }}>
            {editId !== null ? "MODIFICA ALIMENTO" : "NUOVO ALIMENTO"}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <Label>Nome alimento</Label>
            <Input ref={nomeRef} placeholder="es. Pasta di semola" value={form.nome}
              onChange={e => { set("nome", e.target.value); setDupError(null); }}
              style={dupError ? { borderColor: C.warn } : {}} />
            {dupError && (
              <div style={{ fontSize: 12, color: C.warn, marginTop: 4 }}>{dupError}</div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <Label>Porzione std (g)</Label>
              <Input placeholder="es. 80" type="number" value={form.porzione}
                onChange={e => set("porzione", e.target.value)} />
            </div>
            <div>
              <Label>CHO per porzione</Label>
              <Input placeholder="es. 58" type="number" value={form.choPerPorzione}
                onChange={e => set("choPerPorzione", e.target.value)} />
            </div>
          </div>

          {/* Anteprima CHO/100g calcolata */}
          {choPreview && (
            <div style={{ fontSize: 12, color: C.muted, background: C.bg,
              borderRadius: 8, padding: "7px 12px", border: `1px solid ${C.border}` }}>
              Equivale a{" "}
              <span style={{ color: C.accent, fontWeight: 700 }}>{choPreview}g CHO ogni 100g</span>
              {" "}— usato per il calcolo proporzionale
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={save} style={{ flex: 1 }}>
              <Icon name="check" size={18} color={C.isDark ? "#0f1923" : "#fff"} />
              {editId !== null ? "Aggiorna" : "Aggiungi"}
            </Btn>
            {editId !== null && (
              <Btn variant="ghost" onClick={() => { setForm(empty); setEditId(null); setTimeout(() => nomeRef.current?.focus(), 50); }}>
                <Icon name="close" size={18} /> Annulla
              </Btn>
            )}
          </div>
        </div>
      </Card>

      <div>
        <Label>Cerca nei tuoi alimenti</Label>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <Icon name="search" size={18} />
          </div>
          <Input placeholder="Filtra per nome..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }} />
        </div>
      </div>

      {totalFiltered === 0 && (
        <div style={{ textAlign: "center", color: C.muted, padding: "24px 0", fontSize: 13 }}>
          {foods.length === 0 ? "Nessun alimento ancora. Aggiungine uno!" : `Nessun risultato per "${search.trim()}"`}
        </div>
      )}

      {totalFiltered > MAX_SHOWN && (
        <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "4px 0 2px" }}>
          {search.trim()
            ? `${totalFiltered} risultati trovati`
            : `Primi ${MAX_SHOWN} di ${totalFiltered} alimenti — cerca per filtrare`}
        </div>
      )}
      {filtered.map((f, i) => {
        const choStd = +(f.choPer100 * f.porzione / 100).toFixed(1);
        return (
          <div key={String(f.id) + "-" + i}>
            <Card style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, color: C.text }}>{f.nome}</div>
                <div style={{ fontSize: 12, color: C.muted }}>
                  <span style={{ color: C.accent, fontWeight: 700 }}>{choStd}g CHO</span>
                  {" "}per porzione da{" "}
                  <span style={{ color: C.text }}>{f.porzione}g</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn variant="icon" onClick={() => edit(f)} title="Modifica">
                  <Icon name="edit" size={18} />
                </Btn>
                <Btn variant="icon" onClick={() => del(f.id)} title="Elimina">
                  <Icon name="trash" size={18} />
                </Btn>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

// ── Section: Pasto ──────────────────────────────────────────────────────────────
function PastoSection({ foods, autoFocusTrigger, meal, setMeal }) {
  const C = useTheme();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [grPerPorzione, setGrPerPorzione] = useState("");
  const [editMealId, setEditMealId] = useState(null);
  const searchRef = useRef();

  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [autoFocusTrigger]);

  const cho = selected ? (parseFloat(grPerPorzione || 0) / 100 * selected.choPer100) : 0;
  const filtered = search.length > 1 ? foods.filter(f => matchSearch(f.nome, search)) : [];

  const selectFood = (f) => { setSelected(f); setGrPerPorzione(String(f.porzione)); setSearch(""); setEditMealId(null); };

  const addToMeal = () => {
    if (!selected) return;
    const entry = { uid: editMealId ?? Date.now(), id: selected.id, nome: selected.nome,
      porzione: parseFloat(grPerPorzione), cho: +cho.toFixed(1) };
    setMeal(m => editMealId !== null ? m.map(x => x.uid === editMealId ? entry : x) : [...m, entry]);
    setSelected(null); setGrPerPorzione(""); setEditMealId(null);
    if (searchRef.current) searchRef.current.blur();
  };

  const editEntry = (entry) => {
    const f = foods.find(f => f.id === entry.id);
    if (!f) return;
    setSelected(f); setGrPerPorzione(String(entry.porzione)); setEditMealId(entry.uid);
  };

  const totalCho = meal.reduce((s, x) => s + x.cho, 0);
  const reset = () => { setMeal([]); setSelected(null); setGrPerPorzione(""); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 130 }}>
      {/* Search — diretto, senza card wrapper */}
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <Icon name="search" size={18} />
        </div>
        <Input ref={searchRef} placeholder="Cerca alimento nel pasto..."
          value={search} style={{ paddingLeft: 36 }}
          onChange={e => { setSearch(e.target.value); setSelected(null); }} />
        {filtered.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
            zIndex: 10, overflow: "hidden", boxShadow: `0 8px 28px ${C.overlay}` }}>
            {filtered.map(f => (
              <div key={f.id} onClick={() => selectFood(f)}
                style={{ padding: "10px 14px", cursor: "pointer",
                  borderBottom: `1px solid ${C.border}`, transition: "background .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = C.bg}
                onMouseLeave={e => e.currentTarget.style.background = ""}>
                <div style={{ fontWeight: 500, color: C.text, fontSize: 14 }}>{f.nome}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{+(f.choPer100 * f.porzione / 100).toFixed(1)}g CHO · porzione std {f.porzione}g</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calculator */}
      {selected && (
        <Card className="fade-up" style={{ borderColor: C.accent + "55", padding: 12 }}>
          <div style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, marginBottom: 8, color: C.accent }}>
            {selected.nome}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div>
              <Label>Porzione (g)</Label>
              <Input type="number" value={grPerPorzione} onChange={e => setGrPerPorzione(e.target.value)}
                className="porzione-input"
                style={{ fontSize: 20, fontWeight: 700, textAlign: "center", color: C.accent,
                  padding: "8px 10px", background: C.surface }} />
            </div>
            <div>
              <Label>CHO calcolati</Label>
              <div style={{ background: C.isDark ? "#0f1923" : "#e8efed",
                border: `1.5px solid ${C.border}`,
                borderRadius: 8, padding: "8px 10px", textAlign: "center",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                opacity: 0.85 }}>
                <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "DM Sans",
                  color: cho > 0 ? C.accent : C.muted, letterSpacing: "-0.5px" }}>{cho.toFixed(1)}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: C.muted }}>g</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Btn variant="add" onClick={addToMeal} title="Aggiungi al pasto">
              <Icon name="plus" size={22} color={C.isDark ? "#0f1923" : "#fff"} />
            </Btn>
            <span style={{ fontSize: 13, color: C.muted, flex: 1 }}>
              {editMealId !== null ? "Aggiorna nel pasto" : "Aggiungi al pasto"}
            </span>
            <Btn variant="icon" onClick={() => { setSelected(null); setGrPerPorzione(""); }}>
              <Icon name="close" size={18} />
            </Btn>
          </div>
        </Card>
      )}

      {/* Meal list — compatta, gap minimo */}
      {meal.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
            <Icon name="meal" size={14} color={C.muted} />
            <span style={{ fontFamily: "Outfit", fontSize: 10, letterSpacing: 2,
              color: C.muted, textTransform: "uppercase" }}>Piatti nel pasto</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {meal.map((entry, i) => (
              <div key={entry.uid} className="fade-up" style={{ animationDelay: `${i * 25}ms` }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: C.card, borderRadius: 10, padding: "8px 10px",
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => editEntry(entry)}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: C.text, lineHeight: 1.3 }}>{entry.nome}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>
                      {entry.porzione}g &nbsp;·&nbsp;
                      <span style={{ color: C.accent, fontWeight: 700 }}>{entry.cho}g CHO</span>
                    </div>
                  </div>
                  <Btn variant="icon" onClick={() => editEntry(entry)} title="Modifica"
                    style={{ padding: "5px 7px" }}>
                    <Icon name="edit" size={16} />
                  </Btn>
                  <Btn variant="icon" onClick={() => setMeal(m => m.filter(x => x.uid !== entry.uid))} title="Rimuovi"
                    style={{ padding: "5px 7px" }}>
                    <Icon name="trash" size={16} />
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {meal.length === 0 && !selected && (
        <div style={{ textAlign: "center", color: C.muted, padding: "30px 0 10px", fontSize: 13 }}>
          Cerca un alimento qui sopra e aggiungilo al pasto.
        </div>
      )}

      {/* Totale CHO + Svuota — appena sopra la bottom nav */}
      {meal.length > 0 && (
        <div style={{
          position: "fixed", bottom: 40, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 480, zIndex: 35,
          background: C.isDark ? "#0d2a22" : "#e6f7f2",
          borderTop: `2px solid ${C.accent}`,
          padding: "7px 14px 10px 16px", display: "flex", alignItems: "center",
          justifyContent: "space-between", backdropFilter: "blur(10px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="logo" size={20} />
            <div>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: C.muted }}>
                Totale CHO
              </div>
              <div style={{ fontFamily: "DM Sans", fontSize: 24, fontWeight: 700, color: C.accent, lineHeight: 1.3, letterSpacing: -0.5 }}>
                {totalCho.toFixed(1)}<span style={{ fontSize: 12, fontWeight: 400, color: C.muted }}> g &nbsp;·&nbsp; {meal.length} piatt{meal.length === 1 ? "o" : "i"}</span>
              </div>
            </div>
          </div>
          <Btn variant="danger" onClick={reset}
            style={{ fontSize: 13, padding: "7px 16px", gap: 5, alignSelf: "center", fontWeight: 700 }}>
            <Icon name="broom" size={17} color="#ff6b6b" /> Svuota
          </Btn>
        </div>
      )}
    </div>
  );
}

// ── App shell ───────────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  render() {
    if (this.state.err) return (
      <div style={{ padding: 24, color: "#ff6b6b", fontFamily: "sans-serif" }}>
        <b>Errore:</b> {this.state.err.message}
        <br/><button onClick={() => this.setState({ err: null })} style={{ marginTop: 12 }}>Riprova</button>
      </div>
    );
    return this.props.children;
  }
}

export default function App() {
  const [tab, setTab] = useState("pasto");
  const [foods, setFoods] = useState([]);
  const [ready, setReady] = useState(false);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [themePref, setThemePref] = useState("auto");
  const [sysDark, setSysDark] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [meal, setMeal] = useState([]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSysDark(mq.matches);
    const h = e => setSysDark(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    const f = loadFoods();
    const tp = loadThemePref();
    const sortedF = [...f].sort((a,b) => a.nome.toLowerCase().localeCompare(b.nome.toLowerCase()));
    setFoods(sortedF);
    setThemePref(tp);
    setReady(true);
  }, []);

  const isDark = themePref === "dark" || (themePref === "auto" && sysDark);
  const C = isDark ? DARK : LIGHT;

  const switchTab = (id) => { setTab(id); setFocusTrigger(n => n + 1); };

  const tabs = [
    { id: "pasto",    label: "Pasto",     iconName: "meal" },
    { id: "alimenti", label: "Alimenti",  iconName: "list" },
  ];

  return (
    <ErrorBoundary>
    <ThemeCtx.Provider value={C}>
      <style>{BASE_CSS}</style>
      <style>{`
        html, body, #root { background: ${C.bg}; color: ${C.text}; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
      `}</style>

      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh",
        display: "flex", flexDirection: "column", background: C.bg,
        transition: "background .3s" }}>

        {/* ── Header compatto ── */}
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`,
          padding: "8px 16px", position: "sticky", top: 0, zIndex: 30,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          transition: "background .3s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Icon name="logo" size={24} />
            <span style={{ fontFamily: "Outfit", fontWeight: 800, fontSize: 20,
              color: C.accent, letterSpacing: -0.5, lineHeight: 1 }}>
              CarboCount
            </span>
          </div>
          <button onClick={() => setShowSettings(true)} title="Impostazioni"
            style={{ background: C.border, border: "none", borderRadius: 8,
              width: 34, height: 34, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background .2s" }}>
            <Icon name="gear" size={17} color={C.muted} />
          </button>
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, padding: "10px 12px 0", overflowY: "auto", paddingBottom: 80 }}>
          {!ready
            ? <div style={{ textAlign: "center", color: C.muted, paddingTop: 60 }}>Caricamento…</div>
            : tab === "alimenti"
              ? <AlimentiSection foods={foods} setFoods={setFoods} autoFocusTrigger={focusTrigger} />
              : <PastoSection foods={foods} autoFocusTrigger={focusTrigger} meal={meal} setMeal={setMeal} />
          }
        </div>

        {/* ── Bottom navigation fissa ── */}
        <div style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 480, zIndex: 40,
          background: C.surface, borderTop: `1px solid ${C.border}`,
          display: "flex", transition: "background .3s",
        }}>
          {tabs.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => switchTab(t.id)}
                style={{
                  flex: 1, border: "none", background: "none",
                  padding: "10px 0", cursor: "pointer", transition: "all .2s",
                  borderTop: `2px solid ${active ? C.accent : "transparent"}`,
                  display: "flex", flexDirection: "row",
                  alignItems: "center", justifyContent: "center", gap: 7,
                }}>
                <Icon name={t.iconName} size={20} color={active ? C.accent : C.muted} />
                <span style={{ fontFamily: "DM Sans", fontWeight: 600, fontSize: 14,
                  color: active ? C.accent : C.muted }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {showSettings && (
        <SettingsModal themePref={themePref} setThemePref={setThemePref}
          foods={foods} setFoods={setFoods}
          onClose={() => setShowSettings(false)} />
      )}
    </ThemeCtx.Provider>
    </ErrorBoundary>
  );
}
