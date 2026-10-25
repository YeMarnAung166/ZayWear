<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Product;
use App\Services\CustomerAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WishlistTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_guests_cannot_use_the_wishlist(): void
    {
        $this->getJson('/api/me/wishlist')->assertUnauthorized();
        $this->getJson('/api/me/wishlist/ids')->assertUnauthorized();
        $this->postJson('/api/me/wishlist', ['product_id' => 1])->assertUnauthorized();
        $this->deleteJson('/api/me/wishlist/1')->assertUnauthorized();
    }

    public function test_a_customer_can_save_and_list_a_product(): void
    {
        $customer = $this->customer();
        $token = $this->token($customer);
        $product = $this->product();

        $this->postJson('/api/me/wishlist', ['product_id' => $product->id], $this->bearer($token))
            ->assertCreated()
            ->assertJsonPath('data.product_id', $product->id);

        $this->getJson('/api/me/wishlist', $this->bearer($token))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $product->id)
            ->assertJsonStructure([
                'data' => [
                    [
                        'id',
                        'slug',
                        'name_mm',
                        'name_en',
                        'price_mmk',
                        'variants' => ['*' => ['id', 'size', 'color', 'stock_qty', 'price_mmk']],
                        'sizes',
                        'colors',
                        'in_stock',
                    ],
                ],
            ]);

        $this->getJson('/api/me/wishlist/ids', $this->bearer($token))
            ->assertOk()
            ->assertExactJson(['data' => [$product->id]]);
    }

    public function test_saving_the_same_product_twice_is_idempotent(): void
    {
        $customer = $this->customer();
        $token = $this->token($customer);
        $product = $this->product();

        $this->postJson('/api/me/wishlist', ['product_id' => $product->id], $this->bearer($token))
            ->assertCreated();

        $this->postJson('/api/me/wishlist', ['product_id' => $product->id], $this->bearer($token))
            ->assertOk();

        $this->getJson('/api/me/wishlist', $this->bearer($token))
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->assertDatabaseCount('wishlist_items', 1);
    }

    public function test_wishlist_survives_a_new_session(): void
    {
        $customer = $this->customer();
        $firstToken = $this->token($customer);
        $product = $this->product();

        $this->postJson('/api/me/wishlist', ['product_id' => $product->id], $this->bearer($firstToken))
            ->assertCreated();

        $secondToken = $this->token($customer);

        $this->getJson('/api/me/wishlist/ids', $this->bearer($secondToken))
            ->assertOk()
            ->assertExactJson(['data' => [$product->id]]);

        $this->getJson('/api/me/wishlist', $this->bearer($secondToken))
            ->assertOk()
            ->assertJsonPath('data.0.id', $product->id);
    }

    public function test_wishlist_is_scoped_to_the_customer(): void
    {
        $first = $this->customer('09771234567');
        $second = $this->customer('09771234568');
        $firstToken = $this->token($first);
        $secondToken = $this->token($second);
        $product = $this->product();

        $this->postJson('/api/me/wishlist', ['product_id' => $product->id], $this->bearer($firstToken))
            ->assertCreated();

        $this->getJson('/api/me/wishlist', $this->bearer($secondToken))
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->deleteJson("/api/me/wishlist/{$product->id}", [], $this->bearer($secondToken))
            ->assertOk();

        $this->getJson('/api/me/wishlist', $this->bearer($firstToken))
            ->assertOk()
            ->assertJsonPath('data.0.id', $product->id);
    }

    public function test_deleting_removes_the_item_and_is_idempotent(): void
    {
        $customer = $this->customer();
        $token = $this->token($customer);
        $product = $this->product();

        $this->postJson('/api/me/wishlist', ['product_id' => $product->id], $this->bearer($token))
            ->assertCreated();

        $this->deleteJson("/api/me/wishlist/{$product->id}", [], $this->bearer($token))
            ->assertOk();

        $this->getJson('/api/me/wishlist', $this->bearer($token))
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->deleteJson("/api/me/wishlist/{$product->id}", [], $this->bearer($token))
            ->assertOk();

        $this->assertDatabaseCount('wishlist_items', 0);
    }

    public function test_cannot_save_an_unknown_or_inactive_product(): void
    {
        $customer = $this->customer();
        $token = $this->token($customer);
        $product = $this->product();

        $product->update(['is_active' => false]);

        $this->postJson('/api/me/wishlist', ['product_id' => 999999], $this->bearer($token))
            ->assertNotFound();

        $this->postJson('/api/me/wishlist', ['product_id' => $product->id], $this->bearer($token))
            ->assertNotFound();
    }

    public function test_inactive_products_disappear_from_an_existing_wishlist(): void
    {
        $customer = $this->customer();
        $token = $this->token($customer);
        $product = $this->product();

        $this->postJson('/api/me/wishlist', ['product_id' => $product->id], $this->bearer($token))
            ->assertCreated();

        $product->update(['is_active' => false]);

        $this->getJson('/api/me/wishlist', $this->bearer($token))
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->getJson('/api/me/wishlist/ids', $this->bearer($token))
            ->assertOk()
            ->assertExactJson(['data' => []]);

        $this->assertDatabaseCount('wishlist_items', 1);
    }

    private function customer(string $phone = '09771234567'): Customer
    {
        return Customer::query()->create([
            'phone' => $phone,
            'name' => 'Thiri Aung',
        ]);
    }

    private function token(Customer $customer): string
    {
        return app(CustomerAuth::class)->issueToken($customer);
    }

    /**
     * @return array<string, string>
     */
    private function bearer(string $token): array
    {
        return ['Authorization' => 'Bearer '.$token];
    }

    private function product(): Product
    {
        return Product::query()
            ->where('is_active', true)
            ->with('variants')
            ->firstOrFail();
    }
}
