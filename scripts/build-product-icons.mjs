// Builds the product icons shown in the Service column, the service filter and
// on share cards: public/icons/products/<slug>.png (96px) and
// public/icons/products.json, which maps each service name to its icon and its
// group in the filter.
//
// The icons come from two community collections, cloned locally:
//   https://github.com/loryanstrant/MicrosoftCloudLogos  (product logos)
//   https://github.com/DanielBradley1/msicons            (Azure and app SVGs)
// Both say the logos belong to Microsoft.
//
// Run it again when the services list grows:
//   node scripts/build-product-icons.mjs --logos <MicrosoftCloudLogos> --msicons <msicons>
// It prints the services it could not match; they get a monogram tile.

import fs from "node:fs"
import path from "node:path"
import { parseArgs } from "node:util"
import sharp from "sharp"

const { values: args } = parseArgs({
  options: { logos: { type: "string" }, msicons: { type: "string" } },
})
if (!args.logos || !args.msicons) {
  console.error("Usage: node scripts/build-product-icons.mjs --logos <dir> --msicons <dir>")
  process.exit(1)
}

const ROOT = path.resolve(import.meta.dirname, "..")
const OUT_DIR = path.join(ROOT, "public/icons/products")
const MAP_FILE = path.join(ROOT, "public/icons/products.json")
const SIZE = 96
const LOGOS = path.join(args.logos, "logos")
const MSICONS = path.join(args.msicons, "msicons/public")

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/^\d+-icon-service-/, "")
    .replace(/_scalable|color icon|bw icon|-logo/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\b(microsoft|azure|online|service|services|for business|the)\b/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/^\d+-icon-service-/, "")
    .replace(/\.(svg|png|jpg)$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

// Candidates by normalised name. MicrosoftCloudLogos goes first because its
// logos are the products' own; msicons fills in Azure resources and SVGs.
const candidates = new Map()
const add = (name, file, slug) => {
  const key = norm(name)
  if (key && !candidates.has(key)) candidates.set(key, { file, slug })
}

for (const dir of fs.readdirSync(LOGOS)) {
  const folder = path.join(LOGOS, dir)
  if (!fs.statSync(folder).isDirectory()) continue
  // Current, full-colour logos only: no retired, dated, negative or wordmark files.
  const files = fs
    .readdirSync(folder, { recursive: true })
    .map(String)
    .filter(
      (f) =>
        !/former|zz|negative|monochrom|postive|horiz|white-background|wordmark/i.test(f) &&
        Number(f.match(/20\d\d-(20\d\d)/)?.[1] ?? 9999) >= 2025
    )
  const pngs = files.filter((f) => f.endsWith(".png"))
  const pick =
    files.find((f) => f.endsWith(".svg")) ||
    pngs.find((f) => /256x256(?!-+padded)/.test(f)) ||
    pngs.find((f) => /(512|510x510|620x620|800x800)/.test(f)) ||
    pngs[0]
  if (!pick) continue
  const file = path.join(folder, pick)
  add(dir, file, dir)
  const meta = path.join(folder, "metadata.md")
  if (fs.existsSync(meta)) {
    const alt = fs.readFileSync(meta, "utf8").match(/altnames:[ \t]*(.*)/)
    alt?.[1].split(/[,;]/).forEach((name) => add(name, file, dir))
  }
}

const msicons = JSON.parse(
  fs.readFileSync(path.join(args.msicons, "msicons/src/data/icons.json"), "utf8")
)
for (const icon of msicons) {
  // Skip the Fluent UI glyph sets that come in dark, light and grey variants.
  const base = path.basename(icon.path, ".svg")
  if (/^(dark|light|grey)-|_(Dark|Gray|Light)$/i.test(base)) continue
  const file = path.join(MSICONS, icon.path)
  add(icon.name, file, slugify(path.basename(icon.path)))
}

// Archive names that differ from both collections' names.
const ALIAS = {
  "Dynamics 365 Apps": "dynamics 365",
  "Microsoft Viva": "viva suite",
  "Microsoft 365 suite": "365 apps",
  "Microsoft 365 for the web": "365 apps",
  "Microsoft 365 app": "365 apps",
  "Microsoft 365": "365 apps",
  "Microsoft Defender XDR": "defender",
  "Microsoft 365 Defender": "defender",
  "Microsoft Defender for Office 365": "defender",
  "Microsoft Defender for Cloud Apps": "defender",
  "Microsoft Copilot for Security": "defender",
  "Azure Backup": "backup vault",
  "Azure Site Recovery": "recovery services vaults",
  "Azure Blob Storage": "storage accounts",
  "Archive Storage": "storage accounts",
  "Queue Storage": "storage accounts",
  "Table Storage": "storage accounts",
  "Azure Disk Storage": "disks",
  "Managed Disks": "disks",
  "Log Analytics": "log analytics workspaces",
  "Content Delivery Network": "cdn profiles",
  "Linux Virtual Machines": "virtual machine",
  "Windows Virtual Machines": "virtual machine",
  "SQL Server on Azure Virtual Machines": "virtual machine",
  "Azure Spot Virtual Machines": "virtual machine",
  "Azure Dedicated Host": "host groups",
  "Azure Virtual Network Manager": "network managers",
  "Visual Studio Team Services": "devops",
  "Azure Pipelines": "devops",
  "Azure Boards": "devops",
  "Azure Repos": "devops",
  "Azure Active Directory B2C": "ad b2c",
  "Spring Cloud": "spring apps",
  "Azure AI Bot Service": "bot",
  "Azure Time Series Insights": "time series insights environments",
  "Azure Resource Graph": "resource graph explorer",
  "Azure Resource Manager": "resource groups",
  "Azure Web PubSub": "pubsub",
  StorSimple: "storsimple device managers",
  "Storage Databox": "data box",
  "Power Apps in Microsoft 365": "power apps",
  "Microsoft Power Automate in Microsoft 365": "power automate",
  "Microsoft Power Platform governance and administration": "power platform",
  "Project for the web": "project",
  "Project Online": "project",
  "Microsoft Project": "project",
  "Dynamics 365 Customer Insights - Journeys": "dynamics 365 customer insights",
  "Dynamics 365 Customer Insights - Data": "dynamics 365 customer insights",
  "Dynamics 365 Finance and Operations cross-app": "dynamics 365 finance",
  "Dynamics 365 Sustainability": "dynamics 365 sustainability calculator",
  "Azure Stack Hub": "azure stack",
  "Azure Stack HCI": "azure stack",
  "Microsoft Azure portal": "management portal",
  "Managed Prometheus": "monitor",
  "Microsoft Clipchamp ": "clipchamp",
  "Azure AI Foundry": "foundry",
  "HDInsight Apache Kafka": "hdinsight",
  "HDInsight Apache Spark": "hdinsight",
  "HDInsight Apache Storm": "hdinsight",
  "R Server for HDInsight": "hdinsight",
  "Azure HDInsight on Azure Kubernetes Service (AKS)": "hdinsight",
  "Web App for Containers": "app service",
  "Web Apps for Containers": "app service",
  "Azure Form Recognizer": "azure ai document intelligence",
  "Speech to text": "azure ai speech",
  "Text to speech": "azure ai speech",
  "Speech translation": "azure ai speech",
  "Custom Speech": "azure ai speech",
  "Speaker recognition": "azure ai speech",
  "Conversational language understanding": "azure ai language",
  "QnA Maker": "azure ai language",
  "Storage Databox Disk": "data box",
  "Data Science Virtual Machines": "virtual machine",
  "B-series": "virtual machine",
  "M-series": "virtual machine",
  "Windows Autopatch": "intune",
}

// Where a collection's best match is the wrong picture: an SVG over a PNG, a
// colour icon over a black-and-white one, a plain mark over a badge.
const MS = (p) => ({ file: path.join(MSICONS, "icons", p), slug: slugify(path.basename(p)) })
const LC = (p, slug) => ({ file: path.join(LOGOS, p), slug })
const COPILOT = MS("fabric/copilot_color.svg")
const M365 = LC("microsoft-365-apps/microsoft-365-apps-logo.png", "microsoft-365")
const OVERRIDE = {
  "Microsoft Teams": MS("apps/Microsoft Teams.svg"),
  Outlook: MS("apps/Microsoft Outlook.svg"),
  Word: MS("apps/Microsoft Word.svg"),
  Excel: MS("apps/Microsoft Excel.svg"),
  PowerPoint: MS("apps/PowerPoint.svg"),
  "Microsoft OneDrive": MS("apps/OneDrive.svg"),
  OneDrive: MS("apps/OneDrive.svg"),
  "OneDrive for Business": MS("apps/OneDrive.svg"),
  OneNote: MS("apps/OneNote.svg"),
  "Microsoft Defender XDR": MS("apps/Defender.svg"),
  "Microsoft Defender": MS("apps/Defender.svg"),
  "Microsoft 365 Defender": MS("apps/Defender.svg"),
  "Microsoft Defender for Office 365": MS("apps/Defender.svg"),
  "Microsoft Defender for Cloud Apps": MS("apps/Defender.svg"),
  "SharePoint Online": MS("sharepoint/microsoft-office-sharepoint-2025.svg"),
  SharePoint: MS("sharepoint/microsoft-office-sharepoint-2025.svg"),
  "SharePoint Syntex": MS("sharepoint/microsoft-office-sharepoint-2025.svg"),
  "Microsoft Intune": MS("intune/Microsoft-intune.svg"),
  "Microsoft Entra": MS("entra/Microsoft Entra Product Family.svg"),
  "Microsoft Entra ID (formerly Azure AD)": MS("entra/Microsoft Entra ID color icon.svg"),
  "Microsoft Copilot (Microsoft 365)": COPILOT,
  "Microsoft 365 Copilot Chat": COPILOT,
  "Microsoft Copilot (Power Platform)": COPILOT,
  "Azure Copilot": COPILOT,
  "Microsoft 365 apps": M365,
  "Microsoft 365 suite": M365,
  "Microsoft 365 for the web": M365,
  "Microsoft 365 app": M365,
  "Microsoft 365": M365,
  // The collection's Windows logo is a JPEG with white seams; draw the mark.
  Windows: { svg: windowsLogo(), slug: "windows" },
}

function windowsLogo() {
  const tile = (x, y) => `<rect x="${x}" y="${y}" width="46" height="46" fill="#0078d4"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">${tile(0, 0)}${tile(50, 0)}${tile(0, 50)}${tile(50, 50)}</svg>`
}

// The filter's headings. Azure is decided by where a service's posts come
// from, so "Microsoft Defender for Cloud" lands with Azure.
function groupOf(service, azureShare) {
  if (azureShare > 0.5) return "azure"
  if (/Dynamics 365/.test(service)) return "dynamics"
  if (/Power (Apps|Automate|BI|Pages|Platform)|Dataverse|AI Builder/.test(service))
    return "power"
  if (/Copilot|Foundry|Agent 365|Work IQ/.test(service)) return "copilot"
  if (
    /Purview|Defender|Entra|Intune|Sentinel|Information Protection|Multi-Factor|Security|Autopatch/.test(
      service
    )
  )
    return "security"
  if (/^Windows|Edge|Universal Print|Surface/.test(service)) return "windows"
  return "m365"
}

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"))
const services = readJson("@data/table-services.json")
const posts = [...readJson("public/messages-index.json"), ...readJson("public/messages-archive.json")]
const tally = {}
for (const post of posts) {
  for (const service of post.Services || []) {
    tally[service] ??= { all: 0, azure: 0 }
    tally[service].all++
    if (post.Source === "azure") tally[service].azure++
  }
}

fs.rmSync(OUT_DIR, { recursive: true, force: true })
fs.mkdirSync(OUT_DIR, { recursive: true })

const map = {}
const written = new Set()
const missing = []
for (const service of services) {
  const count = tally[service] ?? { all: 0, azure: 0 }
  const match =
    OVERRIDE[service] ||
    candidates.get(norm(service)) ||
    (ALIAS[service] && candidates.get(norm(ALIAS[service])))
  map[service] = { icon: match ? match.slug : null, group: groupOf(service, count.azure / (count.all || 1)) }
  if (!match) {
    missing.push(`${service} (${count.all})`)
    continue
  }
  if (written.has(match.slug)) continue
  written.add(match.slug)
  const input = match.svg ? Buffer.from(match.svg) : match.file
  await sharp(input, { density: 300 })
    .trim({ threshold: 5 })
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(path.join(OUT_DIR, `${match.slug}.png`))
}

fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2) + "\n")

const matched = services.length - missing.length
console.log(`${matched} of ${services.length} services have an icon (${written.size} files).`)
if (missing.length) console.log(`Monogram only: ${missing.join(", ")}`)
