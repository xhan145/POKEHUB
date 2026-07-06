import msrpSeed from "../data/msrp-seed.json";

async function main() {
  console.log("MSRP seed ready for import:");
  for (const product of msrpSeed.products) {
    console.log(`${product.name} - $${product.msrp.toFixed(2)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
