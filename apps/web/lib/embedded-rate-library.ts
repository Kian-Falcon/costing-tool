import type { RateItem } from "@kf/shared";

export type EmbeddedVendorLink = {
  name: string;
  materialName: string;
  rateKey: string;
};

export const EMBEDDED_RATE_LIBRARY_META = {
  "sourceFile": "rm_rates.xlsx",
  "rowsRead": 927,
  "rowsImported": 108,
  "rowsSkipped": 744,
  "generatedAt": "2026-07-04T06:11:33.810Z"
} as const;

export const EMBEDDED_RM_RATES: RateItem[] = [
  {
    "key": "edge_band",
    "label": "Edge banding",
    "unit": "MTR",
    "category": "Consumable",
    "source": "rm_rates.xlsx",
    "rate": 21.05
  },
  {
    "key": "hardware",
    "label": "Hardware set",
    "unit": "SET",
    "category": "Hardware",
    "source": "rm_rates.xlsx",
    "rate": 255
  },
  {
    "key": "ply_commercial",
    "label": "Commercial plywood",
    "unit": "SFT",
    "category": "Board",
    "source": "rm_rates.xlsx",
    "rate": 57.75
  },
  {
    "key": "aluminium",
    "label": "Aluminium",
    "unit": "KG",
    "category": "Metal",
    "source": "rm_rates.xlsx",
    "rate": 195
  },
  {
    "key": "metal_ms",
    "label": "Mild steel",
    "unit": "KG",
    "category": "Metal",
    "source": "rm_rates.xlsx",
    "rate": 76
  },
  {
    "key": "stone",
    "label": "Stone or marble top",
    "unit": "SFT",
    "category": "Stone",
    "source": "rm_rates.xlsx",
    "rate": 376.09
  },
  {
    "key": "laminate",
    "label": "Laminate",
    "unit": "SFT",
    "category": "Finish",
    "source": "rm_rates.xlsx",
    "rate": 45
  },
  {
    "key": "mdf",
    "label": "MDF board",
    "unit": "SFT",
    "category": "Board",
    "source": "rm_rates.xlsx",
    "rate": 31.26
  },
  {
    "key": "fabric_mid",
    "label": "Upholstery fabric",
    "unit": "MTR",
    "category": "Upholstery",
    "source": "rm_rates.xlsx",
    "rate": 513.33
  },
  {
    "key": "compact",
    "label": "Compact board",
    "unit": "SFT",
    "category": "Board",
    "source": "rm_rates.xlsx",
    "rate": 509.375
  },
  {
    "key": "wood_ashwood",
    "label": "Ashwood",
    "rate": 1900,
    "unit": "CFT",
    "category": "Wood",
    "source": "seed:fallback"
  },
  {
    "key": "wood_teak",
    "label": "CP Teakwood",
    "rate": 5200,
    "unit": "CFT",
    "category": "Wood",
    "source": "seed:fallback"
  },
  {
    "key": "wood_marandi",
    "label": "Marandi Wood",
    "rate": 1250,
    "unit": "CFT",
    "category": "Wood",
    "source": "seed:fallback"
  },
  {
    "key": "wood_beech",
    "label": "Beechwood",
    "rate": 1500,
    "unit": "CFT",
    "category": "Wood",
    "source": "seed:fallback"
  },
  {
    "key": "wood_rattan",
    "label": "Rattan",
    "rate": 300,
    "unit": "SFT",
    "category": "Wood",
    "source": "seed:fallback"
  },
  {
    "key": "ply_18_mr",
    "label": "Ply 18mm Commercial",
    "rate": 82,
    "unit": "SFT",
    "category": "Plywood",
    "source": "seed:fallback"
  },
  {
    "key": "ply_18_bwp",
    "label": "Ply 18mm BWP",
    "rate": 94,
    "unit": "SFT",
    "category": "Plywood",
    "source": "seed:fallback"
  },
  {
    "key": "ply_12_com",
    "label": "Ply 12mm Commercial",
    "rate": 42,
    "unit": "SFT",
    "category": "Plywood",
    "source": "seed:fallback"
  },
  {
    "key": "ply_6_flexi",
    "label": "Flexi Ply 6+6+6mm",
    "rate": 32,
    "unit": "SFT",
    "category": "Plywood",
    "source": "seed:fallback"
  },
  {
    "key": "mdf_25",
    "label": "MDF 25mm",
    "rate": 65.5,
    "unit": "SFT",
    "category": "MDF",
    "source": "seed:fallback"
  },
  {
    "key": "mdf_18",
    "label": "MDF 18mm",
    "rate": 59.61,
    "unit": "SFT",
    "category": "MDF",
    "source": "seed:fallback"
  },
  {
    "key": "mdf_12",
    "label": "MDF 12mm",
    "rate": 27.81,
    "unit": "SFT",
    "category": "MDF",
    "source": "seed:fallback"
  },
  {
    "key": "balancing",
    "label": "Balancing sheet",
    "rate": 10.78,
    "unit": "SFT",
    "category": "Laminate",
    "source": "seed:fallback"
  },
  {
    "key": "edgeband",
    "label": "Edgebanding std",
    "rate": 45.38,
    "unit": "MTR",
    "category": "Edgeband",
    "source": "seed:fallback"
  },
  {
    "key": "edgeband_rehau",
    "label": "Rehau 30x2mm",
    "rate": 32.89,
    "unit": "MTR",
    "category": "Edgeband",
    "source": "seed:fallback"
  },
  {
    "key": "ms_pipe_gen",
    "label": "MS Pipe (general)",
    "rate": 77,
    "unit": "KG",
    "category": "Metal MS",
    "source": "seed:fallback"
  },
  {
    "key": "ms_pipe_63",
    "label": "MS Pipe 63x1.6mm",
    "rate": 76,
    "unit": "KG",
    "category": "Metal MS",
    "source": "seed:fallback"
  },
  {
    "key": "ms_pipe_25sq",
    "label": "MS Pipe 25x25mm",
    "rate": 77.25,
    "unit": "KG",
    "category": "Metal MS",
    "source": "seed:fallback"
  },
  {
    "key": "ms_pipe_40sq",
    "label": "MS Pipe 40x40mm",
    "rate": 77.67,
    "unit": "KG",
    "category": "Metal MS",
    "source": "seed:fallback"
  },
  {
    "key": "ms_rod_12",
    "label": "MS Rod 12mm",
    "rate": 70,
    "unit": "KG",
    "category": "Metal MS",
    "source": "seed:fallback"
  },
  {
    "key": "ms_sq_30",
    "label": "MS CR Sq 30x30mm",
    "rate": 78.5,
    "unit": "KG",
    "category": "Metal MS",
    "source": "seed:fallback"
  },
  {
    "key": "al_pipe",
    "label": "Aluminium Pipe",
    "rate": 449.9,
    "unit": "KG",
    "category": "Aluminium",
    "source": "seed:fallback"
  },
  {
    "key": "foam_75",
    "label": "Foam 75mm HR",
    "rate": 66.1,
    "unit": "SFT",
    "category": "Foam",
    "source": "seed:fallback"
  },
  {
    "key": "foam_50",
    "label": "Foam 50mm",
    "rate": 53.5,
    "unit": "SFT",
    "category": "Foam",
    "source": "seed:fallback"
  },
  {
    "key": "foam_40",
    "label": "Foam 40mm",
    "rate": 43.8,
    "unit": "SFT",
    "category": "Foam",
    "source": "seed:fallback"
  },
  {
    "key": "foam_25",
    "label": "Foam 25mm",
    "rate": 27,
    "unit": "SFT",
    "category": "Foam",
    "source": "seed:fallback"
  },
  {
    "key": "foam_12",
    "label": "Foam 12mm",
    "rate": 17.5,
    "unit": "SFT",
    "category": "Foam",
    "source": "seed:fallback"
  },
  {
    "key": "leatherite",
    "label": "Leatherite / PU leath",
    "rate": 500,
    "unit": "MTR",
    "category": "Upholstery",
    "source": "seed:fallback"
  },
  {
    "key": "leather_real",
    "label": "Real Leather",
    "rate": 1200,
    "unit": "SFT",
    "category": "Upholstery",
    "source": "seed:fallback"
  },
  {
    "key": "non_woven",
    "label": "Non-woven lining",
    "rate": 33,
    "unit": "MTR",
    "category": "Upholstery",
    "source": "seed:fallback"
  },
  {
    "key": "elastic_50",
    "label": "Elastic 50mm",
    "rate": 25,
    "unit": "MTR",
    "category": "Upholstery",
    "source": "seed:fallback"
  },
  {
    "key": "polyfil",
    "label": "Polyfill",
    "rate": 180,
    "unit": "KG",
    "category": "Upholstery",
    "source": "seed:fallback"
  },
  {
    "key": "bostic",
    "label": "Bostic adhesive",
    "rate": 195,
    "unit": "KG",
    "category": "Upholstery",
    "source": "seed:fallback"
  },
  {
    "key": "pu_polish",
    "label": "PU Polish",
    "rate": 50,
    "unit": "SFT",
    "category": "Finish",
    "source": "seed:fallback"
  },
  {
    "key": "nat_polish",
    "label": "Natural Polish",
    "rate": 50,
    "unit": "SFT",
    "category": "Finish",
    "source": "seed:fallback"
  },
  {
    "key": "mel_polish",
    "label": "Melamine Polish",
    "rate": 75,
    "unit": "SFT",
    "category": "Finish",
    "source": "seed:fallback"
  },
  {
    "key": "pu_paint",
    "label": "PU Paint RAL match",
    "rate": 892,
    "unit": "KG",
    "category": "Finish",
    "source": "seed:fallback"
  },
  {
    "key": "powder_coat",
    "label": "Powder Coat",
    "rate": 250,
    "unit": "KG",
    "category": "Finish",
    "source": "seed:fallback"
  },
  {
    "key": "fevicol_sft",
    "label": "Fevicol D3 (per SFT)",
    "rate": 6.78,
    "unit": "SFT",
    "category": "Adhesive",
    "source": "seed:fallback"
  },
  {
    "key": "fevicol_kg",
    "label": "Fevicol D3 (kg)",
    "rate": 155,
    "unit": "KG",
    "category": "Adhesive",
    "source": "seed:fallback"
  },
  {
    "key": "probond",
    "label": "Fevicol Probond",
    "rate": 315,
    "unit": "KG",
    "category": "Adhesive",
    "source": "seed:fallback"
  },
  {
    "key": "bond_tite",
    "label": "Bond Tite (structural)",
    "rate": 1150,
    "unit": "SET",
    "category": "Adhesive",
    "source": "seed:fallback"
  },
  {
    "key": "ss_adhesive",
    "label": "Solid Surface Adhesive",
    "rate": 565,
    "unit": "NOS",
    "category": "Adhesive",
    "source": "seed:fallback"
  },
  {
    "key": "hinge_soft",
    "label": "Hettich Hinge SC",
    "rate": 220,
    "unit": "SET",
    "category": "Hardware",
    "source": "seed:fallback"
  },
  {
    "key": "tele_chan",
    "label": "Telescopic Channel",
    "rate": 770,
    "unit": "SET",
    "category": "Hardware",
    "source": "seed:fallback"
  },
  {
    "key": "handle_rec",
    "label": "Recessed Handle",
    "rate": 350,
    "unit": "PCS",
    "category": "Hardware",
    "source": "seed:fallback"
  },
  {
    "key": "caster_50",
    "label": "Caster Wheel 50mm",
    "rate": 350,
    "unit": "SET",
    "category": "Hardware",
    "source": "seed:fallback"
  },
  {
    "key": "screws",
    "label": "Chipboard Screws",
    "rate": 280,
    "unit": "PKT",
    "category": "Hardware",
    "source": "seed:fallback"
  },
  {
    "key": "ss_surface",
    "label": "Solid Surface (SFT)",
    "rate": 642,
    "unit": "SFT",
    "category": "Solid Surface",
    "source": "seed:fallback"
  },
  {
    "key": "compact_board",
    "label": "Compact Board 12mm",
    "rate": 509.38,
    "unit": "SFT",
    "category": "Board",
    "source": "seed:fallback"
  },
  {
    "key": "out_bar_stool",
    "label": "Bar Stool Outsourced",
    "rate": 3900,
    "unit": "NOS",
    "category": "Outsourced",
    "source": "seed:fallback"
  },
  {
    "key": "lustrell",
    "label": "Lustrell premium fabric",
    "rate": 2099,
    "unit": "MTR",
    "category": "Upholstery",
    "source": "seed:fallback"
  },
  {
    "key": "ply_8_com",
    "label": "Ply 8mm Commercial",
    "rate": 44,
    "unit": "SFT",
    "category": "Plywood",
    "source": "seed:fallback"
  },
  {
    "key": "ply_12_bwp",
    "label": "Ply 12mm BWP",
    "rate": 65,
    "unit": "SFT",
    "category": "Plywood",
    "source": "seed:fallback"
  },
  {
    "key": "ply_16_com",
    "label": "Ply 16mm Commercial",
    "rate": 55,
    "unit": "SFT",
    "category": "Plywood",
    "source": "seed:fallback"
  },
  {
    "key": "ply_8_bwp",
    "label": "Ply 8mm BWP",
    "rate": 42,
    "unit": "SFT",
    "category": "Plywood",
    "source": "seed:fallback"
  },
  {
    "key": "hdhmr_18",
    "label": "HDHMR 18mm",
    "rate": 77.5,
    "unit": "SFT",
    "category": "Plywood",
    "source": "seed:fallback"
  },
  {
    "key": "mdf_3",
    "label": "MDF 3.3mm",
    "rate": 9.01,
    "unit": "SFT",
    "category": "MDF",
    "source": "seed:fallback"
  },
  {
    "key": "mdf_5",
    "label": "MDF 5.5mm",
    "rate": 14.56,
    "unit": "SFT",
    "category": "MDF",
    "source": "seed:fallback"
  },
  {
    "key": "mdf_7",
    "label": "MDF 7.5mm",
    "rate": 18.56,
    "unit": "SFT",
    "category": "MDF",
    "source": "seed:fallback"
  },
  {
    "key": "mdf_8_prelam",
    "label": "MDF 8mm Prelam",
    "rate": 34.71,
    "unit": "SFT",
    "category": "MDF",
    "source": "seed:fallback"
  },
  {
    "key": "edgeband_thin",
    "label": "Edgeband 30x0.8mm",
    "rate": 16.8,
    "unit": "MTR",
    "category": "Edgeband",
    "source": "seed:fallback"
  },
  {
    "key": "ss_304_pipe",
    "label": "SS 304 Pipe/Rod",
    "rate": 255,
    "unit": "KG",
    "category": "Metal SS",
    "source": "seed:fallback"
  },
  {
    "key": "facade_ral",
    "label": "Facade RAL paint",
    "rate": 650,
    "unit": "KG",
    "category": "Finish",
    "source": "seed:fallback"
  },
  {
    "key": "compact_8",
    "label": "Compact Board 8mm",
    "rate": 35,
    "unit": "SFT",
    "category": "Board",
    "source": "seed:fallback"
  },
  {
    "key": "veneer",
    "label": "Wood Veneer",
    "rate": 118,
    "unit": "SFT",
    "category": "Wood",
    "source": "seed:fallback"
  },
  {
    "key": "hdhmr_6",
    "label": "HDHMR 6mm",
    "rate": 25.38,
    "unit": "SFT",
    "category": "Plywood",
    "source": "seed:fallback"
  },
  {
    "key": "hdhmr_8",
    "label": "HDHMR 8mm",
    "rate": 32.06,
    "unit": "SFT",
    "category": "Plywood",
    "source": "seed:fallback"
  },
  {
    "key": "hdhmr_12",
    "label": "HDHMR 12mm",
    "rate": 41.5,
    "unit": "SFT",
    "category": "Plywood",
    "source": "seed:fallback"
  },
  {
    "key": "hdhmr_25",
    "label": "HDHMR 25mm",
    "rate": 98.72,
    "unit": "SFT",
    "category": "Plywood",
    "source": "seed:fallback"
  },
  {
    "key": "mdf_16",
    "label": "MDF 16-17mm",
    "rate": 40.25,
    "unit": "SFT",
    "category": "MDF",
    "source": "seed:fallback"
  },
  {
    "key": "laminate_06",
    "label": "Laminate 0.6mm thin",
    "rate": 31.41,
    "unit": "SFT",
    "category": "Laminate",
    "source": "seed:fallback"
  },
  {
    "key": "laminate_07",
    "label": "Laminate 0.7mm thin",
    "rate": 10.62,
    "unit": "SFT",
    "category": "Laminate",
    "source": "seed:fallback"
  },
  {
    "key": "drawer_sys",
    "label": "Drawer system (Innotech)",
    "rate": 3146.37,
    "unit": "SET",
    "category": "Hardware",
    "source": "seed:fallback"
  },
  {
    "key": "lock_mul",
    "label": "Multipurpose lock",
    "rate": 77,
    "unit": "PCS",
    "category": "Hardware",
    "source": "seed:fallback"
  },
  {
    "key": "minifix",
    "label": "Minifix stud",
    "rate": 6.75,
    "unit": "SET",
    "category": "Hardware",
    "source": "seed:fallback"
  },
  {
    "key": "connector",
    "label": "Gola connector set",
    "rate": 55,
    "unit": "SET",
    "category": "Hardware",
    "source": "seed:fallback"
  },
  {
    "key": "gas_spring",
    "label": "Gas spring 75KG",
    "rate": 850,
    "unit": "SET",
    "category": "Hardware",
    "source": "seed:fallback"
  },
  {
    "key": "handle_profile",
    "label": "Aluminium handle profile",
    "rate": 745,
    "unit": "NOS",
    "category": "Hardware",
    "source": "seed:fallback"
  },
  {
    "key": "fastack",
    "label": "Fastack adhesive",
    "rate": 150,
    "unit": "KG",
    "category": "Adhesive",
    "source": "seed:fallback"
  },
  {
    "key": "wood_filler",
    "label": "Wood filler white",
    "rate": 160,
    "unit": "KG",
    "category": "Finish",
    "source": "seed:fallback"
  },
  {
    "key": "pu_paint_kgs",
    "label": "PU Paint RAL KGS",
    "rate": 892,
    "unit": "KG",
    "category": "Finish",
    "source": "seed:fallback"
  },
  {
    "key": "primer",
    "label": "White Primer/Sealer",
    "rate": 380,
    "unit": "KG",
    "category": "Finish",
    "source": "seed:fallback"
  },
  {
    "key": "hardener",
    "label": "PU Hardener",
    "rate": 399,
    "unit": "KG",
    "category": "Finish",
    "source": "seed:fallback"
  },
  {
    "key": "curtain_fab",
    "label": "Curtain fabric",
    "rate": 385,
    "unit": "MTR",
    "category": "Upholstery",
    "source": "seed:fallback"
  },
  {
    "key": "non_woven_pad",
    "label": "Non-woven pad",
    "rate": 33,
    "unit": "NOS",
    "category": "Upholstery",
    "source": "seed:fallback"
  },
  {
    "key": "ms_wire",
    "label": "MS filler wire 1.6mm",
    "rate": 168,
    "unit": "KG",
    "category": "Metal MS",
    "source": "seed:fallback"
  },
  {
    "key": "ms_erw",
    "label": "ERW Steel tubes",
    "rate": 78.5,
    "unit": "KG",
    "category": "Metal MS",
    "source": "seed:fallback"
  },
  {
    "key": "bentwood_seat",
    "label": "Bentwood chair seat",
    "rate": 105,
    "unit": "NOS",
    "category": "Outsourced",
    "source": "seed:fallback"
  },
  {
    "key": "dacron",
    "label": "Dacron wrap",
    "rate": 18,
    "unit": "SFT",
    "category": "Upholstery",
    "source": "seed:fallback"
  },
  {
    "key": "springs_set",
    "label": "Zigzag springs (sofa)",
    "rate": 1800,
    "unit": "SET",
    "category": "Hardware",
    "source": "seed:fallback"
  },
  {
    "key": "piping_cord",
    "label": "Piping cord",
    "rate": 25,
    "unit": "MTR",
    "category": "Upholstery",
    "source": "seed:fallback"
  },
  {
    "key": "upholstery_thread",
    "label": "Thread+staples",
    "rate": 400,
    "unit": "SET",
    "category": "Upholstery",
    "source": "seed:fallback"
  },
  {
    "key": "wood_oak",
    "label": "Oak Wood frame/legs (CFT)",
    "rate": 1900,
    "unit": "CFT",
    "category": "Wood",
    "source": "seed:fallback"
  },
  {
    "key": "wood_slab_sft",
    "label": "Solid wood panel/slab (per SFT)",
    "rate": 1100,
    "unit": "SFT",
    "category": "Wood",
    "source": "seed:fallback"
  },
  {
    "key": "polish",
    "label": "Polish",
    "rate": 50,
    "unit": "SFT",
    "category": "Finish",
    "source": "seed:fallback"
  },
  {
    "key": "foam",
    "label": "Foam",
    "rate": 43.8,
    "unit": "SFT",
    "category": "Foam",
    "source": "seed:fallback"
  },
  {
    "key": "wood_ash",
    "label": "Ash wood",
    "rate": 1900,
    "unit": "CFT",
    "category": "Wood",
    "source": "seed:fallback"
  }
];

export const EMBEDDED_VENDOR_LINKS: EmbeddedVendorLink[] = [
  {
    "name": "SHYAM PAINTS AND HARDWARE",
    "materialName": "Edge Banding 30X2 MM CODE-75729 BRIGHT WHITE REHAU",
    "rateKey": "edge_band"
  },
  {
    "name": "CASH/ALLEN KEY BOLT",
    "materialName": "ALLEN KEY BOLT (10X25)",
    "rateKey": "hardware"
  },
  {
    "name": "R S TIMBER TRADERS",
    "materialName": "PLY 12MM THK Plain 8'X4' BWP",
    "rateKey": "ply_commercial"
  },
  {
    "name": "R S TIMBER TRADERS",
    "materialName": "PLY 18MM THK Plain 8'X4' BWP GRADE",
    "rateKey": "ply_commercial"
  },
  {
    "name": "R S TIMBER TRADERS",
    "materialName": "PLY 18MM THK Plain 8'X4' MR GRADE",
    "rateKey": "ply_commercial"
  },
  {
    "name": "R S TIMBER TRADERS",
    "materialName": "PLY 12MM THK MARINE 8'X4' LOCAL",
    "rateKey": "ply_commercial"
  },
  {
    "name": "HS DISTRIBUTERS",
    "materialName": "M/P LOCKS DOOR SET",
    "rateKey": "hardware"
  },
  {
    "name": "DHARMA GLASS AND ALUMINIUM WORKS",
    "materialName": "ALUMINIUM FIX PARTITION",
    "rateKey": "aluminium"
  },
  {
    "name": "DHARMA GLASS AND ALUMINIUM WORKS",
    "materialName": "ALUMINIUM DOOR",
    "rateKey": "aluminium"
  },
  {
    "name": "A3 PANELS AND EDGEBANDS",
    "materialName": "Edge Banding 45X2 MM DN-216 BAVARIAN BEECH DECOAGE",
    "rateKey": "edge_band"
  },
  {
    "name": "DHARMA GLASS AND ALUMINIUM WORKS",
    "materialName": "HINGE CUTOUT",
    "rateKey": "hardware"
  },
  {
    "name": "SOHAM ENTERPRISES",
    "materialName": "SCREW CHIP BOARD 4X20MM",
    "rateKey": "hardware"
  },
  {
    "name": "SOHAM ENTERPRISES",
    "materialName": "SCREW CHIP BOARD 4X30MM",
    "rateKey": "hardware"
  },
  {
    "name": "SOHAM ENTERPRISES",
    "materialName": "SCREW CHIP BOARD 4X40MM",
    "rateKey": "hardware"
  },
  {
    "name": "SOHAM ENTERPRISES",
    "materialName": "SCREW CHIP BOARD 5X50MM",
    "rateKey": "hardware"
  },
  {
    "name": "SOHAM ENTERPRISES",
    "materialName": "SCREW CHIP BOARD 4X50MM",
    "rateKey": "hardware"
  },
  {
    "name": "USP TRADING & MANUFACTURING",
    "materialName": "Edge Banding 30X2 MM CODE-75729 BRIGHT WHITE REHAU",
    "rateKey": "edge_band"
  },
  {
    "name": "USP TRADING & MANUFACTURING",
    "materialName": "Edge Banding 30X0.8MM CODE-75729 BRIGHT WHITE REHAU",
    "rateKey": "edge_band"
  },
  {
    "name": "USP TRADING & MANUFACTURING",
    "materialName": "Edge Banding 30X2 MM 020P Intal Beech REHAU",
    "rateKey": "edge_band"
  },
  {
    "name": "USP TRADING & MANUFACTURING",
    "materialName": "Edge Banding 30X0.8 MM 020P Intal Beech REHAU",
    "rateKey": "edge_band"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "PLY 12MM THK Plain 8'X4' LOCAL",
    "rateKey": "ply_commercial"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "PLY 18MM THK Plain 8'X4' LOCAL",
    "rateKey": "ply_commercial"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "PLY 16MM THK Plain 8'X4' LOCAL",
    "rateKey": "ply_commercial"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "PLY 18MM THK Plain 8'X4' LOCAL",
    "rateKey": "ply_commercial"
  },
  {
    "name": "GEE ESS INTERNATIONAL",
    "materialName": "MS FLAT",
    "rateKey": "metal_ms"
  },
  {
    "name": "SHIV SHAKTI STEEL TUBES",
    "materialName": "Pipe MS CR Square 30X30X1.6 MM 6000 MM",
    "rateKey": "metal_ms"
  },
  {
    "name": "COUNTER CRAFT",
    "materialName": "SOLID SURFACE 12MM LG 12'X2.5' -HI MACS G 004 WHITE QUARTZ",
    "rateKey": "stone"
  },
  {
    "name": "COUNTER CRAFT",
    "materialName": "ADHESIVE -HI MACS G 004 WHITE QUARTZ",
    "rateKey": "stone"
  },
  {
    "name": "SHIV SHAKTI STEEL TUBES",
    "materialName": "ERW STEEL TUBES",
    "rateKey": "metal_ms"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "PLY 12MM THK Plain 8'X4' LOCAL",
    "rateKey": "ply_commercial"
  },
  {
    "name": "SHIV SHAKTI STEEL TUBES",
    "materialName": "Pipe MS CR Square 20X20X1.6 MM 6000 MM",
    "rateKey": "metal_ms"
  },
  {
    "name": "SHIV SHAKTI STEEL TUBES",
    "materialName": "Pipe MS CR Square 30X30X1.6 MM 6000 MM",
    "rateKey": "metal_ms"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "PLY 18MM THK Plain 8'X4' MR GRADE",
    "rateKey": "ply_commercial"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "PLY 12MM THK Plain 8'X4' GREENPLY",
    "rateKey": "ply_commercial"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "LAMINATE 6972 SF",
    "rateKey": "laminate"
  },
  {
    "name": "HS DISTRIBUTORS",
    "materialName": "HINGE 16 CRANK",
    "rateKey": "hardware"
  },
  {
    "name": "JAGDAMBA ENTERPRISES",
    "materialName": "Pipe MS CR Rectangle 40X20X1.6 MM 6000 MM",
    "rateKey": "metal_ms"
  },
  {
    "name": "JAGDAMBA ENTERPRISES",
    "materialName": "Pipe MS CR Rectangle 50x25x1.6 MM 6000 MM",
    "rateKey": "metal_ms"
  },
  {
    "name": "JAGDAMBA ENTERPRISES",
    "materialName": "Pipe MS CR Round Dia 12X1.6MM 6000 MM",
    "rateKey": "metal_ms"
  },
  {
    "name": "JAGDAMBA ENTERPRISES",
    "materialName": "Pipe MS CR Round Dia 15.88 X 1.6MM 6000 MM",
    "rateKey": "metal_ms"
  },
  {
    "name": "JAGDAMBA ENTERPRISES",
    "materialName": "Pipe MS CR Round Dia 19 X 1.6MM 6000 MM",
    "rateKey": "metal_ms"
  },
  {
    "name": "JAGDAMBA ENTERPRISES",
    "materialName": "Pipe MS CR Square 20X20X1.6 MM 6000 MM",
    "rateKey": "metal_ms"
  },
  {
    "name": "JAGDAMBA ENTERPRISES",
    "materialName": "Pipe MS CR Square 30X30X1.6 MM 6000 MM",
    "rateKey": "metal_ms"
  },
  {
    "name": "JAGDAMBA ENTERPRISES",
    "materialName": "Pipe MS CR Round Dia 19x 2.0 MM 6000 MM",
    "rateKey": "metal_ms"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "PLY 18MM THK PLAIN 8'X4' MR SAINIK greenlam",
    "rateKey": "ply_commercial"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "PLY 18MM THK Plain 8'X4' MR ARCHID",
    "rateKey": "ply_commercial"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "PLY 12MM THK Plain 8'X4' ARCHIED MR GRADE",
    "rateKey": "ply_commercial"
  },
  {
    "name": "HI TECH MODULER KITCHEN",
    "materialName": "Telescopic channel 500 MM SOFT CLOSE",
    "rateKey": "hardware"
  },
  {
    "name": "HI TECH MODULER KITCHEN",
    "materialName": "HETTIC Telescopic channel 400 MM SOFT CLOSE",
    "rateKey": "hardware"
  },
  {
    "name": "HI TECH MODULER KITCHEN",
    "materialName": "HETTIC TELESCOPIC CHANNEL 550MM (SOFT CLOSE)",
    "rateKey": "hardware"
  },
  {
    "name": "KAYASTHA ENTERPRISES",
    "materialName": "LAMINATE-1MM THK MERNIOLAM-22091 FT MERINO",
    "rateKey": "laminate"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "MDF 16.5 MM 8'X4' PLAIN GREENPLY",
    "rateKey": "ply_commercial"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "MDF 12MM 8'X4' PLAIN GREENPANEL",
    "rateKey": "mdf"
  },
  {
    "name": "COHORT TOOLS AND ADESIVE",
    "materialName": "PU PAINT RAL MATCHING WITH LAMINATE 132 SF Cyclone",
    "rateKey": "laminate"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "MDF 25MM 8'X4' PLAIN GREENPANEL",
    "rateKey": "mdf"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "MDF 5.5MM 8'X4' PLAIN GREENPANEL",
    "rateKey": "mdf"
  },
  {
    "name": "123 ply",
    "materialName": "EDGE BENDING 30 X 0.8 MM CODE-WHITE LILY 1101 MAKE E3",
    "rateKey": "edge_band"
  },
  {
    "name": "123 ply",
    "materialName": "EDGE BENDING 30 X 2 MM CODE- 1054 MAKE- E3",
    "rateKey": "edge_band"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "MDF 3.3MM 8'X4' PLAIN GREENPANEL",
    "rateKey": "mdf"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "MDF 17MM 8'X4' PLAIN GREENPANEL",
    "rateKey": "mdf"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "PLY 6MM THK FLEXI 8'X4' WHITE",
    "rateKey": "ply_commercial"
  },
  {
    "name": "THE MAPPLE OFFICE SYSTEM",
    "materialName": "EDGE BENDING 30 X 0.8 MM E3 CODE-2301 LINEAR",
    "rateKey": "edge_band"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "PLY 18MM THK Plain 8'X4' ARCHIED MR GRADE",
    "rateKey": "ply_commercial"
  },
  {
    "name": "NIRMALS HANDLOOM HOUSE",
    "materialName": "FABRIC SAROM Jaguar -721 MAKE SAROM",
    "rateKey": "fabric_mid"
  },
  {
    "name": "NIRMALS HANDLOOM HOUSE",
    "materialName": "FABRIC SAROM Jaguar -727 MAKE SAROM",
    "rateKey": "fabric_mid"
  },
  {
    "name": "TRIO OPULENCE",
    "materialName": "MULTIPURPOSE LOCK 22 MM",
    "rateKey": "hardware"
  },
  {
    "name": "TRIO OPULENCE",
    "materialName": "HAFFLE HINGES 110 DEGREE SOFT CLOSE 0 CRANK ARTICLE NO-329.19.036",
    "rateKey": "hardware"
  },
  {
    "name": "HS DISTRIBUTORS",
    "materialName": "MULTIPURPOSE LOCK 22 WITH STUD 30MM",
    "rateKey": "hardware"
  },
  {
    "name": "NAVYUG ENTERPRISES",
    "materialName": "SCREW CHIP BOARD 4X50MM",
    "rateKey": "hardware"
  },
  {
    "name": "NAVYUG ENTERPRISES",
    "materialName": "SCREW SELF DRILL 3.9X25MM",
    "rateKey": "hardware"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "HDHMR 8 MM 8'X4' PLAIN GREENPLY",
    "rateKey": "ply_commercial"
  },
  {
    "name": "RESPONSE FABRICS",
    "materialName": "FABRIC RESPONSE BOND SR.NO-11",
    "rateKey": "fabric_mid"
  },
  {
    "name": "123 PLY",
    "materialName": "EDGE BENDING 30 X 0.8 MM CODE-FABRIC -2098 E3",
    "rateKey": "fabric_mid"
  },
  {
    "name": "123 PLY",
    "materialName": "EDGE BENDING 30 X 2 MM CODE- 1054 MAKE- E3",
    "rateKey": "edge_band"
  },
  {
    "name": "USP TRADING COMPANY",
    "materialName": "EDGE BENDING 30 X2 MM TAN CODE - 75635 REHAU",
    "rateKey": "edge_band"
  },
  {
    "name": "USP TRADING COMPANY",
    "materialName": "Edge Banding 30X2 MM CODE-75729 BRIGHT WHITE REHAU",
    "rateKey": "edge_band"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "ACTION TESLA PRELAM MDF 18MM 8'X4' BSB 1001 WHITE BALANCING",
    "rateKey": "mdf"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "ACTION TESLA PRELAM MDF 8MM 8'X4' BSB 1001 WHITE BALANCING",
    "rateKey": "mdf"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "Edge Banding 45X2 MM DN-132 CARDINAL RED DECOAGE",
    "rateKey": "edge_band"
  },
  {
    "name": "A3 PANELS AND EDGEBANDS",
    "materialName": "EDGE BENDING 30 X 0.8 MM CODE- 101 MAKE DECOAGE",
    "rateKey": "edge_band"
  },
  {
    "name": "A3 PANELS AND EDGEBANDS",
    "materialName": "EDGE BENDING 30 X 0.8MM CODE- 274 MAKE- DECOAGE",
    "rateKey": "edge_band"
  },
  {
    "name": "A3 PANELS AND EDGEBANDS",
    "materialName": "EDGE BENDING 30 X 2 MM CODE- 101 MAKE DECOAGE",
    "rateKey": "edge_band"
  },
  {
    "name": "A3 PANELS AND EDGEBANDS",
    "materialName": "EDGE BENDING 30 X 2 MM CODE- 274 MAKE- DECOAGE",
    "rateKey": "edge_band"
  },
  {
    "name": "HI TECH MODULER KITCHEN",
    "materialName": "HINGE 16 CRANK",
    "rateKey": "hardware"
  },
  {
    "name": "HI TECH MODULER KITCHEN",
    "materialName": "TELESCOPIC CHANNEL 600MM (SOFT CLOSE)",
    "rateKey": "hardware"
  },
  {
    "name": "HI TECH MODULER KITCHEN",
    "materialName": "TELESCOPIC CHANNEL 550MM (SOFT CLOSE)",
    "rateKey": "hardware"
  },
  {
    "name": "HI TECH MODULER KITCHEN",
    "materialName": "Telescopic channel 400 MM SOFT CLOSE",
    "rateKey": "hardware"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "PLY 18MM THK Plain 8'X4' ARCHIED MR GRADE",
    "rateKey": "ply_commercial"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "PLY 18MM THK Plain 8'X4' GREENPLY PLATINUM",
    "rateKey": "ply_commercial"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "PLY 8MM THK Plain 8'X4' BWP GRADE",
    "rateKey": "ply_commercial"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "PLY 18MM THK Plain 8'X4' ARCHIED MR GRADE",
    "rateKey": "ply_commercial"
  },
  {
    "name": "INNOVIX SOLUTION",
    "materialName": "CONNECTOR SET WITH L GOLA WITH SCREW CODE-9333566",
    "rateKey": "hardware"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "PLY 18MM THK Plain 8'X4' ARCHIED MR GRADE",
    "rateKey": "ply_commercial"
  },
  {
    "name": "GLOBAL TEXTILE ALLIANCE INDIA PVT LTD",
    "materialName": "FABRIC Moody 105 (Symphony Mills)",
    "rateKey": "fabric_mid"
  },
  {
    "name": "GLOBAL TEXTILE ALLIANCE INDIA PVT LTD",
    "materialName": "FABRIC Fabrick Brooklyn 104 (Symphony Mills)",
    "rateKey": "fabric_mid"
  },
  {
    "name": "TAPER SS BOLT 4X25/CASH",
    "materialName": "TAPER SS BOLT 4X25",
    "rateKey": "hardware"
  },
  {
    "name": "TAPER SS BOLT 4X20/CASH",
    "materialName": "TAPER SS BOLT 4X20",
    "rateKey": "hardware"
  },
  {
    "name": "TAPER SS BOLT 5X25/CASH",
    "materialName": "TAPER SS BOLT 5X25",
    "rateKey": "hardware"
  },
  {
    "name": "TAPER SS BOLT 5X25/CASH",
    "materialName": "TAPER SS BOLT 5X25",
    "rateKey": "hardware"
  },
  {
    "name": "SHYAM PAINTS",
    "materialName": "EDGE BENDING 30 X0.8 MM TAN CODE - 75635 REHAU",
    "rateKey": "edge_band"
  },
  {
    "name": "SHYAM PAINTS",
    "materialName": "EDGE BAND 408P",
    "rateKey": "edge_band"
  },
  {
    "name": "NIRMALS HANDLOOM HOUSE",
    "materialName": "FABRIC SAROM ABOONE 112",
    "rateKey": "fabric_mid"
  },
  {
    "name": "NIRMALS HANDLOOM HOUSE",
    "materialName": "FABRIC SAROM ABOONE 111",
    "rateKey": "fabric_mid"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "HDHMR 18MM 8'X4' PLAIN GREENPLY",
    "rateKey": "ply_commercial"
  },
  {
    "name": "123 PLY",
    "materialName": "EDGE BENDING 30 X0.8 MM L-white code-1102 E3",
    "rateKey": "edge_band"
  },
  {
    "name": "123 PLY",
    "materialName": "EDGE BENDING 30 X0.8 MM MIDNIGHT BLUE CODE-1058 E3",
    "rateKey": "edge_band"
  },
  {
    "name": "123 PLY",
    "materialName": "EDGE BENDING 30 X 2 MM FROSTY WHITE CODE-1002 E3",
    "rateKey": "edge_band"
  },
  {
    "name": "123 PLY",
    "materialName": "Edge Banding 30X0.8 MM E3 EDGE CODE -2320",
    "rateKey": "edge_band"
  },
  {
    "name": "123 PLY",
    "materialName": "EDGE BENDING 30 X0.8 MM TAN CODE - 1021 E3",
    "rateKey": "edge_band"
  },
  {
    "name": "123 PLY",
    "materialName": "EDGE BENDING 30 X2 MM TAN CODE - 1021 E3",
    "rateKey": "edge_band"
  },
  {
    "name": "123 PLY",
    "materialName": "EDGE BENDING 30 X2 MM TAN CODE - 1021 E3",
    "rateKey": "edge_band"
  },
  {
    "name": "PROFIT MAX",
    "materialName": "PEN HEAD SCREW 8X13 SS",
    "rateKey": "hardware"
  },
  {
    "name": "PROFIT MAX",
    "materialName": "Dom Bolt SS 8X60 MM",
    "rateKey": "hardware"
  },
  {
    "name": "123 ply",
    "materialName": "EDGE BENDING 30 X 2 MM MIDNIGHT BLUE CODE-1058 E3",
    "rateKey": "edge_band"
  },
  {
    "name": "123 ply",
    "materialName": "EDGE BENDING 30 X0.8 MM FROSTY WHITE CODE-1002 E3",
    "rateKey": "edge_band"
  },
  {
    "name": "123 ply",
    "materialName": "EDGE BENDING 30 X2 MM TAN CODE - 1021 E3",
    "rateKey": "edge_band"
  },
  {
    "name": "A.D. PLYWOOD INDIA PVT. LTD.",
    "materialName": "LAMINATE-1MM THK MERNIOLAM-14018 VNR RH AUSTRA MONDO NOCE",
    "rateKey": "laminate"
  },
  {
    "name": "PYRAMID TIMBER INDUSTRIES (P) LTD",
    "materialName": "LAMINATE SHEETS 1MM 1153 SF",
    "rateKey": "laminate"
  },
  {
    "name": "PYRAMID TIMBER INDUSTRIES (P) LTD",
    "materialName": "LAMINATE SHEETS 1MM 1156 SF",
    "rateKey": "laminate"
  },
  {
    "name": "PYRAMID TIMBER INDUSTRIES (P) LTD",
    "materialName": "LAMINATE SHEET 1 MM 1158 SF",
    "rateKey": "laminate"
  },
  {
    "name": "PYRAMID TIMBER INDUSTRIES (P) LTD",
    "materialName": "LAMINATE SHEET 1MM 6889 SF",
    "rateKey": "laminate"
  },
  {
    "name": "PYRAMID TIMBER INDUSTRIES (P) LTD",
    "materialName": "LAMINATE SHEET 1MM 1146 SF",
    "rateKey": "laminate"
  },
  {
    "name": "PYRAMID TIMBER INDUSTRIES (P) LTD",
    "materialName": "COMPACT SHEET 12MM 8844 SF 8'X4'",
    "rateKey": "compact"
  },
  {
    "name": "SOHAM ENTERPRISES",
    "materialName": "SCREW CHIP BOARD 4X20MM",
    "rateKey": "hardware"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "PLY 18MM THK Plain 8'X4' ARCHIED MR GRADE",
    "rateKey": "ply_commercial"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "PLY 18MM THK Plain 8'X4' GREENPLY",
    "rateKey": "ply_commercial"
  },
  {
    "name": "SIDHI VINAY PLYWOOD",
    "materialName": "LAMINATE-1MM THK 49912 SEDA ARABIA MERINO",
    "rateKey": "laminate"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "PLY 18MM THK Plain 8'X4' LOCAL",
    "rateKey": "ply_commercial"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "PLY 12MM THK Plain 8'X4'century",
    "rateKey": "ply_commercial"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "PLY 8MM THK Plain 8'X4'century",
    "rateKey": "ply_commercial"
  },
  {
    "name": "SHYAM PAINTS",
    "materialName": "EDGE BENDING 30 X 2 MM DECOR VILLAGE OAK-II CODE - 096 REHAU",
    "rateKey": "edge_band"
  },
  {
    "name": "SHYAM PAINTS",
    "materialName": "EDGE BENDING 30 X0.8 MM DECOR VILLAGE OAK-II CODE - 096 REHAU",
    "rateKey": "edge_band"
  },
  {
    "name": "SHYAM PAINTS",
    "materialName": "EDGE BENDING 30X2MM SHAHARA WALNUT 408P REHAU",
    "rateKey": "edge_band"
  },
  {
    "name": "INNOVIX SOLUTION",
    "materialName": "ALUMINIUM HANDLE G PROFILE END CAP ROSE GOLD",
    "rateKey": "aluminium"
  },
  {
    "name": "BHATIA FURNISHING",
    "materialName": "CURTAIN FABRIC DECORE MAX SERIAL NO-A-06 AS PER APPROVED",
    "rateKey": "fabric_mid"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "PLY 18MM THK Plain 8'X4' LOCAL",
    "rateKey": "ply_commercial"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "PLY 18MM THK Plain 8'X4' MR GRADE",
    "rateKey": "ply_commercial"
  },
  {
    "name": "SOHAM ENTERPRISES",
    "materialName": "SCREW CHIP BOARD 4X50MM",
    "rateKey": "hardware"
  },
  {
    "name": "SOHAM ENTERPRISES",
    "materialName": "SCREW CHIP BOARD 4X40MM",
    "rateKey": "hardware"
  },
  {
    "name": "SOHAM ENTERPRISES",
    "materialName": "SCREW CHIP BOARD 4X35MM",
    "rateKey": "hardware"
  },
  {
    "name": "SOHAM ENTERPRISES",
    "materialName": "SCREW CHIP BOARD 4X30MM",
    "rateKey": "hardware"
  },
  {
    "name": "SOHAM ENTERPRISES",
    "materialName": "SCREW CHIP BOARD 4X25MM",
    "rateKey": "hardware"
  },
  {
    "name": "JAGDAMBA ENTERPRISES",
    "materialName": "Pipe MS CR Rectangle 50x25x1.2 MM 6000 MM",
    "rateKey": "metal_ms"
  },
  {
    "name": "JAGDAMBA ENTERPRISES",
    "materialName": "Pipe MS CR Round Dia 19x 2.0 MM 6000 MM",
    "rateKey": "metal_ms"
  },
  {
    "name": "JAGDAMBA ENTERPRISES",
    "materialName": "Pipe MS CR Round Dia 31.75x1.6 MM 6000 MM",
    "rateKey": "metal_ms"
  },
  {
    "name": "JAGDAMBA ENTERPRISES",
    "materialName": "Pipe MS CR Round Dia 19 X 1.6MM 6000 MM",
    "rateKey": "metal_ms"
  },
  {
    "name": "HI TECH MODULER KITCHEN",
    "materialName": "HETTIC Telescopic channel 400 MM SOFT CLOSE",
    "rateKey": "hardware"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "PLY 16MM THK Plain 8'X4' LOCAL",
    "rateKey": "ply_commercial"
  },
  {
    "name": "HS DISTRIBUTORS",
    "materialName": "Telescopic channel 250 MM SOFT CLOSE",
    "rateKey": "hardware"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "PLY 12MM THK Plain 8'X4' LOCAL",
    "rateKey": "ply_commercial"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "PLY 18MM THK Plain 8'X4' LOCAL",
    "rateKey": "ply_commercial"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "PLY 12MM THK Plain 8'X4' LOCAL",
    "rateKey": "ply_commercial"
  },
  {
    "name": "A3 PANELS AND EDGEBANDS",
    "materialName": "EDGE BENDING 30 X 0.8 MM CODE- 101 MAKE DECOAGE",
    "rateKey": "edge_band"
  },
  {
    "name": "A3 PANELS AND EDGEBANDS",
    "materialName": "EDGE BENDING 30 X 0.8MM CODE- 274 MAKE- DECOAGE",
    "rateKey": "edge_band"
  },
  {
    "name": "A3 PANELS AND EDGEBANDS",
    "materialName": "EDGE BENDING 30 X 2 MM CODE- 101 MAKE DECOAGE",
    "rateKey": "edge_band"
  },
  {
    "name": "A3 PANELS AND EDGEBANDS",
    "materialName": "EDGE BENDING 30 X 2 MM CODE- 274 MAKE- DECOAGE",
    "rateKey": "edge_band"
  },
  {
    "name": "HS DISTRIBUTORS",
    "materialName": "HINGES ( 16 CRANK SOFT CLOSE) (HETICH )",
    "rateKey": "hardware"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "LAMINATE-1MM THK MERNIOLAM-22091 FT MERINO",
    "rateKey": "laminate"
  },
  {
    "name": "123ply",
    "materialName": "EDGE BENDING 30 X 2 MM CODE- 1054 MAKE- E3",
    "rateKey": "edge_band"
  },
  {
    "name": "123ply",
    "materialName": "Edge Banding 45X2 MM E3 CODE -2320",
    "rateKey": "edge_band"
  },
  {
    "name": "123ply",
    "materialName": "EDGE BENDING 30 X 0.8 MM CODE-WHITE LILY 1101 MAKE E3",
    "rateKey": "edge_band"
  },
  {
    "name": "SHYAM PAINTS",
    "materialName": "EDGE BENDING 45 X0.8 MM DECOR VILLAGE OAK-II CODE - 096 REHAU",
    "rateKey": "edge_band"
  },
  {
    "name": "GEE ESS INTERNATIONAL",
    "materialName": "FLAT MS 25X5 MM 6000 MM",
    "rateKey": "metal_ms"
  },
  {
    "name": "GEE ESS INTERNATIONAL",
    "materialName": "BRIGHT BAR MS Round Dia 12 MM 3000 MM grade-1018",
    "rateKey": "metal_ms"
  },
  {
    "name": "MATCO ENTERPRISES",
    "materialName": "ALUMINIUM EXTRUSION 3660MM/ 5 PCS",
    "rateKey": "aluminium"
  },
  {
    "name": "MATCO ENTERPRISES",
    "materialName": "ALUMINIUM EXTRUSION 3000MM/ 10PCS",
    "rateKey": "aluminium"
  },
  {
    "name": "USP TRADING & MANUFACTURING",
    "materialName": "Edge Banding 30X0.8MM CODE-75729 BRIGHT WHITE REHAU",
    "rateKey": "edge_band"
  },
  {
    "name": "USP TRADING & MANUFACTURING",
    "materialName": "Edge Banding 30X2 MM CODE-75729 BRIGHT WHITE REHAU",
    "rateKey": "edge_band"
  },
  {
    "name": "PROFIT MAX",
    "materialName": "TAPER BOLT 5X16",
    "rateKey": "hardware"
  },
  {
    "name": "A.D. PLYWOOD INDIA PVT.LTD.",
    "materialName": "LAMINATE-1MM THK MERNIOLAM-22091 FT MERINO",
    "rateKey": "laminate"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "LM 1MM 8'X4' CENTURY LAMINATE - THANSUE MAPLE/357SUD",
    "rateKey": "laminate"
  },
  {
    "name": "RS TIMBER TRADERS",
    "materialName": "LAMINATE-1MM THK MERNIOLAM-14018 VNR RH AUSTRA MONDO NOCE",
    "rateKey": "laminate"
  },
  {
    "name": "GAURIKA FABRICS",
    "materialName": "FABRIC CODE-MORROCCO#016 MAKE GAURICA",
    "rateKey": "fabric_mid"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "PLY 12MM THK Plain 8'X4' LOCAL",
    "rateKey": "ply_commercial"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "HDHMR 18MM 8'X4' PLAIN GREENPLY",
    "rateKey": "ply_commercial"
  },
  {
    "name": "MG PLYWOOD",
    "materialName": "PLY 18MM THK Plain 8'X4' KIT",
    "rateKey": "ply_commercial"
  },
  {
    "name": "MG PLYWOOD",
    "materialName": "PLY 08MM THK Plain 8'X4' KIT",
    "rateKey": "ply_commercial"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "MDF 7.5MM 8'X4' PLAIN GREENPANEL",
    "rateKey": "mdf"
  },
  {
    "name": "JAKSH TRADERS",
    "materialName": "GI EARTHING WITH CHEMICAL",
    "rateKey": "laminate"
  },
  {
    "name": "KAPOOR PLYWOOD AND LAMINATES",
    "materialName": "PLY 12MM THK Plain 8'X4' LOCAL",
    "rateKey": "ply_commercial"
  },
  {
    "name": "TRIO OPULENCE",
    "materialName": "MULTIPURPOSE LOCK 22 MM",
    "rateKey": "hardware"
  },
  {
    "name": "MG PLYWOOD",
    "materialName": "PLY 18MM THK Plain 8'X4' KIT",
    "rateKey": "ply_commercial"
  },
  {
    "name": "MG PLYWOOD",
    "materialName": "PLY 08MM THK Plain 8'X4' KIT",
    "rateKey": "ply_commercial"
  }
];
