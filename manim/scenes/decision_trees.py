"""Clips for /learnings/decision-trees."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, split_words, words


class GiniSplit(Clip):
    """Gini impurity in words, then in symbols; one pile of question B scored
    with it; then both piles weighed by size, the pure one adding nothing,
    and B's decrease set against A's."""

    def construct(self):
        said, sp = split_words(
            "how mixed", "=", "1", R"$-$", "the sum of", R"(each share)$^2$",
            font_size=46,
        )
        rule, rp = split_formula(
            "G", "=", "1", "-", R"\sum_k", "p_k^2",
            font_size=72,
        )
        said.to_edge(UP, buff=0.9)
        rule.next_to(said, DOWN, buff=0.7)

        self.play(Write(said), run_time=2)
        self.wait(0.6)
        self.play(
            LaggedStart(*(FadeTransform(sp[i].copy(), rp[i]) for i in range(6)), lag_ratio=0.12),
            run_time=2,
        )
        self.play(FadeOut(said), rule.animate.to_edge(UP, buff=0.7), run_time=1)

        # The mixed pile of question B: 200 spam and 400 not
        pile = words("B's mixed pile: 200 spam, 400 not", font_size=40, color=FADED)
        pile.next_to(rule, DOWN, buff=0.6)
        one, op = split_formula(
            "G", "=", "1", "-", R"\left(\tfrac{1}{3}\right)^2", "-", R"\left(\tfrac{2}{3}\right)^2", "=", R"\tfrac{4}{9}",
            font_size=62,
        )
        one.next_to(pile, DOWN, buff=0.4)
        self.play(FadeIn(pile, shift=0.2 * DOWN))
        self.play(
            LaggedStart(
                TransformFromCopy(rp[0:4], op[0:4]),
                TransformFromCopy(rp[5], op[4]),
                FadeIn(op[5]),
                TransformFromCopy(rp[5], op[6]),
                lag_ratio=0.25,
            ),
            run_time=2,
        )
        self.play(FadeIn(op[7:], shift=0.2 * LEFT))
        self.wait(0.8)

        # Both piles, each weighed by its share of the 800 emails
        both, bp = split_formula(
            R"\tfrac{3}{4}", R"\times", R"\tfrac{4}{9}", "+", R"\tfrac{1}{4}", R"\times", "0", "=", R"\tfrac{1}{3}",
            font_size=66,
            t2c={"0": SAGE},
        )
        both.next_to(one, DOWN, buff=0.8)
        self.play(
            TransformFromCopy(op[8], bp[2]),
            FadeIn(bp[0:2]),
            run_time=1.2,
        )
        mixed_brace = Brace(bp[0:3], DOWN, buff=0.15).set_fill(FADED)
        mixed = words("600 of 800", font_size=36, color=FADED).next_to(mixed_brace, DOWN, buff=0.15)
        self.play(GrowFromCenter(mixed_brace), FadeIn(mixed))
        self.play(FadeIn(bp[3:7]), run_time=1)
        pure_brace = Brace(bp[4:7], DOWN, buff=0.15).set_fill(SAGE)
        pure = words("the pure pile", font_size=36, color=SAGE).next_to(pure_brace, DOWN, buff=0.15)
        self.play(GrowFromCenter(pure_brace), FadeIn(pure))
        self.play(FadeIn(bp[7:], shift=0.2 * LEFT))
        self.wait(1)

        # How much each question lowers it, from 1/2
        line_b, lb = split_formula(R"\mathrm{B}\colon", "0.500", "-", "0.333", "=", "0.167", font_size=62, t2c={"0.167": SAGE})
        line_a, la = split_formula(R"\mathrm{A}\colon", "0.500", "-", "0.375", "=", "0.125", font_size=62)
        end = VGroup(rule.copy(), both.copy(), line_b, line_a)
        end.arrange(DOWN, buff=0.75).center()
        line_a.align_to(line_b, LEFT)
        self.play(
            FadeOut(VGroup(pile, mixed_brace, mixed, pure_brace, pure)),
            FadeOut(one),
            rule.animate.move_to(end[0]),
            both.animate.move_to(end[1]),
            run_time=1.2,
        )
        self.play(FadeIn(line_b, shift=0.2 * UP))
        self.play(FadeIn(line_a, shift=0.2 * UP))
        self.play(Indicate(lb[5], color=SAGE, scale_factor=1.2))
        self.wait(3)
