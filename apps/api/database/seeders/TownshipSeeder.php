<?php

namespace Database\Seeders;

use App\Models\Township;
use Illuminate\Database\Seeder;

/**
 * MOCK DATA — replace with the courier's served-township list before launch.
 * See ARCHITECTURE.md §2 (townships) and implemented.md.
 */
class TownshipSeeder extends Seeder
{
    public function run(): void
    {
        $metro = 1500;
        $secondary = 2500;
        $remote = 3500;

        $rows = [
            // Yangon — metro
            ['Yangon', 'ကျောက်တံတား', 'Kyauktada', $metro],
            ['Yangon', 'ပန်းဘဲတန်း', 'Pabedan', $metro],
            ['Yangon', 'လသာ', 'Latha', $metro],
            ['Yangon', 'လမ်းမတော်', 'Lanmadaw', $metro],
            ['Yangon', 'စမ်းချောင်း', 'Sanchaung', $metro],
            ['Yangon', 'ဗဟန်း', 'Bahan', $metro],
            ['Yangon', 'ဒဂုံ', 'Dagon', $metro],
            ['Yangon', 'မင်္ဂလာတောင်ညွန့်', 'Mingalar Taungnyunt', $metro],
            ['Yangon', 'ရန်ကင်း', 'Yankin', $metro],
            ['Yangon', 'သင်္ဃန်းကျွန်း', 'Thingangyun', $metro],
            ['Yangon', 'တောင်ဥက္ကလာပ', 'South Okkalapa', $metro],
            ['Yangon', 'မြောက်ဥက္ကလာပ', 'North Okkalapa', $metro],
            ['Yangon', 'လှိုင်', 'Hlaing', $metro],
            ['Yangon', 'မရမ်းကုန်း', 'Mayangone', $metro],
            ['Yangon', 'အင်းစိန်', 'Insein', $metro],
            ['Yangon', 'ရွှေပြည်သာ', 'Shwe Pyi Thar', $metro],
            ['Yangon', 'သာကေတ', 'Thaketa', $metro],
            ['Yangon', 'ဒလ', 'Dala', $secondary],

            // Mandalay — metro
            ['Mandalay', 'ချမ်းအေးသာဇံ', 'Chanayethazan', $metro],
            ['Mandalay', 'မဟာအောင်မြေ', 'Mahaaungmyay', $metro],
            ['Mandalay', 'ချမ်းမြသာစည်', 'Chanmyathazi', $metro],
            ['Mandalay', 'ပြည်ကြီးတံခွန်', 'Pyigyidagun', $metro],
            ['Mandalay', 'အောင်မြေသာစံ', 'Aungmyaythazan', $metro],
            ['Mandalay', 'အမရပူရ', 'Amarapura', $secondary],
            ['Mandalay', 'ပုသိမ်ကြီး', 'Patheingyi', $secondary],

            // Naypyidaw — metro
            ['Naypyidaw', 'ဇမ္ဗူသီရိ', 'Zabuthiri', $metro],
            ['Naypyidaw', 'ပုဗ္ဗသီရိ', 'Pobbathiri', $metro],
            ['Naypyidaw', 'ဥတ္တရသီရိ', 'Ottarathiri', $metro],
            ['Naypyidaw', 'ဒက္ခိဏသီရိ', 'Dekkhinathiri', $metro],

            // Secondary towns
            ['Shan', 'တောင်ကြီး', 'Taunggyi', $secondary],
            ['Mon', 'မော်လမြိုင်', 'Mawlamyine', $secondary],
            ['Bago', 'ပဲခူး', 'Bago', $secondary],
            ['Ayeyarwady', 'ပုသိမ်', 'Pathein', $secondary],
            ['Sagaing', 'မုံရွာ', 'Monywa', $secondary],
            ['Magway', 'မကွေး', 'Magway', $secondary],

            // Remote towns
            ['Kachin', 'မြစ်ကြီးနား', 'Myitkyina', $remote],
            ['Rakhine', 'စစ်တွေ', 'Sittwe', $remote],
            ['Kayin', 'ဘားအံ', 'Hpa-An', $remote],
            ['Kayah', 'လွိုင်ကော်', 'Loikaw', $remote],
            ['Chin', 'ဟားခါး', 'Hakha', $remote],
            ['Tanintharyi', 'ထားဝယ်', 'Dawei', $remote],
        ];

        foreach ($rows as [$region, $nameMm, $nameEn, $fee]) {
            Township::query()->updateOrCreate(
                ['region' => $region, 'name_en' => $nameEn],
                [
                    'name_mm' => $nameMm,
                    'delivery_fee_mmk' => $fee,
                    'is_active' => true,
                ],
            );
        }
    }
}
