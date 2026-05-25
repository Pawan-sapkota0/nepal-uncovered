import { db, usersTable, profilesTable, userRolesTable, categoriesTable, placesTable, submissionsTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { logger } from "../../artifacts/api-server/src/lib/logger";

async function seed() {
  logger.info("Starting seed...");

  // Categories
  const cats = [
    { slug: "lakes", name: "Lakes", description: "Glacial mirrors hidden in the high valleys.", icon: "droplets", sortOrder: 1 },
    { slug: "mountains", name: "Mountains", description: "Eight of the world's fourteen 8,000ers.", icon: "mountain", sortOrder: 2 },
    { slug: "villages", name: "Villages", description: "Living traditions in stone and timber.", icon: "home", sortOrder: 3 },
    { slug: "heritage", name: "Heritage", description: "Temples, stupas and royal courtyards.", icon: "landmark", sortOrder: 4 },
    { slug: "wildlife", name: "Wildlife", description: "Rhinos, tigers and red pandas in their wild homes.", icon: "paw-print", sortOrder: 5 },
    { slug: "trekking", name: "Trekking", description: "Footpaths through the Himalaya.", icon: "footprints", sortOrder: 6 },
    { slug: "spiritual", name: "Spiritual", description: "Pilgrimage sites and meditation retreats.", icon: "sparkles", sortOrder: 7 },
    { slug: "valleys", name: "Valleys", description: "Lush corridors carved by ancient rivers.", icon: "trees", sortOrder: 8 },
  ];

  for (const cat of cats) {
    await db.insert(categoriesTable).values(cat).onConflictDoNothing();
  }
  logger.info("Categories seeded");

  // Demo users
  const passwordHash = await bcrypt.hash("nepal2024!", 12);
  const demoUsers = [
    { email: "viewer@hiddennepal.app", name: "Aanya Shrestha", role: "viewer" as const, bio: "Trekker and photographer from Pokhara." },
    { email: "contributor@hiddennepal.app", name: "Bibek Tamang", role: "contributor" as const, bio: "Guide based in Kathmandu, focused on hidden trails." },
    { email: "moderator@hiddennepal.app", name: "Maya Gurung", role: "moderator" as const },
    { email: "admin@hiddennepal.app", name: "Suresh Adhikari", role: "admin" as const },
  ];

  const userIds: Record<string, string> = {};
  for (const u of demoUsers) {
    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(
      (await import("drizzle-orm")).eq(usersTable.email, u.email)
    );
    if (existing.length > 0) {
      userIds[u.role] = existing[0].id;
      continue;
    }
    const [user] = await db.insert(usersTable).values({ email: u.email, passwordHash, emailVerifiedAt: new Date() }).returning();
    await db.insert(profilesTable).values({ userId: user.id, name: u.name, bio: u.bio });
    await db.insert(userRolesTable).values({ userId: user.id, role: "viewer" });
    if (u.role !== "viewer") {
      await db.insert(userRolesTable).values({ userId: user.id, role: u.role });
    }
    userIds[u.role] = user.id;
  }
  logger.info("Demo users seeded");

  // Places
  const adminId = userIds.admin;
  const contributorId = userIds.contributor;

  const places = [
    {
      slug: "rara-lake",
      title: "Rara Lake",
      shortDescription: "Nepal's largest lake, a turquoise jewel ringed by pine forest in remote Mugu.",
      description: "At 2,990 metres, Rara is the country's largest and deepest lake — a luminous oval of turquoise resting inside Rara National Park. The shore is lined with blue pine, spruce and rhododendron, and the only sounds are wind across the water and the call of the Himalayan monal.",
      history: "Rara has long been sacred to the Thakuri and Khas communities of Karnali. Folk songs describe the lake as a goddess who refused a king's hand and turned to water. The area was declared a national park in 1976.",
      categorySlug: "lakes", district: "Mugu", province: "Karnali" as const,
      lat: "29.523000", lng: "82.093900", hidden: true, featured: true, views: 12480,
      bestSeason: "Sep – Nov, Apr – May", difficulty: "Moderate" as const,
      costEstimate: "NPR 25,000 – 45,000", permits: "Rara National Park entry permit", durationDays: 5,
      nearbyHospital: "Mugu District Hospital, Gamgadhi (≈ 3 hrs)",
      emergency: "Tourist Police: 1144 · Ambulance: 102", localSupport: "Rara Community Homestay coordinators",
      status: "approved" as const, submittedBy: contributorId, approvedBy: adminId, approvedAt: new Date("2024-08-14"),
      coverImage: "/api/placeholder/rara-lake",
      images: [],
    },
    {
      slug: "upper-mustang",
      title: "Upper Mustang",
      shortDescription: "The forbidden kingdom — ochre cliffs, sky-caves and a thousand-year-old walled city.",
      description: "Beyond the rain shadow of the Annapurnas lies Lo, the old Tibetan kingdom now called Upper Mustang. Eroded canyons glow red and gold, mani walls run along ridgelines, and the walled capital of Lo Manthang still keeps its medieval rhythm.",
      history: "Founded in 1380 by Ame Pal, the kingdom of Lo was an independent Buddhist state for six centuries. Its mountaintop sky-caves — over 10,000 of them — hold murals, manuscripts and burials still being studied today.",
      categorySlug: "valleys", district: "Mustang", province: "Gandaki" as const,
      lat: "29.179700", lng: "83.959800", hidden: true, featured: true, views: 18920,
      bestSeason: "Mar – Nov", difficulty: "Challenging" as const,
      costEstimate: "NPR 80,000 – 150,000", permits: "Restricted Area Permit (USD 500/10 days) + ACAP", durationDays: 12,
      nearbyHospital: "Jomsom Hospital", emergency: "Tourist Police: 1144 · Heli rescue available",
      localSupport: "Licensed guides required by law",
      status: "approved" as const, submittedBy: contributorId, approvedBy: adminId, approvedAt: new Date("2024-09-03"),
      coverImage: "/api/placeholder/upper-mustang",
      images: [],
    },
    {
      slug: "tilicho-lake",
      title: "Tilicho Lake",
      shortDescription: "One of the world's highest lakes, a glassy mirror at 4,919 metres.",
      description: "Tucked beneath the north face of the Annapurna massif, Tilicho is a place that asks something of you. The trail traverses landslide slopes and a high camp before opening onto a basin of turquoise water reflecting peaks no road will ever reach.",
      history: "Hindu mythology identifies Tilicho with the Kak Bhusundi Lake of the Ramayana. Modern mountaineering recognised it after the 1950 French Annapurna expedition.",
      categorySlug: "lakes", district: "Manang", province: "Gandaki" as const,
      lat: "28.691700", lng: "83.862800", hidden: false, featured: true, views: 24310,
      bestSeason: "Mar – May, Sep – Nov", difficulty: "Challenging" as const,
      costEstimate: "NPR 35,000 – 60,000", permits: "ACAP + TIMS", durationDays: 4,
      nearbyHospital: "Manang Health Post", emergency: "HRA aid posts on Annapurna Circuit",
      localSupport: "Tea-house network along route",
      status: "approved" as const, submittedBy: contributorId, approvedBy: adminId, approvedAt: new Date("2024-07-24"),
      coverImage: "/api/placeholder/tilicho-lake",
      images: [],
    },
    {
      slug: "bandipur",
      title: "Bandipur",
      shortDescription: "A car-free Newari hilltop town with carved windows and a 360° Himalayan horizon.",
      description: "A short detour off the Kathmandu–Pokhara highway lifts you 1,030 metres into Bandipur — a perfectly preserved 18th-century trading town where the main bazaar is still closed to traffic.",
      history: "Bandipur grew rich as a stop on the India–Tibet trade route. When the Prithvi Highway bypassed it in the 1970s, the town fell asleep and woke up decades later as one of the best-preserved examples of Newari urban architecture.",
      categorySlug: "villages", district: "Tanahun", province: "Gandaki" as const,
      lat: "27.934200", lng: "84.414700", hidden: true, views: 8210,
      bestSeason: "Oct – Apr", difficulty: "Easy" as const,
      costEstimate: "NPR 8,000 – 18,000", permits: "None", durationDays: 2,
      nearbyHospital: "Damauli Hospital (45 min)", emergency: "Tourist Police: 1144",
      localSupport: "Bandipur Tourism Development Committee",
      status: "approved" as const, submittedBy: contributorId, approvedBy: adminId, approvedAt: new Date("2024-10-06"),
      coverImage: "/api/placeholder/bandipur",
      images: [],
    },
    {
      slug: "phoksundo-lake",
      title: "Phoksundo Lake",
      shortDescription: "An unreal alpine blue inside Shey Phoksundo, the country's largest national park.",
      description: "Phoksundo holds water so blue it looks invented. Surrounded by limestone cliffs and the Bon-po village of Ringmo, it sits in Dolpo — a region so isolated it kept its Tibetan-Buddhist culture intact.",
      history: "Local legend says a demoness fleeing Guru Rinpoche flooded a village to create the lake. Ringmo is among the last living centres of the pre-Buddhist Bon religion.",
      categorySlug: "lakes", district: "Dolpa", province: "Karnali" as const,
      lat: "29.190000", lng: "82.950000", hidden: true, featured: true, views: 9870,
      bestSeason: "May – Oct", difficulty: "Challenging" as const,
      costEstimate: "NPR 60,000 – 110,000", permits: "Lower Dolpo Permit + SPNP entry", durationDays: 10,
      nearbyHospital: "Dunai District Hospital", emergency: "Heli evacuation only beyond Dunai",
      localSupport: "Registered guides mandatory",
      status: "approved" as const, submittedBy: contributorId, approvedBy: adminId, approvedAt: new Date("2024-06-21"),
      coverImage: "/api/placeholder/phoksundo-lake",
      images: [],
    },
    {
      slug: "boudhanath-stupa",
      title: "Boudhanath Stupa",
      shortDescription: "A vast white dome and the spiritual heart of Tibetan Buddhism in Kathmandu.",
      description: "Boudha's mandala-shaped stupa is one of the largest in the world. At dusk thousands of butter lamps flicker around the dome as monks, locals and pilgrims walk the kora clockwise — a ritual that has continued for more than a millennium.",
      history: "Built around the 5th century and rebuilt after the 2015 earthquake, Boudha became central to Tibetan Buddhism after refugees settled the surrounding neighbourhood in 1959.",
      categorySlug: "spiritual", district: "Kathmandu", province: "Bagmati" as const,
      lat: "27.721480", lng: "85.362060", hidden: false, featured: true, views: 31540,
      bestSeason: "Year-round", difficulty: "Easy" as const,
      costEstimate: "NPR 5,000 – 12,000", permits: "Monument entry NPR 400", durationDays: 1,
      nearbyHospital: "CIWEC Clinic Kathmandu", emergency: "Tourist Police: 1144",
      localSupport: "Tibetan guest-house network",
      status: "approved" as const, submittedBy: contributorId, approvedBy: adminId, approvedAt: new Date("2024-05-10"),
      coverImage: "/api/placeholder/boudhanath-stupa",
      images: [],
    },
    {
      slug: "ghandruk",
      title: "Ghandruk",
      shortDescription: "A stone Gurung village draped in rhododendrons with front-row Annapurna views.",
      description: "Ghandruk sits at 1,940 metres, looking straight at the South Face of Annapurna. The village is entirely stone, the lodges are family-run, and the Gurung Museum gives the culture texture that most Annapurna trek descriptions skip over.",
      history: "Gurung communities have lived at Ghandruk for centuries. The village became a model for community-based tourism in the 1980s and has maintained its character while opening to visitors.",
      categorySlug: "villages", district: "Kaski", province: "Gandaki" as const,
      lat: "28.378200", lng: "83.806600", hidden: false, views: 14230,
      bestSeason: "Oct – May", difficulty: "Moderate" as const,
      costEstimate: "NPR 12,000 – 25,000", permits: "ACAP + TIMS", durationDays: 3,
      nearbyHospital: "Ghandruk Health Post", emergency: "Tourist Police Pokhara: 980-101-7707",
      localSupport: "Community-run lodges throughout",
      status: "approved" as const, submittedBy: contributorId, approvedBy: adminId, approvedAt: new Date("2024-09-30"),
      coverImage: "/api/placeholder/ghandruk",
      images: [],
    },
    {
      slug: "chitwan-national-park",
      title: "Chitwan National Park",
      shortDescription: "Subtropical jungle, one-horned rhinos, and Tharu villages on the Indian border.",
      description: "Nepal's first national park and a UNESCO World Heritage site, Chitwan protects 952 km² of sal forest, grassland and river. It's the best place in the world to see the greater one-horned rhinoceros.",
      history: "Once a royal hunting reserve, Chitwan was declared a national park in 1973 and helped pull the Asian one-horned rhino back from the brink of extinction.",
      categorySlug: "wildlife", district: "Chitwan", province: "Bagmati" as const,
      lat: "27.579000", lng: "84.500800", hidden: false, views: 22150,
      bestSeason: "Oct – Mar", difficulty: "Easy" as const,
      costEstimate: "NPR 18,000 – 40,000", permits: "Park entry NPR 2,000/day", durationDays: 3,
      nearbyHospital: "Bharatpur Hospital", emergency: "Park warden + Tourist Police",
      localSupport: "Licensed jungle guides only",
      status: "approved" as const, submittedBy: contributorId, approvedBy: adminId, approvedAt: new Date("2024-05-02"),
      coverImage: "/api/placeholder/chitwan-national-park",
      images: [],
    },
  ];

  for (const p of places) {
    await db.insert(placesTable).values(p).onConflictDoNothing();
  }

  // Update contributions count for contributor
  if (contributorId) {
    await db.update(profilesTable).set({ contributionsCount: 8 }).where(
      (await import("drizzle-orm")).eq(profilesTable.userId, contributorId)
    );
  }

  logger.info("Places seeded");
  logger.info("Seed complete!");
  logger.info("Demo accounts:");
  logger.info("  viewer@hiddennepal.app / nepal2024! (viewer)");
  logger.info("  contributor@hiddennepal.app / nepal2024! (contributor)");
  logger.info("  moderator@hiddennepal.app / nepal2024! (moderator)");
  logger.info("  admin@hiddennepal.app / nepal2024! (admin)");
}

seed().catch((e) => {
  logger.error(e, "Seed failed");
  process.exit(1);
});
