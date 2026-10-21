<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['slug' => 'men', 'name_mm' => 'အမျိုးသား', 'name_en' => 'Men', 'sort_order' => 1],
            ['slug' => 'women', 'name_mm' => 'အမျိုးသမီး', 'name_en' => 'Women', 'sort_order' => 2],
        ];

        foreach ($categories as $category) {
            Category::query()->updateOrCreate(
                ['slug' => $category['slug']],
                $category + ['is_active' => true],
            );
        }
    }
}
