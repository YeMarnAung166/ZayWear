<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_the_root_redirects_to_the_admin_order_list(): void
    {
        $this->get('/')->assertRedirect('/admin/orders');
    }
}
