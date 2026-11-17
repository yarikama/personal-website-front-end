"""Clips for /learnings/multi-head-attention."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words


class ScoreSpread(Clip):
    """Why the scores are divided by the square root of d_k. A dot product
    is d_k terms; each, for random queries and keys, has mean 0 and
    variance 1; variances add, so the sum has variance d_k and spread
    sqrt(d_k). Dividing by sqrt(d_k) brings the spread back to 1. Then the
    numbers for d_k = 64."""

    def construct(self):
        title = words("a query and a key, $d_k$ numbers each", font_size=40, color=FADED).to_edge(UP, buff=0.8)
        sum_, sp = split_formula(
            R"q \cdot k", "=", R"q_1 k_1", "+", R"q_2 k_2", "+", R"\cdots", "+", R"q_{d_k} k_{d_k}",
            font_size=64,
        )
        sum_.move_to(UP * 1.2)
        self.play(FadeIn(title, shift=0.2 * DOWN), run_time=0.8)
        self.play(Write(sp[:2]), run_time=0.8)
        self.play(LaggedStart(*(FadeIn(p, shift=0.15 * LEFT) for p in sp[2:]), lag_ratio=0.15), run_time=1.8)

        # Each term: a little noise of its own
        terms = VGroup(sp[2], sp[4], sp[8])
        marks = VGroup(*(Brace(t, DOWN, buff=0.12).set_fill(SAGE) for t in terms))
        each = words("each: mean 0, variance 1", font_size=40, color=SAGE)
        each.next_to(marks, DOWN, buff=0.3)
        self.play(LaggedStart(*(GrowFromCenter(m) for m in marks), lag_ratio=0.2), FadeIn(each, shift=0.2 * UP))
        self.wait(1.4)

        # Variances add: d_k ones
        var, vp = split_formula(
            R"\mathrm{Var}(q \cdot k)", "=", "1", "+", "1", "+", R"\cdots", "+", "1", "=", "d_k",
            font_size=64,
        )
        var.next_to(sum_, DOWN, buff=0.7)
        self.play(FadeOut(marks), FadeOut(each), run_time=0.5)
        self.play(
            TransformFromCopy(sp[0], vp[0]),
            FadeIn(vp[1]),
            TransformFromCopy(sp[2], vp[2]),
            FadeIn(vp[3]),
            TransformFromCopy(sp[4], vp[4]),
            FadeIn(vp[5]),
            TransformFromCopy(sp[6], vp[6]),
            FadeIn(vp[7]),
            TransformFromCopy(sp[8], vp[8]),
            run_time=1.8,
        )
        self.play(FadeIn(vp[9:], shift=0.2 * LEFT))
        spread = words(R"so a typical score is about $\pm\sqrt{d_k}$", font_size=40, color=SAGE)
        spread.next_to(var, DOWN, buff=0.45)
        self.play(FadeIn(spread, shift=0.2 * UP))
        self.wait(1.6)

        # The fix
        scaled = formula(R"\text{score} = \frac{q \cdot k}{\sqrt{d_k}}", font_size=72)
        scaled.move_to(UP * 0.6)
        back = words("spread back to 1, whatever $d_k$ is", font_size=40, color=SAGE)
        back.next_to(scaled, DOWN, buff=0.4)
        self.play(FadeOut(VGroup(sum_, var, spread)), run_time=0.6)
        self.play(Write(scaled), run_time=1.4)
        self.play(FadeIn(back, shift=0.2 * UP))
        self.wait(1.0)

        # The paper's width
        example = formula(
            R"d_k = 64:\quad \frac{\pm 8}{\sqrt{64}} = \pm 1",
            font_size=60,
        )
        paper = words("the original Transformer's heads", font_size=36, color=FADED)
        paper.next_to(example, DOWN, buff=0.3)
        whole = VGroup(scaled, back, example, paper)
        self.play(VGroup(scaled, back).animate.shift(0.9 * UP), run_time=0.6)
        example.next_to(back, DOWN, buff=0.55)
        paper.next_to(example, DOWN, buff=0.3)
        self.play(Write(example), run_time=1.4)
        self.play(FadeIn(paper))
        self.play(whole.animate.center().shift(0.45 * DOWN), run_time=0.6)
        self.play(Indicate(scaled, color=INK, scale_factor=1.08))
        self.wait(3)
