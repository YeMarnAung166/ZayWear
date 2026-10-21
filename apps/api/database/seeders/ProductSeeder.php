<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use Illuminate\Database\Seeder;

/**
 * MOCK CATALOG — 8 products with placeholder art in apps/web/public/mock.
 * Replaced with the real catalog before launch (see implemented.md).
 */
class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $men = Category::query()->where('slug', 'men')->firstOrFail();
        $women = Category::query()->where('slug', 'women')->firstOrFail();

        $products = [
            [
                'category_id' => $men->id,
                'slug' => 'basic-cotton-tee',
                'name_mm' => 'ချည်သား တီရှပ်',
                'name_en' => 'Basic Cotton Tee',
                'description_mm' => 'နေ့စဉ်ဝတ်ဆင်နိုင်သော ချည်သား ၁၀၀% တီရှပ်။ ပြောင်းလဲမှုမရှိသော ပုံစံ၊ နူးညံ့သော အထည်။',
                'description_en' => 'Everyday 100% cotton tee. Straight cut, soft hand feel, holds its shape after washing.',
                'fabric_care_mm' => 'ချည်သား ၁၀၀%။ အအေးရေဖြင့် လျှော်ပါ။ နေပူတွင် အခြောက်မလှန်းပါနှင့်။',
                'fabric_care_en' => '100% cotton. Cold machine wash, dry in shade, warm iron.',
                'base_price_mmk' => 18000,
                'compare_at_price_mmk' => null,
                'is_featured' => true,
                'image' => 'tee-sand.svg',
                'alt_mm' => 'ချည်သား တီရှပ်',
                'alt_en' => 'Basic cotton tee',
                'colors' => [
                    ['Sand', '#D8C3A5', [6, 14, 9, 0]],
                    ['Black', '#1A1A1A', [4, 10, 0, 5]],
                ],
            ],
            [
                'category_id' => $men->id,
                'slug' => 'oxford-shirt',
                'name_mm' => 'အောက်စဖို့ဒ် ရှပ်အင်္ကျီ',
                'name_en' => 'Oxford Shirt',
                'description_mm' => 'ရုံးဝတ်ရန် သင့်တော်သော အောက်စဖို့ဒ် ရှပ်အင်္ကျီ။ လက်ရှည်၊ အိတ်ကပ်တစ်ခု။',
                'description_en' => 'Office-ready oxford shirt with a single chest pocket and a clean collar.',
                'fabric_care_mm' => 'ချည်သား ၉၈%၊ စပန်းဒက်စ် ၂%။ နူးညံ့စွာ လျှော်ပါ။',
                'fabric_care_en' => '98% cotton, 2% elastane. Gentle wash, hang dry.',
                'base_price_mmk' => 42000,
                'compare_at_price_mmk' => 49000,
                'is_featured' => true,
                'image' => 'oxford-white.svg',
                'alt_mm' => 'အဖြူရောင် အောက်စဖို့ဒ် ရှပ်အင်္ကျီ',
                'alt_en' => 'White oxford shirt',
                'colors' => [
                    ['White', '#FAFAFA', [5, 11, 7, 2]],
                    ['Blue', '#7FA8C9', [3, 8, 4, 0]],
                ],
            ],
            [
                'category_id' => $men->id,
                'slug' => 'cargo-pants',
                'name_mm' => 'ကားဂိုး ဘောင်းဘီ',
                'name_en' => 'Cargo Pants',
                'description_mm' => 'ဘေးအိတ်ကပ်များပါသော ခိုင်ခံ့သည့် ကားဂိုး ဘောင်းဘီ။ နေ့စဉ်အသုံးပြုရန်။',
                'description_en' => 'Hard-wearing cargo pants with side pockets and a relaxed straight leg.',
                'fabric_care_mm' => 'ချည်သား ၁၀၀%။ လျှော်စက်ဖြင့် လျှော်နိုင်သည်။',
                'fabric_care_en' => '100% cotton twill. Machine wash cold.',
                'base_price_mmk' => 38000,
                'compare_at_price_mmk' => null,
                'is_featured' => false,
                'image' => 'cargo-olive.svg',
                'alt_mm' => 'စိမ်းညိုရောင် ကားဂိုး ဘောင်းဘီ',
                'alt_en' => 'Olive cargo pants',
                'colors' => [
                    ['Olive', '#5A6247', [4, 9, 6, 3]],
                    ['Black', '#1A1A1A', [2, 7, 5, 1]],
                ],
            ],
            [
                'category_id' => $men->id,
                'slug' => 'linen-short-sleeve',
                'name_mm' => 'လီနင် လက်တို အင်္ကျီ',
                'name_en' => 'Linen Short Sleeve',
                'description_mm' => 'ပူသောရာသီအတွက် လီနင်လက်တို အင်္ကျီ။ လေဝင်လေထွက်ကောင်း။',
                'description_en' => 'Breathable linen shirt built for the hot season. Relaxed fit, camp collar.',
                'fabric_care_mm' => 'လီနင် ၅၅%၊ ချည်သား ၄၅%။ အအေးရေဖြင့် လျှော်ပါ။',
                'fabric_care_en' => '55% linen, 45% cotton. Cold wash, line dry.',
                'base_price_mmk' => 29000,
                'compare_at_price_mmk' => null,
                'is_featured' => false,
                'image' => 'linen-blue.svg',
                'alt_mm' => 'အပြာရောင် လီနင် လက်တို အင်္ကျီ',
                'alt_en' => 'Blue linen short sleeve shirt',
                'colors' => [
                    ['Sky', '#A8C8DC', [7, 12, 8, 4]],
                    ['Sand', '#D8C3A5', [5, 6, 0, 2]],
                ],
            ],
            [
                'category_id' => $women->id,
                'slug' => 'cotton-blouse',
                'name_mm' => 'ချည်သား အင်္ကျီ',
                'name_en' => 'Cotton Blouse',
                'description_mm' => 'ချည်သားဖြင့် ချုပ်ထားသော နူးညံ့သည့် အင်္ကျီ။ လက်ရှည်၊ လည်ပင်းပွပုံစံ။',
                'description_en' => 'Soft cotton blouse with a gathered neckline and long sleeves.',
                'fabric_care_mm' => 'ချည်သား ၁၀၀%။ နူးညံ့စွာ လျှော်ပါ။',
                'fabric_care_en' => '100% cotton. Hand wash cold.',
                'base_price_mmk' => 26000,
                'compare_at_price_mmk' => null,
                'is_featured' => true,
                'image' => 'blouse-cream.svg',
                'alt_mm' => 'ခရင်မ်ရောင် ချည်သား အင်္ကျီ',
                'alt_en' => 'Cream cotton blouse',
                'colors' => [
                    ['Cream', '#EFE6D8', [6, 10, 7, 2]],
                ],
            ],
            [
                'category_id' => $women->id,
                'slug' => 'midi-dress',
                'name_mm' => 'အလယ်အလတ် ဂါဝန်',
                'name_en' => 'Midi Dress',
                'description_mm' => 'ဒူးအောက်အထိ ရှည်သော ဂါဝန်။ ခါးတွင် ကြိုးဖြင့် ချိန်နိုင်သည်။',
                'description_en' => 'Midi-length dress with a tie waist and side pockets.',
                'fabric_care_mm' => 'ဗစ်ကို့စ် ၇၀%၊ လီနင် ၃၀%။ အအေးရေဖြင့် လျှော်ပါ။',
                'fabric_care_en' => '70% viscose, 30% linen. Cold wash, cool iron.',
                'base_price_mmk' => 45000,
                'compare_at_price_mmk' => 55000,
                'is_featured' => true,
                'image' => 'midi-terracotta.svg',
                'alt_mm' => 'အနီညိုရောင် အလယ်အလတ် ဂါဝန်',
                'alt_en' => 'Terracotta midi dress',
                'colors' => [
                    ['Terracotta', '#B4553C', [3, 8, 5, 1]],
                ],
            ],
            [
                'category_id' => $women->id,
                'slug' => 'wide-leg-pants',
                'name_mm' => 'ခြေကျယ် ဘောင်းဘီ',
                'name_en' => 'Wide Leg Pants',
                'description_mm' => 'ခြေကျယ်ပုံစံ ဘောင်းဘီ။ ခါးတွင် ရာဘာကြိုး။',
                'description_en' => 'Wide leg trousers with an elasticated waist and deep pockets.',
                'fabric_care_mm' => 'ပိုလီအက်စတာ ၈၀%၊ ချည်သား ၂၀%။',
                'fabric_care_en' => '80% polyester, 20% cotton. Machine wash cold.',
                'base_price_mmk' => 34000,
                'compare_at_price_mmk' => null,
                'is_featured' => false,
                'image' => 'wideleg-charcoal.svg',
                'alt_mm' => 'မီးခိုးရောင် ခြေကျယ် ဘောင်းဘီ',
                'alt_en' => 'Charcoal wide leg pants',
                'colors' => [
                    ['Charcoal', '#3A3A3A', [5, 9, 6, 2]],
                ],
            ],
            [
                'category_id' => $women->id,
                'slug' => 'ribbed-long-sleeve',
                'name_mm' => 'ရစ် လက်ရှည် အင်္ကျီ',
                'name_en' => 'Ribbed Long Sleeve',
                'description_mm' => 'ကိုယ်ထည်ကို ကပ်နေသော ရစ်ထည် လက်ရှည်။ အေးသောရာသီအတွက်။',
                'description_en' => 'Body-skimming ribbed knit long sleeve for cooler evenings.',
                'fabric_care_mm' => 'ချည်သား ၉၂%၊ စပန်းဒက်စ် ၈%။ လက်ဖြင့် လျှော်ပါ။',
                'fabric_care_en' => '92% cotton, 8% elastane. Hand wash, dry flat.',
                'base_price_mmk' => 22000,
                'compare_at_price_mmk' => null,
                'is_featured' => true,
                'image' => 'ribbed-black.svg',
                'alt_mm' => 'အနက်ရောင် ရစ် လက်ရှည် အင်္ကျီ',
                'alt_en' => 'Black ribbed long sleeve',
                'colors' => [
                    ['Black', '#1A1A1A', [8, 12, 7, 3]],
                    ['Cream', '#EFE6D8', [4, 6, 2, 0]],
                ],
            ],
        ];

        $sizes = ['S', 'M', 'L', 'XL'];

        foreach ($products as $row) {
            $product = Product::query()->updateOrCreate(
                ['slug' => $row['slug']],
                [
                    'category_id' => $row['category_id'],
                    'name_mm' => $row['name_mm'],
                    'name_en' => $row['name_en'],
                    'description_mm' => $row['description_mm'],
                    'description_en' => $row['description_en'],
                    'fabric_care_mm' => $row['fabric_care_mm'],
                    'fabric_care_en' => $row['fabric_care_en'],
                    'base_price_mmk' => $row['base_price_mmk'],
                    'compare_at_price_mmk' => $row['compare_at_price_mmk'],
                    'is_featured' => $row['is_featured'],
                    'is_active' => true,
                ],
            );

            ProductImage::query()->updateOrCreate(
                ['product_id' => $product->id, 'sort_order' => 0],
                [
                    'path' => $row['image'],
                    'alt_mm' => $row['alt_mm'],
                    'alt_en' => $row['alt_en'],
                    'is_primary' => true,
                ],
            );

            foreach ($row['colors'] as [$color, $hex, $stock]) {
                foreach ($sizes as $index => $size) {
                    ProductVariant::query()->updateOrCreate(
                        [
                            'product_id' => $product->id,
                            'size' => $size,
                            'color' => $color,
                        ],
                        [
                            'sku' => sprintf('ZW-%d-%s-%s', $product->id, $size, strtoupper(substr($color, 0, 3))),
                            'color_hex' => $hex,
                            'stock_qty' => $stock[$index],
                            'price_delta_mmk' => 0,
                            'is_active' => true,
                        ],
                    );
                }
            }
        }
    }
}
