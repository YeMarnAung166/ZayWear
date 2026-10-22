<?php

namespace App\Console\Commands;

use App\Models\Township;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

#[Signature('townships:import
    {path : UTF-8 CSV file with header region,name_mm,name_en,delivery_fee_mmk,is_active}
    {--dry-run : Validate and report without writing to the database}
    {--deactivate-missing : Deactivate townships that are not present in the file}')]
#[Description('Replace the mock township seed with the real courier-served list')]
class TownshipsImport extends Command
{
    private const REQUIRED_COLUMNS = ['region', 'name_mm', 'name_en', 'delivery_fee_mmk'];

    public function handle(): int
    {
        $path = (string) $this->argument('path');
        $contents = $this->readFile($path);

        if ($contents === null) {
            return self::FAILURE;
        }

        [$header, $records] = $this->parse($contents);

        if ($header === null) {
            return self::FAILURE;
        }

        [$rows, $errors] = $this->validate($header, $records);

        if ($errors !== []) {
            $this->error(count($errors).' row(s) failed validation. Nothing was written.');

            foreach (array_slice($errors, 0, 20) as $error) {
                $this->line('  • '.$error);
            }

            if (count($errors) > 20) {
                $this->line('  … and '.(count($errors) - 20).' more.');
            }

            return self::FAILURE;
        }

        if ($this->option('dry-run')) {
            $this->info(count($rows).' row(s) validated. Dry run — nothing was written.');

            return self::SUCCESS;
        }

        try {
            $result = $this->import($rows);
        } catch (Throwable $exception) {
            $this->error('Import failed: '.$exception->getMessage());

            return self::FAILURE;
        }

        $this->info(sprintf(
            '%d township(s) imported: %d created, %d updated, %d deactivated.',
            count($rows),
            $result['created'],
            $result['updated'],
            $result['deactivated'],
        ));

        return self::SUCCESS;
    }

    private function readFile(string $path): ?string
    {
        if (! is_file($path) || ! is_readable($path)) {
            $this->error("File not found or not readable: {$path}");

            return null;
        }

        $contents = (string) file_get_contents($path);

        if (str_starts_with($contents, "\xEF\xBB\xBF")) {
            $contents = substr($contents, 3);
        }

        if (! mb_check_encoding($contents, 'UTF-8')) {
            $this->error('The file is not valid UTF-8. Re-export it as "CSV UTF-8" so Burmese names survive.');

            return null;
        }

        return $contents;
    }

    /**
     * @return array{0: list<string>|null, 1: list<array{line: int, cells: list<string|null>}>}
     */
    private function parse(string $contents): array
    {
        $handle = fopen('php://temp', 'r+');
        fwrite($handle, $contents);
        rewind($handle);

        $header = fgetcsv($handle, escape: '');

        if ($header === false) {
            $this->error('The file is empty.');

            return [null, []];
        }

        $header = array_map(
            fn ($column): string => strtolower(trim((string) $column)),
            $header,
        );

        $missing = array_diff(self::REQUIRED_COLUMNS, $header);

        if ($missing !== []) {
            $this->error('Missing column(s): '.implode(', ', $missing).'.');
            $this->line('Expected header: region,name_mm,name_en,delivery_fee_mmk,is_active');

            return [null, []];
        }

        $records = [];
        $line = 1;

        while (($cells = fgetcsv($handle, escape: '')) !== false) {
            $line++;

            // Skip blank lines that spreadsheet exports tend to leave behind.
            if (count(array_filter($cells, fn ($cell): bool => trim((string) $cell) !== '')) === 0) {
                continue;
            }

            $records[] = ['line' => $line, 'cells' => $cells];
        }

        fclose($handle);

        return [$header, $records];
    }

    /**
     * @param  list<string>  $header
     * @param  list<array{line: int, cells: list<string|null>}>  $records
     * @return array{0: list<array{region: string, name_mm: string, name_en: string, delivery_fee_mmk: int, is_active: bool}>, 1: list<string>}
     */
    private function validate(array $header, array $records): array
    {
        $rows = [];
        $errors = [];
        $seen = [];

        foreach ($records as $record) {
            $cells = array_pad($record['cells'], count($header), null);
            $row = array_combine($header, array_slice($cells, 0, count($header)));

            if ($row === false) {
                $errors[] = "Line {$record['line']}: could not read the row.";

                continue;
            }

            $region = trim((string) ($row['region'] ?? ''));
            $nameMm = trim((string) ($row['name_mm'] ?? ''));
            $nameEn = trim((string) ($row['name_en'] ?? ''));
            $fee = trim((string) ($row['delivery_fee_mmk'] ?? ''));
            $active = strtolower(trim((string) ($row['is_active'] ?? '1')));
            $line = $record['line'];

            if ($region === '' || mb_strlen($region) > 80) {
                $errors[] = "Line {$line}: region is required (max 80 characters).";
            }

            if ($nameMm === '' || mb_strlen($nameMm) > 120) {
                $errors[] = "Line {$line}: name_mm is required (max 120 characters).";
            }

            if ($nameEn === '' || mb_strlen($nameEn) > 120) {
                $errors[] = "Line {$line}: name_en is required (max 120 characters).";
            }

            if (! ctype_digit($fee) || (int) $fee > 20000) {
                $errors[] = "Line {$line}: delivery_fee_mmk must be a whole number between 0 and 20000.";
            }

            if (! in_array($active, ['1', '0', 'true', 'false', 'yes', 'no'], true)) {
                $errors[] = "Line {$line}: is_active must be 1/0, true/false, or yes/no.";
            }

            $key = mb_strtolower($region).'|'.mb_strtolower($nameEn);

            if (isset($seen[$key])) {
                $errors[] = "Line {$line}: duplicate of line {$seen[$key]} ({$region} / {$nameEn}).";
            }

            $seen[$key] = $line;

            $rows[] = [
                'region' => $region,
                'name_mm' => $nameMm,
                'name_en' => $nameEn,
                'delivery_fee_mmk' => (int) $fee,
                'is_active' => in_array($active, ['1', 'true', 'yes'], true),
            ];
        }

        return $rows === [] && $errors === []
            ? [[], ['The file has a header but no township rows.']]
            : [$rows, $errors];
    }

    /**
     * @param  list<array{region: string, name_mm: string, name_en: string, delivery_fee_mmk: int, is_active: bool}>  $rows
     * @return array{created: int, updated: int, deactivated: int}
     */
    private function import(array $rows): array
    {
        return DB::transaction(function () use ($rows): array {
            $created = 0;
            $updated = 0;

            foreach ($rows as $row) {
                $township = Township::query()->updateOrCreate(
                    ['region' => $row['region'], 'name_en' => $row['name_en']],
                    [
                        'name_mm' => $row['name_mm'],
                        'delivery_fee_mmk' => $row['delivery_fee_mmk'],
                        'is_active' => $row['is_active'],
                    ],
                );

                $township->wasRecentlyCreated ? $created++ : $updated++;
            }

            $deactivated = 0;

            if ($this->option('deactivate-missing')) {
                $keep = collect($rows)
                    ->map(fn (array $row): string => mb_strtolower($row['region']).'|'.mb_strtolower($row['name_en']))
                    ->flip();

                Township::query()
                    ->where('is_active', true)
                    ->get()
                    ->each(function (Township $township) use ($keep, &$deactivated): void {
                        $key = mb_strtolower($township->region).'|'.mb_strtolower($township->name_en);

                        if (! $keep->has($key)) {
                            $township->update(['is_active' => false]);
                            $deactivated++;
                        }
                    });
            }

            return ['created' => $created, 'updated' => $updated, 'deactivated' => $deactivated];
        });
    }
}
