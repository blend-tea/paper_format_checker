import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import { appWindow } from "@tauri-apps/api/window";
import AceEditor, { IMarker } from "react-ace";
import "ace-builds/src-noconflict/mode-latex";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";

function App() {
  // contents: ファイルの内容
  // contents: contents of the file
  const [contents, setContents] = useState("ファイルを開いてください");
  // rules: rule.jsonの内容。ファイルがない時のデフォルト値が設定されている。
  // rules: contents of rules.json. Default values are set when the file does not exist.
  const [rules, setRules] = useState<{
    [key: string]: {
      regex: string;
      error: string;
    };
  }>({
    "comma-space": {
      regex: ",[^\\s]",
      error: "半角カンマの後ろにはスペースを入れてください",
    },
    "zenkaku-comma": {
      regex: "、",
      error: "全角カンマ「，」を使用してください",
    },
  });
  // error_log: 右に表示されるエラーログの情報(行番号とエラーメッセージ)を格納する
  // error_log: Stores information (line number and error message) of the error log displayed on the right.
  let [error_log, setErrorLog] = useState<
    { line_number: number; error: string }[]
  >([]);
  let [markers, setMarkers] = useState<IMarker[]>([
    // {
    //   startRow: 0,
    //   startCol: 0,
    //   endRow: 1,
    //   endCol: 0,
    //   className: "marker",
    //   type: "text",
    // },
  ]);

  useEffect(() => {
    // rules.jsonの読み込み
    // Load rules.json
    invoke("open_rules", {}).then((result) => {
      const resultString = result as string;
      if (resultString === "error") {
        window.alert("rules.jsonの読み込みに失敗しました");
      }
      setRules(JSON.parse(resultString));
    });
    // メニューバーのFile -> File Open... をクリックした時のフロントエンド側の処理。ファイルの読み込み処理はsrc-tauri/src/main.rsに記述されている。
    // Frontend processing when clicking File -> File Open... in the menu bar. The file reading process is written in src-tauri/src/main.rs.
    const unlistenFileOpen = appWindow.listen("fileOpen", async (event) => {
      if (event.payload === "error") {
        window.alert("ファイルの読み込みに失敗しました");
      } else {
        setContents(event.payload as string);
        format_check(event.payload as string);
      }
    });

    return () => {
      unlistenFileOpen.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    // メニューバーのFile -> File Save... をクリックした時のフロントエンド側の処理。ファイルの保存処理はsrc-tauri/src/main.rsに記述されている。
    const unlistenFileSave = appWindow.listen("fileSave", async () => {
      invoke("save_file", { contents: contents }).then((result) => {
        window.alert(result);
      });
    });
    return () => {
      unlistenFileSave.then((unlisten) => unlisten());
    };
  }, [contents]);

  // rules.jsonの内容に従ってエラーチェックを行い、マーカーをエラーログとマーカーを引く箇所を設定する。
  // Perform error checking according to the contents of rules.json and set the error log and the location to draw the marker.
  const format_check = (contents: string) => {
    // コメントアウトを除外
    // Exclude comments
    const regex = /(.*?)((?<!\\)\%.*)?$/gm;
    const extractedText = contents.replace(regex, "$1");
    const newMarkers: IMarker[] = [];

    error_log = [];

    // Iterate over the rules
    Object.keys(rules).forEach((ruleKey) => {
      const { regex, error } = rules[ruleKey];
      const regExp = new RegExp(regex, "g");

      let match;
      while ((match = regExp.exec(extractedText)) !== null) {
        const lineNumber =
          extractedText.substring(0, match.index).split("\n").length - 1;
        const columnNumber =
          match.index - extractedText.lastIndexOf("\n", match.index) - 1;

        newMarkers.push({
          startRow: lineNumber,
          startCol: columnNumber,
          endRow: lineNumber,
          endCol: columnNumber + match[0].length,
          className: "marker",
          type: "text",
        });

        error_log.push({
          line_number: lineNumber + 1,
          error,
        });
      }
    });
    setMarkers(newMarkers);
    setErrorLog(error_log);
  };

  // エラーログをerror_logの内容に従って描画する
  // Draw error logs according to the contents of error_log
  const renderErrorLogs = () => {
    return error_log.map((log, index) => {
      return (
        <li key={index}>
          <span>
            {log.line_number}行目: {log.error}
          </span>
        </li>
      );
    });
  };

  return (
    <div className="container">
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
          onChange={(value) => {
            setContents(value);
            format_check(value);
          }}
        />
      </div>
      <div className="error_log">
        <ul>{renderErrorLogs()}</ul>
      </div>
    </div>
  );
}

export default App;
