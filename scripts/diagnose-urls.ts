import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://felofmlhqwcdpiyjgstx.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function diagnose() {
  // Check what files exist in the storage bucket
  console.log("Checking files in guideline-pdfs bucket:\n");

  const { data: bucketFiles, error: listError } = await supabase.storage
    .from("guideline-pdfs")
    .list("NCCN_general", { limit: 50 });

  // Check for colon.pdf specifically
  const colonFiles = bucketFiles?.filter(f => f.name.includes("colon")) || [];
  console.log("Colon-related files:", colonFiles.map(f => f.name));

  if (listError) {
    console.log("List error:", listError.message);
  } else {
    console.log("Files in NCCN_general:");
    for (const f of bucketFiles || []) {
      console.log("  -", f.name);
    }
  }

  // Check root level folders
  const { data: rootFolders } = await supabase.storage
    .from("guideline-pdfs")
    .list("", { limit: 20 });

  console.log("\nTop-level folders/files:");
  for (const f of rootFolders || []) {
    console.log("  ", f.name, f.id ? "(folder)" : "");
  }

  // Check the RPC function that the Research tab actually uses
  console.log("\n\nTesting get_resources_by_cancer_type RPC for 'colon':\n");

  const { data: rpcData, error: rpcError } = await supabase
    .rpc("get_resources_by_cancer_type", {
      search_term: "colon",
      max_results: 30
    });

  if (rpcError) {
    console.log("RPC Error:", rpcError.message);
  }

  console.log("RPC Results:");
  for (const d of rpcData || []) {
    if (!d.source_url) continue;

    // Apply the same transformation as the hook
    const fixedUrl = d.source_url.replace('xobmvxatidcnbuwqptbe', 'felofmlhqwcdpiyjgstx');

    console.log("---");
    console.log("Title:", d.title);
    console.log("Original URL:", d.source_url);
    console.log("Fixed URL:", fixedUrl);

    // Test if URL is accessible
    try {
      const resp = await fetch(fixedUrl, { method: "HEAD" });
      console.log("Status:", resp.status, resp.status === 200 ? "✓ WORKS" : "✗ FAILS");
    } catch (e: any) {
      console.log("Error:", e.message);
    }
  }

  // Get colon cancer guidelines to see URL patterns
  const { data } = await supabase
    .from("guideline_chunks")
    .select("guideline_title, source_url, content_tier")
    .ilike("cancer_type", "%colon%")
    .eq("content_tier", "tier_1")
    .limit(30);

  console.log("Colon cancer tier_1 URLs:\n");
  const seen = new Set<string>();

  for (const d of data || []) {
    const key = d.guideline_title + "|" + d.source_url;
    if (seen.has(key)) continue;
    seen.add(key);

    const hasUUID = d.source_url?.match(/^[a-f0-9-]{36}\//);
    const status = hasUUID ? "[UUID-BAD]" : "[OK]";
    console.log(status, d.guideline_title?.substring(0, 40), "→", d.source_url?.substring(0, 60));
  }

  // Count totals
  console.log("\n--- Summary ---");

  const { data: allData } = await supabase
    .from("guideline_chunks")
    .select("source_url")
    .eq("content_tier", "tier_1")
    .limit(1000);

  let uuidCount = 0;
  let goodCount = 0;
  const uuidUrls = new Set<string>();
  const goodUrls = new Set<string>();

  for (const d of allData || []) {
    if (d.source_url?.match(/^[a-f0-9-]{36}\//)) {
      uuidCount++;
      uuidUrls.add(d.source_url);
    } else if (d.source_url) {
      goodCount++;
      goodUrls.add(d.source_url);
    }
  }

  console.log("UUID-based URLs (broken):", uuidUrls.size, "unique");
  console.log("Standard URLs (working):", goodUrls.size, "unique");
}

diagnose();
