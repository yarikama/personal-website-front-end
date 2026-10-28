"""Clips for /learnings/bellman-equation."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, split_words, words


class AverageOfNext(Clip):
    """The Bellman equation built from words: a square's worth is the
    average, over its moves, of what a move pays plus 0.9 of the worth where
    it lands. Then the numbers for A' (an average of four) and for A."""

    def construct(self):
        said, sp = split_words(
            "worth here", "=", "average over moves of", "(what it pays", "+ 0.9 $\\times$", "worth where it lands)",
            font_size=36,
        )
        said.to_edge(UP, buff=0.7)
        self.play(Write(said), run_time=2.5)
        self.wait(0.6)

        rule, rp = split_formula(
            R"v_\pi(s)", "=", R"\sum_a \pi(a \mid s)", R"\sum_{s',r} p(s',r \mid s,a)", R"\big[\, r", "+",
            R"\gamma\, v_\pi(s')\,\big]",
            font_size=56,
            t2c={R"\gamma\, v_\pi(s')\,\big]": SAGE},
        )
        rule.next_to(said, DOWN, buff=0.8)
        self.play(
            FadeTransform(sp[0].copy(), rp[0]),
            FadeTransform(sp[1].copy(), rp[1]),
            FadeTransform(sp[2].copy(), rp[2:4]),
            FadeTransform(sp[3].copy(), rp[4]),
            FadeTransform(sp[4].copy(), rp[5]),
            FadeTransform(sp[5].copy(), rp[6]),
            run_time=2.2,
        )
        b1 = Brace(rp[2], DOWN, buff=0.12).set_fill(FADED)
        l1 = words("the policy picks", font_size=30, color=FADED).next_to(b1, DOWN, buff=0.12)
        b2 = Brace(rp[3], DOWN, buff=0.12).set_fill(FADED)
        l2 = words("the world answers", font_size=30, color=FADED).next_to(b2, DOWN, buff=0.12)
        self.play(GrowFromCenter(b1), FadeIn(l1), GrowFromCenter(b2), FadeIn(l2))
        self.wait(1.4)
        self.play(FadeOut(VGroup(said, b1, l1, b2, l2)), rule.animate.to_edge(UP, buff=0.7), run_time=1.2)

        # A': each move 1 time in 4
        a_label = words("$A'$, by the bottom edge:", font_size=36, color=FADED)
        a_label.next_to(rule, DOWN, buff=0.7).to_edge(LEFT, buff=1.0)
        four, fp = split_formula(
            R"\tfrac{1}{4}", "(", "-0.4", R"\mskip\medmuskip-\mskip\medmuskip 1.1", R"\mskip\medmuskip-\mskip\medmuskip 2.2", R"\mskip\medmuskip-\mskip\medmuskip 1.7", ")", "=", "-1.3",
            font_size=56,
            t2c={"-1.3": SAGE},
        )
        four.next_to(a_label, DOWN, buff=0.35).to_edge(LEFT, buff=1.4)
        names = ["north", "east", "south: edge", "west"]
        tags = VGroup(*(words(n, font_size=24, color=FADED).next_to(fp[2 + i], DOWN, buff=0.15) for i, n in enumerate(names)))
        self.play(FadeIn(a_label))
        self.play(FadeIn(fp[:2]), LaggedStart(*(FadeIn(fp[2 + i], shift=0.15 * UP) for i in range(4)), lag_ratio=0.3), FadeIn(tags), run_time=2)
        self.play(FadeIn(fp[6:], shift=0.2 * LEFT))
        self.wait(0.8)

        # A: every move pays 10 and lands on A'
        b_label = words("$A$, whose moves all pay 10 and land on $A'$:", font_size=36, color=FADED)
        b_label.next_to(tags, DOWN, buff=0.6).to_edge(LEFT, buff=1.0)
        a, ap = split_formula("10", "+", "0.9", R"\times", "(-1.3)", "=", "8.8", font_size=60, t2c={"8.8": SAGE})
        a.next_to(b_label, DOWN, buff=0.35).to_edge(LEFT, buff=1.4)
        self.play(FadeIn(b_label))
        self.play(FadeIn(ap[:4]), TransformFromCopy(fp[8], ap[4]), run_time=1.4)
        self.play(FadeIn(ap[5:], shift=0.2 * LEFT))
        self.play(FlashAround(ap[6], color=SAGE, stroke_width=3))
        self.wait(4)
