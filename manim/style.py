"""The look every clip shares: the site's colours and a Garamond close to its
serif. A clip is rendered once per theme (THEME=light or THEME=dark, set by
render.sh), so a scene draws only with the colours named here."""

import os

from manimlib import Scene, Tex, TexText

THEME = os.environ.get("THEME", "dark")

# The site's tokens (src/index.css). The background is a figure's: the paper
# under 40% of paper-dark, so a clip sits in a Figure without a seam.
_PALETTES = {
    "light": dict(bg="#f5f4f0", ink="#1a1a1a", faded="#71717a", sage="#6b8f8b", rule="#d4d4d8"),
    "dark": dict(bg="#131313", ink="#e8e8e8", faded="#a1a1aa", sage="#7fa8a3", rule="#3f3f46"),
}
_palette = _PALETTES[THEME]
BG = _palette["bg"]
INK = _palette["ink"]  # what the reader reads
FADED = _palette["faded"]  # what supports it
SAGE = _palette["sage"]  # the one thing to watch
RULE = _palette["rule"]  # scaffolding: axes, dividers

# Words and maths both in Garamond, like the page around the clip
PREAMBLE = R"""
\usepackage[T1]{fontenc}
\usepackage{ebgaramond}
\usepackage[cmintegrals,cmbraces]{newtxmath}
\usepackage{ebgaramond-maths}
"""


def formula(*tex: str, color: str = INK, **kwargs) -> Tex:
    return Tex(*tex, additional_preamble=PREAMBLE, fill_color=color, **kwargs)


def words(*text: str, color: str = INK, **kwargs) -> TexText:
    return TexText(*text, additional_preamble=PREAMBLE, fill_color=color, **kwargs)


class Clip(Scene):
    """A clip for a learning page: the theme's background, nothing else."""

    default_camera_config = dict(background_color=BG)



# An operator set apart in a piece of its own loses TeX's spacing around it
# (a group on its own is an ordinary atom), so the pieces carry the spacing
SPACED = {
    "+": R"\mskip\medmuskip+\mskip\medmuskip",
    "-": R"\mskip\medmuskip-\mskip\medmuskip",
    R"\times": R"\mskip\medmuskip\times\mskip\medmuskip",
    "=": R"\mskip\thickmuskip=\mskip\thickmuskip",
    R"\leftarrow": R"\mskip\thickmuskip\leftarrow\mskip\thickmuskip",
}


def _split(make, pieces: tuple[str, ...], **kwargs):
    """`make` the pieces as one string, and return it with each piece as its
    own part, in order, so a derivation can move one term at a time.
    (Indexing a Tex gives glyphs; selecting by text is ambiguous when one
    piece is inside another, like ")" in "V(s)", so parts go by position.)"""
    from manimlib import VGroup

    spans = []
    at = 0
    for piece in pieces:
        spans.append((at, at + len(piece)))
        at += len(piece) + 1
    mob = make(" ".join(pieces), isolate=spans, **kwargs)
    return mob, VGroup(*(mob.select_parts(span) for span in spans))


def split_formula(*tex: str, **kwargs):
    """A formula and its pieces, one per string; operators keep their spacing."""
    return _split(formula, tuple(SPACED.get(piece, piece) for piece in tex), **kwargs)


def split_words(*text: str, **kwargs):
    """Words and their pieces, one per string."""
    return _split(words, text, **kwargs)
