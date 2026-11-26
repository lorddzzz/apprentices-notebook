#!/usr/bin/env node
/**
 * `pnpm art:process <raw.png> <ArtId> (--ship | --scratch) --role <role> --size WxH [options]`
 * (UA-2, UA-D9, UA-D14, UA-D15). Turns one accepted raw generation into a shipped asset:
 * role size enforced, ground-contact placement for figures (never alpha-extent trimming), a
 * standard shadow composed by the processor, seamless tiles, WebP q80 (q76 for scenes >= 750x800),
 * a skeleton sidecar and the master record. Run `node scripts/art/process.mjs --help`.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { checkArt } from '../art-check.ts';
import {
  blit,
  coverWindow,
  defringe,
  fail,
  floatToRgb,
  GROUND_TOLERANCE,
  haloReport,
  hasTransparency,
  loadRgba,
  MASTER_STORE,
  MASTERS_FILE,
  makeSeamless,
  matchEdges,
  PROCESSOR,
  paintShadow,
  pair,
  parseArtId,
  ROLE_RULES,
  readJson,
  roleProblems,
  sha256,
  sharp,
} from './common.mjs';

const HELP = `Usage: pnpm art:process <raw.png> <ArtId> --ship|--scratch --role <role> --size WxH [options]

  --ship                 write src/assets/art/<ArtId>.webp, art-src/<ArtId>.json and the master record
  --scratch              anchors: write art-src/anchors/<ArtId>.webp + .json only (ArtId is "<anchor>/<name>")
  --root <dir>           repo root (default: current directory)
  --role <role>          tile-opaque | material-overlay-alpha | figure | boss-figure | portrait | card |
                         strip | scene | map-plate | map-patch-with-bbox | nine-slice
  --size WxH             output size (must satisfy the role rule)
  --alpha                strip/other roles whose sidecar declares alpha
  --ground-contact x,y   figures: the foot/ground contact in SOURCE pixels (required)
  --height h             figures: source pixels from the contact up to the top of the head (required)
  --baseline y           figures: target baseline (default 160; boss 232)
  --draw-height h        figures: drawn body height on the canvas (default 150; boss 220)
  --no-shadow            figures: skip the standard shadow
  --slice t,r,b,l        nine-slice insets   --bbox x,y,w,h   map patch position in 750x3800 master pixels
  --tile                 tile-opaque: make seamless (offset-wrap blend)
  --edge-from <img>      tile-opaque: share edge pixels with this tile (floor variants A-D)
  --edge-band <px>       edge blend width for --edge-from (default 8)
  --focal fx,fy          cover-crop focus 0..1 (default 0.5,0.5)
  --background <hex>     colour flattened under alpha for opaque roles (default 101820)
  --defringe             recolour partial-alpha pixels from the nearest solid pixel (fixes a matte fringe)
  --allow-halo           waive the halo check (recorded in the sidecar)
  --quality <n>          WebP quality (default 80; 76 for scenes >= 750x800)
  --pack <name> --screen <text> --model <id> --generation-id <id> --prompt-file <file>
  --ref <path> (repeatable)   --set key=value (repeatable; any other sidecar field)
  --masters archive|git  master rule (default: the project's, see spec.ts)
  --no-verify            skip the final art:check proof (ship mode)
`;

const { values: o, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    ship: { type: 'boolean' },
    scratch: { type: 'boolean' },
    root: { type: 'string' },
    role: { type: 'string' },
    size: { type: 'string' },
    alpha: { type: 'boolean' },
    'ground-contact': { type: 'string' },
    height: { type: 'string' },
    baseline: { type: 'string' },
    'draw-height': { type: 'string' },
    'no-shadow': { type: 'boolean' },
    slice: { type: 'string' },
    bbox: { type: 'string' },
    tile: { type: 'boolean' },
    'edge-from': { type: 'string' },
    'edge-band': { type: 'string' },
    focal: { type: 'string' },
    background: { type: 'string' },
    defringe: { type: 'boolean' },
    'allow-halo': { type: 'boolean' },
    quality: { type: 'string' },
    pack: { type: 'string' },
    screen: { type: 'string' },
    model: { type: 'string' },
    'generation-id': { type: 'string' },
    'prompt-file': { type: 'string' },
    ref: { type: 'string', multiple: true },
    set: { type: 'string', multiple: true },
    masters: { type: 'string' },
    'no-verify': { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
});

if (o.help || positionals.length === 0) {
  console.log(HELP);
  process.exit(o.help ? 0 : 2);
}

const [rawPath, id] = positionals;
if (!rawPath || !id) fail('usage: art:process <raw.png> <ArtId> --ship|--scratch ...');
if (!!o.ship === !!o.scratch) fail('pass exactly one of --ship or --scratch');
if (!existsSync(rawPath)) fail(`raw file not found: ${rawPath}`);
const root = resolve(o.root ?? process.cwd());
const role = o.role;
const rule = ROLE_RULES[role];
if (!rule) fail(`--role must be one of ${Object.keys(ROLE_RULES).join(', ')}`);
const size = pair(o.size, '--size');
if (!size) fail('--size WxH is required');
const [W, H] = size;
const store = o.masters ?? MASTER_STORE;
if (store !== 'archive' && store !== 'git') fail('--masters must be archive or git');

if (o.ship && !parseArtId(id)) {
  fail(
    `ArtId "${id}" is not <family>/<scope>/<subject>[-<state>] (family and scope must be known)`,
  );
}
if (o.scratch && !/^[a-z0-9][a-z0-9/_.-]*$/i.test(id)) fail(`scratch name "${id}" is not a path`);

// ── Role-rule failures come first, before any pixel work ──
const early = [];
if (rule.w !== null && W !== rule.w) early.push(`role ${role} is ${rule.w} wide, --size says ${W}`);
if (rule.h !== null && H !== rule.h) early.push(`role ${role} is ${rule.h} high, --size says ${H}`);
if (role === 'strip' && W !== 750 && !o.alpha) {
  // strips default to 750 wide; another width is allowed only when the sidecar declares it
}
const alphaWanted = rule.alpha === 'required' || (rule.alpha === 'declared' && !!o.alpha);
if (rule.alpha === 'forbidden' && o.alpha)
  early.push(`role ${role} is opaque, --alpha contradicts it`);
const contact = pair(o['ground-contact'], '--ground-contact');
const bodyH = o.height === undefined ? null : Number(o.height);
const bbox = pair(o.bbox, '--bbox', 4);
const slice = pair(o.slice, '--slice', 4);
if (rule.ground && (!contact || !bodyH)) {
  early.push(
    `role ${role} needs --ground-contact x,y and --height (source px, contact to top of head)`,
  );
}
if (rule.needsBbox && !bbox)
  early.push(`role ${role} needs --bbox x,y,w,h (750x3800 master pixels)`);
if (rule.needsSlice && !slice) early.push(`role ${role} needs --slice t,r,b,l`);
if (o.tile && role !== 'tile-opaque') early.push('--tile is for role tile-opaque');
if (o['edge-from'] && role !== 'tile-opaque') early.push('--edge-from is for role tile-opaque');
if (early.length) fail(`role-rule failure:\n  - ${early.join('\n  - ')}`);

// ── Load, halo test, defringe ──
let src = await loadRgba(rawPath);
const rawBuf = readFileSync(rawPath);
const rawSha = sha256(rawBuf);
const rawHasAlpha = hasTransparency(src);
if (alphaWanted && !rawHasAlpha) {
  fail(
    `role ${role} needs real transparency but ${rawPath} has none (ask for a transparent background)`,
  );
}
const notes = [];
if (alphaWanted) {
  if (o.defringe) {
    const r = defringe(src);
    src = r.rgba;
    notes.push(`defringed ${r.fixed} partial-alpha pixels`);
  }
  const halo = haloReport(src);
  if (halo.halo && !o['allow-halo']) {
    fail(
      `alpha-edge halo: ${halo.partial} partial-alpha pixels are on average ${Math.abs(halo.mean).toFixed(0)} luminance steps ${halo.kind}er than the solid pixels beside them (${(halo.share * 100).toFixed(0)}% agree). A ${halo.kind} matte fringe will show on a ${halo.kind === 'light' ? 'dark' : 'light'} tile. Re-run with --defringe, or regenerate; --allow-halo waives it.`,
    );
  }
  if (halo.halo) notes.push('halo waived');
}

// ── Build the output pixels ──
const q = o.quality ? Number(o.quality) : role === 'scene' && W >= 750 && H >= 800 ? 76 : 80;
let outPipe;
let silhouette = null;
let groundContact = null;
let sourceNote = null;

if (rule.ground) {
  const [gx, gy] = pair(
    o.baseline ? `${rule.ground[0]},${o.baseline}` : rule.ground.join(','),
    '--baseline',
  );
  const drawH = Number(o['draw-height'] ?? (role === 'boss-figure' ? 220 : 150));
  const scale = drawH / bodyH;
  const [cx, cy] = contact;
  if (cx < 0 || cy < 0 || cx >= src.w || cy >= src.h)
    fail(`--ground-contact ${cx},${cy} is outside the ${src.w}x${src.h} source`);
  const sw = Math.max(1, Math.round(src.w * scale));
  const sh = Math.max(1, Math.round(src.h * scale));
  const scaled = await sharp(src.data, { raw: { width: src.w, height: src.h, channels: 4 } })
    .resize(sw, sh, { kernel: 'lanczos3' })
    .raw()
    .toBuffer();
  const left = Math.round(gx - cx * scale);
  const top = Math.round(gy - cy * scale);
  const fig = Buffer.alloc(W * H * 4);
  const cut = blit(fig, W, H, scaled, sw, sh, left, top);
  if (cut.top || cut.left || cut.right) {
    fail(
      `the figure is cut off at the canvas (top ${cut.top}, left ${cut.left}, right ${cut.right} visible px). Lower --draw-height (now ${drawH}) or re-centre --ground-contact. (Anything below the feet, such as a hem or pole tip, may run off the bottom; that is allowed.)`,
    );
  }
  const canvas = Buffer.alloc(W * H * 4);
  if (!o['no-shadow']) paintShadow(canvas, W, H, gx, gy, role === 'boss-figure' ? 1.5 : 1);
  blit(canvas, W, H, fig, W, H, 0, 0);
  outPipe = sharp(canvas, { raw: { width: W, height: H, channels: 4 } });
  groundContact = [gx, gy];
  sourceNote = {
    groundContact: [cx, cy],
    bodyHeight: bodyH,
    drawHeight: drawH,
    scale: +scale.toFixed(5),
  };
  silhouette = await makeSilhouette(fig, W, H);
} else if (role === 'tile-opaque') {
  const win = coverWindow(src.w, src.h, 1, 1, pair(o.focal ?? '0.5,0.5', '--focal'));
  let rgb = await sharp(src.data, { raw: { width: src.w, height: src.h, channels: 4 } })
    .flatten({ background: `#${(o.background ?? '101820').replace('#', '')}` })
    .extract(win)
    .resize(W, H, { kernel: 'lanczos3' })
    .removeAlpha()
    .raw()
    .toBuffer();
  let f = Float32Array.from(rgb);
  if (o.tile || o['edge-from']) f = makeSeamless(f, W);
  if (o['edge-from']) {
    const ref = await sharp(o['edge-from']).resize(W, H).removeAlpha().raw().toBuffer();
    f = matchEdges(f, Float32Array.from(ref), W, Number(o['edge-band'] ?? 8));
    notes.push(`edges shared with ${o['edge-from']}`);
  }
  rgb = floatToRgb(f);
  outPipe = sharp(rgb, { raw: { width: W, height: H, channels: 3 } });
} else {
  const focal = pair(o.focal ?? '0.5,0.5', '--focal');
  const win = coverWindow(src.w, src.h, W, H, focal);
  let pipe = sharp(src.data, { raw: { width: src.w, height: src.h, channels: 4 } }).extract(win);
  if (!alphaWanted && rawHasAlpha) {
    pipe = pipe.flatten({ background: `#${(o.background ?? '101820').replace('#', '')}` });
    notes.push('flattened onto the background colour (the raw had transparency)');
  }
  pipe = pipe.resize(W, H, { kernel: 'lanczos3' });
  if (!alphaWanted) pipe = pipe.removeAlpha();
  outPipe = pipe;
}

const webp = await outPipe
  .webp({ quality: q, alphaQuality: 100, effort: 5, smartSubsample: true })
  .toBuffer();

// ── Self-check against the role rules (the same pure function art:check uses) ──
const decoded = await decode(webp);
const sidecarCore = {
  role,
  size: [W, H],
  ...(role === 'strip' || o.alpha ? { alpha: !!alphaWanted } : {}),
  ...(groundContact ? { groundContact } : {}),
  ...(bbox ? { bbox } : {}),
  ...(slice ? { slice } : {}),
};
const problems = roleProblems(
  { ...sidecarCore, size: [W, H], groundContact: groundContact ?? null },
  decoded,
);
if (problems.length) fail(`role-rule failure:\n  - ${problems.join('\n  - ')}`);

// ── Write: destinations are explicit ──
const dest = o.ship
  ? {
      webp: join(root, 'src/assets/art', `${id}.webp`),
      sidecar: join(root, 'art-src', `${id}.json`),
      silhouette: join(root, 'art-src', `${id}.silhouette.webp`),
    }
  : {
      webp: join(root, 'art-src/anchors', `${id}.webp`),
      sidecar: join(root, 'art-src/anchors', `${id}.json`),
      silhouette: join(root, 'art-src/anchors', `${id}.silhouette.webp`),
    };
for (const f of Object.values(dest)) mkdirSync(dirname(f), { recursive: true });
writeFileSync(dest.webp, webp);
if (silhouette) writeFileSync(dest.silhouette, silhouette);

const prior = readJson(dest.sidecar, {});
const parts = o.ship ? id.split('/') : [];
const subjectFull = parts[2] ?? id;
const state = o.ship ? (subjectFull.match(/^(.*?)-(worn|card|night|[a-d]|b)$/)?.[2] ?? null) : null;
const promptText = o['prompt-file'] ? readFileSync(o['prompt-file'], 'utf8').trim() : undefined;
const extra = Object.fromEntries(
  (o.set ?? []).map((kv) => {
    const i = kv.indexOf('=');
    return [kv.slice(0, i), kv.slice(i + 1)];
  }),
);

let master = null;
if (o.ship) {
  const ext = extname(rawPath) || '.png';
  if (store === 'git') {
    const rel = `${id}.master.webp`;
    const masterBuf = await sharp(rawBuf).webp({ lossless: true, effort: 4 }).toBuffer();
    const file = join(root, 'art-src', rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, masterBuf);
    master = { path: `art-src/${rel}`, sha256: sha256(masterBuf) };
  } else {
    const rel = `${id}.master${ext}`;
    master = { path: `art-src/${rel}`, sha256: rawSha };
    const file = join(root, MASTERS_FILE);
    const doc = readJson(file, { masters: [] });
    doc.masters ??= [];
    const meta = await sharp(rawBuf).metadata();
    const entry = {
      file: rel,
      width: meta.width,
      height: meta.height,
      bytes: statSync(rawPath).size,
      sha256: rawSha,
      archiveKey: `r2:apprentices-notebook-art/${rel}`,
    };
    const at = doc.masters.findIndex((e) => e.file === rel);
    if (at >= 0) doc.masters[at] = entry;
    else doc.masters.push(entry);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
    console.log(
      `master: ${rel} (${entry.bytes} bytes, ${rawSha.slice(0, 12)}…) recorded in ${MASTERS_FILE}`,
    );
    console.log(
      `  UPLOAD IT: rclone copyto "${rawPath}" "r2:apprentices-notebook-art/${rel}"  (the record is not true until you do)`,
    );
  }
}
const meta0 = await sharp(rawBuf).metadata();
const sidecar = {
  id: o.ship ? id : `anchors/${id}`,
  screen: o.screen ?? prior.screen ?? '',
  district: o.ship ? parts[1] : (prior.district ?? ''),
  subject: o.ship ? subjectFull.replace(/-(worn|card|night|[a-d]|b)$/, '') : (prior.subject ?? ''),
  state: o.ship ? state : (prior.state ?? null),
  role,
  size: [W, H],
  alpha: alphaWanted,
  groundContact,
  master: {
    ...(master ?? {}),
    origSize: [meta0.width, meta0.height],
    sha256: master?.sha256 ?? rawSha,
    processor: PROCESSOR,
    quality: q,
    refSha256: (o.ref ?? []).filter((r) => existsSync(r)).map((r) => sha256(readFileSync(r))),
  },
  crop: prior.crop ?? '',
  focal: prior.focal ?? null,
  angle: prior.angle ?? '',
  light: prior.light ?? 'top-left',
  palette: prior.palette ?? [],
  model: o.model ?? prior.model ?? '',
  prompt: promptText ?? prior.prompt ?? '',
  references: o.ref ?? prior.references ?? [],
  generationId: o['generation-id'] ?? prior.generationId ?? null,
  seed: prior.seed ?? null,
  date: new Date().toISOString().slice(0, 10),
  pack: o.pack ?? prior.pack ?? '',
  slice,
  bbox,
  layerId: prior.layerId ?? null,
  process: {
    mode: o.ship ? 'ship' : 'scratch',
    source: { sha256: rawSha, size: [src.w, src.h] },
    ...(sourceNote ? { figure: sourceNote } : {}),
    ...(o.tile ? { tile: true } : {}),
    ...(notes.length ? { notes } : {}),
  },
  ...extra,
};
if (o.scratch) {
  // anchors are never shipped, so they carry the source hash but no master record
  sidecar.master = {
    origSize: [meta0.width, meta0.height],
    sha256: rawSha,
    processor: PROCESSOR,
    quality: q,
    refSha256: sidecar.master.refSha256,
  };
}
writeFileSync(dest.sidecar, `${JSON.stringify(sidecar, null, 2)}\n`);

console.log(
  `${o.ship ? 'shipped' : 'scratch'}: ${dest.webp.replace(`${root}/`, '')} ${W}x${H} ${role} ${webp.length} bytes (q${q})`,
);
for (const n of notes) console.log(`  note: ${n}`);
if (groundContact) {
  console.log(
    `  ground contact: source ${contact.join(',')} -> canvas ${groundContact.join(',')} (tolerance ${GROUND_TOLERANCE})`,
  );
}

// ── Final proof: UF's art:check on this asset ──
if (o.ship && !o['no-verify']) {
  const res = await checkArt({ root, masters: store });
  const mine = res.problems.filter((p) => p.id === id);
  if (mine.length) {
    for (const p of mine) console.error(`FAIL ${p.id}: ${p.message}`);
    process.exit(1);
  }
  console.log(`  art:check: ${id} passes (role, size, alpha, sidecar, master record)`);
}

// ── helpers ──
async function decode(buf) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .extractChannel(3)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let transparent = false;
  for (const a of data) {
    if (a < 250) {
      transparent = true;
      break;
    }
  }
  return { w: info.width, h: info.height, transparent };
}

/** 48x48 silhouette: the figure's alpha as black on white, cropped square, for the contact sheet. */
async function makeSilhouette(rgba, w, h) {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rgba[(y * w + x) * 4 + 3] >= 128) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
    }
  }
  if (x1 < 0) return null;
  const mask = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .extractChannel(3)
    .negate()
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .resize(48, 48, { fit: 'contain', background: '#ffffff' })
    .webp({ lossless: true })
    .toBuffer();
  return mask;
}
