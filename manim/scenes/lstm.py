"""Clips for /learnings/lstm."""

from manimlib import *

from style import FADED, RULE, SAGE, Clip, split_formula, split_words, words

# The Garamond maths has no partial sign: borrow newtx's
PARTIAL = R"\text{\usefont{OML}{ntxmi}{m}{it}\char64}"


class CellPath(Clip):
    """The cell update in words, then in symbols; how much the new cell moves
    with the old one (the forget gate, nothing else); then twenty words of it,
    with numbers."""

    def construct(self):
        said, sp = split_words(
            "new cell", "=", "keep", R"$\times$", "old cell", "+", "let in", R"$\times$", "new content",
            font_size=38,
        )
        rule, rp = split_formula(
            "c_t", "=", "f_t", R"\times", "c_{t-1}", "+", "i_t", R"\times", "g_t",
            font_size=72,
            t2c={"f_t": SAGE},
        )
        said.to_edge(UP, buff=1.0)
        rule.next_to(said, DOWN, buff=0.8)

        self.play(Write(said), run_time=2.5)
        self.wait(0.6)
        self.play(
            LaggedStart(*(FadeTransform(sp[k].copy(), rp[k]) for k in range(9)), lag_ratio=0.12),
            run_time=2.5,
        )
        self.play(FadeOut(said), rule.animate.to_edge(UP, buff=0.9), run_time=1)

        # Only the first term holds the old cell, and it holds it by f
        kept = rp[2:5]
        brace = Brace(kept, DOWN, buff=0.15).set_fill(SAGE)
        only = words("the old cell's own path forward", font_size=34, color=SAGE).next_to(brace, DOWN, buff=0.2)
        self.play(GrowFromCenter(brace), FadeIn(only, shift=0.2 * DOWN))
        self.wait(1.2)

        slope, slp = split_formula(
            Rf"\frac{{{PARTIAL} c_t}}{{{PARTIAL} c_{{t-1}}}}", "=", "f_t",
            font_size=64,
            t2c={"f_t": SAGE},
        )
        slope.move_to(0.2 * DOWN)
        self.play(FadeOut(only), FadeOut(brace), FadeIn(slp[0:2]), TransformFromCopy(rp[2], slp[2]), run_time=1.5)
        self.wait(1.0)

        # Twenty words back: the forget gates multiplied
        chain, cp = split_formula(
            Rf"\frac{{{PARTIAL} c_t}}{{{PARTIAL} c_{{t-20}}}}", "=", R"f_t \, f_{t-1} \cdots f_{t-19}",
            font_size=64,
            t2c={R"f_t \, f_{t-1} \cdots f_{t-19}": SAGE},
        )
        chain.move_to(0.2 * DOWN)
        self.play(ReplacementTransform(slope, chain), run_time=1.5)
        self.wait(0.8)

        nums, np_ = split_formula(
            "0.99^{20}", "=", "0.82",
            font_size=64,
        )
        nums.next_to(chain, DOWN, buff=0.9)
        line = Line(LEFT * 5.5, RIGHT * 5.5, stroke_color=RULE, stroke_width=2).next_to(nums, DOWN, buff=0.5)
        note = words("with every forget gate at 0.99", font_size=34, color=FADED).next_to(line, DOWN, buff=0.3)
        self.play(FadeIn(np_[0], shift=0.2 * UP), FadeIn(note), ShowCreation(line), run_time=1.2)
        self.play(FadeIn(np_[1:], shift=0.2 * LEFT), run_time=1)
        self.play(Indicate(np_[2], color=SAGE, scale_factor=1.15))
        self.wait(2.5)
