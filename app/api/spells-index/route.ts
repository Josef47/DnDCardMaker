import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

type SpellListItem = {
  name: string;
  url: string;
  level: string;
};

export async function GET() {
  try {
    const response = await fetch("https://dnd5e.wikidot.com/spells", {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch spell index: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const spells: SpellListItem[] = [];
    let currentLevel = "Unknown";

    $("body *").each((_, el) => {
      const text = $(el).text().trim();

      if (/cantrip|1st level|2nd level|3rd level|4th level|5th level|6th level|7th level|8th level|9th level/i.test(text)) {
        currentLevel = text;
      }

      $(el)
        .find("a")
        .each((__, a) => {
          const name = $(a).text().trim();
          const href = $(a).attr("href") || "";

          if (href.includes("/spell:") && name) {
            const url = href.startsWith("http") ? href : `https://dnd5e.wikidot.com${href}`;
            spells.push({
              name,
              url,
              level: currentLevel,
            });
          }
        });
    });

    const unique = Array.from(
      new Map(spells.map((spell) => [spell.url, spell])).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ spells: unique });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}