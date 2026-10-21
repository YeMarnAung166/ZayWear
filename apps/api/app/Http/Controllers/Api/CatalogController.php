<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CatalogController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Product::query()
            ->active()
            ->with(['category', 'images', 'variants' => fn ($q) => $q->where('is_active', true)]);

        if ($category = $request->string('category')->toString()) {
            $query->whereHas('category', fn ($q) => $q->where('slug', $category));
        }

        if ($search = $request->string('q')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name_mm', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        match ($request->string('sort')->toString()) {
            'price_asc' => $query->orderBy('base_price_mmk'),
            'price_desc' => $query->orderByDesc('base_price_mmk'),
            default => $query->latest('id'),
        };

        $perPage = min(max($request->integer('per_page', 12), 1), 48);

        return ProductResource::collection($query->paginate($perPage)->withQueryString());
    }

    public function show(string $slug): ProductResource
    {
        $product = Product::query()
            ->active()
            ->where('slug', $slug)
            ->with(['category', 'images', 'variants' => fn ($q) => $q->orderBy('id')])
            ->firstOrFail();

        return new ProductResource($product);
    }

    public function sizeChart(string $slug): mixed
    {
        $product = Product::query()->active()->where('slug', $slug)->with('category.sizeChart')->firstOrFail();
        $chart = $product->category?->sizeChart;

        abort_if($chart === null, 404, 'No size chart for this category.');

        return response()->json([
            'title_mm' => $chart->title_mm,
            'title_en' => $chart->title_en,
            'rows' => $chart->rows,
        ]);
    }
}
