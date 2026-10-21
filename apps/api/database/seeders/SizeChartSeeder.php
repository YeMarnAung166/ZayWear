<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\SizeChart;
use Illuminate\Database\Seeder;

class SizeChartSeeder extends Seeder
{
    public function run(): void
    {
        $men = Category::query()->where('slug', 'men')->first();
        $women = Category::query()->where('slug', 'women')->first();

        if ($men) {
            SizeChart::query()->updateOrCreate(
                ['category_id' => $men->id],
                [
                    'title_mm' => 'အမျိုးသား အရွယ်အစား ဇယား',
                    'title_en' => 'Men size chart',
                    'rows' => [
                        ['size' => 'S', 'chest_cm' => 92, 'waist_cm' => 76, 'length_cm' => 68, 'chest_in' => 36.2, 'waist_in' => 29.9, 'length_in' => 26.8],
                        ['size' => 'M', 'chest_cm' => 98, 'waist_cm' => 82, 'length_cm' => 70, 'chest_in' => 38.6, 'waist_in' => 32.3, 'length_in' => 27.6],
                        ['size' => 'L', 'chest_cm' => 104, 'waist_cm' => 88, 'length_cm' => 72, 'chest_in' => 40.9, 'waist_in' => 34.6, 'length_in' => 28.3],
                        ['size' => 'XL', 'chest_cm' => 110, 'waist_cm' => 94, 'length_cm' => 74, 'chest_in' => 43.3, 'waist_in' => 37.0, 'length_in' => 29.1],
                        ['size' => 'XXL', 'chest_cm' => 116, 'waist_cm' => 100, 'length_cm' => 76, 'chest_in' => 45.7, 'waist_in' => 39.4, 'length_in' => 29.9],
                    ],
                ],
            );
        }

        if ($women) {
            SizeChart::query()->updateOrCreate(
                ['category_id' => $women->id],
                [
                    'title_mm' => 'အမျိုးသမီး အရွယ်အစား ဇယား',
                    'title_en' => 'Women size chart',
                    'rows' => [
                        ['size' => 'S', 'chest_cm' => 84, 'waist_cm' => 66, 'length_cm' => 62, 'chest_in' => 33.1, 'waist_in' => 26.0, 'length_in' => 24.4],
                        ['size' => 'M', 'chest_cm' => 88, 'waist_cm' => 70, 'length_cm' => 64, 'chest_in' => 34.6, 'waist_in' => 27.6, 'length_in' => 25.2],
                        ['size' => 'L', 'chest_cm' => 92, 'waist_cm' => 74, 'length_cm' => 66, 'chest_in' => 36.2, 'waist_in' => 29.1, 'length_in' => 26.0],
                        ['size' => 'XL', 'chest_cm' => 96, 'waist_cm' => 78, 'length_cm' => 68, 'chest_in' => 37.8, 'waist_in' => 30.7, 'length_in' => 26.8],
                    ],
                ],
            );
        }
    }
}
