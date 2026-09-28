import React from "react";
import ReactDOM from "react-dom/client";
import { SnapBotWidget } from "./components/SnapBotWidget";

/**
 * SnapBot Standalone CDN / Vanilla JS Initializer
 *
 * Usage in HTML:
 * <script src="https://cdn.example.com/snapbot.js"></script>
 * <script>
 *   SnapBot.init({
 *     apiUrl: "http://localhost:8000",
 *     botName: "SnapBot",
 *     welcomeMessage: "How can I help you?",
 *     primaryColor: "#111827"
 *   });
 * </script>
 */
const SnapBot = {
  version: "0.1.0",
  SnapBotWidget,

  init(config = {}, target = null) {
    if (typeof document === "undefined") {
      console.warn("SnapBot.init() can only be called in a browser environment.");
      return null;
    }

    let container = null;
    if (typeof target === "string") {
      container = document.querySelector(target);
    } else if (target && target.nodeType) {
      container = target;
    }

    if (!container) {
      container = document.getElementById("snapbot-widget-root");
      if (!container) {
        container = document.createElement("div");
        container.id = "snapbot-widget-root";
        document.body.appendChild(container);
      }
    }

    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(SnapBotWidget, config));

    return {
      root,
      container,
      destroy() {
        root.unmount();
        container.remove();
      },
    };
  },
};

if (typeof window !== "undefined") {
  window.SnapBot = SnapBot;
}

export { SnapBot };
export default SnapBot;
