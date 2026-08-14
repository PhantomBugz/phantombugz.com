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

const enter = read("enter.html");
const page = read("zombie-killer.html");
const styles = read("styles.css");
const sitemap = read("sitemap.xml");

const enterMarkup = sanitizeMarkup(enter);
const pageMarkup = sanitizeMarkup(page);
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
  [".shop-page .site-header", "body:not([class]) .site-header"],
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
  [".shop-page .header-nav", "body:not([class]) .header-nav"],
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

assert.doesNotMatch(sitemapMarkup, /<!DOCTYPE\b/i, "sitemap.xml must not use a document type declaration");
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

console.log("Zombie Killer public-page contract passed.");
