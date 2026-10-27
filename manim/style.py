"""The look every clip shares: the site's dark colours and a Garamond close
to its serif. Clips are dark in both of the site's themes, so a scene draws
only with the colours named here."""

from manimlib import Scene, Tex, TexText

# The site's dark tokens (src/index.css). The background is a dark figure's:
# the paper under 40% of paper-dark.
BG = "#131313"
INK = "#e8e8e8"  # what the reader reads
FADED = "#a1a1aa"  # what supports it
SAGE = "#7fa8a3"  # the one thing to watch
RULE = "#3f3f46"  # scaffolding: axes, dividers

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
    """A clip for a learning page: the dark background, nothing else."""

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
