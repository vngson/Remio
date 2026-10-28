import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

function sourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, files);
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.includes(".test.")) {
      files.push(full);
    }
  }
  return files;
}

function relative(file: string): string {
  return file.slice(SRC.length + 1);
}

describe("biến môi trường", () => {
  /**
   * Next.js chỉ thay `NEXT_PUBLIC_*` bằng giá trị thật khi truy cập tĩnh, ví dụ
   * `process.env.NEXT_PUBLIC_SUPABASE_URL`. Truy cập động `process.env[name]`
   * khiến trình duyệt nhận `undefined` — app vẫn render bình thường nhưng hỏng
   * ngay khi người dùng bấm nút. Đó là lỗi rất khó thấy bằng typecheck/build.
   */
  it("không truy cập động vào process.env", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(SRC)) {
      const lines = readFileSync(file, "utf8").split("\n");
      let insideBlockComment = false;

      lines.forEach((rawLine, index) => {
        let line = rawLine;

        if (insideBlockComment) {
          const end = line.indexOf("*/");
          if (end === -1) {
            return;
          }
          line = line.slice(end + 2);
          insideBlockComment = false;
        }

        line = line.replace(/\/\*[\s\S]*?\*\//g, "");

        const blockStart = line.indexOf("/*");
        if (blockStart !== -1) {
          line = line.slice(0, blockStart);
          insideBlockComment = true;
        }

        line = line.replace(/\/\/.*$/, "");

        if (/process\.env\s*\[/.test(line)) {
          offenders.push(`${relative(file)}:${index + 1}`);
        }
      });
    }

    expect(offenders, "Hãy dùng process.env.TÊN_BIẾN thay vì process.env[tên]").toEqual(
      [],
    );
  });

  it("biến NEXT_PUBLIC_ dùng ở client được đọc tĩnh trong lib/env.ts", () => {
    const source = readFileSync(join(SRC, "lib/env.ts"), "utf8");

    expect(source).toContain("process.env.NEXT_PUBLIC_SUPABASE_URL");
    expect(source).toContain("process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(source).toContain("process.env.NEXT_PUBLIC_SITE_URL");
  });
});
