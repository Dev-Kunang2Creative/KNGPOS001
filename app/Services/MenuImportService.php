<?php

namespace App\Services;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\MemoryDrawing;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class MenuImportService
{
    private const COLUMNS = [
        'A' => 'Nama Menu',
        'B' => 'Kategori',
        'C' => 'Harga',
        'D' => 'Deskripsi',
        'E' => 'Print Ke',
        'F' => 'Tersedia',
        'G' => 'Gambar',
    ];

    private const PRINT_TO_OPTIONS = ['kasir', 'kitchen', 'bar', 'kitchen_bar'];

    public function buildTemplate(): Spreadsheet
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Menu');

        foreach (self::COLUMNS as $column => $label) {
            $sheet->setCellValue($column.'1', $label);
        }

        $sheet->getStyle('A1:G1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '16A34A']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);

        $examples = [
            ['Nasi Goreng Spesial', 'Makanan Utama', 25000, 'Nasi goreng dengan telur dan ayam', 'kitchen', 'Y'],
            ['Es Teh Manis', 'Minuman', 8000, 'Teh manis dingin', 'bar', 'Y'],
            ['Ayam Bakar', 'Makanan Utama', 30000, 'Ayam bakar bumbu kecap', 'kitchen', 'N'],
        ];

        foreach ($examples as $index => $example) {
            $row = $index + 2;
            $sheet->fromArray($example, null, 'A'.$row);
            $sheet->getRowDimension($row)->setRowHeight(70);
        }

        $sheet->getStyle('A1:G'.(count($examples) + 1))->applyFromArray([
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ]);

        foreach (['A' => 28, 'B' => 20, 'C' => 12, 'D' => 36, 'E' => 12, 'F' => 10, 'G' => 16] as $column => $width) {
            $sheet->getColumnDimension($column)->setWidth($width);
        }

        $this->addSampleImage($sheet, 'G2');

        $this->addInstructionSheet($spreadsheet);

        $spreadsheet->setActiveSheetIndex(0);

        return $spreadsheet;
    }

    /**
     * Import menu items (with optional in-cell images) from an .xlsx file.
     *
     * @return array{created: int, updated: int, errors: list<string>}
     */
    public function import(string $path): array
    {
        $reader = IOFactory::createReader('Xlsx');
        $spreadsheet = $reader->load($path);
        $sheet = $spreadsheet->getSheet(0);

        $imagesByRow = $this->extractImagesByRow($sheet);

        $created = 0;
        $updated = 0;
        $errors = [];

        foreach ($sheet->getRowIterator(2) as $rowIterator) {
            $row = $rowIterator->getRowIndex();

            $name = trim((string) $sheet->getCell('A'.$row)->getValue());
            $categoryName = trim((string) $sheet->getCell('B'.$row)->getValue());
            $price = $sheet->getCell('C'.$row)->getValue();
            $description = trim((string) $sheet->getCell('D'.$row)->getValue());
            $printTo = Str::of((string) $sheet->getCell('E'.$row)->getValue())->trim()->lower()->value();
            $available = Str::of((string) $sheet->getCell('F'.$row)->getValue())->trim()->upper()->value();

            if ($name === '' && $categoryName === '' && $price === null) {
                continue;
            }

            if ($name === '' || $categoryName === '') {
                $errors[] = "Baris {$row}: Nama Menu dan Kategori wajib diisi.";

                continue;
            }

            if (! is_numeric($price) || (float) $price < 0) {
                $errors[] = "Baris {$row}: Harga harus berupa angka.";

                continue;
            }

            if ($printTo !== '' && ! in_array($printTo, self::PRINT_TO_OPTIONS, true)) {
                $errors[] = "Baris {$row}: Print Ke harus salah satu dari ".implode(', ', self::PRINT_TO_OPTIONS).'.';

                continue;
            }

            $category = MenuCategory::query()->firstOrCreate(['name' => $categoryName]);

            $data = [
                'category_id' => $category->id,
                'price' => (float) $price,
                'description' => $description !== '' ? $description : null,
                'print_to' => $printTo !== '' ? $printTo : 'kasir',
                'is_available' => $available !== 'N',
            ];

            $item = MenuItem::query()->where('name', $name)->first();

            if (isset($imagesByRow[$row])) {
                if ($item?->image_path) {
                    Storage::disk('public')->delete($item->image_path);
                }

                $data['image_path'] = $this->storeImage($imagesByRow[$row]);
            }

            if ($item) {
                $item->update($data);
                $updated++;
            } else {
                MenuItem::query()->create(['name' => $name] + $data);
                $created++;
            }
        }

        return ['created' => $created, 'updated' => $updated, 'errors' => $errors];
    }

    /**
     * Map embedded worksheet images to the row their anchor cell is on.
     *
     * @return array<int, array{contents: string, extension: string}>
     */
    private function extractImagesByRow(Worksheet $sheet): array
    {
        $images = [];

        foreach ($sheet->getDrawingCollection() as $drawing) {
            [, $row] = Coordinate::coordinateFromString($drawing->getCoordinates());

            if ($drawing instanceof MemoryDrawing) {
                ob_start();
                call_user_func($drawing->getRenderingFunction(), $drawing->getImageResource());
                $contents = (string) ob_get_clean();
                $extension = match ($drawing->getMimeType()) {
                    MemoryDrawing::MIMETYPE_GIF => 'gif',
                    MemoryDrawing::MIMETYPE_JPEG => 'jpg',
                    default => 'png',
                };
            } elseif ($drawing instanceof Drawing) {
                $contents = (string) file_get_contents($drawing->getPath());
                $extension = $drawing->getExtension() ?: 'png';
            } else {
                continue;
            }

            if ($contents !== '') {
                $images[(int) $row] = ['contents' => $contents, 'extension' => $extension];
            }
        }

        return $images;
    }

    /**
     * @param  array{contents: string, extension: string}  $image
     */
    private function storeImage(array $image): string
    {
        $path = 'menu/'.Str::uuid().'.'.$image['extension'];
        Storage::disk('public')->put($path, $image['contents']);

        return $path;
    }

    private function addSampleImage(Worksheet $sheet, string $coordinates): void
    {
        $image = imagecreatetruecolor(120, 90);
        $background = imagecolorallocate($image, 229, 231, 235);
        $textColor = imagecolorallocate($image, 75, 85, 99);
        imagefill($image, 0, 0, $background);
        imagestring($image, 4, 32, 38, 'FOTO', $textColor);

        $drawing = new MemoryDrawing;
        $drawing->setImageResource($image);
        $drawing->setRenderingFunction(MemoryDrawing::RENDERING_PNG);
        $drawing->setMimeType(MemoryDrawing::MIMETYPE_PNG);
        $drawing->setCoordinates($coordinates);
        $drawing->setOffsetX(5);
        $drawing->setOffsetY(5);
        $drawing->setWorksheet($sheet);
    }

    private function addInstructionSheet(Spreadsheet $spreadsheet): void
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Petunjuk');

        $instructions = [
            'Petunjuk Import Menu',
            '',
            '1. Isi data menu di sheet "Menu" mulai dari baris 2 (baris contoh boleh dihapus atau ditimpa).',
            '2. Kolom wajib: Nama Menu, Kategori, dan Harga. Kategori yang belum ada akan dibuat otomatis.',
            '3. Kolom "Print Ke" diisi salah satu dari: kasir, kitchen, bar, kitchen_bar. Kosongkan untuk kasir.',
            '4. Kolom "Tersedia" diisi Y atau N. Kosongkan untuk Y.',
            '5. Untuk gambar: klik cell di kolom "Gambar" pada baris menu, lalu Insert > Pictures > Place over Cells (This Device), dan posisikan gambar di dalam cell tersebut seperti pada baris contoh.',
            '6. Jika nama menu sudah ada, data menu tersebut akan diperbarui (tidak dibuat duplikat).',
            '7. Simpan file dalam format .xlsx lalu upload melalui tombol "Import Excel" di halaman Menu.',
        ];

        foreach ($instructions as $index => $line) {
            $sheet->setCellValue('A'.($index + 1), $line);
        }

        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getColumnDimension('A')->setWidth(110);
    }
}
