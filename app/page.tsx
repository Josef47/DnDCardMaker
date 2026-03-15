"use client";

import React, { useEffect, useMemo, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type SpellListItem = {
  name: string;
  url: string;
  level: string;
};

type SpellData = {
  title: string;
  damage: string;
  school: string;
  metaLines: string[];
  description: string;
  accent?: string;
  sourceUrl?: string;
};

type SavedCard = {
  id: string;
  imageUrl: string;
  data: SpellData;
};

const defaultData: SpellData = {
  title: "Acid Splash",
  damage: "1d6 Acid",
  school: "Conjuration cantrip",
  metaLines: [
    "Casting Time: 1 action",
    "Range: 60 feet",
    "Components: V, S",
    "Duration: Instantaneous",
  ],
  description:
    "You hurl a bubble of acid. Choose one creature you can see within range, or choose two creatures you can see within range that are within 5 feet of each other. A target must succeed on a Dexterity saving throw or take 1d6 acid damage.\n\nAt Higher Levels. This spell’s damage increases by 1d6 when you reach 5th level (2d6), 11th level (3d6), and 17th level (4d6).\n\nSpell Lists. Artificer, Sorcerer, Wizard",
  accent: "#c8b22e",
  sourceUrl: "https://dnd5e.wikidot.com/spell:acid-splash",
};

function inferDamage(text: string) {
  const match = text.match(/\b(\d+d\d+(?:\s*\+\s*\d+)?)\s+([A-Za-z]+)\s+damage\b/i);
  if (!match) return "";
  return `${match[1]} ${match[2][0].toUpperCase()}${match[2].slice(1).toLowerCase()}`;
}

function slugifySpellName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function SpellCard({
  data,
  imageUrl,
  small = false,
}: {
  data: SpellData;
  imageUrl: string;
  small?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[24px] border-[4px] border-neutral-500 bg-white ${
        small ? "h-[340px] w-[235px] p-3" : "min-h-[460px] w-[320px] p-4"
      }`}
      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
    >
      <div
        className={`absolute overflow-hidden rounded-full border border-neutral-200 bg-neutral-50 ${
          small ? "right-3 top-3 h-[64px] w-[64px]" : "right-4 top-4 h-[84px] w-[84px]"
        }`}
      >
        {imageUrl ? <img src={imageUrl} alt="spell art" className="h-full w-full object-cover" /> : null}
      </div>

      <div className={small ? "pr-[74px]" : "pr-[96px]"}>
        <h1 className={small ? "text-[1.5rem] font-bold leading-none" : "text-[2rem] font-bold leading-none tracking-tight"}>
          {data.title}
        </h1>
        <p className={small ? "mt-1 text-[1rem] font-semibold" : "mt-1 text-[1.2rem] font-semibold"} style={{ color: data.accent || defaultData.accent }}>
          {data.damage}
        </p>
        <p className={small ? "mt-1 text-[0.75rem] italic" : "mt-1 text-[0.95rem] italic"}>{data.school}</p>
      </div>

      <div className={small ? "mt-2 space-y-0 text-[0.7rem] leading-snug" : "mt-3 space-y-0.5 text-[0.92rem] leading-snug"}>
        {data.metaLines.map((line, idx) => (
          <p key={idx} className="font-semibold">
            {line}
          </p>
        ))}
      </div>

      <div className={small ? "mt-3 whitespace-pre-wrap text-[0.67rem] leading-[1.18] text-neutral-900" : "mt-4 whitespace-pre-wrap text-[0.88rem] leading-[1.28] text-neutral-900"}>
        {data.description}
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-xl">
      <h2 className="mb-4 text-lg font-semibold text-neutral-900">{title}</h2>
      {children}
    </div>
  );
}

export default function SpellCardBuilderApp() {
  const [spellName, setSpellName] = useState("Acid Splash");
  const [siteUrl, setSiteUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?auto=format&fit=crop&w=300&q=80");
  const [manualText, setManualText] = useState(defaultData.description);
  const [title, setTitle] = useState(defaultData.title);
  const [damage, setDamage] = useState(defaultData.damage);
  const [school, setSchool] = useState(defaultData.school);
  const [metaText, setMetaText] = useState(defaultData.metaLines.join("\n"));
  const [accent, setAccent] = useState(defaultData.accent || "#c8b22e");
  const [status, setStatus] = useState("Ready");
  const [spellList, setSpellList] = useState<SpellListItem[]>([]);
  const [spellSearch, setSpellSearch] = useState("");
  const [sheetCards, setSheetCards] = useState<SavedCard[]>([]);

  const derivedSpellUrl = useMemo(() => {
    if (siteUrl.trim()) return siteUrl.trim();
    return `https://dnd5e.wikidot.com/spell:${slugifySpellName(spellName)}`;
  }, [spellName, siteUrl]);

  const metaLines = useMemo(() => metaText.split("\n").map((s) => s.trim()).filter(Boolean), [metaText]);

  const cardData = useMemo(
    () => ({
      title,
      damage,
      school,
      metaLines,
      description: manualText,
      accent,
      sourceUrl: derivedSpellUrl,
    }),
    [title, damage, school, metaLines, manualText, accent, derivedSpellUrl]
  );

  const filteredSpellList = useMemo(() => {
    const q = spellSearch.trim().toLowerCase();
    if (!q) return spellList;
    return spellList.filter((spell) => `${spell.name} ${spell.level}`.toLowerCase().includes(q));
  }, [spellList, spellSearch]);

  useEffect(() => {
    fetchSpellIndex();
  }, []);

  async function fetchSpellIndex() {
    try {
      setStatus("Loading spell list...");
      const response = await fetch("/api/spells-index");
      if (!response.ok) throw new Error("Could not load spell index");
      const data = await response.json();
      setSpellList(data.spells || []);
      setStatus("Spell list loaded");
    } catch (error) {
      console.error(error);
      setStatus("Could not load spell list");
    }
  }

  async function fetchSpell(urlOverride?: string, nameOverride?: string) {
    const targetUrl = urlOverride || derivedSpellUrl;
    if (nameOverride) setSpellName(nameOverride);
    setStatus("Fetching spell data...");
    try {
      const response = await fetch(
        `/api/scrape-spell?url=${encodeURIComponent(targetUrl)}&name=${encodeURIComponent(nameOverride || spellName)}`
      );
      if (!response.ok) throw new Error("Scrape failed");
      const data = await response.json();
      setTitle(nameOverride || spellName || data.title || "");
      setSchool(data.school || "");
      setMetaText((data.metaLines || []).join("\n"));
      setManualText(data.description || "");
      setDamage(data.damage || inferDamage(data.description || ""));
      setSiteUrl(targetUrl);
      if (data.accent) setAccent(data.accent);
      setStatus(`Loaded ${data.title || "spell"}`);
    } catch (error) {
      console.error(error);
      setStatus("Could not fetch automatically. You can still edit manually.");
    }
  }

  function onImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  }

  function autoFillDamage() {
    const inferred = inferDamage(manualText);
    if (inferred) {
      setDamage(inferred);
      setStatus("Damage line inferred from description");
    } else {
      setStatus("No damage line found in text");
    }
  }

  function addCurrentCardToSheet() {
    if (sheetCards.length >= 9) {
      setStatus("A4 sheet already has 9 cards");
      return;
    }

    const newCard: SavedCard = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      imageUrl,
      data: { ...cardData, metaLines: [...cardData.metaLines] },
    };

    setSheetCards((prev) => [...prev, newCard]);
    setStatus(`Added ${cardData.title} to A4 sheet`);
  }

  function removeCardFromSheet(id: string) {
    setSheetCards((prev) => prev.filter((card) => card.id !== id));
    setStatus("Removed card from A4 sheet");
  }

  function clearSheet() {
    setSheetCards([]);
    setStatus("Cleared A4 sheet");
  }

  async function exportSinglePng() {
    const node = document.getElementById("single-card-preview");
    if (!node) return;
    setStatus("Exporting PNG...");
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: null });
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${slugifySpellName(title || "spell-card")}.png`;
    link.click();
    setStatus("PNG exported");
  }

  async function exportA4Pdf() {
    const node = document.getElementById("a4-sheet");
    if (!node) return;
    setStatus("Exporting A4 PDF...");
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
    pdf.save(`spell-cards-sheet.pdf`);
    setStatus("A4 PDF exported");
  }

  return (
    <div className="min-h-screen bg-neutral-100 p-6">
      <div className="mx-auto grid max-w-[1600px] gap-6 xl:grid-cols-[320px_420px_1fr]">
        <SectionCard title="Spell Library">
          <div className="space-y-3">
            <input
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-500"
              placeholder="Search spell names"
              value={spellSearch}
              onChange={(e) => setSpellSearch(e.target.value)}
            />
            <div className="text-sm text-neutral-500">{filteredSpellList.length} spells shown</div>
            <div className="h-[780px] overflow-auto rounded-2xl border border-neutral-200 bg-neutral-50 p-2">
              <div className="space-y-1">
                {filteredSpellList.map((spell) => (
                  <button
                    key={spell.url}
                    onClick={() => fetchSpell(spell.url, spell.name)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-white"
                  >
                    <span className="font-medium text-neutral-900">{spell.name}</span>
                    <span className="ml-3 text-xs text-neutral-500">{spell.level}</span>
                  </button>
                ))}
                {!filteredSpellList.length ? (
                  <div className="px-3 py-6 text-sm text-neutral-500">No spells found.</div>
                ) : null}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Card Builder">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Spell name</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-500"
                  value={spellName}
                  onChange={(e) => setSpellName(e.target.value)}
                  placeholder="Acid Splash"
                />
                <button onClick={() => fetchSpell()} className="rounded-xl bg-neutral-900 px-4 py-2 text-white">
                  Fetch
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Spell URL override</label>
              <input
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-500"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://dnd5e.wikidot.com/spell:acid-splash"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Card image</label>
              <div className="flex gap-2">
                <label className="cursor-pointer rounded-xl border border-neutral-300 px-4 py-2 hover:bg-neutral-50">
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={onImageUpload} />
                </label>
                <input
                  className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-500"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Paste image URL"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Title</label>
                <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Damage line</label>
                <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" value={damage} onChange={(e) => setDamage(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">School / subtitle</label>
              <input className="w-full rounded-xl border border-neutral-300 px-3 py-2" value={school} onChange={(e) => setSchool(e.target.value)} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Metadata lines</label>
              <textarea className="min-h-[120px] w-full rounded-xl border border-neutral-300 px-3 py-2" value={metaText} onChange={(e) => setMetaText(e.target.value)} />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-neutral-700">Description</label>
                <button onClick={autoFillDamage} className="rounded-lg border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-50">
                  Infer damage
                </button>
              </div>
              <textarea className="min-h-[220px] w-full rounded-xl border border-neutral-300 px-3 py-2" value={manualText} onChange={(e) => setManualText(e.target.value)} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Accent color</label>
              <div className="flex gap-2">
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-11 w-16 rounded-xl border border-neutral-300 bg-white" />
                <input className="flex-1 rounded-xl border border-neutral-300 px-3 py-2" value={accent} onChange={(e) => setAccent(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={addCurrentCardToSheet} className="rounded-xl bg-neutral-900 px-4 py-2 text-white">
                Add to A4 sheet
              </button>
              <button onClick={exportSinglePng} className="rounded-xl border border-neutral-300 px-4 py-2 hover:bg-neutral-50">
                Export PNG
              </button>
              <button onClick={exportA4Pdf} className="rounded-xl border border-neutral-300 px-4 py-2 hover:bg-neutral-50">
                Export A4 PDF
              </button>
            </div>

            <div className="rounded-xl bg-neutral-100 px-3 py-2 text-sm text-neutral-700">{status}</div>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Current Preview">
            <div className="flex justify-center">
              <div id="single-card-preview">
                <SpellCard data={cardData} imageUrl={imageUrl} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="A4 Sheet Builder">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-neutral-600">{sheetCards.length} / 9 cards</div>
              <button onClick={clearSheet} className="rounded-xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50">
                Clear sheet
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {sheetCards.map((card, index) => (
                <div key={card.id} className="flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-sm">
                  <span>{index + 1}. {card.data.title}</span>
                  <button onClick={() => removeCardFromSheet(card.id)} className="rounded-md bg-white px-2 py-1 text-xs hover:bg-neutral-200">
                    Remove
                  </button>
                </div>
              ))}
              {!sheetCards.length ? <div className="text-sm text-neutral-500">Add cards from the builder to fill the A4 page.</div> : null}
            </div>

            <div className="overflow-auto rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
              <div id="a4-sheet" className="mx-auto w-[794px] bg-white p-[18px]">
                <div className="grid grid-cols-3 gap-[10px]">
                  {Array.from({ length: 9 }).map((_, i) => {
                    const card = sheetCards[i];
                    return (
                      <div key={i} className="flex items-center justify-center">
                        {card ? (
                          <SpellCard data={card.data} imageUrl={card.imageUrl} small />
                        ) : (
                          <div className="h-[340px] w-[235px] rounded-[24px] border border-dashed border-neutral-300 bg-white" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
