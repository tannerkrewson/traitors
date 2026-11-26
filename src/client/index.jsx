import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { game } from "../game/game.js";

import "./main.css";

// Nova runs the rules on one player's device and shares the state
if (window.nova) window.nova.defineGame(game);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
