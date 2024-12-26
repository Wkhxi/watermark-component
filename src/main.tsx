import { createRoot } from "react-dom/client";
// import './index.css'
import App from "./App.tsx";

console.log("test main");

createRoot(document.getElementById("root")!).render(<App />);
