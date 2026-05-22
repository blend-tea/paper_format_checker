import type { IMarker } from "react-ace";

export type Rule = { regex: string; error: string };
export type Rules = Record<string, Rule>;
export type FormatError = { line_number: number; error: string };
export type CheckResult = { markers: IMarker[]; errorLog: FormatError[] };

/** rules.toml を読み込めなかったときのフォールバック。起動直後の一瞬だけ使われる。 */
export const DEFAULT_RULES: Rules = {
  "comma-space": {
    regex: ",[^\\s]",
    error: "半角カンマの後ろにはスペースを入れてください",
  },
  "zenkaku-comma": {
    regex: "、",
    error: "全角カンマ「，」を使用してください",
  },
};

/**
 * LaTeX の行コメント（`\` でエスケープされていない `%` 以降）を取り除く。
 * 行数と列位置を保つため、改行とコメント前の文字列はそのまま残す。
 */
function stripComments(text: string): string {
  return text.replace(/(.*?)(?<!\\)%.*$/gm, "$1");
}

/** 指定テキストに全ルールを適用し、エディタ用マーカーとエラー一覧を返す。 */
export function runFormatCheck(text: string, rules: Rules): CheckResult {
  const extracted = stripComments(text);
  const markers: IMarker[] = [];
  const errorLog: FormatError[] = [];

  for (const { regex, error } of Object.values(rules)) {
    let compiled: RegExp;
    try {
      compiled = new RegExp(regex, "g");
    } catch {
      // 不正な正規表現のルールはスキップし、他のルールの検査は続行する。
      continue;
    }

    let match: RegExpExecArray | null;
    while ((match = compiled.exec(extracted)) !== null) {
      const lineNumber = extracted.slice(0, match.index).split("\n").length - 1;
      const columnNumber =
        match.index - extracted.lastIndexOf("\n", match.index) - 1;

      markers.push({
        startRow: lineNumber,
        startCol: columnNumber,
        endRow: lineNumber,
        endCol: columnNumber + match[0].length,
        className: "marker",
        type: "text",
      });
      errorLog.push({ line_number: lineNumber + 1, error });

      // 空マッチ（例: 0 幅の正規表現）での無限ループを防ぐ。
      if (match[0] === "") compiled.lastIndex++;
    }
  }

  errorLog.sort((a, b) => a.line_number - b.line_number);
  return { markers, errorLog };
}
