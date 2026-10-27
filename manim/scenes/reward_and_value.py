"""Clips for /learnings/reward-and-value."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, split_formula, split_words, words


class ValueAddsUp(Clip):
    """Value is all the reward still to come, worked for the two robots (3
    and 20); then the sum regrouped: the next reward, plus the value of
    where you land."""

    def construct(self):
        said, sp = split_words("value of where you are", "=", "all the reward still to come", font_size=40)
        sums, sm = split_formula(
            "v(s)", "=", "R_1", "+", "R_2", "+", "R_3", "+", R"\cdots",
            font_size=64,
        )
        said.to_edge(UP, buff=0.9)
        sums.next_to(said, DOWN, buff=0.7)

        self.play(Write(said), run_time=2)
        self.wait(0.6)
        self.play(
            FadeTransform(sp[0].copy(), sm[0]),
            FadeTransform(sp[1].copy(), sm[1]),
            FadeTransform(sp[2].copy(), sm[2:]),
            run_time=1.8,
        )
        self.play(FadeOut(said), sums.animate.to_edge(UP, buff=0.9), run_time=0.8)

        # Worked for the two robots, from the moment the battery is low
        grab_name = words("grab the dirt", font_size=36, color=FADED)
        grab, gp = split_formula("1", "+", "1", "+", "1", "+", "0", "=", "3", font_size=56)
        charge_name = words("charge first", font_size=36, color=SAGE)
        charge, cp = split_formula(
            "0", "+", "0", "+", "0", "+", "0", "+", "1", "+", "1", "+", R"\cdots", "=", "20",
            font_size=56,
            t2c={"20": SAGE},
        )
        rows = VGroup(VGroup(grab_name, grab), VGroup(charge_name, charge))
        for name, line in rows:
            name.next_to(line, UP, buff=0.25).align_to(line, LEFT)
        rows.arrange(DOWN, buff=0.7, aligned_edge=LEFT).next_to(sums, DOWN, buff=0.8)

        self.play(FadeIn(grab_name), LaggedStart(*(FadeIn(p, shift=0.15 * DOWN) for p in gp[:-2]), lag_ratio=0.15))
        self.play(FadeIn(gp[-2:], shift=0.2 * LEFT))
        self.play(FadeIn(charge_name), LaggedStart(*(FadeIn(p, shift=0.15 * DOWN) for p in cp[:-2]), lag_ratio=0.1))
        self.play(FadeIn(cp[-2:], shift=0.2 * LEFT))
        self.play(Indicate(cp[-1], color=SAGE, scale_factor=1.3))
        self.wait(1.5)

        # Group everything after the first reward: that is the value of the
        # next place, one step on
        grouped, gr = split_formula(
            "v(s)", "=", "R_1", "+", "(", "R_2", "+", "R_3", "+", R"\cdots", ")",
            font_size=64,
        )
        grouped.move_to(sums)
        self.play(FadeOut(rows), run_time=0.8)
        self.play(
            ReplacementTransform(sm[0:4], gr[0:4]),
            FadeIn(gr[4]),
            ReplacementTransform(sm[4:], gr[5:10]),
            FadeIn(gr[10]),
            run_time=1.5,
        )
        brace = Brace(gr[4:], DOWN, buff=0.15).set_fill(SAGE)
        later = words("the value of where you land", font_size=36, color=SAGE).next_to(brace, DOWN, buff=0.2)
        self.play(GrowFromCenter(brace), FadeIn(later, shift=0.2 * DOWN))
        self.wait(1.2)

        final, fp = split_formula("v(s)", "=", "R_1", "+", "v(s')", font_size=72, t2c={"v(s')": SAGE})
        final.next_to(later, DOWN, buff=0.9).set_x(0)
        self.play(
            TransformFromCopy(gr[0:4], fp[0:4]),
            FadeTransform(later.copy(), fp[4]),
            run_time=1.8,
        )
        reads = words(
            R"the value here = the next reward + the value of where you land",
            font_size=34,
        ).next_to(final, DOWN, buff=0.6).set_x(0)
        self.play(FadeIn(reads, shift=0.2 * UP))
        self.play(Indicate(fp[4], color=SAGE, scale_factor=1.2))
        # Settle the whole result in the middle: it is the poster
        self.play(VGroup(grouped, brace, later, final, reads).animate.center(), run_time=1)
        self.wait(3)
