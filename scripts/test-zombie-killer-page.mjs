import assert from "node:assert/strict";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");

assert.ok(
  existsSync(path.join(root, "zombie-killer.html")),
  "zombie-killer.html must exist",
);

const sanitizeMarkup = (html) =>
  html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /(<(script|style)\b[^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>)[\s\S]*?<\/\2\s*>/gi,
      "$1</$2>",
    );

const extractAttributes = (tag) =>
  Array.from(
    tag.matchAll(/\s+([^\s"'=<>`/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g),
    (match) => ({
      name: match[1].toLowerCase(),
      value: match[2] ?? match[3] ?? match[4] ?? null,
    }),
  );

const extractOpeningTags = (markup) =>
  Array.from(
    markup.matchAll(/<([a-z][a-z0-9:-]*)\b[^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>/gi),
    (match) => ({
      name: match[1].toLowerCase(),
      raw: match[0],
      index: match.index,
      attributes: extractAttributes(match[0]),
    }),
  );

const extractPairedElements = (markup, tagName) => {
  const pattern = new RegExp(
    `(<${tagName}\\b[^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>)([\\s\\S]*?)<\\/${tagName}\\s*>`,
    "gi",
  );

  return Array.from(markup.matchAll(pattern), (match) => ({
    name: tagName.toLowerCase(),
    raw: match[1],
    inner: match[2],
    index: match.index,
    attributes: extractAttributes(match[1]),
  }));
};

const getAttribute = (element, name) => element.attributes.find((attribute) => attribute.name === name);
const attributeValue = (element, name) => getAttribute(element, name)?.value;
const hasClass = (element, className) =>
  (attributeValue(element, "class") ?? "").split(/\s+/).includes(className);
const normalizedText = (element) => element.inner.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const assertLocalFileReference = (tag, attribute) => {
  const label = `<${tag.name}> ${attribute.name}="${attribute.value}"`;
  assert.equal(typeof attribute.value, "string", `${label} must have a value`);
  assert.ok(attribute.value.startsWith("./"), `${label} must use a local ./ reference`);

  const localPath = attribute.value.replace(/[?#].*$/, "");
  const resolvedPath = path.resolve(root, localPath);
  const relativePath = path.relative(root, resolvedPath);
  assert.ok(
    relativePath !== ".." && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath),
    `${label} must stay inside the static-site root`,
  );
  assert.ok(existsSync(resolvedPath), `${label} must resolve to an existing path`);
  assert.ok(
    lstatSync(resolvedPath).isFile(),
    `${label} must resolve directly to a regular file, not a directory or symbolic link`,
  );
};

const findNextCssOpeningBrace = (source, startIndex) => {
  let quote = null;
  let escaped = false;
  for (let index = startIndex; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === "{") return index;
  }
  return -1;
};

const readBalancedCssBlock = (source, openingBraceIndex) => {
  assert.equal(source[openingBraceIndex], "{", "CSS block extraction must start at an opening brace");
  let depth = 1;
  let quote = null;
  let escaped = false;
  for (let index = openingBraceIndex + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          body: source.slice(openingBraceIndex + 1, index),
          endIndex: index,
        };
      }
    }
  }
  assert.fail("CSS block must have a balanced closing brace");
};

const extractCssAtRuleBlocks = (source, headerPattern) => {
  const blocks = [];
  let quote = null;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (!source.startsWith("@media", index) || /[\w-]/.test(source[index - 1] ?? "")) continue;

    const openingBraceIndex = findNextCssOpeningBrace(source, index + "@media".length);
    if (openingBraceIndex < 0) continue;
    const header = source.slice(index, openingBraceIndex).trim();
    const block = readBalancedCssBlock(source, openingBraceIndex);
    if (headerPattern.test(header)) blocks.push(block.body);
    index = block.endIndex;
  }
  return blocks;
};

const extractTopLevelCssRules = (block) => {
  const rules = [];
  let cursor = 0;
  while (cursor < block.length) {
    const openingBraceIndex = findNextCssOpeningBrace(block, cursor);
    if (openingBraceIndex < 0) break;
    const rule = readBalancedCssBlock(block, openingBraceIndex);
    const selectors = block
      .slice(cursor, openingBraceIndex)
      .split(",")
      .map((selector) => selector.trim().replace(/\s+/g, " "))
      .filter(Boolean);
    rules.push({ selectors, body: rule.body });
    cursor = rule.endIndex + 1;
  }
  return rules;
};

const requireCssRule = (rules, expectedSelectors, message) => {
  const wanted = [...expectedSelectors].sort();
  const rule = rules.find(({ selectors }) => {
    const actual = [...selectors].sort();
    return actual.length === wanted.length && actual.every((selector, index) => selector === wanted[index]);
  });
  assert.ok(rule, message);
  assert.doesNotMatch(rule.body, /[{}]/, `${message}; required declarations must be top-level`);
  return rule;
};

const validateXmlDocument = (source) => {
  assert.doesNotMatch(source, /<!DOCTYPE\b/i, "XML must not contain a document type declaration");
  assert.doesNotMatch(source, /<!ENTITY\b/i, "XML must not contain entity declarations");

  const tokens = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]*>/g;
  const stack = [];
  let cursor = 0;
  let rootCount = 0;
  let declarationSeen = false;

  const validateText = (text, outsideRoot) => {
    assert.doesNotMatch(text, /</, "XML text must not contain an unmatched opening bracket");
    assert.doesNotMatch(text, /&/, "XML entities are not accepted in the sitemap contract");
    if (outsideRoot) assert.match(text, /^\s*$/, "XML may contain only whitespace outside its root element");
  };

  for (const match of source.matchAll(tokens)) {
    validateText(source.slice(cursor, match.index), stack.length === 0);
    const token = match[0];

    if (token.startsWith("<!--")) {
      assert.doesNotMatch(token.slice(4, -3), /--/, "XML comments must not contain a double hyphen");
    } else if (token.startsWith("<?")) {
      assert.equal(stack.length, 0, "XML declarations must appear outside elements");
      assert.equal(rootCount, 0, "XML declarations must appear before the root element");
      assert.equal(declarationSeen, false, "XML may contain only one declaration");
      assert.match(
        token,
        /^<\?xml\s+version=(?:"1\.0"|'1\.0')(?:\s+encoding=(?:"UTF-8"|'UTF-8'))?\s*\?>$/i,
        "Only a valid XML declaration is permitted",
      );
      declarationSeen = true;
    } else if (token.startsWith("<![CDATA[")) {
      assert.ok(stack.length > 0, "CDATA must appear inside the root element");
    } else if (token.startsWith("<!")) {
      assert.fail("Unsupported XML declaration");
    } else if (token.startsWith("</")) {
      const closing = token.match(/^<\/([A-Za-z_][\w:.-]*)\s*>$/);
      assert.ok(closing, `Malformed XML closing tag: ${token}`);
      const expected = stack.pop();
      assert.equal(closing[1], expected, `Mismatched XML closing tag: ${token}`);
    } else {
      const opening = token.match(
        /^<([A-Za-z_][\w:.-]*)(?:\s+[A-Za-z_][\w:.-]*\s*=\s*(?:"[^"<&]*"|'[^'<&]*'))*\s*\/?>$/,
      );
      assert.ok(opening, `Malformed XML opening tag: ${token}`);
      if (stack.length === 0) {
        rootCount += 1;
        assert.equal(rootCount, 1, "XML must contain exactly one root element");
      }
      if (!/\/\s*>$/.test(token)) stack.push(opening[1]);
    }

    cursor = match.index + token.length;
  }

  validateText(source.slice(cursor), stack.length === 0);
  assert.equal(stack.length, 0, `Unclosed XML element: ${stack.at(-1) ?? "unknown"}`);
  assert.equal(rootCount, 1, "XML must contain exactly one root element");
  return true;
};

assert.throws(
  () => validateXmlDocument("<urlset><url></urlset>"),
  /Mismatched XML closing tag/,
  "the XML validator must reject mismatched tags",
);
assert.throws(
  () => validateXmlDocument("<!DOCTYPE urlset><urlset></urlset>"),
  /document type declaration/,
  "the XML validator must reject doctypes",
);
assert.throws(
  () => validateXmlDocument("<urlset><url></url>"),
  /Unclosed XML element/,
  "the XML validator must reject unclosed elements",
);

const enter = read("enter.html");
const enterScript = read("enter.js");
const page = read("zombie-killer.html");
const styles = read("styles.css");
const sitemap = read("sitemap.xml");
const githubPagesWorkflow = read(".github/workflows/pages.yml");
const gitlabPipeline = read(".gitlab-ci.yml");
const readme = read("README.md");
const implementationPlan = read("docs/superpowers/plans/2026-08-14-zombie-killer-site-link.md");

const enterMarkup = sanitizeMarkup(enter);
const pageMarkup = sanitizeMarkup(page);

const earlyJsClassScript = /<script>\s*document\.documentElement\.classList\.add\("js"\);\s*window\.__phantombugzRevealFallback = window\.setTimeout\(\(\) => \{\s*document\.documentElement\.classList\.remove\("js"\);\s*\}, 3000\);\s*<\/script>/m.exec(enter);
assert.ok(earlyJsClassScript, "enter.html must set and fail-safe the enhancement class in the document head");
assert.ok(
  earlyJsClassScript.index < enter.indexOf('<link rel="stylesheet" href="./styles.css">'),
  "enter.html must set the progressive-enhancement class before the main stylesheet loads",
);
const revealRegistrationIndex = enterScript.indexOf("reveals.forEach((el) => observer.observe(el));");
const revealFallbackClearIndex = enterScript.indexOf("window.clearTimeout(window.__phantombugzRevealFallback);");
assert.doesNotMatch(
  enterScript,
  /document\.documentElement\.classList\.add\("js"\)/,
  "enter.js must not re-hide content after the head fallback has fired",
);
assert.ok(
  revealRegistrationIndex >= 0 && revealRegistrationIndex < revealFallbackClearIndex,
  "enter.js must clear the reveal fallback only after the reveal behavior is installed",
);
const css = styles.replace(/\/\*[\s\S]*?\*\//g, "");
const sitemapMarkup = sitemap
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
  .replace(/<\?[\s\S]*?\?>/g, "");
const pageTags = extractOpeningTags(pageMarkup);
const pageAnchors = extractPairedElements(pageMarkup, "a");
const enterSections = extractPairedElements(enterMarkup, "section");

const primaryNavigation = extractPairedElements(enterMarkup, "nav").find((nav) => hasClass(nav, "header-nav"));
assert.ok(primaryNavigation, "enter.html must retain its primary navigation");
const navLink = extractPairedElements(primaryNavigation.inner, "a").find(
  (anchor) =>
    attributeValue(anchor, "href") === "./zombie-killer.html" && normalizedText(anchor) === "Zombie Killer",
);
assert.ok(navLink, "the primary navigation must link to the Zombie Killer page");

const featureSection = enterSections.find(
  (section) => attributeValue(section, "id") === "zombie-killer" && hasClass(section, "zk-feature"),
);
assert.ok(featureSection, "enter.html must include the Zombie Killer feature section");

const featureCta = extractPairedElements(featureSection.inner, "a").find(
  (anchor) =>
    hasClass(anchor, "zk-cta") &&
    attributeValue(anchor, "href") === "./zombie-killer.html" &&
    normalizedText(anchor).startsWith("Meet Zombie Killer"),
);
assert.ok(featureCta, "the Zombie Killer feature must link to its standalone page");
const featureCopy = extractOpeningTags(featureSection.inner).find(
  (element) => element.name === "div" && hasClass(element, "zk-feature-copy"),
);
assert.ok(featureCopy, "the Zombie Killer feature must retain its copy container");
assert.equal(
  getAttribute(featureCopy, "data-reveal"),
  undefined,
  "the Zombie Killer CTA container must never be hidden while its link remains focusable",
);

const vaultSection = enterSections.find((section) => attributeValue(section, "id") === "vault");
const signalSection = enterSections.find((section) => attributeValue(section, "id") === "signal");
assert.ok(
  vaultSection && signalSection && vaultSection.index < featureSection.index && featureSection.index < signalSection.index,
  "Zombie Killer feature must appear between the vault and signal",
);

const main = extractPairedElements(pageMarkup, "main").find((element) => attributeValue(element, "id") === "zk-main");
assert.ok(main, "the standalone page must expose its main landmark");

const title = extractPairedElements(main.inner, "h1").find(
  (heading) => attributeValue(heading, "id") === "zk-title" && normalizedText(heading) === "Zombie Killer",
);
assert.ok(title, "the standalone page must have its Zombie Killer product heading");
const mainText = normalizedText(main);
assert.match(
  mainText,
  /Local-first process safety for AI-agent workloads\./,
  "the standalone page must state the product purpose",
);
assert.match(mainText, /v0\.1\.0-alpha\.1/, "the standalone page must identify the planned alpha release");
assert.match(mainText, /Coming Soon/, "the standalone page must make the release status clear");
assert.match(mainText, /Apache-2\.0/, "the standalone page must state the planned license");
assert.match(mainText, /Windows/, "the standalone page must describe Windows support");
assert.match(mainText, /Linux/, "the standalone page must describe Linux support");
assert.match(mainText, /pidfd/, "the Linux capability must mention pidfd");
assert.match(mainText, /macOS/, "the standalone page must describe macOS support");
assert.match(mainText, /scan and inspect only/i, "the macOS capability must state its initial safety boundary");
assert.match(mainText, /auditable receipts/i, "the standalone page must describe auditable receipts");
assert.match(
  mainText,
  /The source release candidate is prepared\. Public source will follow completed hosted verification and a verified release tag\. Signed installers will follow human-controlled platform signing; macOS installers also require notarization and stapling\./,
  "the release copy must separate public source verification from installer signing gates",
);
assert.ok(
  !pageTags.some((tag) => getAttribute(tag, "data-reveal")),
  "standalone page must remain visible without JavaScript",
);

const status = extractPairedElements(main.inner, "p").find((paragraph) => hasClass(paragraph, "zk-status"));
assert.ok(status, "the standalone page must retain its visible release status");
assert.equal(
  getAttribute(status, "aria-label"),
  undefined,
  "the visible release status must not be replaced by a redundant aria-label",
);
assert.deepEqual(
  extractPairedElements(status.inner, "span").map(normalizedText),
  ["v0.1.0-alpha.1", "Coming Soon", "Apache-2.0"],
  "the release status must keep its visible version, availability, and license text",
);

const canonicalLink = pageTags.find(
  (tag) =>
    tag.name === "link" &&
    (attributeValue(tag, "rel") ?? "")
      .toLowerCase()
      .split(/\s+/)
      .includes("canonical") &&
    attributeValue(tag, "href") === "https://phantombugz.com/zombie-killer.html",
);
assert.ok(canonicalLink, "the standalone page must publish the canonical URL");

const openGraphUrl = pageTags.find(
  (tag) =>
    tag.name === "meta" &&
    attributeValue(tag, "property") === "og:url" &&
    attributeValue(tag, "content") === "https://phantombugz.com/zombie-killer.html",
);
assert.ok(openGraphUrl, "the standalone page must publish its Open Graph URL");

for (const [property, expected] of [
  ["og:image:width", "1200"],
  ["og:image:height", "630"],
]) {
  const meta = pageTags.find(
    (tag) =>
      tag.name === "meta" &&
      attributeValue(tag, "property") === property &&
      attributeValue(tag, "content") === expected,
  );
  assert.ok(meta, `${property} must match the actual social image dimension ${expected}`);
}

const jsonLdScripts = extractPairedElements(page, "script").filter(
  (script) => (attributeValue(script, "type") ?? "").toLowerCase() === "application/ld+json",
);
assert.equal(jsonLdScripts.length, 1, "the standalone page must contain exactly one application/ld+json block");
let softwareMetadata;
assert.doesNotThrow(() => {
  softwareMetadata = JSON.parse(jsonLdScripts[0].inner);
}, "the SoftwareApplication structured data must be valid JSON");
assert.equal(softwareMetadata["@type"], "SoftwareApplication", "JSON-LD must describe a SoftwareApplication");
assert.equal(softwareMetadata.name, "Zombie Killer", "JSON-LD must name Zombie Killer");
assert.equal(softwareMetadata.softwareVersion, "0.1.0-alpha.1", "JSON-LD must publish the alpha version");
assert.equal(
  softwareMetadata.license,
  "https://spdx.org/licenses/Apache-2.0.html",
  "JSON-LD must publish the Apache-2.0 SPDX license",
);
assert.equal(
  softwareMetadata.url,
  "https://phantombugz.com/zombie-killer.html",
  "JSON-LD must publish the canonical application URL",
);
assert.equal(softwareMetadata.operatingSystem, "Windows, Linux, macOS", "JSON-LD must state the supported OS set");

const githubAnchor = pageAnchors.find(
  (anchor) =>
    attributeValue(anchor, "href") === "https://github.com/PhantomBugz" &&
    normalizedText(anchor) === "Follow PhantomBugz on GitHub",
);
assert.ok(githubAnchor, "the coming-soon page must direct visitors to the PhantomBugz GitHub profile");

const packageExtension = /\.(?:exe|msi|msix|appx|dmg|pkg|zip|deb|rpm|appimage|tar\.(?:gz|xz)|tgz|7z)$/i;
const approvedAnchorReferences = new Set([
  "#zk-main",
  "./enter.html#arrival",
  "./enter.html",
  "https://github.com/PhantomBugz",
  "mailto:founder@phantombugz.com",
]);
const pageIds = new Set(
  pageTags.map((tag) => attributeValue(tag, "id")).filter((value) => typeof value === "string"),
);

for (const tag of pageTags) {
  const sourceAttributes = tag.attributes.filter(({ name }) => name === "src");
  for (const attribute of sourceAttributes) assertLocalFileReference(tag, attribute);

  const hrefAttributes = tag.attributes.filter(({ name }) => name === "href");
  if (tag.name === "a") {
    assert.ok(
      !tag.attributes.some(({ name }) => name === "download"),
      "the coming-soon page must not contain a real anchor download attribute",
    );
    assert.equal(hrefAttributes.length, 1, "every anchor on the coming-soon page must have exactly one href");

    const [attribute] = hrefAttributes;
    assert.equal(typeof attribute.value, "string", "every anchor href attribute must have a value");
    const hrefPath = attribute.value.replace(/[?#].*$/, "");
    assert.doesNotMatch(
      hrefPath,
      packageExtension,
      `the coming-soon page must not link to a downloadable package: ${attribute.value}`,
    );
    assert.ok(
      approvedAnchorReferences.has(attribute.value),
      `<a> href="${attribute.value}" is not approved for the coming-soon page`,
    );
    if (attribute.value.startsWith("./")) assertLocalFileReference(tag, attribute);
    if (attribute.value === "#zk-main") {
      assert.ok(pageIds.has("zk-main"), "the #zk-main anchor must target an element on the page");
    }
    continue;
  }

  if (tag.name === "link") {
    for (const attribute of hrefAttributes) {
      if (attribute.value === "https://phantombugz.com/zombie-killer.html") continue;
      assertLocalFileReference(tag, attribute);
    }
    continue;
  }

  for (const attribute of hrefAttributes) assertLocalFileReference(tag, attribute);
}

for (const selector of [".zk-feature", ".zk-page", ".zk-hero", ".zk-capability-grid", ".zk-release"]) {
  const selectorRule = new RegExp(`\\.${selector.slice(1)}(?![\\w-])(?=[^{}]*\\{)`);
  assert.match(css, selectorRule, `styles.css must define ${selector} in a real selector rule`);
}

const topLevelRules = extractTopLevelCssRules(css);
const skipLinkRule = requireCssRule(topLevelRules, [".skip-link"], "skip links must define an accessible target size");
assert.match(
  skipLinkRule.body,
  /(?:^|;)\s*min-height\s*:\s*44px\s*(?:;|$)/,
  "skip links must be at least 44px tall",
);

const mutedCopyRule = requireCssRule(
  topLevelRules,
  [
    ".zk-feature-text",
    ".zk-intro",
    ".zk-release > p:not(.eyebrow)",
    ".zk-platform-list dd",
    ".zk-capability-grid article > p:last-child",
  ],
  "muted Zombie Killer copy must exclude the release eyebrow",
);
assert.match(mutedCopyRule.body, /(?:^|;)\s*color\s*:\s*var\(--muted\)\s*(?:;|$)/);

const defaultRevealRule = requireCssRule(
  topLevelRules,
  ["[data-reveal]"],
  "reveal-marked content must be visible by default without JavaScript",
);
assert.match(defaultRevealRule.body, /(?:^|;)\s*opacity\s*:\s*1\s*(?:;|$)/);
assert.match(defaultRevealRule.body, /(?:^|;)\s*transform\s*:\s*none\s*(?:;|$)/);
const enhancedRevealRule = requireCssRule(
  topLevelRules,
  [".js [data-reveal]"],
  "JavaScript enhancement must explicitly opt reveal-marked content into hiding",
);
assert.match(enhancedRevealRule.body, /(?:^|;)\s*opacity\s*:\s*0\s*(?:;|$)/);
assert.match(enhancedRevealRule.body, /(?:^|;)\s*transform\s*:\s*translateY\(18px\)\s*(?:;|$)/);
const enhancedVisibleRule = requireCssRule(
  topLevelRules,
  [".js [data-reveal].in"],
  "revealed JavaScript-enhanced content must become visible",
);
assert.match(enhancedVisibleRule.body, /(?:^|;)\s*opacity\s*:\s*1\s*(?:;|$)/);
assert.match(enhancedVisibleRule.body, /(?:^|;)\s*transform\s*:\s*none\s*(?:;|$)/);

const revealSetupIndex = enterScript.indexOf('document.querySelectorAll("[data-reveal]")');
assert.ok(
  revealSetupIndex >= 0,
  "enter.js must configure reveal behavior after the document head opts into enhancement",
);

const headerTargetRule = requireCssRule(
  topLevelRules,
  [".main-page .header-nav a", ".zk-page .header-nav a"],
  "main and Zombie Killer header links must share an accessible target-size rule",
);
assert.match(
  headerTargetRule.body,
  /(?:^|;)\s*min-width\s*:\s*44px\s*(?:;|$)/,
  "main and Zombie Killer header links must be at least 44px wide",
);
assert.match(
  headerTargetRule.body,
  /(?:^|;)\s*min-height\s*:\s*44px\s*(?:;|$)/,
  "main and Zombie Killer header links must be at least 44px tall",
);

const ctaTargetRule = requireCssRule(
  topLevelRules,
  [".zk-cta"],
  "Zombie Killer calls to action must define an accessible target size",
);
assert.match(
  ctaTargetRule.body,
  /(?:^|;)\s*min-width\s*:\s*44px\s*(?:;|$)/,
  "Zombie Killer calls to action must be at least 44px wide",
);
assert.match(
  ctaTargetRule.body,
  /(?:^|;)\s*min-height\s*:\s*44px\s*(?:;|$)/,
  "Zombie Killer calls to action must be at least 44px tall",
);

const mobileBlocks = extractCssAtRuleBlocks(css, /^@media\s*\(\s*max-width\s*:\s*720px\s*\)$/);
assert.equal(mobileBlocks.length, 1, "styles.css must define exactly one real 720px mobile media block");
const mobileRules = extractTopLevelCssRules(mobileBlocks[0]);

const mobileHeaderRule = requireCssRule(
  mobileRules,
  [".main-page .site-header", ".zk-page .site-header"],
  "the 720px block must share a site-header rule between the main and Zombie Killer pages",
);
assert.match(
  mobileHeaderRule.body,
  /(?:^|;)\s*grid-template-columns\s*:\s*34px\s+minmax\(\s*0\s*,\s*1fr\s*\)\s*(?:;|$)/,
  "the mobile site-header rule must reserve 34px and a shrinkable navigation column",
);

const mobileNavigationRule = requireCssRule(
  mobileRules,
  [".main-page .header-nav", ".zk-page .header-nav"],
  "the 720px block must share a header-nav rule between the main and Zombie Killer pages",
);
assert.match(
  mobileNavigationRule.body,
  /(?:^|;)\s*flex-wrap\s*:\s*wrap\s*(?:;|$)/,
  "the mobile header-nav rule must wrap navigation links",
);

const mobileShopHeaderRule = requireCssRule(
  mobileRules,
  [
    ".shop-page .site-header",
    "body:not(.main-page):not(.zk-page):not(.shop-page) .site-header",
  ],
  "the 720px block must preserve the shop and index header spacing without the icon-only grid",
);
assert.match(
  mobileShopHeaderRule.body,
  /(?:^|;)\s*padding\s*:\s*12px\s+18px\s*(?:;|$)/,
  "the mobile shop and index headers must retain their compact padding",
);
assert.doesNotMatch(
  mobileShopHeaderRule.body,
  /(?:^|;)\s*(?:display\s*:\s*grid|grid-template-columns\s*:)/,
  "the text-bearing shop brand must not be forced into the icon-only grid",
);

const mobileShopNavigationRule = requireCssRule(
  mobileRules,
  [
    ".shop-page .header-nav",
    "body:not(.main-page):not(.zk-page):not(.shop-page) .header-nav",
  ],
  "the 720px block must preserve the shop and index navigation spacing",
);
assert.match(
  mobileShopNavigationRule.body,
  /(?:^|;)\s*gap\s*:\s*14px\s*(?:;|$)/,
  "the mobile shop and index navigation must retain the 14px gap",
);
assert.match(
  mobileShopNavigationRule.body,
  /(?:^|;)\s*font-size\s*:\s*\.66rem\s*(?:;|$)/,
  "the mobile shop and index navigation must retain the compact font size",
);
assert.match(
  mobileShopNavigationRule.body,
  /(?:^|;)\s*letter-spacing\s*:\s*\.16em\s*(?:;|$)/,
  "the mobile shop and index navigation must retain readable letter spacing",
);

const mobileFooterNavigationRule = requireCssRule(
  mobileRules,
  [".main-page .site-footer nav", ".zk-page .site-footer nav"],
  "the 720px block must wrap the main and Zombie Killer footer navigation",
);
assert.match(
  mobileFooterNavigationRule.body,
  /(?:^|;)\s*width\s*:\s*100%\s*(?:;|$)/,
  "mobile main and Zombie Killer footer navigation must fit its container",
);
assert.match(
  mobileFooterNavigationRule.body,
  /(?:^|;)\s*min-width\s*:\s*0\s*(?:;|$)/,
  "mobile main and Zombie Killer footer navigation must be shrinkable",
);
assert.match(
  mobileFooterNavigationRule.body,
  /(?:^|;)\s*flex-wrap\s*:\s*wrap\s*(?:;|$)/,
  "mobile main and Zombie Killer footer navigation must wrap",
);

const mobileBrandTargetRule = requireCssRule(
  mobileRules,
  [".main-page .brand-lockup", ".zk-page .brand-lockup"],
  "the 720px block must size main and Zombie Killer brand links as accessible targets",
);
assert.match(
  mobileBrandTargetRule.body,
  /(?:^|;)\s*min-width\s*:\s*44px\s*(?:;|$)/,
  "mobile main and Zombie Killer brand links must be at least 44px wide",
);
assert.match(
  mobileBrandTargetRule.body,
  /(?:^|;)\s*min-height\s*:\s*44px\s*(?:;|$)/,
  "mobile main and Zombie Killer brand links must be at least 44px tall",
);

const mobileTextTargetRule = requireCssRule(
  mobileRules,
  [
    ".main-page .foot-mark",
    ".zk-page .foot-mark",
    ".main-page .site-footer nav a",
    ".zk-page .site-footer nav a",
    ".zk-page .zk-text-link",
  ],
  "the 720px block must size footer and back links as accessible targets",
);
assert.match(
  mobileTextTargetRule.body,
  /(?:^|;)\s*min-width\s*:\s*44px\s*(?:;|$)/,
  "mobile footer and back links must be at least 44px wide",
);
assert.match(
  mobileTextTargetRule.body,
  /(?:^|;)\s*min-height\s*:\s*44px\s*(?:;|$)/,
  "mobile footer and back links must be at least 44px tall",
);
assert.match(
  mobileTextTargetRule.body,
  /(?:^|;)\s*overflow-wrap\s*:\s*anywhere\s*(?:;|$)/,
  "mobile footer and back link text must be allowed to wrap",
);

const featureGridRule = requireCssRule(
  mobileRules,
  [".zk-feature-grid", ".zk-hero"],
  "the 720px block must collapse the feature and hero grids together",
);
assert.match(
  featureGridRule.body,
  /(?:^|;)\s*grid-template-columns\s*:\s*1fr\s*(?:;|$)/,
  "the mobile feature and hero grids must use one column",
);

const mobileHeroRule = requireCssRule(mobileRules, [".zk-hero"], "the 720px block must define the mobile hero");
assert.match(
  mobileHeroRule.body,
  /(?:^|;)\s*min-height\s*:\s*auto\s*(?:;|$)/,
  "the mobile hero must remove its minimum height",
);
assert.match(
  mobileHeroRule.body,
  /(?:^|;)\s*padding-top\s*:\s*84px\s*(?:;|$)/,
  "the mobile hero must retain header clearance",
);

const mobileShellRule = requireCssRule(mobileRules, [".zk-shell"], "the 720px block must define the mobile shell");
assert.match(
  mobileShellRule.body,
  /(?:^|;)\s*padding-top\s*:\s*0\s*(?:;|$)/,
  "the mobile shell must remove duplicate top padding",
);

const capabilityGridRule = requireCssRule(
  mobileRules,
  [".zk-capability-grid"],
  "the 720px block must define the mobile capability grid",
);
assert.match(
  capabilityGridRule.body,
  /(?:^|;)\s*grid-template-columns\s*:\s*1fr\s*(?:;|$)/,
  "the mobile capability grid must use one column",
);

const platformRowRule = requireCssRule(
  mobileRules,
  [".zk-platform-list > div"],
  "the 720px block must define mobile platform rows",
);
assert.match(
  platformRowRule.body,
  /(?:^|;)\s*grid-template-columns\s*:\s*1fr\s*(?:;|$)/,
  "mobile platform rows must use one column",
);
assert.match(
  platformRowRule.body,
  /(?:^|;)\s*gap\s*:\s*6px\s*(?:;|$)/,
  "mobile platform rows must use the compact six-pixel gap",
);

const compactBlocks = extractCssAtRuleBlocks(css, /^@media\s*\(\s*max-width\s*:\s*420px\s*\)$/);
assert.equal(compactBlocks.length, 1, "styles.css must define exactly one real 420px compact media block");
const compactRules = extractTopLevelCssRules(compactBlocks[0]);
const compactIndexHeaderRule = requireCssRule(
  compactRules,
  ["body:not(.main-page):not(.zk-page):not(.shop-page) .site-header"],
  "the 420px block must stack the runtime-class-safe index header",
);
assert.match(compactIndexHeaderRule.body, /(?:^|;)\s*display\s*:\s*grid\s*(?:;|$)/);
assert.match(
  compactIndexHeaderRule.body,
  /(?:^|;)\s*grid-template-columns\s*:\s*minmax\(\s*0\s*,\s*1fr\s*\)\s*(?:;|$)/,
);
assert.match(compactIndexHeaderRule.body, /(?:^|;)\s*min-width\s*:\s*0\s*(?:;|$)/);

const compactIndexNavRule = requireCssRule(
  compactRules,
  ["body:not(.main-page):not(.zk-page):not(.shop-page) .header-nav"],
  "the 420px block must contain and wrap the runtime-class-safe index navigation",
);
assert.match(compactIndexNavRule.body, /(?:^|;)\s*width\s*:\s*100%\s*(?:;|$)/);
assert.match(compactIndexNavRule.body, /(?:^|;)\s*max-width\s*:\s*100%\s*(?:;|$)/);
assert.match(compactIndexNavRule.body, /(?:^|;)\s*min-width\s*:\s*0\s*(?:;|$)/);
assert.match(compactIndexNavRule.body, /(?:^|;)\s*flex-wrap\s*:\s*wrap\s*(?:;|$)/);

const compactIndexNavLinkRule = requireCssRule(
  compactRules,
  ["body:not(.main-page):not(.zk-page):not(.shop-page) .header-nav a"],
  "the 420px block must let each index navigation link shrink and wrap",
);
assert.match(compactIndexNavLinkRule.body, /(?:^|;)\s*min-width\s*:\s*0\s*(?:;|$)/);
assert.match(compactIndexNavLinkRule.body, /(?:^|;)\s*max-width\s*:\s*100%\s*(?:;|$)/);
assert.match(compactIndexNavLinkRule.body, /(?:^|;)\s*overflow-wrap\s*:\s*anywhere\s*(?:;|$)/);

const compactMainSectionRule = requireCssRule(
  compactRules,
  [
    ".main-page .arrival",
    ".main-page .vault",
    ".main-page .zk-feature",
    ".main-page .signal",
  ],
  "the 420px block must bound the main-page sections at extreme text zoom",
);
assert.match(compactMainSectionRule.body, /(?:^|;)\s*box-sizing\s*:\s*border-box\s*(?:;|$)/);
assert.match(compactMainSectionRule.body, /(?:^|;)\s*min-width\s*:\s*0\s*(?:;|$)/);
assert.match(compactMainSectionRule.body, /(?:^|;)\s*max-width\s*:\s*100%\s*(?:;|$)/);

const compactMainSurfaceRule = requireCssRule(
  compactRules,
  [
    ".main-page .arrival-name",
    ".main-page .manifesto",
    ".main-page .arrival-sub",
    ".main-page .spec",
    ".main-page .spec-tech",
    ".main-page .spec-presets",
    ".main-page .spec-layers",
    ".main-page .preset",
    ".main-page .signal-row",
    ".main-page .signal-cell",
    ".main-page .zk-feature-grid",
    ".main-page .zk-feature-copy",
    ".main-page .zk-process-map",
    ".main-page .zk-feature-meta",
  ],
  "the 420px block must let every main-page min-content surface shrink and wrap",
);
assert.match(compactMainSurfaceRule.body, /(?:^|;)\s*min-width\s*:\s*0\s*(?:;|$)/);
assert.match(compactMainSurfaceRule.body, /(?:^|;)\s*max-width\s*:\s*100%\s*(?:;|$)/);
assert.match(compactMainSurfaceRule.body, /(?:^|;)\s*overflow-wrap\s*:\s*anywhere\s*(?:;|$)/);

const compactMainFieldsetRule = requireCssRule(
  compactRules,
  [".main-page .pieces"],
  "the 420px block must let the main-page interest fieldset shrink below its intrinsic minimum",
);
assert.match(compactMainFieldsetRule.body, /(?:^|;)\s*box-sizing\s*:\s*border-box\s*(?:;|$)/);
assert.match(compactMainFieldsetRule.body, /(?:^|;)\s*width\s*:\s*100%\s*(?:;|$)/);
assert.match(compactMainFieldsetRule.body, /(?:^|;)\s*min-width\s*:\s*0\s*(?:;|$)/);
assert.match(compactMainFieldsetRule.body, /(?:^|;)\s*max-width\s*:\s*100%\s*(?:;|$)/);

const compactMainFieldsetChildRule = requireCssRule(
  compactRules,
  [".main-page .pieces legend", ".main-page .pieces label"],
  "the 420px block must wrap the main-page interest fieldset labels",
);
assert.match(compactMainFieldsetChildRule.body, /(?:^|;)\s*min-width\s*:\s*0\s*(?:;|$)/);
assert.match(compactMainFieldsetChildRule.body, /(?:^|;)\s*max-width\s*:\s*100%\s*(?:;|$)/);
assert.match(compactMainFieldsetChildRule.body, /(?:^|;)\s*overflow-wrap\s*:\s*anywhere\s*(?:;|$)/);

const compactMainSurfaceChildRule = requireCssRule(
  compactRules,
  [
    ".main-page .manifesto .line",
    ".main-page .spec-layers > *",
    ".main-page .preset > *",
    ".main-page .signal-cell > *",
    ".main-page .zk-feature-copy > *",
    ".main-page .zk-process-map > *",
    ".main-page .zk-feature-meta > *",
  ],
  "the 420px block must let main-page grid and text children shrink and wrap",
);
assert.match(compactMainSurfaceChildRule.body, /(?:^|;)\s*min-width\s*:\s*0\s*(?:;|$)/);
assert.match(compactMainSurfaceChildRule.body, /(?:^|;)\s*max-width\s*:\s*100%\s*(?:;|$)/);
assert.match(compactMainSurfaceChildRule.body, /(?:^|;)\s*overflow-wrap\s*:\s*anywhere\s*(?:;|$)/);

const compactMainGridRule = requireCssRule(
  compactRules,
  [".main-page .spec", ".main-page .spec-presets", ".main-page .zk-feature-grid", ".main-page .signal-row"],
  "the 420px block must collapse main-page grids onto one shrinkable column",
);
assert.match(
  compactMainGridRule.body,
  /(?:^|;)\s*grid-template-columns\s*:\s*minmax\(\s*0\s*,\s*1fr\s*\)\s*(?:;|$)/,
);

const compactMainSpecLinkRule = requireCssRule(
  compactRules,
  [".main-page .spec-link"],
  "the 420px block must bound the main-page technical-spec control",
);
assert.match(compactMainSpecLinkRule.body, /(?:^|;)\s*box-sizing\s*:\s*border-box\s*(?:;|$)/);
assert.match(compactMainSpecLinkRule.body, /(?:^|;)\s*width\s*:\s*100%\s*(?:;|$)/);
assert.match(compactMainSpecLinkRule.body, /(?:^|;)\s*max-width\s*:\s*100%\s*(?:;|$)/);
assert.match(compactMainSpecLinkRule.body, /(?:^|;)\s*min-width\s*:\s*0\s*(?:;|$)/);
assert.match(compactMainSpecLinkRule.body, /(?:^|;)\s*overflow-wrap\s*:\s*anywhere\s*(?:;|$)/);

const compactMainFeatureControlRule = requireCssRule(
  compactRules,
  [".main-page .zk-feature-meta span", ".main-page .zk-cta"],
  "the 420px block must bound the main-page feature status and call to action",
);
assert.match(compactMainFeatureControlRule.body, /(?:^|;)\s*box-sizing\s*:\s*border-box\s*(?:;|$)/);
assert.match(compactMainFeatureControlRule.body, /(?:^|;)\s*width\s*:\s*100%\s*(?:;|$)/);
assert.match(compactMainFeatureControlRule.body, /(?:^|;)\s*max-width\s*:\s*100%\s*(?:;|$)/);
assert.match(compactMainFeatureControlRule.body, /(?:^|;)\s*min-width\s*:\s*0\s*(?:;|$)/);
assert.match(compactMainFeatureControlRule.body, /(?:^|;)\s*overflow-wrap\s*:\s*anywhere\s*(?:;|$)/);

const compactContainmentRule = requireCssRule(
  compactRules,
  [
    ".zk-hero",
    ".zk-hero-copy",
    ".zk-console",
    ".zk-status",
    ".zk-actions",
    ".zk-capability-grid",
    ".zk-capability-grid article",
    ".zk-platform-list",
    ".zk-release",
  ],
  "the 420px block must contain every Zombie Killer reflow surface",
);
assert.match(compactContainmentRule.body, /(?:^|;)\s*min-width\s*:\s*0\s*(?:;|$)/);
assert.match(compactContainmentRule.body, /(?:^|;)\s*max-width\s*:\s*100%\s*(?:;|$)/);

const compactSurfaceSpacingRule = requireCssRule(
  compactRules,
  [".zk-console", ".zk-capability-grid article"],
  "the 420px block must reduce console and capability-card padding",
);
assert.match(
  compactSurfaceSpacingRule.body,
  /(?:^|;)\s*padding\s*:\s*clamp\(\s*12px\s*,\s*5vw\s*,\s*20px\s*\)\s*(?:;|$)/,
);

const compactConsoleRowRule = requireCssRule(
  compactRules,
  [".zk-console p"],
  "the 420px block must use shrinkable console grid tracks",
);
assert.match(
  compactConsoleRowRule.body,
  /(?:^|;)\s*grid-template-columns\s*:\s*minmax\(\s*0\s*,\s*3ch\s*\)\s+minmax\(\s*0\s*,\s*1fr\s*\)\s*(?:;|$)/,
);
assert.match(compactConsoleRowRule.body, /(?:^|;)\s*column-gap\s*:\s*6px\s*(?:;|$)/);

const compactGridChildRule = requireCssRule(
  compactRules,
  [".zk-console > *", ".zk-capability-grid > *", ".zk-platform-list > *"],
  "the 420px block must let Zombie Killer grid children shrink below min-content width",
);
assert.match(compactGridChildRule.body, /(?:^|;)\s*min-width\s*:\s*0\s*(?:;|$)/);
assert.match(compactGridChildRule.body, /(?:^|;)\s*max-width\s*:\s*100%\s*(?:;|$)/);

const compactActionTextRule = requireCssRule(
  compactRules,
  [".zk-status span", ".zk-cta", ".zk-text-link"],
  "the 420px block must contain status chips and hero actions",
);
assert.match(compactActionTextRule.body, /(?:^|;)\s*box-sizing\s*:\s*border-box\s*(?:;|$)/);
assert.match(compactActionTextRule.body, /(?:^|;)\s*max-width\s*:\s*100%\s*(?:;|$)/);
assert.match(compactActionTextRule.body, /(?:^|;)\s*overflow-wrap\s*:\s*anywhere\s*(?:;|$)/);
const compactTitleRule = requireCssRule(
  compactRules,
  [".zk-hero h1"],
  "the 420px block must bound and wrap the Zombie Killer title",
);
assert.match(compactTitleRule.body, /(?:^|;)\s*max-width\s*:\s*100%\s*(?:;|$)/);
assert.match(compactTitleRule.body, /(?:^|;)\s*overflow-wrap\s*:\s*anywhere\s*(?:;|$)/);
assert.match(
  compactTitleRule.body,
  /(?:^|;)\s*font-size\s*:\s*clamp\(\s*2\.5rem\s*,\s*18vw\s*,\s*4rem\s*\)\s*(?:;|$)/,
  "the compact Zombie Killer title must use the bounded small-screen font scale",
);
const compactSectionTitleRule = requireCssRule(
  compactRules,
  [".zk-capabilities h2", ".zk-platforms h2", ".zk-release h2"],
  "the 420px block must bound and wrap Zombie Killer section headings",
);
assert.match(compactSectionTitleRule.body, /(?:^|;)\s*max-width\s*:\s*100%\s*(?:;|$)/);
assert.match(compactSectionTitleRule.body, /(?:^|;)\s*overflow-wrap\s*:\s*anywhere\s*(?:;|$)/);
assert.match(
  compactSectionTitleRule.body,
  /(?:^|;)\s*font-size\s*:\s*clamp\(\s*1\.75rem\s*,\s*10vw\s*,\s*2\.5rem\s*\)\s*(?:;|$)/,
  "compact Zombie Killer section headings must use a bounded font scale",
);

const reducedMotionBlocks = extractCssAtRuleBlocks(
  css,
  /^@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)$/,
);
assert.equal(reducedMotionBlocks.length, 1, "styles.css must define exactly one real reduced-motion media block");
const reducedMotionRules = extractTopLevelCssRules(reducedMotionBlocks[0]);
const reducedHtmlRule = requireCssRule(
  reducedMotionRules,
  ["html"],
  "the reduced-motion block must disable smooth scrolling",
);
assert.match(
  reducedHtmlRule.body,
  /(?:^|;)\s*scroll-behavior\s*:\s*auto\s*(?:;|$)/,
  "the reduced-motion block must restore automatic scrolling",
);
const reducedAnimationRule = requireCssRule(
  reducedMotionRules,
  ["*", "*::before", "*::after"],
  "the reduced-motion block must constrain element and pseudo-element animation",
);
assert.match(
  reducedAnimationRule.body,
  /(?:^|;)\s*animation-duration\s*:\s*0?\.001ms\s*!important\s*(?:;|$)/,
  "the reduced-motion block must minimize animation duration",
);
assert.match(
  reducedAnimationRule.body,
  /(?:^|;)\s*animation-iteration-count\s*:\s*1\s*!important\s*(?:;|$)/,
  "the reduced-motion block must limit animation iteration",
);
assert.match(
  reducedAnimationRule.body,
  /(?:^|;)\s*transition-duration\s*:\s*0?\.001ms\s*!important\s*(?:;|$)/,
  "the reduced-motion block must minimize transition duration",
);
const reducedRevealRule = requireCssRule(
  reducedMotionRules,
  ["[data-reveal]"],
  "the reduced-motion block must keep reveal-marked homepage content visible",
);
assert.match(
  reducedRevealRule.body,
  /(?:^|;)\s*opacity\s*:\s*1\s*(?:;|$)/,
  "the reduced-motion block must show reveal-marked content",
);
assert.match(
  reducedRevealRule.body,
  /(?:^|;)\s*transform\s*:\s*none\s*(?:;|$)/,
  "the reduced-motion block must remove reveal transforms",
);
const reducedEnhancedRevealRule = requireCssRule(
  reducedMotionRules,
  [".js [data-reveal]"],
  "the reduced-motion block must override JavaScript-enhanced reveal hiding",
);
assert.match(reducedEnhancedRevealRule.body, /(?:^|;)\s*opacity\s*:\s*1\s*(?:;|$)/);
assert.match(reducedEnhancedRevealRule.body, /(?:^|;)\s*transform\s*:\s*none\s*(?:;|$)/);

assert.equal(validateXmlDocument(sitemap), true, "sitemap.xml must be a well-formed, entity-free XML document");
const sitemapLocations = Array.from(
  sitemapMarkup.matchAll(/<url(?:\s[^>]*)?>([\s\S]*?)<\/url\s*>/g),
  (urlMatch) =>
    Array.from(
      urlMatch[1].matchAll(/<loc(?:\s[^>]*)?>([\s\S]*?)<\/loc\s*>/g),
      (locMatch) => locMatch[1].trim(),
    ),
).flat();
assert.equal(
  sitemapLocations.filter((location) => location === "https://phantombugz.com/zombie-killer.html").length,
  1,
  "sitemap.xml must include exactly one real Zombie Killer <url><loc> entry",
);

const normalizeCanonicalFile = (source) => {
  const withoutBom = source.startsWith("\uFEFF") ? source.slice(1) : source;
  const normalizedLineEndings = withoutBom.replace(/\r\n/g, "\n");
  return normalizedLineEndings.endsWith("\n") ? normalizedLineEndings : `${normalizedLineEndings}\n`;
};

assert.equal(
  normalizeCanonicalFile("\uFEFFfirst\r\nsecond"),
  "first\nsecond\n",
  "release-policy normalization must accept one UTF-8 BOM, CRLF, and a missing final line feed",
);
assert.equal(
  normalizeCanonicalFile("first\n\n"),
  "first\n\n",
  "release-policy normalization must preserve unexpected extra line feeds for strict comparison",
);

const expectedGithubPagesWorkflow = `name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: pages-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: node scripts/test-zombie-killer-page.mjs

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: verify
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: mkdir -p public
      - run: cp -r assets data js index.html enter.html enter.js zombie-killer.html shop.html shop.css shop.js main.js styles.css site.webmanifest robots.txt sitemap.xml _headers _redirects public/
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: public
      - id: deployment
        uses: actions/deploy-pages@v4
`;

const expectedGitlabPipeline = `image: node:24-alpine

pages:
  stage: deploy
  script:
    - node scripts/test-zombie-killer-page.mjs
    - mkdir -p public
    - cp -r assets data js index.html enter.html enter.js zombie-killer.html shop.html shop.css shop.js main.js styles.css site.webmanifest robots.txt sitemap.xml _headers _redirects public/
  artifacts:
    paths:
      - public
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
`;

assert.strictEqual(
  normalizeCanonicalFile(githubPagesWorkflow),
  expectedGithubPagesWorkflow,
  ".github/workflows/pages.yml must exactly match the site-only GitHub Pages release policy",
);
assert.strictEqual(
  normalizeCanonicalFile(gitlabPipeline),
  expectedGitlabPipeline,
  ".gitlab-ci.yml must exactly match the site-only GitLab Pages release policy",
);
assert.match(
  implementationPlan,
  /<meta property="og:image:width" content="1200">[\s\S]*?<meta property="og:image:height" content="630">/,
  "the implementation plan must document the reviewed 1200 by 630 social image",
);
assert.match(
  implementationPlan,
  /deploy:[\s\S]*?if: github\.ref == 'refs\/heads\/main'[\s\S]*?- run: mkdir -p public[\s\S]*?- run: cp -r [^\r\n]+ public\/[\s\S]*?path: public/,
  "the implementation plan must document main-only deployment of the site-only public artifact",
);
assert.doesNotMatch(
  implementationPlan,
  /only main-branch\/manual runs can deploy/i,
  "the implementation plan must not imply that a manual dispatch from any ref can deploy",
);
assert.match(
  implementationPlan,
  /manual dispatches[^\r\n]*main/i,
  "the implementation plan must state that manual deployments are restricted to main",
);

const stripBalancedHtmlComments = (source) => {
  let visible = "";
  let cursor = 0;

  while (cursor < source.length) {
    const commentStart = source.indexOf("<!--", cursor);
    const commentEnd = source.indexOf("-->", cursor);
    if (commentEnd >= 0 && (commentStart < 0 || commentEnd < commentStart)) {
      throw new Error("README.md contains a stray HTML comment closer");
    }
    if (commentStart < 0) {
      visible += source.slice(cursor);
      break;
    }

    visible += source.slice(cursor, commentStart);
    const closingIndex = source.indexOf("-->", commentStart + 4);
    if (closingIndex < 0) {
      throw new Error("README.md contains an unterminated HTML comment");
    }
    const nestedStart = source.indexOf("<!--", commentStart + 4);
    if (nestedStart >= 0 && nestedStart < closingIndex) {
      throw new Error("README.md contains an unmatched HTML comment opener");
    }
    cursor = closingIndex + 3;
  }

  return visible;
};
assert.equal(
  stripBalancedHtmlComments("visible<!-- hidden -->text"),
  "visibletext",
  "README visibility scanning must remove balanced HTML comments",
);
assert.throws(
  () => stripBalancedHtmlComments("<!-- hidden"),
  /unterminated HTML comment/,
  "README visibility scanning must reject an unterminated HTML comment",
);
assert.throws(
  () => stripBalancedHtmlComments("visible --> hidden"),
  /stray HTML comment closer/,
  "README visibility scanning must reject a stray HTML comment closer",
);

const visibleReadme = stripBalancedHtmlComments(readme);
const readmeCommandsHeading = /^## Commands[ \t]*$/m.exec(visibleReadme);
assert.ok(readmeCommandsHeading, "README.md must retain its Commands section");
const readmeAfterCommandsHeading = visibleReadme.slice(
  readmeCommandsHeading.index + readmeCommandsHeading[0].length,
);
const readmeNextHeadingIndex = readmeAfterCommandsHeading.search(/^##[ \t]+/m);
const readmeCommands =
  readmeNextHeadingIndex >= 0
    ? readmeAfterCommandsHeading.slice(0, readmeNextHeadingIndex)
    : readmeAfterCommandsHeading;
assert.match(
  readmeCommands,
  /Verify the Zombie Killer landing-page contract:/,
  "README.md must label the Zombie Killer verification command",
);
const powershellBlocks = Array.from(
  readmeCommands.matchAll(/```powershell\s*\r?\n([\s\S]*?)```/g),
  (match) => match[1].trim(),
);
assert.ok(
  powershellBlocks.includes("node .\\scripts\\test-zombie-killer-page.mjs"),
  "README.md must document the root-level PowerShell verification command",
);
assert.ok(
  powershellBlocks.includes("python -m http.server 4173 --bind 127.0.0.1"),
  "README.md must document the local root preview command",
);
assert.match(
  readmeCommands,
  /http:\/\/127\.0\.0\.1:4173\/zombie-killer\.html/,
  "README.md must document the local Zombie Killer preview URL",
);
assert.doesNotMatch(
  readmeCommands,
  /\\phantombugz-site\\/i,
  "README.md commands must use paths that exist from the repository root",
);
assert.doesNotMatch(
  visibleReadme,
  /tools\\record-bounty-platform-event\.ps1/i,
  "README.md must not direct maintainers to a missing internal tool",
);

console.log("Zombie Killer public-page contract passed.");
