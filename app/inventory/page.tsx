'use client';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, Badge, EmptyState, Spinner, ConfirmDialog, toast, ResponsiveTable } from '@/components/ui';
import { Plus, Search, Edit2, Trash2, TrendingDown, AlertTriangle, Package, Tag, FolderOpen, X, ChevronDown, MapPin, Wrench } from 'lucide-react';
import api, { apiCache } from '@/lib/api';
import ProductImageUpload from '@/components/inventory/ProductImageUpload';

// ── Category field templates ──────────────────────────────────────────────────
type FieldDef = { label: string; key: string; type: 'text'|'number'|'select'|'boolean'; options?: string[]; required?: boolean };
type Template = { label: string; icon: string; fields: FieldDef[] };

const CATEGORY_TEMPLATES: Record<string, Template> = {
  clothing: {
    label: 'Clothing & Apparel', icon: '👕',
    fields: [
      { label: 'Size', key: 'size', type: 'select', options: ['XS','S','M','L','XL','XXL','XXXL'], required: true },
      { label: 'Color', key: 'color', type: 'text', required: true },
      { label: 'Material', key: 'material', type: 'text' },
      { label: 'Gender', key: 'gender', type: 'select', options: ['Men','Women','Unisex','Kids'] },
      { label: 'Season', key: 'season', type: 'select', options: ['All Season','Summer','Winter','Spring','Autumn'] },
    ],
  },
  electronics: {
    label: 'Electronics', icon: '💻',
    fields: [
      { label: 'Brand', key: 'brand', type: 'text', required: true },
      { label: 'Model', key: 'model', type: 'text' },
      { label: 'Warranty (months)', key: 'warranty_months', type: 'number' },
      { label: 'Voltage', key: 'voltage', type: 'text' },
      { label: 'Condition', key: 'condition', type: 'select', options: ['New','Refurbished','Used'] },
    ],
  },
  food: {
    label: 'Food & Beverage', icon: '🍎',
    fields: [
      { label: 'Weight / Volume', key: 'weight', type: 'text', required: true },
      { label: 'Expiry Date', key: 'expiry_date', type: 'text' },
      { label: 'Ingredients', key: 'ingredients', type: 'text' },
      { label: 'Allergens', key: 'allergens', type: 'text' },
      { label: 'Organic', key: 'organic', type: 'boolean' },
    ],
  },
  furniture: {
    label: 'Furniture & Home', icon: '🛋️',
    fields: [
      { label: 'Material', key: 'material', type: 'text', required: true },
      { label: 'Color / Finish', key: 'color', type: 'text' },
      { label: 'Dimensions (L×W×H)', key: 'dimensions', type: 'text' },
      { label: 'Weight (kg)', key: 'weight_kg', type: 'number' },
      { label: 'Assembly Required', key: 'assembly_required', type: 'boolean' },
    ],
  },
  pharmacy: {
    label: 'Pharmacy & Health', icon: '💊',
    fields: [
      { label: 'Dosage / Strength', key: 'dosage', type: 'text', required: true },
      { label: 'Form', key: 'form', type: 'select', options: ['Tablet','Capsule','Syrup','Injection','Cream','Drops'] },
      { label: 'Manufacturer', key: 'manufacturer', type: 'text' },
      { label: 'Prescription Required', key: 'prescription', type: 'boolean' },
      { label: 'Expiry Date', key: 'expiry_date', type: 'text' },
    ],
  },
  books: {
    label: 'Books & Stationery', icon: '📚',
    fields: [
      { label: 'Author', key: 'author', type: 'text', required: true },
      { label: 'ISBN', key: 'isbn', type: 'text' },
      { label: 'Publisher', key: 'publisher', type: 'text' },
      { label: 'Edition', key: 'edition', type: 'text' },
      { label: 'Language', key: 'language', type: 'text' },
    ],
  },
  automotive: {
    label: 'Automotive & Parts', icon: '🚗',
    fields: [
      { label: 'Brand', key: 'brand', type: 'text', required: true },
      { label: 'Part Number', key: 'part_number', type: 'text' },
      { label: 'Compatible Models', key: 'compatible_models', type: 'text' },
      { label: 'Condition', key: 'condition', type: 'select', options: ['New','OEM','Aftermarket','Used'] },
      { label: 'Warranty (months)', key: 'warranty_months', type: 'number' },
    ],
  },
  jewelry: {
    label: 'Jewelry & Accessories', icon: '💍',
    fields: [
      { label: 'Metal / Material', key: 'material', type: 'text', required: true },
      { label: 'Karat / Purity', key: 'karat', type: 'text' },
      { label: 'Stone', key: 'stone', type: 'text' },
      { label: 'Size', key: 'size', type: 'text' },
      { label: 'Certificate', key: 'certificate', type: 'text' },
    ],
  },
  phones: {
    label: 'Phones & Tablets', icon: '📱',
    fields: [
      { label: 'Brand', key: 'brand', type: 'text', required: true },
      { label: 'Model', key: 'model', type: 'text', required: true },
      { label: 'Storage', key: 'storage', type: 'select', options: ['16GB','32GB','64GB','128GB','256GB','512GB','1TB'] },
      { label: 'RAM', key: 'ram', type: 'select', options: ['2GB','3GB','4GB','6GB','8GB','12GB','16GB'] },
      { label: 'Color', key: 'color', type: 'text' },
      { label: 'Network', key: 'network', type: 'select', options: ['4G','5G','Wi-Fi Only'] },
      { label: 'Condition', key: 'condition', type: 'select', options: ['New','Refurbished','Used'] },
      { label: 'Warranty (months)', key: 'warranty_months', type: 'number' },
    ],
  },
  computers: {
    label: 'Computers & Laptops', icon: '🖥️',
    fields: [
      { label: 'Brand', key: 'brand', type: 'text', required: true },
      { label: 'Model', key: 'model', type: 'text', required: true },
      { label: 'Processor', key: 'processor', type: 'text' },
      { label: 'RAM', key: 'ram', type: 'select', options: ['4GB','8GB','16GB','32GB','64GB'] },
      { label: 'Storage', key: 'storage', type: 'text' },
      { label: 'Display Size', key: 'display_size', type: 'text' },
      { label: 'OS', key: 'os', type: 'select', options: ['Windows 11','Windows 10','macOS','Linux','Chrome OS','No OS'] },
      { label: 'Condition', key: 'condition', type: 'select', options: ['New','Refurbished','Used'] },
      { label: 'Warranty (months)', key: 'warranty_months', type: 'number' },
    ],
  },
  computer_accessories: {
    label: 'Computer Accessories', icon: '🖱️',
    fields: [
      { label: 'Brand', key: 'brand', type: 'text', required: true },
      { label: 'Type', key: 'type', type: 'select', options: ['Keyboard','Mouse','Monitor','Headset','Webcam','USB Hub','Cable','Charger','Bag/Case','Other'] },
      { label: 'Connectivity', key: 'connectivity', type: 'select', options: ['USB','Bluetooth','Wireless 2.4GHz','USB-C','HDMI','Other'] },
      { label: 'Compatible With', key: 'compatible_with', type: 'text' },
      { label: 'Color', key: 'color', type: 'text' },
      { label: 'Warranty (months)', key: 'warranty_months', type: 'number' },
    ],
  },
  pharmacy_products: {
    label: 'Pharmacy Products', icon: '🏥',
    fields: [
      { label: 'Generic Name', key: 'generic_name', type: 'text', required: true },
      { label: 'Dosage / Strength', key: 'dosage', type: 'text', required: true },
      { label: 'Form', key: 'form', type: 'select', options: ['Tablet','Capsule','Syrup','Suspension','Injection','Cream','Ointment','Drops','Inhaler','Patch','Suppository'] },
      { label: 'Manufacturer', key: 'manufacturer', type: 'text' },
      { label: 'Batch Number', key: 'batch_number', type: 'text' },
      { label: 'Expiry Date', key: 'expiry_date', type: 'text', required: true },
      { label: 'Prescription Required', key: 'prescription', type: 'boolean' },
      { label: 'Storage Condition', key: 'storage_condition', type: 'select', options: ['Room Temperature','Refrigerate','Freeze','Keep Dry','Keep Away from Light'] },
    ],
  },
  beauty: {
    label: 'Beauty & Personal Care', icon: '💄',
    fields: [
      { label: 'Brand', key: 'brand', type: 'text', required: true },
      { label: 'Type', key: 'type', type: 'select', options: ['Skincare','Haircare','Makeup','Fragrance','Body Care','Nail Care','Men\'s Grooming','Other'] },
      { label: 'Skin Type', key: 'skin_type', type: 'select', options: ['All Skin Types','Oily','Dry','Combination','Sensitive','Normal'] },
      { label: 'Volume / Weight', key: 'volume', type: 'text' },
      { label: 'Key Ingredients', key: 'ingredients', type: 'text' },
      { label: 'Expiry Date', key: 'expiry_date', type: 'text' },
      { label: 'Cruelty Free', key: 'cruelty_free', type: 'boolean' },
    ],
  },
  // ── Phase 1: Retail & Fashion ─────────────────────────────────────────────
  footwear: {
    label: 'Shoes & Footwear', icon: '👟',
    fields: [
      { label: 'Brand', key: 'brand', type: 'text', required: true },
      { label: 'Size (EU)', key: 'size_eu', type: 'text', required: true },
      { label: 'Size (UK)', key: 'size_uk', type: 'text' },
      { label: 'Gender', key: 'gender', type: 'select', options: ['Men','Women','Unisex','Kids','Infant'] },
      { label: 'Color', key: 'color', type: 'text', required: true },
      { label: 'Material (Upper)', key: 'material_upper', type: 'select', options: ['Leather','Suede','Canvas','Mesh','Synthetic','Rubber'] },
      { label: 'Sole Type', key: 'sole_type', type: 'select', options: ['Rubber','Leather','EVA','PU','Crepe'] },
      { label: 'Closure', key: 'closure', type: 'select', options: ['Lace-up','Slip-on','Velcro','Buckle','Zip'] },
      { label: 'Condition', key: 'condition', type: 'select', options: ['New','Used'] },
    ],
  },
  bags: {
    label: 'Bags & Luggage', icon: '👜',
    fields: [
      { label: 'Brand', key: 'brand', type: 'text', required: true },
      { label: 'Type', key: 'type', type: 'select', options: ['Handbag','Backpack','Wallet','Clutch','Tote','Suitcase','Duffel','Briefcase','School Bag','Other'], required: true },
      { label: 'Material', key: 'material', type: 'select', options: ['Leather','Faux Leather','Canvas','Nylon','Polyester','Fabric'] },
      { label: 'Color', key: 'color', type: 'text', required: true },
      { label: 'Dimensions (L×W×H cm)', key: 'dimensions', type: 'text' },
      { label: 'Capacity (L)', key: 'capacity_liters', type: 'number' },
      { label: 'Gender', key: 'gender', type: 'select', options: ['Women','Men','Unisex','Kids'] },
      { label: 'Waterproof', key: 'waterproof', type: 'boolean' },
    ],
  },
  watches: {
    label: 'Watches', icon: '⌚',
    fields: [
      { label: 'Brand', key: 'brand', type: 'text', required: true },
      { label: 'Model', key: 'model', type: 'text' },
      { label: 'Movement Type', key: 'movement', type: 'select', options: ['Quartz','Automatic','Manual Wind','Solar','Smart/Digital'], required: true },
      { label: 'Case Size (mm)', key: 'case_size_mm', type: 'number' },
      { label: 'Case Material', key: 'case_material', type: 'select', options: ['Stainless Steel','Titanium','Gold Plated','Rose Gold','Plastic','Ceramic'] },
      { label: 'Strap Material', key: 'strap_material', type: 'select', options: ['Leather','Stainless Steel','Rubber','Nylon','Silicone','Fabric'] },
      { label: 'Water Resistance', key: 'water_resistance', type: 'select', options: ['Not Water Resistant','30m / 3ATM','50m / 5ATM','100m / 10ATM','200m+'] },
      { label: 'Gender', key: 'gender', type: 'select', options: ['Men','Women','Unisex'] },
      { label: 'Condition', key: 'condition', type: 'select', options: ['New','Pre-owned','Refurbished'] },
    ],
  },
  eyewear: {
    label: 'Eyewear', icon: '🕶️',
    fields: [
      { label: 'Brand', key: 'brand', type: 'text', required: true },
      { label: 'Type', key: 'type', type: 'select', options: ['Sunglasses','Prescription Frames','Reading Glasses','Safety Glasses','Sports Goggles','Swimming Goggles'], required: true },
      { label: 'Frame Shape', key: 'frame_shape', type: 'select', options: ['Round','Square','Rectangle','Oval','Cat-eye','Aviator','Wayfarer','Rimless'] },
      { label: 'Frame Material', key: 'frame_material', type: 'select', options: ['Acetate','Metal','Titanium','Plastic','Wood','TR90'] },
      { label: 'Lens Type', key: 'lens_type', type: 'select', options: ['Clear','Tinted','Polarized','Photochromic','Mirrored','Blue Light Blocking'] },
      { label: 'UV Protection', key: 'uv_protection', type: 'select', options: ['UV400','UV380','UV350','None'] },
      { label: 'Gender', key: 'gender', type: 'select', options: ['Men','Women','Unisex','Kids'] },
      { label: 'Color', key: 'color', type: 'text' },
    ],
  },
  // ── Phase 2: Food & Grocery ──────────────────────────────────────────────
  fresh_produce: {
    label: 'Fresh Produce', icon: '🥦',
    fields: [
      { label: 'Type', key: 'type', type: 'select', options: ['Vegetable','Fruit','Herb','Mushroom','Tuber','Legume'], required: true },
      { label: 'Origin / Country', key: 'origin', type: 'text' },
      { label: 'Weight / Unit', key: 'weight_unit', type: 'text', required: true },
      { label: 'Grade / Quality', key: 'grade', type: 'select', options: ['Grade A','Grade B','Grade C','Premium','Standard'] },
      { label: 'Organic', key: 'organic', type: 'boolean' },
      { label: 'Storage Condition', key: 'storage', type: 'select', options: ['Room Temperature','Refrigerate','Keep Dry','Keep Away from Light'] },
      { label: 'Shelf Life (days)', key: 'shelf_life_days', type: 'number' },
    ],
  },
  beverages: {
    label: 'Beverages', icon: '🥤',
    fields: [
      { label: 'Brand', key: 'brand', type: 'text', required: true },
      { label: 'Type', key: 'type', type: 'select', options: ['Water','Juice','Soft Drink','Energy Drink','Tea','Coffee','Milk','Smoothie','Beer','Wine','Spirit','Other'], required: true },
      { label: 'Volume (ml)', key: 'volume_ml', type: 'number', required: true },
      { label: 'Packaging', key: 'packaging', type: 'select', options: ['Bottle','Can','Carton','Sachet','Pouch','Keg'] },
      { label: 'Alcoholic', key: 'alcoholic', type: 'boolean' },
      { label: 'Alcohol % (ABV)', key: 'abv', type: 'number' },
      { label: 'Caffeine Content', key: 'caffeine', type: 'select', options: ['None','Low','Medium','High'] },
      { label: 'Expiry Date', key: 'expiry_date', type: 'text', required: true },
      { label: 'Sugar Free', key: 'sugar_free', type: 'boolean' },
    ],
  },
  frozen_foods: {
    label: 'Frozen Foods', icon: '🧊',
    fields: [
      { label: 'Brand', key: 'brand', type: 'text', required: true },
      { label: 'Type', key: 'type', type: 'select', options: ['Meat & Poultry','Seafood','Vegetables','Ready Meal','Snacks & Appetizers','Desserts','Pastry & Dough','Ice Cream','Other'], required: true },
      { label: 'Weight (g)', key: 'weight_g', type: 'number', required: true },
      { label: 'Storage Temperature', key: 'storage_temp', type: 'select', options: ['-18°C or below','-12°C to -18°C','0°C to -4°C'] },
      { label: 'Cooking Method', key: 'cooking_method', type: 'select', options: ['Oven','Microwave','Pan Fry','Deep Fry','Boil','Grill','Air Fryer','No Cooking Required'] },
      { label: 'Cooking Time (mins)', key: 'cooking_time_mins', type: 'number' },
      { label: 'Allergens', key: 'allergens', type: 'text' },
      { label: 'Expiry Date', key: 'expiry_date', type: 'text', required: true },
      { label: 'Halal', key: 'halal', type: 'boolean' },
    ],
  },
  // ── Phase 3: Home & Living ───────────────────────────────────────────────────
  cookware: {
    label: 'Kitchen & Cookware', icon: '🍳',
    fields: [
      { label: 'Brand', key: 'brand', type: 'text', required: true },
      { label: 'Type', key: 'type', type: 'select', options: ['Pan','Pot','Wok','Baking Tray','Knife','Cutting Board','Blender','Toaster','Kettle','Rice Cooker','Air Fryer','Other'], required: true },
      { label: 'Material', key: 'material', type: 'select', options: ['Stainless Steel','Cast Iron','Non-stick','Ceramic','Aluminium','Glass','Plastic','Wood'] },
      { label: 'Capacity / Size', key: 'capacity', type: 'text' },
      { label: 'Induction Compatible', key: 'induction_compatible', type: 'boolean' },
      { label: 'Dishwasher Safe', key: 'dishwasher_safe', type: 'boolean' },
      { label: 'Oven Safe', key: 'oven_safe', type: 'boolean' },
      { label: 'Color / Finish', key: 'color', type: 'text' },
      { label: 'Warranty (months)', key: 'warranty_months', type: 'number' },
    ],
  },
  bedding: {
    label: 'Bedding & Textiles', icon: '🛏️',
    fields: [
      { label: 'Type', key: 'type', type: 'select', options: ['Bedsheet','Duvet / Comforter','Pillow','Pillowcase','Blanket','Mattress Protector','Towel','Curtain','Rug','Other'], required: true },
      { label: 'Material', key: 'material', type: 'select', options: ['Cotton','Polyester','Microfiber','Linen','Bamboo','Silk','Wool','Flannel','Blend'] },
      { label: 'Size', key: 'size', type: 'select', options: ['Single','Twin','Full','Queen','King','Super King','One Size','Custom'] },
      { label: 'Thread Count', key: 'thread_count', type: 'number' },
      { label: 'Color / Pattern', key: 'color', type: 'text', required: true },
      { label: 'Pieces in Set', key: 'pieces', type: 'number' },
      { label: 'Care Instructions', key: 'care_instructions', type: 'select', options: ['Machine Wash Cold','Machine Wash Warm','Hand Wash Only','Dry Clean Only','Tumble Dry Low'] },
    ],
  },
  cleaning: {
    label: 'Cleaning & Household', icon: '🧹',
    fields: [
      { label: 'Brand', key: 'brand', type: 'text', required: true },
      { label: 'Type', key: 'type', type: 'select', options: ['Detergent','Disinfectant','Floor Cleaner','Toilet Cleaner','Glass Cleaner','Air Freshener','Insecticide','Mop','Broom','Sponge','Bin Bag','Other'], required: true },
      { label: 'Volume / Weight', key: 'volume', type: 'text', required: true },
      { label: 'Surface Type', key: 'surface_type', type: 'select', options: ['All Surfaces','Floor','Glass','Fabric','Kitchen','Bathroom','Outdoor'] },
      { label: 'Form', key: 'form', type: 'select', options: ['Liquid','Powder','Spray','Gel','Tablet','Wipes','Solid'] },
      { label: 'Scent', key: 'scent', type: 'text' },
      { label: 'Hazardous / Corrosive', key: 'hazardous', type: 'boolean' },
      { label: 'Eco / Biodegradable', key: 'eco', type: 'boolean' },
    ],
  },
  // ── Phase 4: Industrial / B2B ──────────────────────────────────────────────
  building_materials: {
    label: 'Building Materials', icon: '🧱',
    fields: [
      { label: 'Type', key: 'type', type: 'select', options: ['Cement','Sand','Gravel','Brick','Block','Timber','Steel Rod','Roofing Sheet','Tile','Paint','PVC Pipe','Other'], required: true },
      { label: 'Brand / Manufacturer', key: 'brand', type: 'text' },
      { label: 'Dimensions', key: 'dimensions', type: 'text' },
      { label: 'Grade / Standard', key: 'grade', type: 'text' },
      { label: 'Weight (kg)', key: 'weight_kg', type: 'number' },
      { label: 'Load Capacity', key: 'load_capacity', type: 'text' },
      { label: 'Color / Finish', key: 'color', type: 'text' },
      { label: 'Fire Resistant', key: 'fire_resistant', type: 'boolean' },
      { label: 'Waterproof', key: 'waterproof', type: 'boolean' },
    ],
  },
  electrical_supplies: {
    label: 'Electrical Supplies', icon: '⚡',
    fields: [
      { label: 'Type', key: 'type', type: 'select', options: ['Cable / Wire','Switch','Socket','Breaker / MCB','Conduit','Light Fitting','Bulb','Battery','Inverter','Solar Panel','Generator','Other'], required: true },
      { label: 'Brand', key: 'brand', type: 'text' },
      { label: 'Voltage (V)', key: 'voltage', type: 'text', required: true },
      { label: 'Amperage (A)', key: 'amperage', type: 'text' },
      { label: 'Wattage (W)', key: 'wattage', type: 'number' },
      { label: 'IP Rating', key: 'ip_rating', type: 'text' },
      { label: 'Certifications', key: 'certifications', type: 'text' },
      { label: 'Indoor / Outdoor', key: 'location', type: 'select', options: ['Indoor','Outdoor','Both'] },
      { label: 'Warranty (months)', key: 'warranty_months', type: 'number' },
    ],
  },
  tools: {
    label: 'Tools & Equipment', icon: '🔧',
    fields: [
      { label: 'Brand', key: 'brand', type: 'text', required: true },
      { label: 'Type', key: 'type', type: 'select', options: ['Hand Tool','Power Tool','Measuring Tool','Cutting Tool','Welding Equipment','Lifting Equipment','Safety Equipment','Garden Tool','Other'], required: true },
      { label: 'Model', key: 'model', type: 'text' },
      { label: 'Power Source', key: 'power_source', type: 'select', options: ['Manual','Electric (Corded)','Battery (Cordless)','Pneumatic','Hydraulic','Fuel'] },
      { label: 'Voltage / Power (W)', key: 'power', type: 'text' },
      { label: 'Material', key: 'material', type: 'text' },
      { label: 'Condition', key: 'condition', type: 'select', options: ['New','Refurbished','Used'] },
      { label: 'Warranty (months)', key: 'warranty_months', type: 'number' },
      { label: 'Certifications', key: 'certifications', type: 'text' },
    ],
  },
  // ── Phase 5: Services / Specialty ───────────────────────────────────────────
  sporting_goods: {
    label: 'Sporting Goods', icon: '⚽',
    fields: [
      { label: 'Sport / Activity', key: 'sport', type: 'select', options: ['Football','Basketball','Tennis','Swimming','Running','Cycling','Gym & Fitness','Cricket','Rugby','Volleyball','Golf','Martial Arts','Other'], required: true },
      { label: 'Type', key: 'type', type: 'select', options: ['Ball','Racket','Bat','Net','Goal Post','Protective Gear','Clothing','Footwear','Equipment','Accessory','Other'] },
      { label: 'Brand', key: 'brand', type: 'text', required: true },
      { label: 'Size', key: 'size', type: 'text' },
      { label: 'Material', key: 'material', type: 'text' },
      { label: 'Skill Level', key: 'skill_level', type: 'select', options: ['Beginner','Intermediate','Advanced','Professional'] },
      { label: 'Indoor / Outdoor', key: 'location', type: 'select', options: ['Indoor','Outdoor','Both'] },
      { label: 'Condition', key: 'condition', type: 'select', options: ['New','Used'] },
    ],
  },
  toys: {
    label: 'Toys & Games', icon: '🧸',
    fields: [
      { label: 'Type', key: 'type', type: 'select', options: ['Action Figure','Doll','Board Game','Puzzle','Building Blocks','Remote Control','Educational','Outdoor Toy','Stuffed Animal','Card Game','Video Game','Other'], required: true },
      { label: 'Brand', key: 'brand', type: 'text' },
      { label: 'Minimum Age', key: 'min_age', type: 'number', required: true },
      { label: 'Maximum Age', key: 'max_age', type: 'number' },
      { label: 'Material', key: 'material', type: 'select', options: ['Plastic','Wood','Fabric','Metal','Foam','Electronic','Mixed'] },
      { label: 'Battery Required', key: 'battery_required', type: 'boolean' },
      { label: 'Battery Type', key: 'battery_type', type: 'text' },
      { label: 'Safety Rating / Standard', key: 'safety_rating', type: 'text' },
      { label: 'Gender', key: 'gender', type: 'select', options: ['Boys','Girls','Unisex'] },
    ],
  },
  pet_supplies: {
    label: 'Pet Supplies', icon: '🐾',
    fields: [
      { label: 'Pet Type', key: 'pet_type', type: 'select', options: ['Dog','Cat','Bird','Fish','Rabbit','Hamster','Reptile','All Pets','Other'], required: true },
      { label: 'Type', key: 'type', type: 'select', options: ['Food & Treats','Grooming','Toys','Bedding','Cage / Kennel','Leash & Collar','Health & Medication','Clothing','Accessories','Other'], required: true },
      { label: 'Brand', key: 'brand', type: 'text' },
      { label: 'Breed Size', key: 'breed_size', type: 'select', options: ['All Sizes','Small','Medium','Large','Extra Large'] },
      { label: 'Weight / Volume', key: 'weight', type: 'text' },
      { label: 'Key Ingredients', key: 'ingredients', type: 'text' },
      { label: 'Expiry Date', key: 'expiry_date', type: 'text' },
      { label: 'Vet Approved', key: 'vet_approved', type: 'boolean' },
    ],
  },
  agricultural: {
    label: 'Agricultural Inputs', icon: '🌾',
    fields: [
      { label: 'Type', key: 'type', type: 'select', options: ['Fertilizer','Pesticide','Herbicide','Fungicide','Seeds','Seedlings','Animal Feed','Veterinary Drug','Farm Tool','Irrigation','Other'], required: true },
      { label: 'Brand / Manufacturer', key: 'brand', type: 'text' },
      { label: 'Active Ingredient', key: 'active_ingredient', type: 'text' },
      { label: 'Weight / Volume', key: 'weight', type: 'text', required: true },
      { label: 'Application Method', key: 'application_method', type: 'select', options: ['Foliar Spray','Soil Application','Drip Irrigation','Seed Treatment','Broadcast','Injection'] },
      { label: 'Coverage Area (acres)', key: 'coverage_acres', type: 'number' },
      { label: 'Crop / Animal Type', key: 'crop_type', type: 'text' },
      { label: 'Expiry Date', key: 'expiry_date', type: 'text' },
      { label: 'Organic / Natural', key: 'organic', type: 'boolean' },
    ],
  },
};

const BLANK_FIELD: FieldDef = { label: '', key: '', type: 'text', options: [], required: false };

/**
 * Kinds of service, mirroring config/serviceTypes.js on the server. Held here
 * rather than fetched because it is four words in a dropdown, and the server
 * rejects anything it does not recognise regardless.
 */
const SERVICE_TYPES = [
  { key: 'general',      label: 'General service' },
  { key: 'printing',     label: 'Printing & production' },
  { key: 'design',       label: 'Design & artwork' },
  { key: 'repair',       label: 'Repair & servicing' },
  { key: 'installation', label: 'Installation & site work' },
  { key: 'professional', label: 'Professional services' },
];

/**
 * Wrapped because useSearchParams makes this route client-rendered up to the
 * nearest boundary, and without one the whole page stops being prerendered.
 */
export default function InventoryPage() {
  return <Suspense fallback={null}><Inventory /></Suspense>;
}

function Inventory() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'products'|'categories'|'locations'>('products');
  const [products, setProducts] = useState<any[]>(() => apiCache.get('/products') || []);
  const [categories, setCategories] = useState<any[]>(() => apiCache.get('/categories') || []);
  const [locations, setLocations] = useState<any[]>(() => apiCache.get('/locations') || []);
  const [loading, setLoading] = useState(() => !apiCache.get('/products'));
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  // Operations links here for services alone — the same list that decides what
  // a client can ask for. Read once as a starting point, not watched: having
  // arrived, changing the filter is the user's business, not the URL's.
  const [filterItemType, setFilterItemType] = useState(() => {
    const asked = searchParams.get('type');
    return ['product', 'service', 'bundle'].includes(asked || '') ? asked! : '';
  });
  const [modal, setModal] = useState<'add'|'edit'|'adjust'|'cat-add'|'cat-edit'|'loc-add'|'loc-edit'|null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [selectedCat, setSelectedCat] = useState<any>(null);
  const [selectedLoc, setSelectedLoc] = useState<any>(null);
  const [confirm, setConfirm] = useState<any>(null);
  const [catConfirm, setCatConfirm] = useState<any>(null);
  const [locConfirm, setLocConfirm] = useState<any>(null);
  const [locForm, setLocForm] = useState({ name:'', code:'', type:'shelf', description:'' });
  const [form, setForm] = useState({ name:'', sku:'', barcode:'', description:'', category_id:'', price:'', cost_price:'', stock_qty:'', low_stock_threshold:'10', unit:'piece', item_type:'product' as 'product'|'service'|'bundle', unit_type:'unit' as string, service_type:'general' as string, requires_file:false, duration:'' as string, revenue_account_code:'' as string, pricing_mode:'fixed' as 'fixed'|'open', min_price:'' as string, max_price:'' as string, images: [] as string[], attributes: {} as Record<string,any>, bundle_items: [] as {product_id:string; quantity:number; name?:string}[] });
  const [catForm, setCatForm] = useState({ name:'', description:'', scope:'product' as 'product'|'service', custom_fields: [] as FieldDef[] });
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<'add'|'remove'>('add');
  const [adjustNote, setAdjustNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [labelProduct, setLabelProduct] = useState<any>(null);
  const [labelQty, setLabelQty] = useState(1);
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!labelProduct || !barcodeRef.current) return;
    import('jsbarcode').then(({ default: JsBarcode }) => {
      JsBarcode(barcodeRef.current, labelProduct.sku, {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 14,
        margin: 8,
        background: '#ffffff',
        lineColor: '#000000',
      });
    });
  }, [labelProduct]);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    const [p, c, l] = await Promise.all([
      api.get('/products'),
      api.get('/categories'),
      api.get('/locations').catch(() => ({ data: { data: [] } })),
    ]);
    apiCache.set('/products', p.data.data);
    apiCache.set('/categories', c.data.data);
    apiCache.set('/locations', l.data.data);
    setProducts(p.data.data);
    setCategories(c.data.data);
    setLocations(l.data.data);
    setLoading(false);
  };
  useEffect(() => {
    const hasCache = !!apiCache.get('/products');
    load(!hasCache ? false : true);
    if (hasCache && apiCache.isStale('/products')) load(true);
  }, []);

  const filtered = products.filter(p =>
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku||'').toLowerCase().includes(search.toLowerCase())) &&
    (!filterCat || (p.category_id?._id || p.category_id) == filterCat) &&
    (!filterItemType || (p.item_type || 'product') === filterItemType)
  );

  const openAdd = () => { setForm({ name:'',sku:'',barcode:'',description:'',category_id:'',price:'',cost_price:'',stock_qty:'',low_stock_threshold:'10',unit:'piece',item_type:'product',unit_type:'unit',service_type:'general',requires_file:false,duration:'',revenue_account_code:'',pricing_mode:'fixed',min_price:'',max_price:'',images:[],attributes:{},bundle_items:[] }); setError(''); setModal('add'); };
  const openEdit = (p: any) => { setSelected(p); setForm({ name:p.name,sku:p.sku||'',barcode:p.barcode||'',description:p.description||'',category_id:p.category_id?._id||p.category_id||'',price:p.price,cost_price:p.cost_price,stock_qty:p.stock_qty,low_stock_threshold:p.low_stock_threshold,unit:p.unit,item_type:p.item_type||'product',unit_type:p.unit_type||'unit',service_type:p.service_type||'general',requires_file:!!p.requires_file,duration:p.duration||'',revenue_account_code:p.revenue_account_code||'',pricing_mode:p.pricing_mode==='open'?'open':'fixed',min_price:p.min_price?String(p.min_price):'',max_price:p.max_price?String(p.max_price):'',images:Array.isArray(p.images)?p.images.filter(Boolean):[],attributes:p.attributes||{},bundle_items:(p.bundle_items||[]).map((bi:any)=>({product_id:bi.product_id||bi.product_id?._id,quantity:bi.quantity,name:products.find((x:any)=>x.id===(bi.product_id||bi.product_id?._id))?.name||''})) }); setError(''); setModal('edit'); };
  const openAdjust = (p: any) => { setSelected(p); setAdjustQty(''); setAdjustType('add'); setAdjustNote(''); setModal('adjust'); };

  const save = async () => {
    setSaving(true); setError('');
    const payload = { ...form, barcode: form.barcode.trim() || null, images: form.images };
    try {
      if (modal === 'add') await api.post('/products', payload);
      else await api.put(`/products/${selected.id}`, payload);
      apiCache.invalidate('/products');
      toast.success('Saved successfully'); setModal(null); load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Error saving product'); }
    finally { setSaving(false); }
  };

  const doAdjust = async () => {
    if (!adjustQty || parseInt(adjustQty) <= 0) return;
    const delta = adjustType === 'remove' ? -Math.abs(parseInt(adjustQty)) : Math.abs(parseInt(adjustQty));
    setSaving(true);
    try { await api.post(`/products/${selected.id}/adjust-stock`, { quantity: delta, notes: adjustNote }); apiCache.invalidate('/products'); toast.success('Stock adjusted'); setModal(null); load(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const doDelete = async (id: number) => {
    await api.delete(`/products/${id}`);
    apiCache.invalidate('/products');
    toast.success('Deleted successfully');
    load();
  };

  const saveCat = async () => {
    if (!catForm.name.trim()) { toast.error('Category name is required'); return; }
    setSaving(true);
    try {
      if (selectedCat) await api.put(`/categories/${selectedCat.id}`, catForm);
      else await api.post('/categories', catForm);
      apiCache.invalidate('/categories');
      toast.success('Category saved'); setModal(null); load();
    } catch(e: any) { toast.error(e.response?.data?.message || 'Error saving category'); }
    finally { setSaving(false); }
  };

  const applyTemplate = (key: string) => {
    const prev = selectedTemplate;
    const prevT = prev ? CATEGORY_TEMPLATES[prev] : null;
    setSelectedTemplate(key);
    if (key && CATEGORY_TEMPLATES[key]) {
      const t = CATEGORY_TEMPLATES[key];
      setCatForm(f => ({
        ...f,
        // replace name/description if empty OR if they still match the previously selected template
        name: (!f.name.trim() || (prevT && f.name === prevT.label)) ? t.label : f.name,
        description: (!f.description.trim() || (prevT && f.description === `${prevT.icon} ${prevT.label} — custom attributes for this category`))
          ? `${t.icon} ${t.label} — custom attributes for this category`
          : f.description,
        custom_fields: t.fields.map(fd => ({ ...fd, options: fd.options || [] })),
      }));
    } else {
      // deselected — clear name/description only if they still match the previous template
      setCatForm(f => ({
        ...f,
        name: (prevT && f.name === prevT.label) ? '' : f.name,
        description: (prevT && f.description === `${prevT.icon} ${prevT.label} — custom attributes for this category`) ? '' : f.description,
        custom_fields: [],
      }));
    }
  };

  const addField = () => setCatForm(f => ({ ...f, custom_fields: [...f.custom_fields, { ...BLANK_FIELD }] }));

  const updateField = (i: number, patch: Partial<FieldDef>) =>
    setCatForm(f => ({ ...f, custom_fields: f.custom_fields.map((fd, idx) => idx === i ? { ...fd, ...patch } : fd) }));

  const removeField = (i: number) =>
    setCatForm(f => ({ ...f, custom_fields: f.custom_fields.filter((_, idx) => idx !== i) }));

  // derive key from label automatically if key is empty
  const handleFieldLabel = (i: number, label: string) => {
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    updateField(i, { label, key });
  };

  const deleteCat = async (id: string) => {
    try {
      await api.delete(`/categories/${id}`);
      apiCache.invalidate('/categories');
      toast.success('Category deleted'); load();
    } catch(e: any) { toast.error(e.response?.data?.message || 'Cannot delete — category may be in use'); }
  };

  const saveLoc = async () => {
    if (!locForm.name.trim()) { toast.error('Location name is required'); return; }
    setSaving(true);
    try {
      if (selectedLoc) await api.put(`/locations/${selectedLoc.id}`, locForm);
      else await api.post('/locations', locForm);
      apiCache.invalidate('/locations');
      toast.success('Location saved'); setModal(null); load();
    } catch(e: any) { toast.error(e.response?.data?.message || 'Error saving location'); }
    finally { setSaving(false); }
  };

  const deleteLoc = async (id: string) => {
    try {
      await api.delete(`/locations/${id}`);
      apiCache.invalidate('/locations');
      toast.success('Location deleted'); load();
    } catch(e: any) { toast.error(e.response?.data?.message || 'Cannot delete — location may be in use'); }
  };

  const inputProps = (key: string) => ({ value: (form as any)[key], onChange: (e: any) => setForm({...form, [key]: e.target.value}), className: 'form-input' });

  return (
    <AppLayout title="Inventory" subtitle="Manage products, services, bundles and categories" allowedRoles={['business_owner','branch_manager','warehouse_staff']}>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-5 w-fit">
        <button onClick={() => setTab('products')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ tab==='products' ? 'bg-[#0D3B6E] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50' }`}>
          <Package className="w-4 h-4" /> Catalog
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${ tab==='products' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500' }`}>{products.length}</span>
        </button>
        <button onClick={() => setTab('categories')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ tab==='categories' ? 'bg-[#0D3B6E] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50' }`}>
          <FolderOpen className="w-4 h-4" /> Categories
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${ tab==='categories' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500' }`}>{categories.length}</span>
        </button>
        <button onClick={() => setTab('locations')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ tab==='locations' ? 'bg-[#0D3B6E] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50' }`}>
          <MapPin className="w-4 h-4" /> Locations
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${ tab==='locations' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500' }`}>{locations.length}</span>
        </button>
      </div>

      {/* ── PRODUCTS TAB ── */}
      {tab === 'products' && (<>
      <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9" placeholder="Search products or SKU…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input sm:w-auto" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="form-input sm:w-auto" value={filterItemType} onChange={e => setFilterItemType(e.target.value)}>
          <option value="">All Types</option>
          <option value="product">Products</option>
          <option value="service">Services</option>
          <option value="bundle">Bundles</option>
        </select>
        <button className="btn-primary w-full sm:w-auto" onClick={openAdd}><Plus className="w-4 h-4" />Add Item</button>
      </div>

      {/* Low stock alert */}
      {products.filter(p => (p.item_type || 'product') === 'product' && p.stock_qty <= p.low_stock_threshold).length > 0 && (
        <div className="bg-[#0D3B6E]/8 border border-[#0D3B6E]/15 rounded-xl px-3 sm:px-4 py-3 flex items-start sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-5 text-xs sm:text-sm text-[#0D3B6E]">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <span><strong>{products.filter(p => (p.item_type || 'product') === 'product' && p.stock_qty <= p.low_stock_threshold).length} products</strong> are at or below their low stock threshold.</span>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState message="No items found" description={search || filterCat ? 'Try adjusting your search or filter.' : 'Add your first product or service to get started.'} icon={<Package className="w-9 h-9 text-gray-300" />} action={!search && !filterCat ? { label: '+ Add Item', onClick: openAdd } : undefined} /> : (
          <ResponsiveTable
            columns={[
              {
                key: 'name',
                label: 'Item',
                render: (_, p) => (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{p.name}</span>
                      {(p.item_type === 'service') && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">Service</span>}
                      {(p.item_type === 'bundle') && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">Bundle</span>}
                    </div>
                    {p.sku && <div className="text-xs text-gray-400 font-mono mt-0.5">{p.sku}</div>}
                  </div>
                )
              },
              {
                key: 'category',
                label: 'Category',
                render: (_, p) => p.category_name
                  ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#0D3B6E]/8 text-[#0D3B6E]">{p.category_name}</span>
                  : <span className="text-gray-300">—</span>
              },
              {
                key: 'price',
                label: 'Price',
                render: (_, p) => (
                  <div>
                    {p.pricing_mode === 'open' ? (
                      <div className="font-semibold text-purple-600">On request</div>
                    ) : (
                      <div className="font-semibold text-gray-900">GH₵ {parseFloat(p.price).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-0.5">Cost: GH₵ {parseFloat(p.cost_price).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</div>
                  </div>
                )
              },
              {
                key: 'margin',
                label: 'Margin',
                render: (_, p) => {
                  const margin = p.price > 0 ? Math.round(((p.price - p.cost_price) / p.price) * 100) : 0;
                  return (
                    <span className={`font-semibold text-sm ${ margin >= 30 ? 'text-[#0D3B6E]' : margin >= 15 ? 'text-amber-500' : 'text-red-500' }`}>
                      {margin}%
                    </span>
                  );
                }
              },
              {
                key: 'stock',
                label: 'Stock / Type',
                render: (_, p) => {
                  if ((p.item_type || 'product') === 'service') {
                    return (
                      <div className="text-xs text-gray-500">
                        {p.pricing_mode === 'open' ? (
                          <span className="text-purple-600 font-medium">Quoted at sale</span>
                        ) : (
                          <>
                            <span className="capitalize">{p.unit_type || 'fixed'}</span>
                            {p.duration ? <span className="ml-1 text-gray-400">· {p.duration} {p.unit_type === 'hour' ? 'hr' : p.unit_type === 'day' ? 'day' : ''}</span> : null}
                          </>
                        )}
                      </div>
                    );
                  }
                  if (p.item_type === 'bundle') {
                    const items = p.bundle_items || [];
                    if (!items.length) return <span className="text-xs text-gray-400">No components</span>;
                    return (
                      <div className="text-xs text-gray-600">
                        {items.slice(0,2).map((bi:any, i:number) => {
                          const cp = products.find((x:any) => x.id === (bi.product_id?._id || bi.product_id));
                          return <div key={i} className="truncate max-w-[140px]">{bi.quantity}× {cp?.name || '—'}</div>;
                        })}
                        {items.length > 2 && <div className="text-gray-400">+{items.length - 2} more</div>}
                      </div>
                    );
                  }
                  const isLow = p.stock_qty <= p.low_stock_threshold;
                  const isOut = p.stock_qty === 0;
                  const stockPct = Math.min(100, Math.round((p.stock_qty / Math.max(p.low_stock_threshold * 3, 1)) * 100));
                  const stockColor = isOut ? 'bg-red-500' : isLow ? 'bg-amber-400' : 'bg-[#0D3B6E]';
                  const stockLabel = isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock';
                  const stockTextColor = isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-[#0D3B6E]';
                  return (
                    <div className="flex flex-col gap-1 min-w-[110px]">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${stockTextColor}`}>{stockLabel}</span>
                        <span className="text-xs text-gray-500 font-mono">{p.stock_qty} <span className="text-gray-400">{p.unit}</span></span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${stockColor}`} style={{ width: `${stockPct}%` }} />
                      </div>
                    </div>
                  );
                }
              },
              {
                key: 'status',
                label: 'Status',
                render: (_, p) => <Badge status={p.is_active ? 'active' : 'inactive'} />
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (_, p) => (
                  <div className="flex items-center justify-end gap-1">
                    {(p.item_type || 'product') !== 'service' && <button onClick={() => { setLabelProduct(p); setLabelQty(1); }} title="Print Label" className="p-1.5 hover:bg-[#0D3B6E]/8 rounded-lg text-[#0D3B6E] transition-colors"><Tag className="w-4 h-4" /></button>}
                    {(p.item_type || 'product') === 'product' && <button onClick={() => openAdjust(p)} title="Adjust Stock" className="p-1.5 hover:bg-[#0D3B6E]/8 rounded-lg text-[#0D3B6E] transition-colors"><TrendingDown className="w-4 h-4" /></button>}
                    <button onClick={() => openEdit(p)} title="Edit" className="p-1.5 hover:bg-[#0D3B6E]/8 rounded-lg text-[#0D3B6E] transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setConfirm({ id: p.id, name: p.name })} title="Delete" className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )
              }
            ]}
            data={filtered}
            keyField="id"
          />
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? 'Add Item' : 'Edit Item'} size="lg">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Item type selector */}
          <div className="col-span-2">
            <label className="form-label">Item Type *</label>
            <div className="flex gap-2">
              {(['product','service','bundle'] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => setForm(f => ({ ...f, item_type: t }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                    form.item_type === t ? 'bg-[#0D3B6E] text-white border-[#0D3B6E]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >{t}</button>
              ))}
            </div>
          </div>
          <div className="col-span-2"><label className="form-label">{form.item_type === 'service' ? 'Service Name' : 'Product Name'} *</label><input {...inputProps('name')} placeholder={form.item_type === 'service' ? 'e.g. Website Design' : 'e.g. Laptop Pro 15'} /></div>
          {form.item_type !== 'service' && <>
            <div><label className="form-label">SKU <span className="text-gray-400 font-normal">(optional)</span></label><input {...inputProps('sku')} placeholder="e.g. ELEC-001" /></div>
            <div><label className="form-label">Barcode <span className="text-gray-400 font-normal">(optional)</span></label><input {...inputProps('barcode')} placeholder="e.g. 6001234567890" /></div>
          </>}
          <div>
            <label className="form-label">Category</label>
            <select {...inputProps('category_id')}>
              <option value="">Select category</option>
              {categories
                .filter(c => form.item_type === 'service' ? c.scope === 'service' : c.scope !== 'service')
                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">
              {form.item_type === 'service' && form.pricing_mode === 'open'
                ? 'Typical Price (GH₵)' : 'Selling Price (GH₵) *'}
            </label>
            <input type="number" {...inputProps('price')} placeholder="0.00" />
            {form.item_type === 'service' && form.pricing_mode === 'open' && (
              <p className="text-xs text-gray-400 mt-1">Not charged — the amount is entered when the service is sold. Leave 0 if there is no typical figure.</p>
            )}
          </div>
          <div><label className="form-label">Cost Price (GH₵)</label><input type="number" {...inputProps('cost_price')} placeholder="0.00" /></div>
          {form.item_type === 'service' ? (
            <>
              <div className="col-span-2">
                <label className="form-label">Kind of work</label>
                <select className="form-input" value={form.service_type}
                  onChange={e => setForm(f => ({
                    ...f,
                    service_type: e.target.value,
                    // Printing and design normally need something sent in, so
                    // the box is ticked for you. It stays yours to change.
                    requires_file: ['printing', 'design'].includes(e.target.value),
                  }))}>
                  {SERVICE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Decides the stages a request for this runs through, and what the client is told
                  it&apos;s doing — a print job goes &ldquo;on the press&rdquo;, a repair is &ldquo;being repaired&rdquo;.
                </p>
              </div>
              <div className="col-span-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" className="mt-0.5" checked={form.requires_file}
                    onChange={e => setForm(f => ({ ...f, requires_file: e.target.checked }))} />
                  <span>
                    <span className="text-sm font-medium text-gray-800">Needs a file from the client</span>
                    <span className="block text-xs text-gray-400">
                      Requests for this can&apos;t be sent without an attachment. Right for artwork
                      and documents; wrong for a call-out, where there&apos;s nothing to attach.
                    </span>
                  </span>
                </label>
              </div>
              <div>
                <label className="form-label">Pricing</label>
                <select {...inputProps('pricing_mode')}>
                  <option value="fixed">Set price</option>
                  <option value="open">Price on request (quoted at sale)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {form.pricing_mode === 'open'
                    ? 'Staff enter the amount at the till. Hidden from the online store, since customers can\u2019t quote themselves.'
                    : 'Always charged at the price above.'}
                </p>
              </div>
              {form.pricing_mode === 'open' ? (
                <>
                  <div>
                    <label className="form-label">Minimum (GH₵) <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input type="number" {...inputProps('min_price')} placeholder="No minimum" />
                  </div>
                  <div>
                    <label className="form-label">Maximum (GH₵) <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input type="number" {...inputProps('max_price')} placeholder="No maximum" />
                    <p className="text-xs text-gray-400 mt-1">Guards against a mistyped amount at the till.</p>
                  </div>
                </>
              ) : (
                <div>
                  <label className="form-label">Unit Type</label>
                  <select {...inputProps('unit_type')}>
                    <option value="fixed">Fixed price</option>
                    <option value="hour">Per hour</option>
                    <option value="day">Per day</option>
                    <option value="unit">Per unit</option>
                  </select>
                </div>
              )}
              {form.pricing_mode !== 'open' && form.unit_type !== 'fixed' && (
                <div><label className="form-label">Duration ({form.unit_type === 'hour' ? 'hours' : 'days'})</label><input type="number" {...inputProps('duration')} placeholder="e.g. 2" /></div>
              )}
              <div>
                <label className="form-label">Revenue Account Code <span className="text-gray-400 font-normal">(optional)</span></label>
                <input {...inputProps('revenue_account_code')} placeholder="e.g. 4010" />
                <p className="text-xs text-gray-400 mt-1">Overrides the default GL account for this service. Leave blank to use 4010 (Service Revenue).</p>
              </div>
            </>
          ) : (
            <>
              <div><label className="form-label">{modal === 'add' ? 'Initial Stock' : 'Stock Quantity'}</label><input type="number" {...inputProps('stock_qty')} placeholder="0" /></div>
              <div><label className="form-label">Low Stock Alert</label><input type="number" {...inputProps('low_stock_threshold')} /></div>
              <div><label className="form-label">Unit</label><input {...inputProps('unit')} placeholder="piece, kg, box…" /></div>
            </>
          )}

          {/* Bundle composer */}
          {form.item_type === 'bundle' && (
            <div className="col-span-2">
              <div className="border-t border-gray-100 pt-4 mt-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bundle Components</p>
                  <button type="button" onClick={() => {
                    const opts = products.filter((p:any) => p.item_type !== 'bundle' && p.is_active && !form.bundle_items.some(bi => bi.product_id === p.id));
                    if (!opts.length) return;
                    setForm(f => ({ ...f, bundle_items: [...f.bundle_items, { product_id: opts[0].id, quantity: 1, name: opts[0].name }] }));
                  }} className="text-xs text-[#0D3B6E] font-semibold hover:underline flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Component
                  </button>
                </div>
                {form.bundle_items.length === 0 && (
                  <p className="text-xs text-gray-400 py-3 text-center border border-dashed border-gray-200 rounded-xl">No components yet. Add products or services that make up this bundle.</p>
                )}
                <div className="space-y-2">
                  {form.bundle_items.map((bi, i) => (
                    <div key={i} className="flex gap-2 items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                      <select
                        className="form-input flex-1 text-sm py-1.5"
                        value={bi.product_id}
                        onChange={e => {
                          const p = products.find((x:any) => x.id === e.target.value);
                          setForm(f => ({ ...f, bundle_items: f.bundle_items.map((b,idx) => idx===i ? { ...b, product_id: e.target.value, name: p?.name||'' } : b) }));
                        }}
                      >
                        {products.filter((p:any) => p.item_type !== 'bundle' && p.is_active).map((p:any) => (
                          <option key={p.id} value={p.id}>{p.name}{p.item_type==='service'?' (service)':''}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs text-gray-400">Qty</span>
                        <input
                          type="number" min="1"
                          className="form-input w-16 text-sm py-1.5 text-center"
                          value={bi.quantity}
                          onChange={e => setForm(f => ({ ...f, bundle_items: f.bundle_items.map((b,idx) => idx===i ? { ...b, quantity: Math.max(1,parseInt(e.target.value)||1) } : b) }))}
                        />
                      </div>
                      <button type="button" onClick={() => setForm(f => ({ ...f, bundle_items: f.bundle_items.filter((_,idx)=>idx!==i) }))} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {form.bundle_items.length > 0 && (() => {
                  const total = form.bundle_items.reduce((sum, bi) => {
                    const p = products.find((x:any) => x.id === bi.product_id);
                    return sum + (p ? p.cost_price * bi.quantity : 0);
                  }, 0);
                  return total > 0 ? (
                    <p className="text-xs text-gray-400 mt-2 text-right">Component cost total: <span className="font-semibold text-gray-600">GH₵ {total.toFixed(2)}</span></p>
                  ) : null;
                })()}
              </div>
            </div>
          )}

          <div className="col-span-2"><label className="form-label">Description</label><textarea {...inputProps('description')} rows={3} placeholder="Description…" /></div>
          {form.item_type !== 'service' && (
            <div className="col-span-2">
              <ProductImageUpload
                images={form.images}
                onChange={(images) => setForm({ ...form, images })}
              />
            </div>
          )}

          {/* Dynamic category attributes */}
          {(() => {
            if (form.item_type === 'service') return null;
            const cat = categories.find(c => c.id === form.category_id);
            const fields: FieldDef[] = cat?.custom_fields || [];
            if (!fields.length) return null;
            return (
              <div className="col-span-2">
                <div className="border-t border-gray-100 pt-4 mt-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{cat.name} Attributes</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {fields.map(field => (
                      <div key={field.key}>
                        <label className="form-label">
                          {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        {field.type === 'select' ? (
                          <select
                            className="form-input"
                            value={form.attributes[field.key] ?? ''}
                            onChange={e => setForm(f => ({ ...f, attributes: { ...f.attributes, [field.key]: e.target.value } }))}
                          >
                            <option value="">Select…</option>
                            {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : field.type === 'boolean' ? (
                          <div className="flex items-center gap-3 mt-1">
                            {['Yes','No'].map(v => (
                              <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`attr-${field.key}`}
                                  value={v}
                                  checked={form.attributes[field.key] === v}
                                  onChange={() => setForm(f => ({ ...f, attributes: { ...f.attributes, [field.key]: v } }))}
                                  className="accent-[#0D3B6E]"
                                />
                                <span className="text-sm text-gray-700">{v}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <input
                            type={field.type === 'number' ? 'number' : 'text'}
                            className="form-input"
                            placeholder={field.label}
                            value={form.attributes[field.key] ?? ''}
                            onChange={e => setForm(f => ({ ...f, attributes: { ...f.attributes, [field.key]: e.target.value } }))}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : modal === 'edit' ? `Update ${form.item_type === 'service' ? 'Service' : form.item_type === 'bundle' ? 'Bundle' : 'Product'}` : `Add ${form.item_type === 'service' ? 'Service' : form.item_type === 'bundle' ? 'Bundle' : 'Product'}`}</button>
        </div>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal open={modal === 'adjust'} onClose={() => setModal(null)} title={`Adjust Stock — ${selected?.name}`} size="sm">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        {/* Add / Remove toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-5">
          <button
            onClick={() => setAdjustType('add')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${ adjustType === 'add' ? 'bg-[#0D3B6E] text-white' : 'bg-white text-gray-500 hover:bg-gray-50' }`}
          >+ Add Stock</button>
          <button
            onClick={() => setAdjustType('remove')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${ adjustType === 'remove' ? 'bg-red-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50' }`}
          >− Remove Stock</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="form-label">Quantity</label>
            <input
              type="number" min="1" className="form-input" placeholder="Enter quantity"
              value={adjustQty} onChange={e => setAdjustQty(e.target.value.replace(/[^0-9]/g, ''))}
            />
            {/* Live preview */}
            {adjustQty && parseInt(adjustQty) > 0 && (
              <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${ adjustType === 'add' ? 'bg-[#0D3B6E]/8 text-[#0D3B6E]' : 'bg-red-50 text-red-700' }`}>
                {selected?.stock_qty} → <strong>{adjustType === 'add'
                  ? selected?.stock_qty + parseInt(adjustQty)
                  : Math.max(0, selected?.stock_qty - parseInt(adjustQty))
                } {selected?.unit}</strong>
                {adjustType === 'remove' && parseInt(adjustQty) > selected?.stock_qty && (
                  <span className="ml-2 font-semibold">⚠ Exceeds current stock</span>
                )}
              </div>
            )}
          </div>
          <div><label className="form-label">Reason / Notes</label><input className="form-input" placeholder="e.g. Received from supplier" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button
            className={adjustType === 'add' ? 'btn-primary' : 'btn-danger'}
            onClick={doAdjust} disabled={saving || !adjustQty || parseInt(adjustQty) <= 0}
          >{saving ? 'Saving…' : adjustType === 'add' ? 'Add Stock' : 'Remove Stock'}</button>
        </div>
      </Modal>

      </>) /* end products tab */}

      {/* ── CATEGORIES TAB ── */}
      {tab === 'categories' && (
        <div className="space-y-8">
          {loading ? <Spinner /> : (
            (['product','service'] as const).map(scope => {
              const scoped = categories.filter(c => (c.scope || 'product') === scope);
              const isService = scope === 'service';
              const accent = isService ? 'purple' : 'blue';
              const headerBg = isService ? 'bg-purple-50 border-purple-100' : 'bg-blue-50 border-blue-100';
              const iconBg   = isService ? 'bg-purple-100 text-purple-600' : 'bg-[#0D3B6E]/10 text-[#0D3B6E]';
              const badgeBg  = isService ? 'bg-purple-100 text-purple-700' : 'bg-[#0D3B6E]/8 text-[#0D3B6E]';
              const fieldBg  = isService ? 'bg-purple-50 text-purple-600' : 'bg-[#0D3B6E]/8 text-[#0D3B6E]';
              return (
                <div key={scope}>
                  {/* Section header */}
                  <div className={`flex items-center justify-between px-4 py-3 rounded-xl border mb-4 ${headerBg}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${iconBg}`}>
                        {isService ? <Wrench className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{isService ? 'Service Categories' : 'Product Categories'}</p>
                        <p className="text-xs text-gray-500">{scoped.length} {scoped.length === 1 ? 'category' : 'categories'}</p>
                      </div>
                    </div>
                    <button
                      className="btn-primary text-xs px-3 py-1.5"
                      onClick={() => { setSelectedCat(null); setCatForm({ name:'', description:'', scope, custom_fields:[] }); setSelectedTemplate(''); setModal('cat-add'); }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add {isService ? 'Service' : 'Product'} Category
                    </button>
                  </div>

                  {/* Cards grid */}
                  {scoped.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 flex flex-col items-center gap-2 text-center">
                      <FolderOpen className="w-8 h-8 text-gray-300" />
                      <p className="text-sm font-medium text-gray-400">No {isService ? 'service' : 'product'} categories yet</p>
                      <button
                        className="text-xs text-[#0D3B6E] font-semibold hover:underline mt-1"
                        onClick={() => { setSelectedCat(null); setCatForm({ name:'', description:'', scope, custom_fields:[] }); setSelectedTemplate(''); setModal('cat-add'); }}
                      >+ Add one now</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {scoped.map(c => {
                        const count = products.filter(p => (p.category_id?._id || p.category_id) === c.id).length;
                        const fields: FieldDef[] = c.custom_fields || [];
                        return (
                          <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow flex flex-col gap-3">
                            {/* Card header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${iconBg}`}>
                                  {c.name.charAt(0).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
                                  {c.description && <p className="text-xs text-gray-400 truncate mt-0.5">{c.description}</p>}
                                </div>
                              </div>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badgeBg}`}>
                                {count} item{count !== 1 ? 's' : ''}
                              </span>
                            </div>

                            {/* Custom fields */}
                            <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                              {fields.length === 0 ? (
                                <span className="text-xs text-gray-300 italic">No custom fields</span>
                              ) : (
                                <>
                                  {fields.slice(0, 4).map(f => (
                                    <span key={f.key} className={`text-xs px-2 py-0.5 rounded-full ${fieldBg}`}>{f.label}</span>
                                  ))}
                                  {fields.length > 4 && (
                                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">+{fields.length - 4} more</span>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-1 pt-1 border-t border-gray-100">
                              <button
                                onClick={() => { setSelectedCat(c); setCatForm({ name:c.name, description:c.description||'', scope:c.scope||'product', custom_fields:c.custom_fields||[] }); setSelectedTemplate(''); setModal('cat-edit'); }}
                                className="flex items-center gap-1.5 text-xs text-[#0D3B6E] font-medium px-2.5 py-1.5 rounded-lg hover:bg-[#0D3B6E]/8 transition-colors"
                              ><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                              <button
                                onClick={() => setCatConfirm(c)}
                                className="flex items-center gap-1.5 text-xs text-red-500 font-medium px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                title={count > 0 ? `${count} items use this category` : 'Delete'}
                              ><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => doDelete(confirm?.id)} title="Delete Product" message={`Are you sure you want to deactivate "${confirm?.name}"? It will be hidden from the storefront.`} danger />

      {/* ── LOCATIONS TAB ── */}
      {tab === 'locations' && (
        <div>
          <div className="flex justify-end mb-4">
            <button className="btn-primary" onClick={() => { setSelectedLoc(null); setLocForm({ name:'', code:'', type:'shelf', description:'' }); setModal('loc-add'); }}>
              <Plus className="w-4 h-4" /> Add Location
            </button>
          </div>
          <div className="card p-0 overflow-hidden">
            {loading ? <Spinner /> : locations.length === 0
              ? <EmptyState message="No locations yet" description="Add shelves, zones or bins to track where products are stored." icon={<MapPin className="w-8 h-8 text-gray-300" />} action={{ label: '+ Add Location', onClick: () => { setSelectedLoc(null); setLocForm({ name:'', code:'', type:'shelf', description:'' }); setModal('loc-add'); } }} />
              : (
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>{['Name','Code','Type','Description','Products',''].map(h => <th key={h} className="px-5 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {locations.map(l => {
                    const count = products.filter(p => p.location_id === l.id || p.location_id?._id === l.id).length;
                    return (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3.5">
                          <span className="flex items-center gap-2 font-medium text-gray-900">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" /> {l.name}
                          </span>
                        </td>
                        <td className="px-5 py-3.5"><span className="font-mono text-xs text-gray-500">{l.code || '—'}</span></td>
                        <td className="px-5 py-3.5"><span className="badge badge-blue capitalize">{l.type}</span></td>
                        <td className="px-5 py-3.5 text-gray-400 text-xs">{l.description || '—'}</td>
                        <td className="px-5 py-3.5"><span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{count} product{count !== 1 ? 's' : ''}</span></td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setSelectedLoc(l); setLocForm({ name:l.name, code:l.code||'', type:l.type, description:l.description||'' }); setModal('loc-edit'); }} className="p-1.5 hover:bg-[#0D3B6E]/8 rounded-lg text-[#0D3B6E]"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => setLocConfirm(l)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog open={!!catConfirm} onClose={() => setCatConfirm(null)} onConfirm={() => { deleteCat(catConfirm?.id); setCatConfirm(null); }} title="Delete Category" message={`Delete "${catConfirm?.name}"? Products in this category will become uncategorised.`} danger />
      <ConfirmDialog open={!!locConfirm} onClose={() => setLocConfirm(null)} onConfirm={() => { deleteLoc(locConfirm?.id); setLocConfirm(null); }} title="Delete Location" message={`Delete "${locConfirm?.name}"? Products assigned here will lose their location.`} danger />

      {/* Print Label Modal */}
      {labelProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setLabelProduct(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

            <div className="bg-[#0D3B6E] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-yellow-400" />
                <h2 className="font-bold text-white">Print Barcode Label</h2>
              </div>
              <button onClick={() => setLabelProduct(null)} className="text-white/60 hover:text-white">
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>

            <div className="p-6">
              {/* Label preview — always shows 1, quantity shown as badge */}
              <div id="label-print-area">
                <div className="border border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center bg-white relative">
                  {labelQty > 1 && (
                    <span className="absolute top-2 right-2 bg-[#0D3B6E] text-white text-xs font-bold px-2 py-0.5 rounded-full">&times;{labelQty}</span>
                  )}
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">GEMS Store</p>
                  <p className="text-sm font-bold text-gray-900 text-center mb-2 leading-tight">{labelProduct.name}</p>
                  <svg ref={barcodeRef} className="w-full" />
                  <p className="text-lg font-extrabold text-gray-900 mt-2">GH₵ {parseFloat(labelProduct.price).toFixed(2)}</p>
                </div>
              </div>

              {/* Quantity selector */}
              <div className="flex items-center justify-between mt-4 mb-5">
                <span className="text-sm font-semibold text-gray-700">Number of labels</span>
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                  <button onClick={() => setLabelQty(q => Math.max(1, q - 1))} className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold">−</button>
                  <span className="text-sm font-bold text-gray-900 w-6 text-center">{labelQty}</span>
                  <button onClick={() => setLabelQty(q => Math.min(20, q + 1))} className="w-6 h-6 rounded-full bg-[#0D3B6E] flex items-center justify-center text-white hover:bg-[#1A5294] font-bold">+</button>
                </div>
              </div>

              <button
                onClick={() => {
                  const printArea = document.getElementById('label-print-area');
                  if (!printArea) return;
                  const win = window.open('', '_blank', 'width=400,height=600');
                  if (!win) return;
                  win.document.write(`
                    <html><head><title>Barcode Labels — ${labelProduct.sku}</title>
                    <style>
                      body { margin: 0; padding: 16px; font-family: sans-serif; }
                      .label { border: 1px dashed #ccc; border-radius: 8px; padding: 12px; margin-bottom: 12px; text-align: center; page-break-inside: avoid; }
                      .store { font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; }
                      .name  { font-size: 13px; font-weight: bold; color: #111; margin-bottom: 8px; }
                      .price { font-size: 18px; font-weight: 900; color: #111; margin-top: 8px; }
                      svg    { width: 100%; }
                      @media print { body { padding: 0; } }
                    </style></head><body>
                    ${Array.from({ length: labelQty }).map(() => `
                      <div class="label">
                        <div class="store">GEMS Store</div>
                        <div class="name">${labelProduct.name}</div>
                        ${printArea.querySelector('svg')?.outerHTML || ''}
                        <div class="price">GH₵ ${parseFloat(labelProduct.price).toFixed(2)}</div>
                      </div>`).join('')}
                    </body></html>`);
                  win.document.close();
                  win.focus();
                  setTimeout(() => { win.print(); win.close(); }, 400);
                }}
                className="w-full bg-[#0D3B6E] hover:bg-[#1A5294] text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Tag className="w-4 h-4" />
                Print {labelQty} Label{labelQty > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Category Add/Edit Modal */}
      <Modal open={modal === 'cat-add' || modal === 'cat-edit'} onClose={() => setModal(null)} title={modal === 'cat-edit' ? 'Edit Category' : 'Add Category'} size="lg">
        <div className="space-y-4">
          {/* Name + Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Name *</label>
              <input className="form-input" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="e.g. Clothing" autoFocus />
            </div>
            <div>
              <label className="form-label">Description</label>
              <input className="form-input" value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} placeholder="Optional" />
            </div>
          </div>

          {/* Scope selector */}
          <div>
            <label className="form-label">Category Type</label>
            <div className="flex gap-2">
              {(['product','service'] as const).map(s => (
                <button key={s} type="button"
                  onClick={() => setCatForm(f => ({ ...f, scope: s }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                    catForm.scope === s ? 'bg-[#0D3B6E] text-white border-[#0D3B6E]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >{s === 'product' ? <><Package className="w-3.5 h-3.5" /> Product</> : <><Wrench className="w-3.5 h-3.5" /> Service</>}</button>
              ))}
            </div>
          </div>

          {/* Template picker */}
          <div>
            <label className="form-label">Start from a template <span className="text-gray-400 font-normal">(optional)</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(CATEGORY_TEMPLATES).map(([key, t]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyTemplate(selectedTemplate === key ? '' : key)}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                    selectedTemplate === key
                      ? 'border-[#0D3B6E] bg-[#0D3B6E]/5 text-[#0D3B6E]'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-center leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom fields builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0">Custom Fields <span className="text-gray-400 font-normal">({catForm.custom_fields.length})</span></label>
              <button type="button" onClick={addField} className="text-xs text-[#0D3B6E] font-semibold hover:underline flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Field
              </button>
            </div>

            {catForm.custom_fields.length === 0 && (
              <p className="text-xs text-gray-400 py-3 text-center border border-dashed border-gray-200 rounded-xl">
                No custom fields yet. Pick a template above or add fields manually.
              </p>
            )}

            <div className="space-y-2">
              {catForm.custom_fields.map((field, i) => (
                <div key={i} className="flex gap-2 items-start bg-gray-50 border border-gray-200 rounded-xl p-2.5">
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="col-span-2 sm:col-span-1">
                      <input
                        className="form-input text-xs py-1.5"
                        placeholder="Label"
                        value={field.label}
                        onChange={e => handleFieldLabel(i, e.target.value)}
                      />
                    </div>
                    <div>
                      <select
                        className="form-input text-xs py-1.5"
                        value={field.type}
                        onChange={e => updateField(i, { type: e.target.value as FieldDef['type'] })}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="select">Select</option>
                        <option value="boolean">Yes / No</option>
                      </select>
                    </div>
                    {field.type === 'select' ? (
                      <div className="col-span-2 sm:col-span-1">
                        <input
                          className="form-input text-xs py-1.5"
                          placeholder="Options (comma separated)"
                          value={(field.options || []).join(',')}
                          onChange={e => updateField(i, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                        <input
                          type="checkbox"
                          id={`req-${i}`}
                          checked={!!field.required}
                          onChange={e => updateField(i, { required: e.target.checked })}
                          className="w-3.5 h-3.5 accent-[#0D3B6E]"
                        />
                        <label htmlFor={`req-${i}`} className="text-xs text-gray-500 cursor-pointer">Required</label>
                      </div>
                    )}
                    {field.type === 'select' && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          id={`req-${i}`}
                          checked={!!field.required}
                          onChange={e => updateField(i, { required: e.target.checked })}
                          className="w-3.5 h-3.5 accent-[#0D3B6E]"
                        />
                        <label htmlFor={`req-${i}`} className="text-xs text-gray-500 cursor-pointer">Required</label>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => removeField(i)} className="text-gray-400 hover:text-red-500 mt-1 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-5">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveCat} disabled={saving}>{saving ? 'Saving…' : modal === 'cat-edit' ? 'Update' : 'Add Category'}</button>
        </div>
      </Modal>

      {/* Location Add/Edit Modal */}
      <Modal open={modal === 'loc-add' || modal === 'loc-edit'} onClose={() => setModal(null)} title={modal === 'loc-edit' ? 'Edit Location' : 'Add Location'} size="sm">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Name *</label>
              <input className="form-input" value={locForm.name} onChange={e => setLocForm({...locForm, name: e.target.value})} placeholder="e.g. Shelf A1" autoFocus />
            </div>
            <div>
              <label className="form-label">Code</label>
              <input className="form-input" value={locForm.code} onChange={e => setLocForm({...locForm, code: e.target.value})} placeholder="e.g. A1" />
            </div>
          </div>
          <div>
            <label className="form-label">Type</label>
            <select className="form-input" value={locForm.type} onChange={e => setLocForm({...locForm, type: e.target.value})}>
              {['warehouse','zone','shelf','bin','room','other'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} value={locForm.description} onChange={e => setLocForm({...locForm, description: e.target.value})} placeholder="Optional notes about this location" />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-5">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveLoc} disabled={saving}>{saving ? 'Saving…' : modal === 'loc-edit' ? 'Update' : 'Add Location'}</button>
        </div>
      </Modal>

    </AppLayout>
  );
}
