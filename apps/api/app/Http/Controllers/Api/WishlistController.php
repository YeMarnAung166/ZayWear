<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Customer;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = $this->customer($request)
            ->wishlistItems()
            ->whereHas('product', fn ($query) => $query->where('is_active', true))
            ->with([
                'product.category',
                'product.images',
                'product.variants' => fn ($query) => $query->where('is_active', true),
            ])
            ->latest('id')
            ->get();

        $products = $items->pluck('product')->filter()->values();

        return response()->json([
            'data' => ProductResource::collection($products)->resolve(),
        ]);
    }

    /**
     * The storefront hydrates the saved state of every heart from this list.
     * It deliberately skips product payloads so static pages stay small.
     */
    public function ids(Request $request): JsonResponse
    {
        $ids = $this->customer($request)
            ->wishlistItems()
            ->whereHas('product', fn ($query) => $query->where('is_active', true))
            ->latest('id')
            ->pluck('product_id')
            ->map(fn ($id) => (int) $id)
            ->values();

        return response()->json(['data' => $ids]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer'],
        ]);

        $product = Product::query()->active()->find($validated['product_id']);

        if (! $product) {
            return response()->json(['message' => 'Product not found.'], 404);
        }

        $item = $this->customer($request)
            ->wishlistItems()
            ->firstOrCreate(['product_id' => $product->id]);

        return response()->json([
            'data' => ['product_id' => $product->id],
        ], $item->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        $this->customer($request)
            ->wishlistItems()
            ->where('product_id', $product->id)
            ->delete();

        return response()->json(['message' => 'Removed from wishlist.']);
    }

    private function customer(Request $request): Customer
    {
        /** @var Customer $customer */
        $customer = $request->attributes->get('customer');

        return $customer;
    }
}
