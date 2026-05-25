import { db } from "@workspace/db";
import {
  usersTable, profilesTable, userRolesTable,
  categoriesTable, placesTable,
} from "@workspace/db";
import { hashPassword } from "./lib/password";

async function seed() {
  console.log("🌱 Seeding database...");

  // --- Categories ---
  const catData = [
    { slug: "lakes", name: "Lakes", description: "Serene high-altitude and lowland lakes", icon: "💧", sortOrder: 1 },
    { slug: "mountains", name: "Mountains", description: "Towering peaks and ranges", icon: "🏔", sortOrder: 2 },
    { slug: "villages", name: "Villages", description: "Authentic hill and valley villages", icon: "🏘", sortOrder: 3 },
    { slug: "heritage", name: "Heritage", description: "Ancient temples, palaces and monuments", icon: "🏛", sortOrder: 4 },
    { slug: "wildlife", name: "Wildlife", description: "National parks and wildlife reserves", icon: "🦏", sortOrder: 5 },
    { slug: "trekking", name: "Trekking", description: "World-famous and hidden trekking routes", icon: "🥾", sortOrder: 6 },
    { slug: "spiritual", name: "Spiritual", description: "Sacred sites and pilgrimage destinations", icon: "🕍", sortOrder: 7 },
    { slug: "valleys", name: "Valleys", description: "Scenic valleys and gorges", icon: "🌄", sortOrder: 8 },
  ];

  await db.insert(categoriesTable).values(catData).onConflictDoNothing();
  console.log("✅ Categories seeded");

  // --- Users ---
  const demoPassword = await hashPassword("nepal2024!");

  const userRows = [
    { email: "admin@hiddennepal.app", passwordHash: demoPassword },
    { email: "moderator@hiddennepal.app", passwordHash: demoPassword },
    { email: "contributor@hiddennepal.app", passwordHash: demoPassword },
    { email: "viewer@hiddennepal.app", passwordHash: demoPassword },
  ];

  const insertedUsers = await db.insert(usersTable).values(userRows).onConflictDoUpdate({
    target: usersTable.email,
    set: { updatedAt: new Date() },
  }).returning({ id: usersTable.id, email: usersTable.email });

  const byEmail = Object.fromEntries(insertedUsers.map((u) => [u.email, u.id]));

  const profileRows = [
    { userId: byEmail["admin@hiddennepal.app"], name: "Atlas Admin" },
    { userId: byEmail["moderator@hiddennepal.app"], name: "Content Moderator" },
    { userId: byEmail["contributor@hiddennepal.app"], name: "Nepal Explorer" },
    { userId: byEmail["viewer@hiddennepal.app"], name: "Curious Traveller" },
  ];
  await db.insert(profilesTable).values(profileRows).onConflictDoNothing();

  const roleRows = [
    { userId: byEmail["admin@hiddennepal.app"], role: "viewer" as const },
    { userId: byEmail["admin@hiddennepal.app"], role: "contributor" as const },
    { userId: byEmail["admin@hiddennepal.app"], role: "moderator" as const },
    { userId: byEmail["admin@hiddennepal.app"], role: "admin" as const },
    { userId: byEmail["moderator@hiddennepal.app"], role: "viewer" as const },
    { userId: byEmail["moderator@hiddennepal.app"], role: "contributor" as const },
    { userId: byEmail["moderator@hiddennepal.app"], role: "moderator" as const },
    { userId: byEmail["contributor@hiddennepal.app"], role: "viewer" as const },
    { userId: byEmail["contributor@hiddennepal.app"], role: "contributor" as const },
    { userId: byEmail["viewer@hiddennepal.app"], role: "viewer" as const },
  ];
  await db.insert(userRolesTable).values(roleRows).onConflictDoNothing();
  console.log("✅ Users seeded");

  const adminId = byEmail["admin@hiddennepal.app"];

  // --- Places ---
  const placesData = [
    {
      slug: "rara-lake",
      title: "Rara Lake",
      shortDescription: "Nepal's largest and most remote lake, shimmering at 2990m in Karnali.",
      description: "Rara Lake is Nepal's largest lake and perhaps its best-kept secret. Perched at 2,990 m in the remote Karnali Province, the lake's crystal-clear waters shift from emerald green to deep blue depending on the light and season. Surrounding forests of pine and juniper shelter red pandas, Himalayan black bears, and over 200 bird species. The Rara National Park that envelops the lake remains one of the least-visited in Asia, ensuring an experience of rare solitude.",
      history: "The lake holds deep spiritual significance for local Mugu residents. Ancient legends speak of a divine origin, and small shrines dot the shoreline where villagers offer prayers before the fishing season.",
      categorySlug: "lakes",
      district: "Mugu",
      province: "Karnali" as const,
      lat: "29.5234",
      lng: "82.0897",
      hidden: true,
      featured: true,
      views: 1240,
      bestSeason: "October to May",
      difficulty: "Challenging" as const,
      costEstimate: "USD 80–120/day (flights + permits)",
      permits: "National Park entry permit (NPR 3000), ACAP not required",
      durationDays: 7,
      nearbyHospital: "Gamgadhi Health Post (2 hrs)",
      emergency: "117 (Police)",
      localSupport: "Mugu Tourism Board",
      status: "approved" as const,
      submittedBy: adminId,
      approvedBy: adminId,
      approvedAt: new Date(),
      coverImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      images: ["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200"],
    },
    {
      slug: "khopra-ridge",
      title: "Khopra Ridge",
      shortDescription: "A hidden alternative to Annapurna Base Camp with jaw-dropping Dhaulagiri views.",
      description: "Khopra Ridge, also called Khopra Danda, sits at 3,660 m in the Annapurna Conservation Area and offers unobstructed panoramas of Dhaulagiri, Annapurna South, and Nilgiri. Unlike the crowded ABC trail, Khopra sees a fraction of the trekkers and rewards the effort with pristine rhododendron forests and a sacred glacial lake — Khayer Lake — another 500 m above.",
      history: "Khayer Lake (4,500 m) above the ridge is a Hindu pilgrimage site visited during the Janai Purnima festival. Local Magar and Gurung communities have maintained the trail for centuries as a route between high pastures and valley markets.",
      categorySlug: "trekking",
      district: "Myagdi",
      province: "Gandaki" as const,
      lat: "28.5667",
      lng: "83.5667",
      hidden: true,
      featured: false,
      views: 870,
      bestSeason: "March–May, October–November",
      difficulty: "Moderate" as const,
      costEstimate: "USD 25–40/day",
      permits: "ACAP permit (NPR 3000) + TIMS card",
      durationDays: 5,
      nearbyHospital: "Beni Hospital (6 hrs)",
      emergency: "Annapurna Conservation Area rangers",
      localSupport: "Khopra Community Lodge network",
      status: "approved" as const,
      submittedBy: adminId,
      approvedBy: adminId,
      approvedAt: new Date(),
      coverImage: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
      images: [],
    },
    {
      slug: "ilam-tea-gardens",
      title: "Ilam Tea Gardens",
      shortDescription: "Undulating emerald terraces of the finest Orthodox tea in Eastern Nepal.",
      description: "Nepal's tea country hugs the foothills of the eastern Himalaya, and Ilam is its quiet capital. Rolling hillsides blanketed in dark-green tea bushes stretch as far as the eye can see, interspersed with silver waterfalls and cardamom plantations. The climate is famously pleasant year-round, making it the ideal counterpoint to the extreme altitudes of the high mountains.",
      history: "Tea cultivation arrived in Ilam in 1863 when seeds from Darjeeling were planted by British planters. Today, family-run estates and cooperatives produce award-winning first-flush teas exported to Japan, Germany and the UK.",
      categorySlug: "valleys",
      district: "Ilam",
      province: "Koshi" as const,
      lat: "26.9115",
      lng: "87.9253",
      hidden: false,
      featured: true,
      views: 2100,
      bestSeason: "March–May (first flush), October–November",
      difficulty: "Easy" as const,
      costEstimate: "USD 15–25/day",
      permits: "None required",
      durationDays: 2,
      nearbyHospital: "Ilam District Hospital",
      emergency: "100 (Police)",
      localSupport: "Ilam Tourism Development Committee",
      status: "approved" as const,
      submittedBy: adminId,
      approvedBy: adminId,
      approvedAt: new Date(),
      coverImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      images: [],
    },
    {
      slug: "tilicho-lake",
      title: "Tilicho Lake",
      shortDescription: "One of the world's highest lakes at 4,949 m, on the Annapurna Circuit.",
      description: "Tilicho Lake (4,949 m) is a glacial marvel accessible as a demanding side trip from the Annapurna Circuit. The approach crosses a notorious scree slope — the 'great barrier' — that rewards those who complete it with a view of a frozen expanse hemmed by walls of ice and rock. The turquoise waters are sacred to local Hindus and Buddhists alike.",
      history: "French mountaineer Maurice Herzog noted Tilicho during his 1950 Annapurna expedition. Tibetan trade caravans once passed the lake on ancient trans-Himalayan routes.",
      categorySlug: "lakes",
      district: "Manang",
      province: "Gandaki" as const,
      lat: "28.6858",
      lng: "83.8498",
      hidden: false,
      featured: true,
      views: 3400,
      bestSeason: "May–June, September–November",
      difficulty: "Challenging" as const,
      costEstimate: "USD 30–50/day",
      permits: "ACAP permit (NPR 3000) + TIMS card",
      durationDays: 2,
      nearbyHospital: "Manang Health Post",
      emergency: "Altitude sickness: descend immediately; HEMS helicopter rescue available",
      localSupport: "Manang area teahouses",
      status: "approved" as const,
      submittedBy: adminId,
      approvedBy: adminId,
      approvedAt: new Date(),
      coverImage: "https://images.unsplash.com/photo-1571987502951-57cfb26b52cd?w=800",
      images: [],
    },
    {
      slug: "mustang-lo-manthang",
      title: "Lo Manthang",
      shortDescription: "The walled medieval capital of the ancient kingdom of Upper Mustang.",
      description: "Lo Manthang is the fortified capital of the former Kingdom of Lo, a Tibetan Buddhist enclave sealed to outsiders until 1992. The whitewashed walls enclose a 15th-century palace, ancient chortens, and monasteries still vibrant with thangka paintings and masked Tiji festivals. The semi-arid landscape of eroded red cliffs, cave dwellings, and apple orchards is unlike anywhere else in Nepal.",
      history: "The Kingdom of Lo was founded in 1380 by Ame Pal and remained semi-autonomous even under Nepali sovereignty. Its isolation preserved a near-pristine Tibetan culture that has mostly disappeared elsewhere.",
      categorySlug: "heritage",
      district: "Mustang",
      province: "Gandaki" as const,
      lat: "29.1803",
      lng: "83.9560",
      hidden: false,
      featured: true,
      views: 5200,
      bestSeason: "June–August (Tiji festival in May)",
      difficulty: "Moderate" as const,
      costEstimate: "USD 50/day + USD 500 restricted area permit",
      permits: "Restricted Area Permit (USD 500 for 10 days) + ACAP",
      durationDays: 10,
      nearbyHospital: "Jomsom Hospital",
      emergency: "Mountain Air rescue; CAAN helicopters available",
      localSupport: "Upper Mustang Trekking Agencies Association",
      status: "approved" as const,
      submittedBy: adminId,
      approvedBy: adminId,
      approvedAt: new Date(),
      coverImage: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800",
      images: [],
    },
    {
      slug: "bandipur",
      title: "Bandipur",
      shortDescription: "A perfectly preserved Newari hilltop town with sweeping Himalayan views.",
      description: "Bandipur clings to a hilltop above the Marsyangdi valley, its main street a traffic-free showcase of 18th-century Newari architecture. Trading caravans and later Indo-China commerce once made the town wealthy; today that wealth is preserved in intricately carved windows, traditional dhoka doorways, and an unhurried pace. On clear days the Himalaya — from Dhaulagiri to Ganesh Himal — frames the town.",
      history: "Founded by Newari merchants from Bhaktapur in the 18th century, Bandipur thrived on the India–Tibet trade route. The opening of the Prithvi Highway in 1973 bypassed the town, inadvertently preserving it in amber.",
      categorySlug: "heritage",
      district: "Tanahun",
      province: "Gandaki" as const,
      lat: "27.9387",
      lng: "84.4080",
      hidden: false,
      featured: false,
      views: 4100,
      bestSeason: "October–April",
      difficulty: "Easy" as const,
      costEstimate: "USD 20–35/day",
      permits: "None required",
      durationDays: 1,
      nearbyHospital: "Damauli Hospital (45 min)",
      emergency: "100 (Police)",
      localSupport: "Bandipur Village Tourism Development Committee",
      status: "approved" as const,
      submittedBy: adminId,
      approvedBy: adminId,
      approvedAt: new Date(),
      coverImage: "https://images.unsplash.com/photo-1589825132534-8d5f00be3ab5?w=800",
      images: [],
    },
  ];

  await db.insert(placesTable).values(placesData).onConflictDoUpdate({
    target: placesTable.slug,
    set: { updatedAt: new Date() },
  });
  console.log(`✅ ${placesData.length} places seeded`);

  console.log("\n🎉 Seed complete!");
  console.log("Demo accounts (password: nepal2024!):");
  console.log("  admin@hiddennepal.app       → admin + all roles");
  console.log("  moderator@hiddennepal.app   → moderator role");
  console.log("  contributor@hiddennepal.app → contributor role");
  console.log("  viewer@hiddennepal.app      → viewer only");
}

seed()
  .catch(console.error)
  .finally(() => process.exit());
