async function start(core) {
    try {
        const response = await fetch('./index.md');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const markdown = await response.text();
        await core.render(markdown);
        makeHeadingsCollapsible(core.contentElement);
        const title = core.contentElement.querySelector('h1')?.textContent?.trim();
        if (title) document.title = `${title} · Jay Waves`;
    } catch (error) {
        core.showContent();
        core.contentElement.innerHTML =
            `<h1>文章加载失败</h1><p>${escapeHtml(error.message)}</p>`;
    }
}

function makeHeadingsCollapsible(root) {
    const headings = Array.from(root.children).filter(element =>
        /^H[1-6]$/.test(element.tagName),
    );

    // Build from the bottom up so nested heading levels retain their sections.
    for (let index = headings.length - 1; index >= 0; index -= 1) {
        const heading = headings[index];
        const level = Number(heading.tagName.slice(1));
        const section = document.createElement('section');
        const summary = document.createElement('div');
        const content = document.createElement('div');
        const indicator = document.createElement('span');

        section.className = 'heading-section';
        section.dataset.headingLevel = String(level);
        summary.className = 'heading-summary';
        summary.tabIndex = 0;
        summary.setAttribute('role', 'button');
        summary.setAttribute('aria-expanded', 'true');
        content.className = 'heading-content';
        indicator.className = 'heading-collapsed-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        indicator.textContent = '…';

        root.insertBefore(section, heading);
        summary.append(heading, indicator);
        section.append(summary, content);

        while (section.nextSibling) {
            const sibling = section.nextSibling;
            const siblingLevel = sibling instanceof HTMLElement
                && sibling.matches('section.heading-section')
                ? Number(sibling.dataset.headingLevel)
                : Infinity;

            if (siblingLevel <= level) break;
            if (siblingLevel < Infinity) {
                section.append(sibling);
            } else {
                content.append(sibling);
            }
        }

        const hasContent = Array.from(content.childNodes).some(node =>
            node.nodeType === Node.ELEMENT_NODE || node.textContent.trim(),
        );
        section.classList.toggle('has-heading-content', hasContent);

        const toggle = () => {
            const collapsed = !section.classList.contains('is-collapsed');
            const subtree = [section, ...section.querySelectorAll('section.heading-section')];

            for (const item of subtree) {
                item.classList.toggle('is-collapsed', collapsed);
                const itemSummary = item.querySelector(':scope > .heading-summary');
                itemSummary?.setAttribute('aria-expanded', String(!collapsed));
                if (!itemSummary) continue;

                const disabledByParent = collapsed && item !== section;
                itemSummary.tabIndex = disabledByParent ? -1 : 0;
                if (disabledByParent) {
                    itemSummary.setAttribute('aria-disabled', 'true');
                } else {
                    itemSummary.removeAttribute('aria-disabled');
                }
            }
        };

        summary.addEventListener('click', toggle);
        summary.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            toggle();
        });
    }
}

function escapeHtml(value) {
    const element = document.createElement('span');
    element.textContent = value;
    return element.innerHTML;
}

if (window.markdownPreviewCore) {
    start(window.markdownPreviewCore);
} else {
    window.addEventListener(
        'markdown-preview-ready',
        event => start(event.detail),
        { once: true },
    );
}
