<?php

namespace Tests\Feature;

use App\Models\Township;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class TownshipsImportTest extends TestCase
{
    use RefreshDatabase;

    private string $directory;

    protected function setUp(): void
    {
        parent::setUp();

        $this->directory = storage_path('app/testing/townships');
        File::ensureDirectoryExists($this->directory);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory(storage_path('app/testing'));

        parent::tearDown();
    }

    public function test_it_imports_townships_and_upserts_on_a_second_run(): void
    {
        $path = $this->csv(<<<'CSV'
        region,name_mm,name_en,delivery_fee_mmk,is_active
        Yangon,ကျောက်တံတား,Kyauktada,1500,1
        Mandalay,ချမ်းအေးသာစံ,Chanayethazan,2500,1
        CSV);

        $this->artisan('townships:import', ['path' => $path])->assertExitCode(0);

        $this->assertSame(2, Township::query()->count());
        $this->assertDatabaseHas('townships', [
            'region' => 'Yangon',
            'name_en' => 'Kyauktada',
            'name_mm' => 'ကျောက်တံတား',
            'delivery_fee_mmk' => 1500,
            'is_active' => true,
        ]);

        $path = $this->csv(<<<'CSV'
        region,name_mm,name_en,delivery_fee_mmk,is_active
        Yangon,ကျောက်တံတား,Kyauktada,3500,1
        Mandalay,ချမ်းအေးသာစံ,Chanayethazan,2500,1
        CSV);

        $this->artisan('townships:import', ['path' => $path])->assertExitCode(0);

        $this->assertSame(2, Township::query()->count());
        $this->assertSame(3500, Township::query()->where('name_en', 'Kyauktada')->value('delivery_fee_mmk'));
    }

    public function test_a_dry_run_writes_nothing(): void
    {
        $path = $this->csv(<<<'CSV'
        region,name_mm,name_en,delivery_fee_mmk,is_active
        Yangon,ကျောက်တံတား,Kyauktada,1500,1
        CSV);

        $this->artisan('townships:import', ['path' => $path, '--dry-run' => true])->assertExitCode(0);

        $this->assertSame(0, Township::query()->count());
    }

    public function test_deactivate_missing_hides_rows_that_left_the_courier_list(): void
    {
        Township::query()->create([
            'region' => 'Yangon',
            'name_mm' => 'မရှိတော့သော မြို့နယ်',
            'name_en' => 'Removed Township',
            'delivery_fee_mmk' => 1500,
            'is_active' => true,
        ]);

        $path = $this->csv(<<<'CSV'
        region,name_mm,name_en,delivery_fee_mmk,is_active
        Yangon,ကျောက်တံတား,Kyauktada,1500,1
        CSV);

        $this->artisan('townships:import', ['path' => $path, '--deactivate-missing' => true])
            ->assertExitCode(0);

        $this->assertFalse(Township::query()->where('name_en', 'Removed Township')->value('is_active'));
        $this->assertTrue(Township::query()->where('name_en', 'Kyauktada')->value('is_active'));
    }

    public function test_it_rejects_invalid_rows_without_writing_anything(): void
    {
        $path = $this->csv(<<<'CSV'
        region,name_mm,name_en,delivery_fee_mmk,is_active
        Yangon,ကျောက်တံတား,Kyauktada,free,1
        Yangon,ဗဟန်း,Bahan,1500,maybe
        CSV);

        $this->artisan('townships:import', ['path' => $path])->assertExitCode(1);

        $this->assertSame(0, Township::query()->count());
    }

    public function test_it_rejects_a_missing_column(): void
    {
        $path = $this->csv(<<<'CSV'
        region,name_mm,name_en
        Yangon,ကျောက်တံတား,Kyauktada
        CSV);

        $this->artisan('townships:import', ['path' => $path])->assertExitCode(1);

        $this->assertSame(0, Township::query()->count());
    }

    private function csv(string $contents): string
    {
        $path = $this->directory.'/townships-'.uniqid().'.csv';

        // Include a BOM: Excel's "CSV UTF-8" export writes one.
        File::put($path, "\xEF\xBB\xBF".$contents);

        return $path;
    }
}
