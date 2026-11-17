"""Clips for /learnings/join-order."""

from manimlib import *

from style import FADED, SAGE, Clip, split_formula, split_words, words


class SplitCount(Clip):
    """How many splits dynamic programming over subsets prices. A set of
    tables and a split of it are one choice per table: left, right or out,
    3^n in all. A split needs a table on each side, so take away the 2^n
    with nobody on the left and the 2^n with nobody on the right, and add
    back the one with nobody anywhere, taken away twice: 3^n - 2^(n+1) + 1.
    For 7 tables, 1,932 splits against 665,280 join trees."""

    def construct(self):
        title = words("Every split of every set of tables", font_size=44, color=FADED)
        title.to_edge(UP, buff=1.0)
        self.play(FadeIn(title, shift=0.2 * DOWN), run_time=1)

        # One choice per table
        each, ep = split_words("each table goes", "left,", "right", "or", "out", font_size=48)
        each.next_to(title, DOWN, buff=0.8)
        for i in (1, 2, 4):
            ep[i].set_fill(SAGE)
        self.play(Write(ep[0]), run_time=1)
        self.play(LaggedStart(*(FadeIn(ep[i], shift=0.2 * UP) for i in (1, 2, 3, 4)), lag_ratio=0.3), run_time=1.4)

        whole, wp = split_formula("3^n", "-", "2^n", "-", "2^n", "+", "1", font_size=84)
        whole.next_to(each, DOWN, buff=1.0)
        self.play(FadeTransform(VGroup(ep[1], ep[2], ep[4]).copy(), wp[0]), run_time=1.4)
        self.wait(0.6)

        # What is not a split: an empty side
        why = [
            ("nobody on the left", wp[1:3]),
            ("nobody on the right", wp[3:5]),
            ("nobody at all: taken away twice", wp[5:7]),
        ]
        below = whole.get_bottom() + 1.1 * DOWN
        for said, parts in why:
            line = words(said, font_size=42, color=FADED).move_to(below)
            self.play(FadeIn(line, shift=0.2 * UP), run_time=0.7)
            self.play(FadeIn(parts, shift=0.3 * DOWN), run_time=0.8)
            self.wait(0.5)
            self.play(FadeOut(line), run_time=0.4)

        # The two 2^n together
        final, fp = split_formula("3^n", "-", "2^{n+1}", "+", "1", font_size=84)
        final.move_to(whole)
        self.play(
            ReplacementTransform(wp[0], fp[0]),
            ReplacementTransform(wp[1], fp[1]),
            ReplacementTransform(VGroup(wp[2], wp[4]), fp[2]),
            FadeOut(wp[3], scale=0.5),
            ReplacementTransform(wp[5], fp[3]),
            ReplacementTransform(wp[6], fp[4]),
            run_time=1.4,
        )
        self.wait(0.8)

        # Seven tables
        sums, sp = split_formula(R"2{,}187", "-", "256", "+", "1", "=", R"1{,}932", font_size=72)
        sums.next_to(final, DOWN, buff=1.0)
        sp[6].set_fill(SAGE)
        self.play(
            LaggedStart(
                TransformFromCopy(fp[0], sp[0]),
                TransformFromCopy(fp[1], sp[1]),
                TransformFromCopy(fp[2], sp[2]),
                TransformFromCopy(fp[3], sp[3]),
                TransformFromCopy(fp[4], sp[4]),
                lag_ratio=0.15,
            ),
            run_time=1.8,
        )
        self.play(FadeIn(sp[5:], shift=0.2 * LEFT), run_time=1)
        against = words(R"splits for 7 tables, against 665{,}280 trees", font_size=42, color=FADED)
        against.next_to(sums, DOWN, buff=0.5)
        self.play(FadeIn(against, shift=0.2 * UP), run_time=1)
        self.play(Indicate(sp[6], color=SAGE, scale_factor=1.1))
        self.wait(2.5)
