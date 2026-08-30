        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
        import markdownItGithubAlerts from 'https://unpkg.com/markdown-it-github-alerts@1.0.1/dist/index.mjs';

        // ── DOM refs ──────────────────────────────────────────────────
        const $ = (id) => document.getElementById(id);
        const contentEl = $('content');
        const loadingSkeleton = $('loadingSkeleton');

        // Overlay refs
        const overlay = $('overlay');
        const overlayPanzoom = $('overlay-panzoom');
        const overlayPanzoomInner = $('overlay-panzoom-inner');
        const ovExport = $('ovExport');
        const ovClose = $('ovClose');

        // ── State ─────────────────────────────────────────────────────
        let currentTheme = 'light';
        let mermaidIdCounter = 0;
        const loadedPacks = new Set();

        // Overlay state
        let ovSvgSource = '';
        let ovPanzoom = null;

        function showContent() {
            if (loadingSkeleton) loadingSkeleton.style.display = 'none';
            contentEl.style.display = '';
        }

        // ── Theme ─────────────────────────────────────────────────────
        function applyTheme() {
            currentTheme = 'light';
            document.documentElement.setAttribute('data-theme', 'light');
            mermaid.initialize({
                startOnLoad: false,
                theme: 'default',
                fontFamily: '"Noto Serif", "Noto Serif CJK SC", "Noto Serif SC", Georgia, "Times New Roman", serif',
                themeVariables: {
                    fontFamily: '"Noto Serif", "Noto Serif CJK SC", "Noto Serif SC", Georgia, "Times New Roman", serif',
                },
                securityLevel: 'strict',
            });
        }

        // ── Markdown-it setup ─────────────────────────────────────────
        if (!window.markdownit) {
            console.error('[markdown-preview] markdown-it not loaded from CDN');
            showContent();
            contentEl.innerHTML = '<p style="color:var(--err-fg)">Failed to load markdown-it from CDN. Check your internet connection.</p>';
        }
        const rawHtmlRequested = document.documentElement.dataset.allowHtml !== 'false';
        const sanitizerAvailable = typeof window.DOMPurify !== 'undefined';
        if (rawHtmlRequested && !sanitizerAvailable) {
            console.error('[markdown-preview] DOMPurify failed to load; raw HTML has been disabled');
        }

        const md = (window.markdownit || function () { return { render: (t) => '<pre>' + t + '</pre>', utils: { escapeHtml: (s) => s } }; })({
            // Raw HTML passthrough is configurable: untrusted markdown can
            // otherwise inject handlers/scripts into this page. Only enable
            // passthrough when DOMPurify is available, so CDN failures fail closed.
            html: rawHtmlRequested && sanitizerAvailable,
            linkify: true,
            typographer: true,
            highlight: function (str, lang) {
                if (lang && lang.toLowerCase() === 'mermaid') {
                    const encoded = encodeURIComponent(str);
                    return `<div class="mermaid-block" data-mermaid-source="${encoded}"><div class="mermaid-svg-wrap"><p style="color:var(--fg-muted);font-size:.85rem">Rendering diagram&hellip;</p></div></div>`;
                }
                if (lang && window.hljs && window.hljs.getLanguage(lang)) {
                    try {
                        return '<pre class="hljs" data-lang="' + md.utils.escapeHtml(lang) + '"><code>' +
                            window.hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                            '</code></pre>';
                    } catch (_) { }
                }
                const langAttr = lang ? ' data-lang="' + md.utils.escapeHtml(lang) + '"' : '';
                return '<pre class="hljs"' + langAttr + '><code>' + md.utils.escapeHtml(str) + '</code></pre>';
            }
        });

        function sanitizeRenderedHtml(html) {
            if (!sanitizerAvailable) return html;
            return window.DOMPurify.sanitize(html, {
                // Preserve common layout HTML and images, KaTeX MathML, and
                // raw SVG used in Markdown, including SVG filter effects.
                USE_PROFILES: {
                    html: true,
                    svg: true,
                    svgFilters: true,
                    mathMl: true,
                },
                ALLOW_DATA_ATTR: true,
            });
        }

        // ── Front matter ──────────────────────────────────────────────
        // Recognize only a leading pair of --- delimiters. "code" emits the
        // enclosed source as an ordinary YAML fence; "hide" consumes it;
        // "raw" leaves the document untouched. "panel" is a legacy alias.
        const YAML_MODE = document.documentElement.dataset.yamlMode || 'code';
        if (YAML_MODE !== 'raw') {
            md.block.ruler.before('table', 'front_matter', function (state, startLine, endLine, silent) {
                if (startLine !== 0 || state.blkIndent !== 0) return false;
                if (state.src.slice(state.bMarks[0], state.eMarks[0]) !== '---') return false;
                let closed = -1;
                for (let next = startLine + 1; next < endLine; next++) {
                    if (state.tShift[next] > 0) continue;
                    const line = state.src.slice(state.bMarks[next], state.eMarks[next]);
                    if (/^---\s*$/.test(line)) { closed = next; break; }
                }
                if (closed < 0) return false;
                if (silent) return true;
                if (YAML_MODE !== 'hide') {
                    const token = state.push('fence', 'code', 0);
                    token.info = 'yaml';
                    token.content = state.src.slice(state.bMarks[1], state.bMarks[closed]);
                    token.map = [startLine, closed + 1];
                }
                state.line = closed + 1;
                return true;
            }, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
        }

        // Register plugins
        md.use(markdownItGithubAlerts);
        if (window.markdownitEmoji) md.use(window.markdownitEmoji);
        if (window.markdownitFootnote) md.use(window.markdownitFootnote);
        if (window.markdownitTaskLists) md.use(window.markdownitTaskLists, { enabled: false });
        if (window.markdownItAnchor) {
            md.use(window.markdownItAnchor, {
                permalink: false,
                slugify: (s) => s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
            });
        }

        // LaTeX math via KaTeX + texmath
        if (window.texmath && window.katex) {
            md.use(window.texmath, {
                engine: window.katex,
                delimiters: ['dollars', 'beg_end'],
            });
        }

        // Line number injection for scroll sync (à la peek.nvim / iamcco)
        function injectLineNumbers(tokens, idx, options, env, slf) {
            if (tokens[idx].map) {
                tokens[idx].attrJoin('class', 'source-line');
                tokens[idx].attrSet('data-source-line', String(tokens[idx].map[0]));
            }
            return slf.renderToken(tokens, idx, options, env, slf);
        }
        md.renderer.rules.paragraph_open = injectLineNumbers;
        md.renderer.rules.heading_open = injectLineNumbers;
        md.renderer.rules.list_item_open = injectLineNumbers;
        md.renderer.rules.table_open = injectLineNumbers;
        md.renderer.rules.blockquote_open = injectLineNumbers;

        // Override fence renderer to handle mermaid specially
        const defaultFence = md.renderer.rules.fence;
        md.renderer.rules.fence = function (tokens, idx, options, env, self) {
            const token = tokens[idx];
            const info = token.info ? token.info.trim().toLowerCase() : '';
            const lineAttr = token.map ? ` data-source-line="${token.map[0]}"` : '';
            if (info === 'mermaid') {
                const encoded = encodeURIComponent(token.content);
                const stableId = 'mmd-' + idx;
                return `<div class="mermaid-block source-line"${lineAttr} id="${stableId}" data-mermaid-source="${encoded}" data-graph="mermaid">` +
                    `<button class="mermaid-expand-btn" title="Expand diagram" data-expand="${stableId}">` +
                    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` +
                    `</button>` +
                    `<div class="mermaid-svg-wrap"><p style="color:var(--fg-muted);font-size:.85rem">Rendering&hellip;</p></div>` +
                    `</div>`;
            }
            let html;
            if (defaultFence) {
                html = defaultFence(tokens, idx, options, env, self);
            } else {
                html = self.renderToken(tokens, idx, options);
            }
            if (lineAttr) html = html.replace(/^<pre\b/, `<pre${lineAttr}`);
            // Wrap in a non-scrolling container so the language label
            // stays pinned while the <pre> scrolls horizontally.
            // Emitted here rather than in a DOM pass so morphdom's virtual
            // tree matches the live tree and code blocks patch in place.
            const langMatch = html.match(/^<pre[^>]*\bdata-lang="([^"]*)"/);
            const language = langMatch ? langMatch[1] : '';
            const languageLabel = language ? `<span class="code-lang">${language}</span>` : '';
            return `<div class="code-wrap">${html}${languageLabel}</div>`;
        };

        // ── Iconify auto-detection ────────────────────────────────────
        function detectPacks(src) {
            const re = /\b([a-z0-9-]+):[a-z0-9-]+\b/gi;
            const s = new Set();
            let m;
            while ((m = re.exec(src))) s.add(m[1].toLowerCase());
            return [...s];
        }

        async function ensurePack(name) {
            if (loadedPacks.has(name)) return;
            try {
                const loader = () => fetch(`https://unpkg.com/@iconify-json/${name}@1/icons.json`).then(r => r.json());
                await mermaid.registerIconPacks([{ name, loader }]);
                loadedPacks.add(name);
            } catch (_) { }
        }

        // ── Mermaid rendering ─────────────────────────────────────────
        const lastGoodSvg = {};

        function removeMermaidErrorArtifacts(block) {
            block.querySelectorAll('.error,.error-icon,.error-text,.errorText').forEach(node => node.remove());
        }

        async function renderMermaidBlock(block) {
            const source = decodeURIComponent(block.dataset.mermaidSource || '');
            if (!source.trim()) return;

            const wrap = block.querySelector('.mermaid-svg-wrap');
            if (!wrap) return;

            const packs = detectPacks(source);
            for (const p of packs) await ensurePack(p);

            try {
                mermaidIdCounter++;
                const id = 'mmd-render-' + mermaidIdCounter;
                const { svg } = await mermaid.render(id, source);

                wrap.innerHTML = svg;
                block.classList.add('mermaid-rendered');
                block.classList.remove('mermaid-errored');
                lastGoodSvg[block.id] = svg;

                removeMermaidErrorArtifacts(block);
            } catch (e) {
                block.classList.add('mermaid-errored');
                const fallback = lastGoodSvg[block.id];
                if (fallback) {
                    wrap.innerHTML = fallback;
                }
                let errEl = block.querySelector('.mermaid-error');
                if (!errEl) {
                    errEl = document.createElement('div');
                    errEl.className = 'mermaid-error';
                    block.appendChild(errEl);
                }
                const msg = String(e?.message || e || 'Invalid diagram')
                    .split('\n').find(Boolean) || 'Invalid diagram';
                errEl.textContent = msg.replace(/\s*mermaid version\s*\d+(?:\.\d+)*\s*$/i, '').trim();

                removeMermaidErrorArtifacts(block);
            }
        }

        async function renderAllMermaidBlocks(force = false) {
            const selector = '.mermaid-block[data-mermaid-source]' + (force ? '' : ':not(.mermaid-rendered)');
            const blocks = contentEl.querySelectorAll(selector);
            for (const block of blocks) {
                await renderMermaidBlock(block);
            }
        }

        // ── Expand overlay (fullscreen diagram zoom/pan) ──────────────
        function openOverlay(svgHtml) {
            ovSvgSource = svgHtml;
            overlayPanzoomInner.innerHTML = svgHtml;
            if (!overlay.open) overlay.showModal();

            const svg = overlayPanzoomInner.querySelector('svg');
            if (svg && window.Panzoom) {
                ovPanzoom = window.Panzoom(svg, {
                    canvas: true,
                    pinchAndPan: true,
                    minScale: 0.1,
                    maxScale: 8,
                });
            } else if (svg) {
                console.error('[markdown-preview] Panzoom failed to load');
            }
        }

        function closeOverlay() {
            if (overlay.open) overlay.close();
        }

        overlay.addEventListener('close', () => {
            if (ovPanzoom) ovPanzoom.destroy();
            ovPanzoom = null;
            overlayPanzoomInner.replaceChildren();
            ovSvgSource = '';
        });

        // Trackpad scrolling is a wheel event; trackpad pinch is reported as
        // ctrl+wheel. Keep those gestures distinct instead of zooming both.
        overlayPanzoom.addEventListener('wheel', (e) => {
            if (!ovPanzoom) return;
            e.preventDefault();
            if (e.ctrlKey) {
                ovPanzoom.zoomWithWheel(e);
                return;
            }
            const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? overlayPanzoom.clientHeight : 1;
            const scale = ovPanzoom.getScale();
            const pan = ovPanzoom.getPan();
            ovPanzoom.pan(
                pan.x - e.deltaX * unit / scale,
                pan.y - e.deltaY * unit / scale
            );
        }, { passive: false });

        // Export SVG from overlay
        ovExport.addEventListener('click', () => {
            if (!ovSvgSource) return;
            const blob = new Blob([ovSvgSource], { type: 'image/svg+xml' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'diagram.svg';
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        });

        // Close overlay
        ovClose.addEventListener('click', closeOverlay);

        // ── Delegated content actions ─────────────────────────────────
        contentEl.addEventListener('click', async (e) => {
            const expandBtn = e.target.closest('[data-expand]');
            if (expandBtn) {
                const blockId = expandBtn.dataset.expand;
                const block = document.getElementById(blockId);
                if (!block) return;
                const wrap = block.querySelector('.mermaid-svg-wrap');
                if (!wrap) return;
                const svg = wrap.innerHTML;
                if (svg) openOverlay(svg);
                return;
            }
        });

        // ── Public renderer API ───────────────────────────────────────
        const core = {
            contentElement: contentEl,
            renderToHtml(markdown) {
                return sanitizeRenderedHtml(md.render(markdown));
            },
            async renderMermaid(force = false) {
                await renderAllMermaidBlocks(force);
            },
            async render(markdown) {
                contentEl.innerHTML = this.renderToHtml(markdown);
                showContent();
                await this.renderMermaid();
                return contentEl;
            },
            setTheme: applyTheme,
            showContent,
        };

        // Initialize renderer-only features. Host integrations, including the
        // Neovim live-preview protocol, attach through the ready event below.
        (async function boot() {
            try {
                if (document.documentElement.dataset.mermaidElk === 'true') {
                    const elkLayouts = await import('https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0.2.1/dist/mermaid-layout-elk.esm.min.mjs');
                    mermaid.registerLayoutLoaders(elkLayouts.default || elkLayouts);
                }
                applyTheme(currentTheme);
            } catch (e) {
                console.error('[markdown-preview] boot error:', e);
                showContent();
                contentEl.innerHTML = '<p style="color:var(--err-fg)">Error: ' + (e.message || e) + '</p>';
                return;
            }
            window.markdownPreviewCore = core;
            window.dispatchEvent(new CustomEvent('markdown-preview-ready', { detail: core }));
        })();
