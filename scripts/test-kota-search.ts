import fetch from "node-fetch";

async function testKotaSearch() {
  const url = "https://felofmlhqwcdpiyjgstx.supabase.co/functions/v1/direct-navis";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDY3NDM4MCwiZXhwIjoyMDU2MjUwMzgwfQ.OC0ma2mN2Np_-AEL4siwLaUV0eGZ1tDXgbghMfB61pQ";

  console.log("Testing: Tell me about Dr. Chandra Kota radiation treatment webinar");
  console.log("=".repeat(70));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceKey}`
    },
    body: JSON.stringify({
      question: "Tell me about Dr. Chandra Kota radiation treatment webinar",
      cancerType: null
    })
  });

  const data = await response.json() as any;

  if (!response.ok) {
    console.log("Error response:", response.status);
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log("\nAnswer (first 700 chars):");
  console.log(data.answer?.substring(0, 700));

  console.log("\n" + "=".repeat(70));
  console.log("Citation URLs:");
  data.citationUrls?.forEach((c: any, i: number) => {
    console.log(`${i+1}. ${c.title}`);
    console.log(`   ${c.url?.substring(0, 80)}...`);
  });

  // Check if Kota appears in sources
  const hasKota = data.citationUrls?.some((c: any) =>
    c.title?.toLowerCase().includes("kota") ||
    c.title?.toLowerCase().includes("navigating radiation") ||
    c.url?.toLowerCase().includes("kota")
  );
  console.log("\n" + "=".repeat(70));
  console.log("Kota webinar in sources:", hasKota ? "✓ YES" : "✗ NO");
}

testKotaSearch().catch(console.error);
