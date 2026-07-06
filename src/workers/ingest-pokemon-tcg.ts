import { z } from "zod";

const CardSchema = z.object({
  id: z.string(),
  name: z.string(),
  set: z.object({
    id: z.string(),
    name: z.string(),
    releaseDate: z.string().optional()
  }),
  number: z.string().optional(),
  rarity: z.string().optional(),
  artist: z.string().optional(),
  supertype: z.string().optional(),
  subtypes: z.array(z.string()).optional(),
  images: z.object({
    small: z.string().optional(),
    large: z.string().optional()
  }).optional(),
  tcgplayer: z.any().optional(),
  cardmarket: z.any().optional()
});

async function main() {
  const apiKey = process.env.POKEMON_TCG_API_KEY;
  const headers: Record<string, string> = {};
  if (apiKey) headers["X-Api-Key"] = apiKey;

  const url = new URL("https://api.pokemontcg.io/v2/cards");
  url.searchParams.set("page", "1");
  url.searchParams.set("pageSize", "25");
  url.searchParams.set("orderBy", "-set.releaseDate");
  url.searchParams.set("select", "id,name,set,number,rarity,artist,supertype,subtypes,images,tcgplayer,cardmarket");

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Pokemon TCG API failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  const cards = z.array(CardSchema).parse(payload.data);

  console.log(JSON.stringify({ count: cards.length, sample: cards[0] }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
