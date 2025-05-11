import React, { useEffect, useRef } from "react";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/python/python";
import "codemirror/mode/clike/clike";
import "codemirror/mode/ruby/ruby";
import "codemirror/mode/php/php";
import "codemirror/mode/sql/sql";
import "codemirror/mode/shell/shell";
import "codemirror/mode/r/r";
import "codemirror/mode/swift/swift";
import "codemirror/mode/go/go";
import "codemirror/theme/dracula.css";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/lib/codemirror.css";
import CodeMirror from "codemirror";
import { ACTIONS } from "./Actions";

function Editor({ socketRef, roomId, onCodeChange, language = "javascript" }) {
  const editorRef = useRef(null);
  
  // Language mode mapping for CodeMirror
  const getLanguageMode = (language) => {
    const modeMap = {
      javascript: "javascript",
      nodejs: "javascript",
      python3: "python",
      java: "text/x-java",
      cpp: "text/x-c++src",
      c: "text/x-csrc",
      ruby: "ruby",
      go: "go",
      sql: "sql",
      bash: "shell",
      php: "php",
      swift: "swift",
      r: "r",
      scala: "text/x-scala",
      csharp: "text/x-csharp",
      pascal: "text/x-pascal",
      rust: "rust"
    };
    return modeMap[language] || "javascript";
  };

  // Initialize editor
  useEffect(() => {
    const init = async () => {
      const editor = CodeMirror.fromTextArea(
        document.getElementById("realtimeEditor"),
        {
          mode: getLanguageMode(language),
          theme: "dracula",
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
          tabSize: 2,
          indentWithTabs: false,
          lineWrapping: true,
        }
      );
      
      editorRef.current = editor;
      editor.setSize(null, "100%");
      
      // Handle code changes and emit to socket
      editor.on("change", (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        onCodeChange(code);
        
        // Only emit if change wasn't from setValue (prevents loops)
        if (origin !== "setValue" && socketRef.current) {
          socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code,
          });
        }
      });
    };

    init();
    
    // Cleanup function
    return () => {
      if (editorRef.current) {
        editorRef.current.toTextArea();
      }
    };
  }, [roomId]);

  // Listen for code changes from server
  useEffect(() => {
    if (socketRef.current) {
      // Make sure we're listening for code changes
      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
        if (code !== null && editorRef.current) {
          // Get cursor position to maintain it after update
          const cursor = editorRef.current.getCursor();
          editorRef.current.setValue(code);
          editorRef.current.setCursor(cursor);
        }
      });
    }
    
    // Cleanup listener
    return () => {
      if (socketRef.current) {
        socketRef.current.off(ACTIONS.CODE_CHANGE);
      }
    };
  }, [socketRef.current]);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <textarea id="realtimeEditor"></textarea>
    </div>
  );
}

export default Editor;