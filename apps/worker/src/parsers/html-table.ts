/**
 * 通用 HTML 表格解析器：寻找价格表并返回 (row, cell) 矩阵
 */
import * as cheerio from "cheerio";

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

export function extractTables(html: string): ParsedTable[] {
  const $ = cheerio.load(html);
  const tables: ParsedTable[] = [];

  $("table").each((_, el) => {
    const headers: string[] = [];
    const rows: string[][] = [];

    $(el)
      .find("thead th, thead td, tr:first-child th, tr:first-child td")
      .each((_, th) => {
        headers.push($(th).text().trim());
      });

    $(el)
      .find("tbody tr, tr")
      .each((i, tr) => {
        if (i === 0 && headers.length > 0) return; // skip header row
        const cells: string[] = [];
        $(tr)
          .find("th, td")
          .each((_, td) => {
            cells.push($(td).text().trim());
          });
        if (cells.length > 0 && cells.some((c) => c.length > 0)) rows.push(cells);
      });

    if (rows.length > 0) {
      tables.push({ headers, rows });
    }
  });

  return tables;
}

/**
 * 简化 HTML：去 script/style/广告，保留表格/列表/标题
 */
export function simplifyHtml(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, svg").remove();
  $("[aria-hidden='true']").remove();
  $("header, footer, nav").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}
