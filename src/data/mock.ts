import type { Category, Place, User, Submission } from "@/types";
import rara from "@/assets/place-rara.jpg";
import mustang from "@/assets/place-mustang.jpg";
import tilicho from "@/assets/place-tilicho.jpg";
import bandipur from "@/assets/place-bandipur.jpg";
import phoksundo from "@/assets/place-phoksundo.jpg";
import boudha from "@/assets/place-boudha.jpg";
import ghandruk from "@/assets/place-ghandruk.jpg";
import chitwan from "@/assets/place-chitwan.jpg";

export const categories: Category[] = [
  { id: "c1", slug: "lakes", name: "Lakes", description: "Glacial mirrors hidden in the high valleys." },
  { id: "c2", slug: "mountains", name: "Mountains", description: "Eight of the world's fourteen 8,000ers." },
  { id: "c3", slug: "villages", name: "Villages", description: "Living traditions in stone and timber." },
  { id: "c4", slug: "heritage", name: "Heritage", description: "Temples, stupas and royal courtyards." },
  { id: "c5", slug: "wildlife", name: "Wildlife", description: "Rhinos, tigers and red pandas in their wild homes." },
  { id: "c6", slug: "trekking", name: "Trekking", description: "Footpaths through the Himalaya." },
  { id: "c7", slug: "spiritual", name: "Spiritual", description: "Pilgrimage sites and meditation retreats." },
  { id: "c8", slug: "valleys", name: "Valleys", description: "Lush corridors carved by ancient rivers." },
];

export const places: Place[] = [
  {
    id: "p1",
    slug: "rara-lake",
    title: "Rara Lake",
    shortDescription: "Nepal's largest lake, a turquoise jewel ringed by pine forest in remote Mugu.",
    description:
      "At 2,990 metres, Rara is the country's largest and deepest lake — a luminous oval of turquoise resting inside Rara National Park. The shore is lined with blue pine, spruce and rhododendron, and the only sounds are wind across the water and the call of the Himalayan monal. A two-day walk from Jumla brings you to a place that feels older than memory.",
    history:
      "Rara has long been sacred to the Thakuri and Khas communities of Karnali. Folk songs describe the lake as a goddess who refused a king's hand and turned to water. The area was declared a national park in 1976 to protect both the ecosystem and the surrounding pastoral way of life.",
    category: "lakes",
    district: "Mugu",
    province: "Karnali",
    coordinates: [29.5333, 82.0833],
    coverImage: rara,
    images: [rara, tilicho, ghandruk],
    hidden: true,
    featured: true,
    views: 12480,
    travel: {
      bestSeason: "Sep – Nov, Apr – May",
      difficulty: "Moderate",
      costEstimate: "NPR 25,000 – 45,000",
      permits: "Rara National Park entry permit",
      durationDays: 5,
    },
    safety: {
      nearbyHospital: "Mugu District Hospital, Gamgadhi (≈ 3 hrs)",
      emergency: "Tourist Police: 1144 · Ambulance: 102",
      localSupport: "Rara Community Homestay coordinators",
    },
    status: "approved",
    createdAt: "2024-08-12",
  },
  {
    id: "p2",
    slug: "upper-mustang",
    title: "Upper Mustang",
    shortDescription: "The forbidden kingdom — ochre cliffs, sky-caves and a thousand-year-old walled city.",
    description:
      "Beyond the rain shadow of the Annapurnas lies Lo, the old Tibetan kingdom now called Upper Mustang. Eroded canyons glow red and gold, mani walls run along ridgelines, and the walled capital of Lo Manthang still keeps its medieval rhythm. Mustang opened to outsiders only in 1992 and remains one of the best preserved Tibetan-Buddhist cultures on Earth.",
    history:
      "Founded in 1380 by Ame Pal, the kingdom of Lo was an independent Buddhist state for six centuries. Its mountaintop sky-caves — over 10,000 of them — hold murals, manuscripts and burials still being studied today.",
    category: "valleys",
    district: "Mustang",
    province: "Gandaki",
    coordinates: [29.1833, 83.9667],
    coverImage: mustang,
    images: [mustang, phoksundo, ghandruk],
    hidden: true,
    featured: true,
    views: 18920,
    travel: {
      bestSeason: "Mar – Nov",
      difficulty: "Challenging",
      costEstimate: "NPR 80,000 – 150,000",
      permits: "Restricted Area Permit (USD 500 / 10 days) + ACAP",
      durationDays: 12,
    },
    safety: {
      nearbyHospital: "Jomsom Hospital",
      emergency: "Tourist Police: 1144 · Heli rescue available",
      localSupport: "Licensed guides required by law",
    },
    status: "approved",
    createdAt: "2024-09-01",
  },
  {
    id: "p3",
    slug: "tilicho-lake",
    title: "Tilicho Lake",
    shortDescription: "One of the world's highest lakes, a glassy mirror at 4,919 metres.",
    description:
      "Tucked beneath the north face of the Annapurna massif, Tilicho is a place that asks something of you. The trail traverses landslide slopes and a high camp before opening onto a basin of turquoise water reflecting peaks no road will ever reach.",
    history:
      "Hindu mythology identifies Tilicho with the Kak Bhusundi Lake of the Ramayana, where the sage retold the epic to a flock of crows. Modern mountaineering recognised it after the 1950 French Annapurna expedition.",
    category: "lakes",
    district: "Manang",
    province: "Gandaki",
    coordinates: [28.6833, 83.85],
    coverImage: tilicho,
    images: [tilicho, rara, mustang],
    hidden: false,
    featured: true,
    views: 24310,
    travel: {
      bestSeason: "Mar – May, Sep – Nov",
      difficulty: "Challenging",
      costEstimate: "NPR 35,000 – 60,000",
      permits: "ACAP + TIMS",
      durationDays: 4,
    },
    safety: {
      nearbyHospital: "Manang Health Post",
      emergency: "HRA aid posts on Annapurna Circuit",
      localSupport: "Tea-house network along route",
    },
    status: "approved",
    createdAt: "2024-07-22",
  },
  {
    id: "p4",
    slug: "bandipur",
    title: "Bandipur",
    shortDescription: "A car-free Newari hilltop town with carved windows and a 360° Himalayan horizon.",
    description:
      "A short detour off the Kathmandu–Pokhara highway lifts you 1,030 metres into Bandipur — a perfectly preserved 18th-century trading town where the main bazaar is still closed to traffic. At dawn the Annapurna, Manaslu and Langtang ranges line up across the sky.",
    history:
      "Bandipur grew rich as a stop on the India–Tibet trade route. When the Prithvi Highway bypassed it in the 1970s, the town fell asleep — and woke up decades later as one of the best-preserved examples of Newari urban architecture in Nepal.",
    category: "villages",
    district: "Tanahun",
    province: "Gandaki",
    coordinates: [27.9333, 84.4167],
    coverImage: bandipur,
    images: [bandipur, ghandruk, boudha],
    hidden: true,
    views: 8210,
    travel: {
      bestSeason: "Oct – Apr",
      difficulty: "Easy",
      costEstimate: "NPR 8,000 – 18,000",
      permits: "None",
      durationDays: 2,
    },
    safety: {
      nearbyHospital: "Damauli Hospital (45 min)",
      emergency: "Tourist Police: 1144",
      localSupport: "Bandipur Tourism Development Committee",
    },
    status: "approved",
    createdAt: "2024-10-04",
  },
  {
    id: "p5",
    slug: "phoksundo-lake",
    title: "Phoksundo Lake",
    shortDescription: "An unreal alpine blue inside Shey Phoksundo, the country's largest national park.",
    description:
      "Phoksundo holds water so blue it looks invented. Surrounded by limestone cliffs and the Bon-po village of Ringmo, it sits in Dolpo — a region so isolated it kept its Tibetan-Buddhist culture intact long after the rest of the Himalaya changed.",
    history:
      "Local legend says a demoness fleeing Guru Rinpoche flooded a village to create the lake. Ringmo is among the last living centres of the pre-Buddhist Bon religion.",
    category: "lakes",
    district: "Dolpa",
    province: "Karnali",
    coordinates: [29.1833, 82.95],
    coverImage: phoksundo,
    images: [phoksundo, rara, mustang],
    hidden: true,
    featured: true,
    views: 9870,
    travel: {
      bestSeason: "May – Oct",
      difficulty: "Challenging",
      costEstimate: "NPR 60,000 – 110,000",
      permits: "Lower Dolpo Permit + SPNP entry",
      durationDays: 10,
    },
    safety: {
      nearbyHospital: "Dunai District Hospital",
      emergency: "Heli evacuation only beyond Dunai",
      localSupport: "Registered guides mandatory",
    },
    status: "approved",
    createdAt: "2024-06-19",
  },
  {
    id: "p6",
    slug: "boudhanath-stupa",
    title: "Boudhanath Stupa",
    shortDescription: "A vast white dome and the spiritual heart of Tibetan Buddhism in Kathmandu.",
    description:
      "Boudha's mandala-shaped stupa is one of the largest in the world. At dusk thousands of butter lamps flicker around the dome as monks, locals and pilgrims walk the kora clockwise — a ritual that has continued, uninterrupted, for more than a millennium.",
    history:
      "Built around the 5th century and rebuilt after the 2015 earthquake, Boudha became central to Tibetan Buddhism after refugees settled the surrounding neighbourhood in 1959.",
    category: "spiritual",
    district: "Kathmandu",
    province: "Bagmati",
    coordinates: [27.7215, 85.3617],
    coverImage: boudha,
    images: [boudha, bandipur, mustang],
    hidden: false,
    views: 35420,
    travel: {
      bestSeason: "Year-round",
      difficulty: "Easy",
      costEstimate: "NPR 1,000 – 3,000",
      permits: "Entry fee NPR 400",
      durationDays: 1,
    },
    safety: {
      nearbyHospital: "CIWEC Hospital, Kathmandu",
      emergency: "Tourist Police: 1144",
      localSupport: "Tourist Service Centre",
    },
    status: "approved",
    createdAt: "2024-05-11",
  },
  {
    id: "p7",
    slug: "ghandruk",
    title: "Ghandruk",
    shortDescription: "A stone Gurung village facing Annapurna South across a valley of terraced fields.",
    description:
      "Ghandruk is the kind of village that postcards tried to invent. Slate-roofed Gurung houses step down a ridge, the Annapurna massif fills the northern sky, and a network of stone paths leads further into the Annapurna Sanctuary.",
    history:
      "A historic Gurung settlement and one of the major recruiting grounds for the British Gurkha regiments. The local museum tells the story.",
    category: "villages",
    district: "Kaski",
    province: "Gandaki",
    coordinates: [28.3833, 83.8],
    coverImage: ghandruk,
    images: [ghandruk, tilicho, bandipur],
    hidden: false,
    views: 14230,
    travel: {
      bestSeason: "Oct – May",
      difficulty: "Moderate",
      costEstimate: "NPR 12,000 – 25,000",
      permits: "ACAP + TIMS",
      durationDays: 3,
    },
    safety: {
      nearbyHospital: "Ghandruk Health Post",
      emergency: "Tourist Police Pokhara: 980-101-7707",
      localSupport: "Community-run lodges throughout",
    },
    status: "approved",
    createdAt: "2024-09-28",
  },
  {
    id: "p8",
    slug: "chitwan-national-park",
    title: "Chitwan National Park",
    shortDescription: "Subtropical jungle, one-horned rhinos, and Tharu villages on the Indian border.",
    description:
      "Nepal's first national park and a UNESCO World Heritage site, Chitwan protects 952 km² of sal forest, grassland and river. It's the best place in the world to see the greater one-horned rhinoceros, with a healthy population of Bengal tiger, gharial and over 500 bird species.",
    history:
      "Once a royal hunting reserve, Chitwan was declared a national park in 1973 and helped pull the Asian one-horned rhino back from the brink of extinction.",
    category: "wildlife",
    district: "Chitwan",
    province: "Bagmati",
    coordinates: [27.5291, 84.354],
    coverImage: chitwan,
    images: [chitwan, ghandruk, boudha],
    hidden: false,
    views: 22150,
    travel: {
      bestSeason: "Oct – Mar",
      difficulty: "Easy",
      costEstimate: "NPR 18,000 – 40,000",
      permits: "Park entry NPR 2,000/day",
      durationDays: 3,
    },
    safety: {
      nearbyHospital: "Bharatpur Hospital",
      emergency: "Park warden + Tourist Police",
      localSupport: "Licensed jungle guides only",
    },
    status: "approved",
    createdAt: "2024-04-30",
  },
];

export const users: User[] = [
  {
    id: "u1",
    name: "Aanya Shrestha",
    email: "aanya@hiddennepal.app",
    bio: "Trekker and photographer from Pokhara.",
    role: "contributor",
    joinedAt: "2024-03-12",
    contributions: 6,
  },
  {
    id: "u2",
    name: "Bibek Tamang",
    email: "bibek@hiddennepal.app",
    bio: "Guide based in Kathmandu, focused on hidden trails.",
    role: "contributor",
    joinedAt: "2024-01-20",
    contributions: 12,
  },
  {
    id: "u3",
    name: "Maya Gurung",
    email: "maya@hiddennepal.app",
    role: "moderator",
    joinedAt: "2023-11-02",
    contributions: 0,
  },
  {
    id: "u4",
    name: "Suresh Adhikari",
    email: "admin@hiddennepal.app",
    role: "admin",
    joinedAt: "2023-08-15",
    contributions: 0,
  },
];

export const submissions: Submission[] = [
  { id: "s1", placeId: "p4", userId: "u1", status: "approved", submittedAt: "2024-10-04", reviewedAt: "2024-10-06" },
  { id: "s2", placeId: "p5", userId: "u2", status: "approved", submittedAt: "2024-06-19", reviewedAt: "2024-06-22" },
  { id: "s3", placeId: "p1", userId: "u2", status: "pending", submittedAt: "2025-01-14" },
  { id: "s4", placeId: "p7", userId: "u1", status: "pending", submittedAt: "2025-01-18" },
];

export const districts = Array.from(new Set(places.map((p) => p.district))).sort();
export const provinces: Place["province"][] = [
  "Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim",
];
