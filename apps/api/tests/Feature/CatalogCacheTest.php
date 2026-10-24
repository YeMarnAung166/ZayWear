<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogCacheTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_catalogue_reads_are_served_from_the_cache_after_the_first_request(): void
    {
        $this->getJson('/api/products')
            ->assertOk()
            ->assertHeader('X-Api-Cache', 'MISS');

        $this->getJson('/api/products')
            ->assertOk()
            ->assertHeader('X-Api-Cache', 'HIT');
    }

    public function test_failed_lookups_are_not_cached(): void
    {
        $this->getJson('/api/products/does-not-exist')
            ->assertNotFound()
            ->assertHeaderMissing('X-Api-Cache');

        $this->getJson('/api/products/does-not-exist')
            ->assertNotFound()
            ->assertHeaderMissing('X-Api-Cache');
    }
}
