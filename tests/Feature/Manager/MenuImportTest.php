<?php

namespace Tests\Feature\Manager;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\MemoryDrawing;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\Concerns\InteractsWithRestaurant;
use Tests\TestCase;

class MenuImportTest extends TestCase
{
    use InteractsWithRestaurant;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->activeRestaurant();
    }

    public function test_import_template_downloads_xlsx(): void
    {
        $response = $this->actingAs($this->manager(['menu.view', 'menu.manage']))
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->get('/menu/import/template')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        $this->assertStringContainsString('template-import-menu.xlsx', $response->headers->get('Content-Disposition'));
    }

    public function test_import_creates_menu_items_with_in_cell_images(): void
    {
        Storage::fake('public');

        $file = $this->importFile([
            ['Nasi Goreng Import', 'Makanan Import', 25000, 'Enak', 'kitchen', 'Y'],
            ['Es Teh Import', 'Minuman Import', 8000, '', '', ''],
        ], imageRows: [2]);

        $this->actingAs($this->manager(['menu.view', 'menu.manage']))
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->post('/menu/import', ['file' => $file])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('menu_categories', ['name' => 'Makanan Import']);
        $this->assertDatabaseHas('menu_items', ['name' => 'Es Teh Import', 'print_to' => 'kasir', 'is_available' => 1]);

        $item = MenuItem::query()->where('name', 'Nasi Goreng Import')->firstOrFail();
        $this->assertSame('kitchen', $item->print_to);
        $this->assertNotNull($item->image_path);
        Storage::disk('public')->assertExists($item->image_path);

        $this->assertNull(MenuItem::query()->where('name', 'Es Teh Import')->value('image_path'));
    }

    public function test_import_updates_existing_item_by_name(): void
    {
        $category = MenuCategory::query()->create(['name' => 'Lama']);
        MenuItem::query()->create([
            'category_id' => $category->id,
            'name' => 'Nasi Goreng Import',
            'price' => 10000,
        ]);

        $file = $this->importFile([
            ['Nasi Goreng Import', 'Lama', 27500, 'Harga baru', '', 'N'],
        ]);

        $this->actingAs($this->manager(['menu.view', 'menu.manage']))
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->post('/menu/import', ['file' => $file])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame(1, MenuItem::query()->where('name', 'Nasi Goreng Import')->count());
        $item = MenuItem::query()->where('name', 'Nasi Goreng Import')->firstOrFail();
        $this->assertSame(27500.0, (float) $item->price);
        $this->assertFalse($item->is_available);
    }

    public function test_import_reports_invalid_rows(): void
    {
        $file = $this->importFile([
            ['', 'Makanan', 10000, '', '', ''],
            ['Menu Valid', 'Makanan', 'bukan-angka', '', '', ''],
            ['Menu Print Salah', 'Makanan', 5000, '', 'dapur', ''],
        ]);

        $this->actingAs($this->manager(['menu.view', 'menu.manage']))
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->post('/menu/import', ['file' => $file])
            ->assertRedirect()
            ->assertSessionHas('import_errors', fn (array $errors): bool => count($errors) === 3);

        $this->assertSame(0, MenuItem::query()->count());
    }

    public function test_import_rejects_non_xlsx_file(): void
    {
        $this->actingAs($this->manager(['menu.view', 'menu.manage']))
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->post('/menu/import', ['file' => UploadedFile::fake()->create('menu.csv', 5, 'text/csv')])
            ->assertSessionHasErrors('file');
    }

    public function test_import_requires_menu_manage_permission(): void
    {
        $file = $this->importFile([
            ['Menu Tanpa Izin', 'Makanan', 10000, '', '', ''],
        ]);

        $this->actingAs($this->manager(['menu.view']))
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->post('/menu/import', ['file' => $file])
            ->assertForbidden();
    }

    private function manager(array $permissions): User
    {
        return $this->managerFor($this->restaurant, $permissions);
    }

    /**
     * Build a real .xlsx upload containing the given rows (starting at row 2),
     * optionally embedding a generated image anchored on the Gambar column.
     *
     * @param  list<list<mixed>>  $rows
     * @param  list<int>  $imageRows
     */
    private function importFile(array $rows, array $imageRows = []): UploadedFile
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray(['Nama Menu', 'Kategori', 'Harga', 'Deskripsi', 'Print Ke', 'Tersedia', 'Gambar'], null, 'A1');

        foreach ($rows as $index => $row) {
            $sheet->fromArray($row, null, 'A'.($index + 2));
        }

        foreach ($imageRows as $row) {
            $image = imagecreatetruecolor(60, 45);
            imagefill($image, 0, 0, imagecolorallocate($image, 200, 60, 60));

            $drawing = new MemoryDrawing;
            $drawing->setImageResource($image);
            $drawing->setRenderingFunction(MemoryDrawing::RENDERING_PNG);
            $drawing->setMimeType(MemoryDrawing::MIMETYPE_PNG);
            $drawing->setCoordinates('G'.$row);
            $drawing->setWorksheet($sheet);
        }

        $path = tempnam(sys_get_temp_dir(), 'menu-import').'.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        return new UploadedFile($path, 'menu-import.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
    }
}
