<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TownshipResource;
use App\Models\Township;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TownshipController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return TownshipResource::collection(
            Township::query()
                ->active()
                // Main cities first — that is where most orders come from.
                ->orderByRaw(
                    "case region when 'Yangon' then 1 when 'Mandalay' then 2 when 'Naypyidaw' then 3 else 4 end",
                )
                ->orderBy('region')
                ->orderBy('name_en')
                ->get(),
        );
    }
}
