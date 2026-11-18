"""Clips for /learnings/lora."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words


class Merge(Clip):
    """The layer with LoRA beside it, h = Wx + BAx; take the x out, h =
    (W + BA)x; W + BA is one d × d table, like W; add it in once and the
    layer is h = W'x, one multiply as before."""

    def construct(self):
        said = words("the frozen layer, with the change beside it", font_size=38, color=FADED)
        said.to_edge(UP, buff=0.9)

        first, fp = split_formula("h", "=", "W", "x", "+", "B", "A", "x", font_size=80)
        first.next_to(said, DOWN, buff=0.8)
        for i in (5, 6):
            fp[i].set_fill(SAGE)
        self.play(FadeIn(said, shift=0.2 * DOWN), run_time=1.0)
        self.play(Write(first), run_time=2.0)
        self.wait(1.4)

        # Both terms multiply the same input: take it out
        out = words("both multiply the same $x$: take it out", font_size=38, color=FADED).move_to(said)
        second, sp = split_formula("h", "=", "(", "W", "+", "B", "A", ")", "x", font_size=80)
        second.move_to(first)
        for i in (5, 6):
            sp[i].set_fill(SAGE)
        self.play(FadeTransform(said, out), run_time=0.8)
        self.play(
            ReplacementTransform(fp[0], sp[0]),
            ReplacementTransform(fp[1], sp[1]),
            ReplacementTransform(fp[2], sp[3]),
            ReplacementTransform(fp[4], sp[4]),
            ReplacementTransform(fp[5], sp[5]),
            ReplacementTransform(fp[6], sp[6]),
            ReplacementTransform(VGroup(fp[3], fp[7]), sp[8]),
            FadeIn(sp[2]),
            FadeIn(sp[7]),
            run_time=1.8,
        )
        self.wait(1.0)

        # The bracket is one table, the same shape as W
        brace = Brace(sp[2:8], DOWN, buff=0.2).set_fill(INK)
        shape = words(R"one $d \times d$ table, like $W$", font_size=38).next_to(brace, DOWN, buff=0.2)
        self.play(GrowFromCenter(brace), FadeIn(shape, shift=0.2 * DOWN), run_time=1.0)
        self.wait(1.8)

        # Add it in once, when training ends
        third, tp = split_formula("h", "=", "W'", "x", font_size=80)
        third.move_to(second)
        tp[2].set_fill(SAGE)
        once, op = split_formula("W'", "=", "W", "+", "B", "A", font_size=56)
        op[0].set_fill(SAGE)
        once.next_to(third, DOWN, buff=0.9)
        added = words("added in once, when training ends", font_size=36, color=FADED).move_to(out)
        self.play(FadeOut(brace), FadeOut(shape), FadeTransform(out, added), run_time=0.8)
        self.play(
            ReplacementTransform(sp[0], tp[0]),
            ReplacementTransform(sp[1], tp[1]),
            ReplacementTransform(sp[2:8], tp[2]),
            ReplacementTransform(sp[8], tp[3]),
            run_time=1.4,
        )
        self.play(FadeIn(once, shift=0.2 * UP), run_time=1.0)
        cost = words("one multiply per layer, as before", font_size=40, color=SAGE)
        cost.next_to(once, DOWN, buff=0.7)
        self.play(FadeIn(cost, shift=0.2 * UP), run_time=1.0)
        self.play(VGroup(added, third, once, cost).animate.center(), run_time=0.8)
        self.wait(3.0)
