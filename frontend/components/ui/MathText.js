'use client';
import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Universal MathText Component — Robust Edition
 * 
 * Handles:
 * - Inline math:  $...$  or  \(...\)
 * - Display math: $$...$$ or \[...\]
 * - Auto-display: matrices, tall fractions, aligned envs auto-upgrade to display mode
 * - Multiline text: \n → <br/>
 * - HTML/SVG passthrough
 * - Graceful degradation: KaTeX error → raw LaTeX in styled box (never blank)
 */

// ─── KaTeX Macros ────────────────────────────────────────────────────────────
// These fill in commands KaTeX doesn't support natively
const KATEX_MACROS = {
    // \overset and \underset — KaTeX supports these but sometimes needs nudging
    '\\overset': '\\overset{#1}{#2}',
    // \cancel — KaTeX supports if cancel extension loaded, provide safe fallback
    '\\cancel': '\\not{#1}',
    // Common physics/chem shortcuts
    '\\degree': '^\\circ',
    '\\ang': '^\\circ',
    // Bold vector alternative
    '\\bvec': '\\boldsymbol{#1}',
    // Shorthand for angstrom
    '\\A': '\\text{Å}',
    // Common unit wrappers
    '\\unit': '\\text{ #1}',
};

// ─── Environments that REQUIRE display mode ──────────────────────────────────
const DISPLAY_ENVS = [
    'matrix', 'pmatrix', 'bmatrix', 'Bmatrix', 'vmatrix', 'Vmatrix',
    'array', 'aligned', 'align', 'gather', 'gathered', 'multline',
    'cases', 'rcases', 'dcases', 'split',
];
const DISPLAY_ENV_REGEX = new RegExp(
    `\\\\begin\\{(${DISPLAY_ENVS.join('|')})\\}`
);

// Heuristics: upgrade inline to display if math is "tall"
const shouldBeDisplay = (math) => {
    if (DISPLAY_ENV_REGEX.test(math)) return true;
    // Contains newline \\ (aligned equations)
    if (math.includes('\\\\')) return true;
    // Tall constructs: \frac with large content, \sum with limits
    if (/\\dfrac|\\cfrac/.test(math)) return true;
    // Deep nested fracs
    const fracCount = (math.match(/\\frac/g) || []).length;
    if (fracCount >= 2) return true;
    return false;
};

// ─── KaTeX render options ─────────────────────────────────────────────────────
const KATEX_OPTS_DISPLAY = {
    displayMode: true,
    throwOnError: false,
    strict: false,
    trust: true,
    macros: KATEX_MACROS,
    fleqn: false,
    minRuleThickness: 0.05,
};

const KATEX_OPTS_INLINE = {
    displayMode: false,
    throwOnError: false,
    strict: false,
    trust: true,
    macros: KATEX_MACROS,
};

// ─── Try to render LaTeX with multi-tier fallback ────────────────────────────
const renderMath = (math, forceDisplay = false) => {
    const isDisplay = forceDisplay || shouldBeDisplay(math);

    // Tier 1: render as-is
    try {
        const html = katex.renderToString(math, isDisplay ? KATEX_OPTS_DISPLAY : KATEX_OPTS_INLINE);
        return { html, display: isDisplay, error: false };
    } catch (_) {}

    // Tier 2: if inline failed and it looks like it should be display, try display mode
    if (!isDisplay) {
        try {
            const html = katex.renderToString(math, KATEX_OPTS_DISPLAY);
            return { html, display: true, error: false };
        } catch (_) {}
    }

    // Tier 3: sanitize common Gemini output mistakes and retry
    let cleaned = math
        // Remove \left\right that wrap nothing
        .replace(/\\left\s*\\right/g, '')
        // Fix double-backslash at start of line inside align envs
        .replace(/^\\\\/, '')
        // Remove \displaystyle wrapping (KaTeX handles via displayMode)
        .replace(/\\displaystyle\s*/g, '')
        // \boldsymbol fallback
        .replace(/\\boldsymbol\{([^}]+)\}/g, '\\mathbf{$1}')
        // \underbrace without limit
        .replace(/\\underbrace\{([^}]+)\}\s*(?!_)/g, '\\underbrace{$1}_{\\,}')
        // Fix \text{} that has math inside
        .replace(/\\text\{([^}]*\$[^}]*)\}/g, (_, inner) => inner.replace(/\$/g, ''));

    try {
        const html = katex.renderToString(cleaned, isDisplay ? KATEX_OPTS_DISPLAY : KATEX_OPTS_INLINE);
        return { html, display: isDisplay, error: false };
    } catch (_) {}

    // Tier 4: graceful degradation — show raw LaTeX in readable styled box
    return { html: null, display: isDisplay, error: true, raw: math };
};

// ─── Render a failed math block gracefully ───────────────────────────────────
const FallbackMath = ({ raw, display }) => {
    if (display) {
        return (
            <div className="my-2 overflow-x-auto">
                <code className="block text-xs font-mono bg-amber-50 border border-amber-200 text-amber-800 rounded px-3 py-2 whitespace-pre-wrap break-all">
                    {`$$${raw}$$`}
                </code>
            </div>
        );
    }
    return (
        <code className="text-xs font-mono bg-amber-50 border border-amber-200 text-amber-700 rounded px-1.5 py-0.5 mx-0.5 whitespace-pre-wrap break-all">
            {`$${raw}$`}
        </code>
    );
};

// ─── Regex: match block ($$, \[) BEFORE inline ($, \() ──────────────────────
// Order matters: $$ before $, \[ before \(
const MATH_REGEX = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[\s\S]+?\$|\\\([\s\S]+?\\\))/g;

// ─── Main Component ───────────────────────────────────────────────────────────
const MathText = ({ text = '', className = '' }) => {
    const renderedParts = useMemo(() => {
        if (!text || typeof text !== 'string') return null;

        const parts = text.split(MATH_REGEX);

        return parts.map((part, index) => {
            if (!part) return null;

            // ── Display Math: $$...$$ or \[...\] ──
            const isBlockDollar = part.startsWith('$$') && part.endsWith('$$') && part.length > 4;
            const isBlockBracket = part.startsWith('\\[') && part.endsWith('\\]');

            if (isBlockDollar || isBlockBracket) {
                const math = isBlockDollar ? part.slice(2, -2) : part.slice(2, -2);
                const { html, error, raw } = renderMath(math, true);
                if (error) return <FallbackMath key={index} raw={raw} display={true} />;
                return (
                    <div key={index}
                        className="my-3 overflow-x-auto"
                        style={{ maxWidth: '100%', overflowX: 'auto' }}
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                );
            }

            // ── Inline Math: $...$ or \(...\) ──
            const isInlineDollar = part.startsWith('$') && part.endsWith('$') && part.length > 2;
            const isInlineParen = part.startsWith('\\(') && part.endsWith('\\)');

            if (isInlineDollar || isInlineParen) {
                const math = isInlineDollar ? part.slice(1, -1) : part.slice(2, -2);
                const { html, display, error, raw } = renderMath(math, false);
                if (error) return <FallbackMath key={index} raw={raw} display={display} />;
                if (display) {
                    // Was upgraded to display — render as block
                    return (
                        <div key={index}
                            className="my-3 overflow-x-auto"
                            style={{ maxWidth: '100%', overflowX: 'auto' }}
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    );
                }
                return (
                    <span key={index}
                        className="inline-block px-0.5 align-middle"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                );
            }

            // ── HTML/SVG passthrough ──
            const isHTML = /<[a-z][\s\S]*>/i.test(part);
            if (isHTML) {
                return (
                    <span key={index}
                        className="overflow-x-auto block"
                        dangerouslySetInnerHTML={{ __html: part }}
                    />
                );
            }

            // ── Plain text: preserve \n as <br/> ──
            const lines = part.split('\n');
            if (lines.length === 1) {
                return <span key={index}>{part}</span>;
            }
            return (
                <span key={index}>
                    {lines.map((line, li) => (
                        <span key={li}>
                            {line}
                            {li < lines.length - 1 && <br />}
                        </span>
                    ))}
                </span>
            );
        });
    }, [text]);

    if (!text) return null;

    return (
        <div className={`math-text-root leading-relaxed ${className}`}>
            {renderedParts}
        </div>
    );
};

export default MathText;
