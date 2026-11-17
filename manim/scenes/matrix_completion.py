"""Clips for /learnings/matrix-completion."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, words

# The maths font loses \; : a thick space spelled out
GAP = R"\mskip\thickmuskip "


class DotToFit(Clip):
    """The story's sum, Ana's stars for action times Paris's action plus the
    same for romance, turned into symbols and then a dot product; the
    story's numbers dropped in; then the fit: the squared misses over the
    seen cells only, plus the penalty."""

    def construct(self):
        title = words("Ana's rating of Paris", font_size=44, color=FADED)
        said = VGroup(
            words("(her stars for action) $\\times$ (its action)", font_size=44),
            words("+ (her stars for romance) $\\times$ (its romance)", font_size=44),
        ).arrange(DOWN, buff=0.35)
        VGroup(title, said).arrange(DOWN, buff=0.8).move_to(0.6 * UP)
        self.play(FadeIn(title, shift=0.2 * DOWN), run_time=0.8)
        self.play(FadeIn(said[0], shift=0.2 * DOWN), run_time=1.0)
        self.play(FadeIn(said[1], shift=0.2 * DOWN), run_time=1.0)
        self.wait(1.0)

        # Words into symbols: user i's numbers times movie j's, added up
        sym = formula(R"r_{ij} \approx u_{i1} v_{j1} + u_{i2} v_{j2}", font_size=72)
        sym.next_to(title, DOWN, buff=0.8)
        self.play(FadeTransform(said, sym), run_time=1.6)
        self.wait(0.6)
        dot = formula(R"r_{ij} \approx u_i \cdot v_j", font_size=72, t2c={R"u_i \cdot v_j": SAGE})
        dot.move_to(sym)
        self.play(FadeTransform(sym, dot), run_time=1.4)
        note = words("one short vector per user, one per movie", font_size=40, color=SAGE)
        note.next_to(dot, DOWN, buff=0.45)
        self.play(FadeIn(note, shift=0.2 * UP))
        self.wait(1.0)

        # The story's numbers
        nums = formula(
            R"2 = 5 \times \tfrac{1}{4} + 1 \times \tfrac{3}{4}",
            font_size=64,
        )
        nums.next_to(note, DOWN, buff=0.6)
        self.play(Write(nums), run_time=1.4)
        self.wait(1.4)

        # The fit: misses over the seen cells only, plus the penalty
        self.play(FadeOut(title), VGroup(dot, note, nums).animate.to_edge(UP, buff=0.4), run_time=0.8)
        fit = VGroup(
            formula(
                R"\min_{u,\,v}" + GAP + R"\sum_{(i,j)\ \mathrm{seen}} \big(r_{ij} - u_i \cdot v_j\big)^2",
                font_size=56,
                t2c={R"\mathrm{seen}": SAGE},
            ),
            formula(
                R"+\ \lambda \Big(\sum_i \lVert u_i \rVert^2 + \sum_j \lVert v_j \rVert^2\Big)",
                font_size=56,
            ),
        ).arrange(DOWN, buff=0.35)
        fit.next_to(nums, DOWN, buff=0.7)
        self.play(FadeIn(fit[0], shift=0.2 * DOWN), run_time=1.4)
        seen = words("only the ratings you have", font_size=40, color=SAGE)
        self.wait(0.4)
        self.play(FadeIn(fit[1], shift=0.2 * DOWN), run_time=1.2)
        seen.next_to(fit, DOWN, buff=0.4)
        self.play(FadeIn(seen, shift=0.2 * UP))
        whole = VGroup(dot, note, nums, fit, seen)
        self.play(whole.animate.set_max_height(FRAME_HEIGHT - 0.8).center(), run_time=0.8)
        self.wait(3)
