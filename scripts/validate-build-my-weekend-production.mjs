import fs from "node:fs";
import path from "node:path";

const root = "artifacts/build-my-weekend/dist/public";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

assert(fs.existsSync(root), "Production output directory is missing: " + root);
const files = walk(root);
const htmlPath = path.join(root, "index.html");
assert(fs.existsSync(htmlPath), "Production output is missing index.html.");

const html = fs.readFileSync(htmlPath, "utf8");
for (const [label, marker] of [
  ["page title", "Build My Weekend"],
  ["planner form", 'id="trip-form"'],
  ["group budget input", 'id="budget"'],
  ["experience selector", 'id="experience"'],
  ["demonstration-data warning", "DEMONSTRATION DATA"],
  ["safety disclaimer", "DEMONSTRATION MVP"]
]) {
  assert(html.includes(marker), "Built HTML is missing " + label + ".");
}

assert(!html.includes("Replit Agent is building..."), "Production HTML still contains the placeholder screen.");
const scripts = [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
assert(scripts.length > 0, "Built HTML has no JavaScript entrypoint.");

const missingScripts = scripts.filter((src) => {
  if (/^https?:\/\//i.test(src)) return false;
  const normalized = src.replace(/^\//, "").replace(/^Build-My-Weekend\//, "");
  return !fs.existsSync(path.join(root, normalized));
});
assert(missingScripts.length === 0, "Built HTML references missing JavaScript: " + missingScripts.join(", "));

const explorerPath = path.join(root, "shoreline-explorer.html");
assert(fs.existsSync(explorerPath), "Production output is missing the standalone Shoreline Explorer page.");
const explorerHtml = fs.readFileSync(explorerPath, "utf8");
for (const [label, marker] of [
  ["Shoreline Explorer form", 'id="search-form"'],
  ["fail-closed bathymetry status", 'id="bathymetry-status"'],
  ["regional reference results", 'id="results"']
]) {
  assert(explorerHtml.includes(marker), "Built Shoreline Explorer is missing " + label + ".");
}

const jsFiles = files.filter((file) => file.endsWith(".js") || file.endsWith(".mjs"));
assert(jsFiles.length > 0, "Production output contains no JavaScript files.");
const bundle = jsFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
for (const marker of ["Hermanus", "Gordon's Bay", "budget", "Fishing"]) {
  assert(bundle.includes(marker), "Production JavaScript is missing expected planner content: " + marker);
}

const guidePath = "TESTING_GUIDE.md";
assert(fs.existsSync(guidePath), "Release-readiness checklist is missing: " + guidePath);
const guide = fs.readFileSync(guidePath, "utf8");
for (const [label, marker] of [
  ["explicit weather API commercial-use release gate", "Weather API licence"],
  ["explicit marine forecast commercial-use release gate", "Marine forecast licence and attribution"],
  ["external data licence review gate", "Commercial data review"]
]) {
  assert(guide.includes(marker), "Release-readiness checklist is missing " + label + ".");
}

const cssFiles = files.filter((file) => file.endsWith(".css"));
assert(cssFiles.length > 0, "Production output contains no CSS files.");
console.log("Production artifact smoke: PASS");
console.log("Planner and Shoreline Explorer entrypoints, controls, safety disclosures, local assets, destination data and CSS verified.");
console.log("Production files:", files.length, "| JavaScript files:", jsFiles.length, "| CSS files:", cssFiles.length);
