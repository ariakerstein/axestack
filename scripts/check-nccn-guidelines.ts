import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://felofmlhqwcdpiyjgstx.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function check() {
  // Get ALL unique NCCN guideline titles
  const { data, error } = await supabase
    .from("guideline_chunks")
    .select("guideline_title, guideline_source, url, cancer_type")
    .eq("guideline_source", "NCCN")
    .limit(2000);

  if (error) {
    console.log("Error:", error.message);
    return;
  }

  console.log("All unique NCCN guidelines (source=NCCN):");
  const titles = new Map<string, { url: string | null; cancer: string }>();

  for (const d of data || []) {
    const existing = titles.get(d.guideline_title);
    if (existing) continue;
    titles.set(d.guideline_title, { url: d.url, cancer: d.cancer_type });
  }

  titles.forEach((info, title) => {
    console.log("  -", title, "| url:", info.url ? "YES" : "NO", "| cancer:", info.cancer);
  });

  console.log("\nTotal unique NCCN guidelines:", titles.size);
}

check();
