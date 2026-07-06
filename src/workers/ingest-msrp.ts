import msrpSeed from "../data/msrp-seed.json";
import { POKEHUB_PROJECT_TAG, withProjectTag } from "../lib/project-tag";
import { createServiceSupabaseClient } from "../lib/supabase/server";

type SeedProduct = (typeof msrpSeed.products)[number];

function toSealedProductRow(product: SeedProduct) {
  return withProjectTag({
    name: product.name,
    product_type: product.productType,
    msrp: product.msrp,
    currency: product.currency,
    source: product.source,
    updated_at: new Date().toISOString()
  });
}

export async function ingestMsrpSeed() {
  const rows = msrpSeed.products.map(toSealedProductRow);
  const supabase = createServiceSupabaseClient();

  if (!supabase) {
    console.log(
      `MSRP seed contains ${rows.length} products for project_tag=${POKEHUB_PROJECT_TAG}. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to upsert them.`
    );
    return {
      insertedOrUpdated: 0,
      skipped: rows.length,
      errors: ["Missing Supabase service credentials"]
    };
  }

  const { error } = await supabase
    .from("sealed_products")
    .upsert(rows, { onConflict: "project_tag,name" });

  if (error) {
    throw new Error(`MSRP upsert failed: ${error.message}`);
  }

  console.log(`Upserted ${rows.length} sealed products with project_tag=${POKEHUB_PROJECT_TAG}.`);
  return {
    insertedOrUpdated: rows.length,
    skipped: 0,
    errors: []
  };
}

async function main() {
  await ingestMsrpSeed();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
