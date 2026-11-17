"""Clips for /learnings/b-plus-trees."""

from manimlib import *

from style import FADED, SAGE, Clip, split_formula, split_words, words

# Relations set apart in pieces of their own lose TeX's spacing: spelled out
GE = R"\mskip\thickmuskip\ge\mskip\thickmuskip"


class Levels(Clip):
    """How tall a B+-tree gets. A 4 KB page of 4-byte keys and 4-byte
    pointers has room for F = 512 children. Each level multiplies what the
    tree reaches by F, so h levels reach F^h rows: h = ceil(log_F N). For a
    billion rows that is 4, where halving takes 30."""

    def construct(self):
        # The fanout, in words, then in bytes
        said, sp = split_words("fanout", "=", "page", "/", "(key + pointer)", font_size=44, color=FADED)
        fan, fp = split_formula("F", "=", R"4096", "/", R"(4 + 4)", font_size=60)
        said.to_edge(UP, buff=0.6)
        fan.next_to(said, DOWN, buff=0.4)
        self.play(Write(said), run_time=1.4)
        self.play(
            LaggedStart(*(FadeTransform(sp[i].copy(), fp[i]) for i in range(5)), lag_ratio=0.15),
            run_time=1.6,
        )
        self.wait(0.4)
        whole, wp = split_formula("F", "=", R"4096", "/", "8", "=", "512", font_size=60)
        wp[6].set_fill(SAGE)
        whole.move_to(fan)
        self.play(
            *(ReplacementTransform(fp[i], wp[i]) for i in range(5)),
            FadeIn(wp[5:], shift=0.2 * LEFT),
            run_time=1.2,
        )
        self.play(FadeOut(said), whole.animate.to_edge(UP, buff=0.6), run_time=0.8)

        # Each level multiplies the reach by F
        reach, rp = split_words(
            "each level multiplies", "the rows it reaches", "by", "F", font_size=40, color=FADED
        )
        power, pp = split_formula("F^h", GE, "N", font_size=68)
        reach.next_to(whole, DOWN, buff=0.8)
        power.next_to(reach, DOWN, buff=0.4)
        self.play(FadeIn(reach, shift=0.2 * DOWN), run_time=1.2)
        self.wait(0.4)
        self.play(
            TransformFromCopy(wp[0], pp[0]),
            FadeIn(pp[1]),
            FadeTransform(rp[1].copy(), pp[2]),
            run_time=1.4,
        )
        self.wait(0.6)

        # Turned round: the levels are a logarithm, base F
        height, hp = split_formula("h", "=", R"\lceil", R"\log_F", "N", R"\rceil", font_size=68)
        height.move_to(power)
        self.play(
            FadeOut(reach),
            FadeTransform(pp[0], VGroup(hp[0], hp[3])),
            FadeTransform(pp[1], hp[1]),
            ReplacementTransform(pp[2], hp[4]),
            FadeIn(VGroup(hp[2], hp[5])),
            run_time=1.4,
        )
        self.play(height.animate.next_to(whole, DOWN, buff=0.7), run_time=0.8)
        self.wait(0.6)

        # A billion rows
        given = words(R"a billion rows, $N = 10^9$", font_size=40, color=FADED)
        given.next_to(height, DOWN, buff=0.7)
        tree, tp = split_formula(
            "h", "=", R"\lceil", R"\log_{512}", R"10^9", R"\rceil", "=", R"\lceil 3.3 \rceil", "=", "4",
            font_size=60,
        )
        tp[9].set_fill(SAGE)
        tree.next_to(given, DOWN, buff=0.35)
        self.play(FadeIn(given, shift=0.2 * DOWN))
        self.play(
            LaggedStart(*(TransformFromCopy(hp[i], tp[i]) for i in range(6)), lag_ratio=0.12),
            run_time=1.8,
        )
        self.play(FadeIn(tp[6:8], shift=0.2 * LEFT), run_time=0.8)
        self.play(FadeIn(tp[8:], shift=0.2 * LEFT), run_time=0.8)
        self.play(Indicate(tp[9], color=SAGE, scale_factor=1.3))

        # Against halving: base 2
        halve, hv = split_formula(
            R"\text{halving: }", R"\lceil", R"\log_2", R"10^9", R"\rceil", "=", "30",
            font_size=52,
            color=FADED,
        )
        halve.next_to(tree, DOWN, buff=0.5)
        self.play(FadeIn(halve, shift=0.2 * UP), run_time=1)
        # Hold the whole result in the middle of the frame
        self.play(VGroup(whole, height, given, tree, halve).animate.move_to(ORIGIN), run_time=0.8)
        self.wait(3)
