import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Upload, Wand2, Sparkles } from "lucide-react";

const defaultData = {
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
};

function inferDamage(text) {
  const match = text.match(/\b(\d+d\d+(?:\s*\+\s*\d+)?)\s+([A-Za-z]+)\s+damage\b/i);
  if (!match) return "";
  return `${match[1]} ${match[2][0].toUpperCase()}${match[2].slice(1).toLowerCase()}`;
}

function slugifySpellName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
  const [accent, setAccent] = useState(defaultData.accent);
  const [status, setStatus] = useState("Ready");

  const derivedSpellUrl = useMemo(() => {
    if (siteUrl.trim()) return siteUrl.trim();
    return `https://dnd5e.wikidot.com/spell:${slugifySpellName(spellName)}`;
  }, [spellName, siteUrl]);

  const metaLines = useMemo(
    () => metaText.split("\n").map((s) => s.trim()).filter(Boolean),
    [metaText]
  );

  async function fetchSpell() {
    setStatus("Fetching spell data...");
    try {
      const response = await fetch(`/api/scrape-spell?url=${encodeURIComponent(derivedSpellUrl)}`);
      if (!response.ok) throw new Error("Scrape failed");
      const data = await response.json();

      setTitle(data.title || "");
      setSchool(data.school || "");
      setMetaText((data.metaLines || []).join("\n"));
      setManualText(data.description || "");
      setDamage(data.damage || inferDamage(data.description || ""));
      if (data.accent) setAccent(data.accent);
      setStatus("Spell loaded");
    } catch (error) {
      console.error(error);
      setStatus("Could not fetch automatically. You can still edit manually.");
    }
  }

  function onImageUpload(event) {
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

  return (
    <div className="min-h-screen bg-neutral-100 p-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[420px_1fr]">
        <Card className="rounded-3xl border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Wand2 className="h-6 w-6" />
              Spell Card Builder
            </CardTitle>
            <p className="text-sm text-neutral-600">
              Fetch a spell from Wikidot, upload an image, then fine-tune the card.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Spell name</Label>
              <div className="flex gap-2">
                <Input value={spellName} onChange={(e) => setSpellName(e.target.value)} placeholder="Acid Splash" />
                <Button onClick={fetchSpell} className="gap-2">
                  <Search className="h-4 w-4" />
                  Fetch
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Spell URL override</Label>
              <Input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://dnd5e.wikidot.com/spell:acid-splash" />
              <p className="text-xs text-neutral-500">Current source: {derivedSpellUrl}</p>
            </div>

            <div className="space-y-2">
              <Label>Card image</Label>
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50">
                  <Upload className="h-4 w-4" />
                  Upload image
                  <input type="file" accept="image/*" className="hidden" onChange={onImageUpload} />
                </label>
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Paste image URL" />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Damage line</Label>
                <Input value={damage} onChange={(e) => setDamage(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>School / subtitle</Label>
              <Input value={school} onChange={(e) => setSchool(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Metadata lines</Label>
              <Textarea value={metaText} onChange={(e) => setMetaText(e.target.value)} className="min-h-[120px]" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Description</Label>
                <Button variant="outline" size="sm" onClick={autoFillDamage} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Infer damage
                </Button>
              </div>
              <Textarea value={manualText} onChange={(e) => setManualText(e.target.value)} className="min-h-[220px]" />
            </div>

            <div className="space-y-2">
              <Label>Accent color</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-12 w-16 rounded-xl border bg-white" />
                <Input value={accent} onChange={(e) => setAccent(e.target.value)} />
              </div>
            </div>

            <Badge variant="secondary" className="rounded-xl px-3 py-1 text-xs">
              {status}
            </Badge>
          </CardContent>
        </Card>

        <div className="flex items-start justify-center">
          <div
            className="relative min-h-[460px] w-[320px] rounded-[24px] border-[4px] border-neutral-500 bg-white p-4 shadow-2xl"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            <div className="absolute right-4 top-4 h-[84px] w-[84px] overflow-hidden rounded-full border border-neutral-200 bg-neutral-50">
              {imageUrl ? (
                <img src={imageUrl} alt="spell art" className="h-full w-full object-cover" />
              ) : null}
            </div>

            <div className="pr-[96px]">
              <h1 className="text-[2rem] font-bold leading-none tracking-tight">{title}</h1>
              <p className="mt-1 text-[1.2rem] font-semibold" style={{ color: accent }}>
                {damage}
              </p>
              <p className="mt-1 text-[0.95rem] italic">{school}</p>
            </div>

            <div className="mt-3 space-y-0.5 text-[0.92rem] leading-snug">
              {metaLines.map((line, idx) => (
                <p key={idx} className="font-semibold">
                  {line}
                </p>
              ))}
            </div>

            <div className="mt-4 whitespace-pre-wrap text-[0.88rem] leading-[1.28] text-neutral-900">
              {manualText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
