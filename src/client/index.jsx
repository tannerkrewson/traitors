import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { createGame } from "../game/game.js";

import "./main.css";

// Nova runs the rules on one player's device and shares the state. Each
// game's HTML file says which game it is.
var mode = document.documentElement.dataset.mode || "sabotage";
if (window.nova) window.nova.defineGame(createGame(mode));

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
