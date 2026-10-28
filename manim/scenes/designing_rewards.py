"""Clips for /learnings/designing-rewards."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words


class HintBeatsGoal(Clip):
    """The courier's two choices from the start, worked out: deliver, 10 at
    the end of eleven moves, or circle the checkpoint, 1 every other move for
    ever. The endless trickle wins."""

    def construct(self):
        title = words("from the start, counting each move later at 0.9", font_size=38, color=FADED)
        title.to_edge(UP, buff=0.6)
        self.play(FadeIn(title, shift=0.2 * DOWN))

        # Deliver: nothing for ten moves, then 10
        d_label = words("deliver the parcel", font_size=40).move_to([-3.6, 1.7, 0])
        deliver, dp = split_formula(R"0.9^{10}", R"\times", "10", "=", "3.5", font_size=58)
        deliver.next_to(d_label, DOWN, buff=0.4)
        self.play(FadeIn(d_label))
        self.play(Write(dp[:3]), run_time=1.4)
        self.play(FadeIn(dp[3:], shift=0.2 * LEFT))
        self.wait(0.8)

        # Circle: a point every other move, for ever
        c_label = words("circle the checkpoint", font_size=40, color=SAGE).move_to([3.4, 1.7, 0])
        circle, cp = split_formula(R"0.9", R"\times", "(", "1", "+", "0.81", "+", R"0.81^2", "+", R"\cdots", ")", font_size=50)
        circle.next_to(c_label, DOWN, buff=0.4)
        self.play(FadeIn(c_label))
        self.play(LaggedStart(*(FadeIn(p, shift=0.15 * UP) for p in cp), lag_ratio=0.12), run_time=2.2)
        self.wait(0.6)
        folded, fp = split_formula(R"0.9", R"\times", R"\frac{1}{1 - 0.81}", "=", "4.7", font_size=58, t2c={"4.7": SAGE})
        folded.move_to(circle)
        self.play(
            ReplacementTransform(cp[0], fp[0]),
            ReplacementTransform(cp[1], fp[1]),
            ReplacementTransform(cp[2:], fp[2]),
            run_time=1.5,
        )
        self.play(FadeIn(fp[3:], shift=0.2 * LEFT))
        self.wait(0.8)

        # Side by side
        rule = Line(LEFT * 6, RIGHT * 6, stroke_color=RULE).shift(DOWN * 0.6)
        verdict, vp = split_formula("4.7", R"\mskip\thickmuskip>\mskip\thickmuskip", "3.5", font_size=96, t2c={"4.7": SAGE})
        verdict.shift(DOWN * 1.9)
        self.play(ShowCreation(rule))
        self.play(TransformFromCopy(fp[4], vp[0]), FadeIn(vp[1]), TransformFromCopy(dp[4], vp[2]), run_time=1.5)
        moral = words("a small reward for ever beats a big one far away", font_size=36, color=FADED)
        moral.next_to(verdict, DOWN, buff=0.45)
        self.play(FadeIn(moral, shift=0.2 * UP))
        self.wait(4)
