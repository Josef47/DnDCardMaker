import * as cheerio from "cheerio";

export type SpellCardData = {
  title: string;
  damage: string;
  school: string;
  metaLines: string[];
  description: string;
  sourceUrl: string;
};

function cleanLines(text: string) {
  return text
    .split("\n")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function inferDamage(text: string) {
  const match = text.match(/\b(\d+d\d+(?:\s*\+\s*\d+)?)\s+([A-Za-z]+)\s+damage\b/i);
  if (!match) return "";
  return `${match[1]} ${match[2][0].toUpperCase()}${match[2].slice(1).toLowerCase()}`;
}

export async function scrapeSpell(url: string): Promise<SpellCardData> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch spell page: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const rawText =
    $("#page-content").text() ||
    $("#main-content").text() ||
    $(".page-content").text() ||
    $("body").text();

  const lines = cleanLines(rawText);

  const title = lines[0] || "";

  const school =
    lines.find((line) =>
      /(cantrip|abjuration|conjuration|divination|enchantment|evocation|illusion|necromancy|transmutation)/i.test(
        line
      )
    ) || "";

  const metaFields = ["Casting Time:", "Range:", "Components:", "Duration:"];
  const metaLines = lines.filter((line) => metaFields.some((field) => line.startsWith(field)));

  const durationIndex = lines.findIndex((line) => line.startsWith("Duration:"));
  const startIndex = durationIndex >= 0 ? durationIndex + 1 : -1;

  let endIndex = lines.findIndex((line) => /^Spell Lists?[:.]/i.test(line));
  if (endIndex === -1) endIndex = lines.length;

  const description =
    startIndex >= 0 ? lines.slice(startIndex, endIndex).join("\n\n") : "";

  return {
    title,
    school,
    metaLines,
    description,
    damage: inferDamage(description),
    sourceUrl: url,
  };
}