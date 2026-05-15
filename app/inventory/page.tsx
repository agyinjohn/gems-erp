'use client';
import { useEffect, useState, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, Badge, EmptyState, Spinner, ConfirmDialog, toast, ResponsiveTable } from '@/components/ui';
import { Plus, Search, Edit2, Trash2, TrendingDown, AlertTriangle, Package, Tag, FolderOpen, X, ChevronDown } from 'lucide-react';
import api from '@/lib/api';

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

export default function InventoryPage() {
  const [tab, setTab] = useState<'products'|'categories'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [modal, setModal] = useState<'add'|'edit'|'adjust'|'cat-add'|'cat-edit'|null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [selectedCat, setSelectedCat] = useState<any>(null);
  const [confirm, setConfirm] = useState<any>(null);
  const [catConfirm, setCatConfirm] = useState<any>(null);
  const [form, setForm] = useState({ name:'', sku:'', barcode:'', description:'', category_id:'', price:'', cost_price:'', stock_qty:'', low_stock_threshold:'10', unit:'piece', images:'', attributes: {} as Record<string,any> });
  const [catForm, setCatForm] = useState({ name:'', description:'', custom_fields: [] as FieldDef[] });
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

  const load = async () => {
    setLoading(true);
    const [p, c] = await Promise.all([api.get('/products'), api.get('/categories')]);
    setProducts(p.data.data);
    setCategories(c.data.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = products.filter(p =>
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())) &&
    (!filterCat || (p.category_id?._id || p.category_id) == filterCat)
  );

  const openAdd = () => { setForm({ name:'',sku:'',barcode:'',description:'',category_id:'',price:'',cost_price:'',stock_qty:'',low_stock_threshold:'10',unit:'piece',images:'',attributes:{} }); setError(''); setModal('add'); };
  const openEdit = (p: any) => { setSelected(p); setForm({ name:p.name,sku:p.sku,barcode:p.barcode||'',description:p.description||'',category_id:p.category_id?._id||p.category_id||'',price:p.price,cost_price:p.cost_price,stock_qty:p.stock_qty,low_stock_threshold:p.low_stock_threshold,unit:p.unit,images:p.images?.[0]||'',attributes:p.attributes||{} }); setError(''); setModal('edit'); };
  const openAdjust = (p: any) => { setSelected(p); setAdjustQty(''); setAdjustType('add'); setAdjustNote(''); setModal('adjust'); };

  const save = async () => {
    setSaving(true); setError('');
    const payload = { ...form, barcode: form.barcode.trim() || null, images: form.images.trim() ? [form.images.trim()] : [] };
    try {
      if (modal === 'add') await api.post('/products', payload);
      else await api.put(`/products/${selected.id}`, payload);
      toast.success('Saved successfully'); setModal(null); load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Error saving product'); }
    finally { setSaving(false); }
  };

  const doAdjust = async () => {
    if (!adjustQty || parseInt(adjustQty) <= 0) return;
    const delta = adjustType === 'remove' ? -Math.abs(parseInt(adjustQty)) : Math.abs(parseInt(adjustQty));
    setSaving(true);
    try { await api.post(`/products/${selected.id}/adjust-stock`, { quantity: delta, notes: adjustNote }); toast.success('Stock adjusted'); setModal(null); load(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const doDelete = async (id: number) => {
    await api.delete(`/products/${id}`);
    toast.success('Deleted successfully');
    load();
  };

  const saveCat = async () => {
    if (!catForm.name.trim()) { toast.error('Category name is required'); return; }
    setSaving(true);
    try {
      if (selectedCat) await api.put(`/categories/${selectedCat.id}`, catForm);
      else await api.post('/categories', catForm);
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
      toast.success('Category deleted'); load();
    } catch(e: any) { toast.error(e.response?.data?.message || 'Cannot delete — category may be in use'); }
  };

  const inputProps = (key: string) => ({ value: (form as any)[key], onChange: (e: any) => setForm({...form, [key]: e.target.value}), className: 'form-input' });

  return (
    <AppLayout title="Inventory" subtitle="Manage products, stock levels and categories" allowedRoles={['business_owner','branch_manager','warehouse_staff']}>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-5 w-fit">
        <button onClick={() => setTab('products')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ tab==='products' ? 'bg-[#0D3B6E] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50' }`}>
          <Package className="w-4 h-4" /> Products
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${ tab==='products' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500' }`}>{products.length}</span>
        </button>
        <button onClick={() => setTab('categories')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ tab==='categories' ? 'bg-[#0D3B6E] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50' }`}>
          <FolderOpen className="w-4 h-4" /> Categories
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${ tab==='categories' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500' }`}>{categories.length}</span>
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
        <button className="btn-primary w-full sm:w-auto" onClick={openAdd}><Plus className="w-4 h-4" />Add Product</button>
      </div>

      {/* Low stock alert */}
      {products.filter(p => p.stock_qty <= p.low_stock_threshold).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 sm:px-4 py-3 flex items-start sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-5 text-xs sm:text-sm text-yellow-800">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <span><strong>{products.filter(p => p.stock_qty <= p.low_stock_threshold).length} products</strong> are at or below their low stock threshold.</span>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState message="No products found" description={search || filterCat ? 'Try adjusting your search or filter.' : 'Add your first product to get started.'} icon={<Package className="w-9 h-9 text-gray-300" />} action={!search && !filterCat ? { label: '+ Add Product', onClick: openAdd } : undefined} /> : (
          <ResponsiveTable
            columns={[
              {
                key: 'name',
                label: 'Product',
                render: (_, p) => (
                  <div>
                    <div className="font-medium text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{p.sku}</div>
                  </div>
                )
              },
              {
                key: 'category',
                label: 'Category',
                render: (_, p) => p.category_name
                  ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{p.category_name}</span>
                  : <span className="text-gray-300">—</span>
              },
              {
                key: 'price',
                label: 'Price',
                render: (_, p) => (
                  <div>
                    <div className="font-semibold text-gray-900">GH₵ {parseFloat(p.price).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</div>
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
                    <span className={`font-semibold text-sm ${ margin >= 30 ? 'text-green-600' : margin >= 15 ? 'text-yellow-600' : 'text-red-500' }`}>
                      {margin}%
                    </span>
                  );
                }
              },
              {
                key: 'stock',
                label: 'Stock Level',
                render: (_, p) => {
                  const isLow = p.stock_qty <= p.low_stock_threshold;
                  const isOut = p.stock_qty === 0;
                  const stockPct = Math.min(100, Math.round((p.stock_qty / Math.max(p.low_stock_threshold * 3, 1)) * 100));
                  const stockColor = isOut ? 'bg-red-500' : isLow ? 'bg-yellow-400' : 'bg-green-500';
                  const stockLabel = isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock';
                  const stockTextColor = isOut ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-green-600';
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
                    <button onClick={() => { setLabelProduct(p); setLabelQty(1); }} title="Print Label" className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-500 transition-colors"><Tag className="w-4 h-4" /></button>
                    <button onClick={() => openAdjust(p)} title="Adjust Stock" className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"><TrendingDown className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(p)} title="Edit" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
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
      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? 'Add Product' : 'Edit Product'} size="lg">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="col-span-2"><label className="form-label">Product Name *</label><input {...inputProps('name')} placeholder="e.g. Laptop Pro 15" /></div>
          <div><label className="form-label">SKU <span className="text-gray-400 font-normal">(optional — auto-generated if blank)</span></label><input {...inputProps('sku')} placeholder="e.g. ELEC-001" /></div>
          <div><label className="form-label">Barcode <span className="text-gray-400 font-normal">(optional — EAN, UPC etc.)</span></label><input {...inputProps('barcode')} placeholder="e.g. 6001234567890" /></div>
          <div>
            <label className="form-label">Category</label>
            <select {...inputProps('category_id')}><option value="">Select category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
          <div><label className="form-label">Selling Price (GH₵) *</label><input type="number" {...inputProps('price')} placeholder="0.00" /></div>
          <div><label className="form-label">Cost Price (GH₵)</label><input type="number" {...inputProps('cost_price')} placeholder="0.00" /></div>
          <div><label className="form-label">{modal === 'add' ? 'Initial Stock' : 'Stock Quantity'}</label><input type="number" {...inputProps('stock_qty')} placeholder="0" /></div>
          <div><label className="form-label">Low Stock Alert</label><input type="number" {...inputProps('low_stock_threshold')} /></div>
          <div><label className="form-label">Unit</label><input {...inputProps('unit')} placeholder="piece, kg, box…" /></div>
          <div className="col-span-2"><label className="form-label">Description</label><textarea {...inputProps('description')} rows={3} placeholder="Product description…" /></div>
          <div className="col-span-2">
            <label className="form-label">Image URL</label>
            <input {...inputProps('images')} placeholder="https://example.com/image.jpg" />
            {form.images.trim() && (
              <div className="mt-2 flex items-center gap-3">
                <img src={form.images.trim()} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className="text-xs text-gray-400">Image preview</span>
              </div>
            )}
          </div>

          {/* Dynamic category attributes */}
          {(() => {
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
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Product'}</button>
        </div>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal open={modal === 'adjust'} onClose={() => setModal(null)} title={`Adjust Stock — ${selected?.name}`} size="sm">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        {/* Add / Remove toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-5">
          <button
            onClick={() => setAdjustType('add')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${ adjustType === 'add' ? 'bg-green-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50' }`}
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
              <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${ adjustType === 'add' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700' }`}>
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
        <div>
          <div className="flex justify-end mb-4">
            <button className="btn-primary" onClick={() => { setSelectedCat(null); setCatForm({ name:'', description:'', custom_fields:[] }); setSelectedTemplate(''); setModal('cat-add'); }}>
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>
          <div className="card p-0 overflow-hidden">
            {loading ? <Spinner /> : categories.length === 0
              ? <EmptyState message="No categories yet" icon={<FolderOpen className="w-8 h-8 text-gray-300" />} />
              : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="px-5 py-3 text-left">Name</th>
                    <th className="px-5 py-3 text-left hidden md:table-cell">Description</th>
                    <th className="px-5 py-3 text-left">Fields</th>
                    <th className="px-5 py-3 text-right">Products</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {categories.map(c => {
                    const count = products.filter(p => (p.category_id?._id || p.category_id) === c.id).length;
                    const fields: FieldDef[] = c.custom_fields || [];
                    return (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-2 font-medium text-gray-900">
                            <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                            {c.name}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <span className="text-gray-400 text-xs line-clamp-1 max-w-[200px] block">{c.description || '—'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          {fields.length === 0
                            ? <span className="text-gray-300 text-xs">None</span>
                            : <div className="flex items-center gap-1.5 flex-wrap">
                                {fields.slice(0, 3).map(f => (
                                  <span key={f.key} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full whitespace-nowrap">{f.label}</span>
                                ))}
                                {fields.length > 3 && (
                                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">+{fields.length - 3}</span>
                                )}
                              </div>
                          }
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{count}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setSelectedCat(c); setCatForm({ name: c.name, description: c.description || '', custom_fields: c.custom_fields || [] }); setSelectedTemplate(''); setModal('cat-edit'); }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
                            ><Edit2 className="w-4 h-4" /></button>
                            <button
                              onClick={() => setCatConfirm(c)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"
                              title={count > 0 ? `${count} products use this category` : 'Delete'}
                            ><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => doDelete(confirm?.id)} title="Delete Product" message={`Are you sure you want to deactivate "${confirm?.name}"? It will be hidden from the storefront.`} danger />
      <ConfirmDialog open={!!catConfirm} onClose={() => setCatConfirm(null)} onConfirm={() => { deleteCat(catConfirm?.id); setCatConfirm(null); }} title="Delete Category" message={`Delete "${catConfirm?.name}"? Products in this category will become uncategorised.`} danger />

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

    </AppLayout>
  );
}
