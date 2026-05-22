import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { ask, open, save } from "@tauri-apps/plugin-dialog";
import AceEditor from "react-ace";
import type { IMarker } from "react-ace";
import "ace-builds/src-noconflict/mode-latex";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";
import {
  DEFAULT_RULES,
  runFormatCheck,
  type FormatError,
  type Rules,
} from "./checker";
import "./App.css";

const INITIAL_MESSAGE = "ファイルを開いてください";
const FILE_FILTERS = [{ name: "LaTeX", extensions: ["tex", "txt"] }];
const DIALOG_TITLE = "paper_format_checker";

function App() {
  const [contents, setContents] = useState(INITIAL_MESSAGE);
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [errorLog, setErrorLog] = useState<FormatError[]>([]);
  const [markers, setMarkers] = useState<IMarker[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // 一度だけ登録するイベントリスナから最新値を読むための ref。
  const contentsRef = useRef(contents);
  contentsRef.current = contents;
  const rulesRef = useRef(rules);
  rulesRef.current = rules;
  const savedSnapshotRef = useRef(INITIAL_MESSAGE);
  const hasUnsavedChangesRef = useRef(false);

  const runCheck = useCallback((text: string) => {
    const result = runFormatCheck(text, rulesRef.current);
    setMarkers(result.markers);
    setErrorLog(result.errorLog);
  }, []);

  const markSaved = useCallback((content: string) => {
    savedSnapshotRef.current = content;
    hasUnsavedChangesRef.current = false;
  }, []);

  // 起動時に rules.toml を読み込み、現在のテキストを検査する。
  useEffect(() => {
    invoke<string>("open_rules")
      .then((result) => {
        if (result === "error") throw new Error("invalid rules");
        const loaded = JSON.parse(result) as Rules;
        setRules(loaded);
        const checked = runFormatCheck(contentsRef.current, loaded);
        setMarkers(checked.markers);
        setErrorLog(checked.errorLog);
      })
      .catch(() => window.alert("rules.toml の読み込みに失敗しました"));
  }, []);

  const loadFromPath = useCallback(
    async (path: string) => {
      try {
        const fileContents = await invoke<string>("read_file", { path });
        setContents(fileContents);
        markSaved(fileContents);
        runCheck(fileContents);
      } catch {
        window.alert("ファイルの読み込みに失敗しました");
      }
    },
    [markSaved, runCheck],
  );

  const openWithDialog = useCallback(async () => {
    const path = await open({ multiple: false, filters: FILE_FILTERS });
    if (typeof path === "string") await loadFromPath(path);
  }, [loadFromPath]);

  const saveWithDialog = useCallback(async (): Promise<boolean> => {
    const path = await save({ filters: FILE_FILTERS });
    if (!path) return false;
    try {
      await invoke("write_file", { path, contents: contentsRef.current });
      markSaved(contentsRef.current);
      return true;
    } catch {
      window.alert("ファイルの保存に失敗しました");
      return false;
    }
  }, [markSaved]);

  // メニュー / ドラッグ&ドロップ / 終了要求のリスナを一度だけ登録する。
  useEffect(() => {
    const win = getCurrentWebviewWindow();

    const pending: Array<Promise<() => void>> = [
      win.listen("fileOpenRequest", () => void openWithDialog()),
      win.listen("fileSaveRequest", () => void saveWithDialog()),
      win.onDragDropEvent((event) => {
        const { payload } = event;
        if (payload.type === "enter" || payload.type === "over") {
          setIsDragOver(true);
        } else if (payload.type === "leave") {
          setIsDragOver(false);
        } else if (payload.type === "drop") {
          setIsDragOver(false);
          const file = payload.paths.find((p) => /\.(tex|txt)$/i.test(p));
          if (file) {
            void loadFromPath(file);
          } else if (payload.paths.length > 0) {
            window.alert(".tex または .txt ファイルを開いてください");
          }
        }
      }),
      win.onCloseRequested(async (event) => {
        if (!hasUnsavedChangesRef.current) return; // 変更なし → そのまま閉じる
        event.preventDefault();

        const quit = await ask("未保存の変更があります。終了しますか?", {
          title: DIALOG_TITLE,
          kind: "warning",
          okLabel: "終了する",
          cancelLabel: "キャンセル",
        });
        if (!quit) return;

        const saveFirst = await ask("変更を保存しますか?", {
          title: DIALOG_TITLE,
          kind: "warning",
          okLabel: "保存する",
          cancelLabel: "保存しない",
        });
        // 保存を選んだのにダイアログを中止した場合は終了しない。
        if (saveFirst && !(await saveWithDialog())) return;

        await win.destroy();
      }),
    ];

    return () => {
      for (const p of pending) {
        p.then((unlisten) => unlisten()).catch(() => {});
      }
    };
  }, [openWithDialog, saveWithDialog, loadFromPath]);

  const handleChange = useCallback(
    (value: string) => {
      setContents(value);
      runCheck(value);
      hasUnsavedChangesRef.current = value !== savedSnapshotRef.current;
    },
    [runCheck],
  );

  return (
    <div className={isDragOver ? "container drag-over" : "container"}>
      <div className="contents">
        <AceEditor
          mode="latex"
          theme="monokai"
          fontSize={16}
          width="100%"
          height="100%"
          name="editor"
          wrapEnabled={true}
          editorProps={{ $blockScrolling: true }}
          setOptions={{
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            displayIndentGuides: true,
            showPrintMargin: false,
            indentedSoftWrap: false,
          }}
          markers={markers}
          value={contents}
          onChange={handleChange}
        />
      </div>
      <div className="error_log">
        <ul>
          {errorLog.map((log, index) => (
            <li key={index}>
              <span>
                {log.line_number}行目: {log.error}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {isDragOver && (
        <div className="drop-overlay">ファイルをドロップして開く</div>
      )}
    </div>
  );
}

export default App;
